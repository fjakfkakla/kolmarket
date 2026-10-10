"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Wallet } from "@wallet-standard/base";
import type { AccountData, Activity, Bet } from "./account-types";
import { checkBet, checkDeposit, checkWithdraw } from "./limits";
import { fetchSession, signInWithWallet, signOut, signTransactionWith } from "./solana-wallets";
import { useI18n } from "@/i18n/client";
import { translateError } from "@/i18n/errors";

export type { Activity, Bet } from "./account-types";

/**
 * Compte du joueur côté navigateur.
 * - Mode réel (base configurée) : solde, mises et historique viennent du registre (/api/account),
 *   les dépôts passent par le wallet et la blockchain.
 * - Mode démo (pas de base) : tout est simulé dans le navigateur, par adresse.
 */

type Modal = "connect" | "deposit" | "withdraw" | null;

export type DepositStep = "prepare" | "sign" | "send" | "confirm";
export type DepositResult = { error: string } | { credited: number; excess: number };
export type WithdrawStatus = "REVIEW" | "QUEUED" | "SENDING" | "CONFIRMED" | "REFUNDED";
export type WithdrawResult = { error: string } | { status: WithdrawStatus; signature: string | null };

type Demo = { owner: string | null; balance: number; bets: Bet[]; activity: Activity[] };

type WalletState = {
  ready: boolean;
  connected: boolean;
  /** true = vrai registre ; false = démo dans le navigateur. */
  live: boolean;
  address: string | null;
  provider: string | null;
  balance: number;
  /** Dépôts au-delà du plafond : retirables, pas jouables. */
  excess: number;
  /** Total misé, encore en jeu. */
  inPlay: number;
  bets: Bet[];
  /** Mises des défis terminés (gagnées, perdues, remboursées). */
  settled: Bet[];
  activity: Activity[];
  depositsEnabled: boolean;
  modal: Modal;
  openModal: (m: Modal) => void;
  signIn: (wallet: Wallet) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  stakedOn: (marketSlug: string) => number;
  deposit: (amount: number, onStep?: (s: DepositStep) => void) => Promise<DepositResult>;
  withdraw: (amount: number, onSending?: () => void) => Promise<WithdrawResult>;
  placeBet: (bet: Omit<Bet, "id" | "createdAt">, open: boolean) => Promise<string | null>;
};

const Ctx = createContext<WalletState | null>(null);
const EMPTY: Demo = { owner: null, balance: 0, bets: [], activity: [] };
const demoKey = (address: string) => `marketcoins.demo.v2.${address}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadDemo(address: string): Demo {
  try {
    const s = JSON.parse(localStorage.getItem(demoKey(address)) ?? "null");
    if (s) {
      return {
        owner: address,
        balance: Number(s.balance) || 0,
        bets: Array.isArray(s.bets) ? s.bets : [],
        activity: Array.isArray(s.activity) ? s.activity : [],
      };
    }
  } catch {}
  return { ...EMPTY, owner: address };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Service indisponible.");
  return data as T;
}

/** Charge le compte : réel si le serveur a une base, sinon null (démo). */
async function fetchAccount(): Promise<AccountData | null> {
  const r = await api<{ live: boolean; account?: AccountData }>("/api/account");
  return r.live && r.account ? r.account : null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<{ address: string; walletApp: string | null } | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [demo, setDemo] = useState<Demo>(EMPTY);
  const [modal, setModal] = useState<Modal>(null);
  const { t } = useI18n();
  // Messages d'erreur (en français côté serveur et règles partagées) traduits dans la langue de l'interface.
  const tr = useCallback((msg: string) => translateError(msg, t), [t]);

  const load = useCallback(async (s: { address: string; walletApp: string | null } | null) => {
    // Le compte est chargé avant d'afficher la session : pas de passage furtif par le mode démo.
    const acc = s ? await fetchAccount().catch(() => null) : null;
    setSession(s);
    setAccount(acc);
    setDemo(s && !acc ? loadDemo(s.address) : EMPTY);
  }, []);

  // Reprend la session existante (cookie httpOnly, vérifié par le serveur).
  useEffect(() => {
    let alive = true;
    fetchSession()
      .then((s) => (alive ? load(s) : undefined))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [load]);

  useEffect(() => {
    if (!demo.owner) return;
    try {
      const { balance, bets, activity } = demo;
      localStorage.setItem(demoKey(demo.owner), JSON.stringify({ balance, bets, activity }));
    } catch {}
  }, [demo]);

  const signIn = useCallback(
    async (wallet: Wallet) => {
      let s: Awaited<ReturnType<typeof signInWithWallet>>;
      try {
        s = await signInWithWallet(wallet);
      } catch (e) {
        throw new Error(tr((e as Error)?.message || "Connexion impossible."));
      }
      await load(s);
      setModal(null);
    },
    [load, tr],
  );

  const disconnect = useCallback(async () => {
    await signOut();
    await load(null);
  }, [load]);

  const refresh = useCallback(async () => {
    const acc = await fetchAccount().catch(() => null);
    if (acc) setAccount(acc);
  }, []);

  const value = useMemo<WalletState>(() => {
    const live = account !== null;
    const bets = live ? account.bets : demo.bets;
    const balance = live ? account.balance : demo.balance;
    const inPlay = live ? account.inPlay : round2(demo.bets.reduce((s, b) => s + b.amount, 0));
    const stakedOn = (slug: string) => round2(bets.filter((b) => b.marketSlug === slug).reduce((s, b) => s + b.amount, 0));
    const entry = (a: Omit<Activity, "id" | "at">): Activity => ({ ...a, id: crypto.randomUUID(), at: Date.now() });

    return {
      ready,
      connected: Boolean(session),
      live,
      address: session?.address ?? null,
      provider: session?.walletApp ?? null,
      balance,
      excess: live ? account.excess : 0,
      inPlay,
      bets,
      settled: live ? (account.settled ?? []) : [],
      activity: live ? account.activity : demo.activity,
      depositsEnabled: live ? account.depositsEnabled : true,
      modal,
      openModal: setModal,
      signIn,
      disconnect,
      refresh,
      stakedOn,

      deposit: async (amount, onStep) => {
        const err = checkDeposit(amount, balance, inPlay);
        if (err) return { error: tr(err) };
        if (!live) {
          await sleep(1200);
          const a = entry({ type: "DEPOT", label: "Dépôt USDC (démo)", amount });
          setDemo((d) => ({ ...d, balance: round2(d.balance + amount), activity: [a, ...d.activity].slice(0, 50) }));
          return { credited: amount, excess: 0 };
        }
        try {
          onStep?.("prepare");
          const prep = await api<{ transaction: string; token: string }>("/api/deposit/prepare", {
            method: "POST",
            body: JSON.stringify({ amount }),
          });
          onStep?.("sign");
          const signed = await signTransactionWith(session?.walletApp ?? null, session!.address, prep.transaction);
          onStep?.("send");
          const { signature } = await api<{ signature: string }>("/api/deposit/submit", {
            method: "POST",
            body: JSON.stringify({ transaction: signed, token: prep.token }),
          });
          // Crédit seulement quand la transaction est définitive (~15 s sur Solana).
          onStep?.("confirm");
          for (let i = 0; i < 30; i++) {
            await sleep(4000);
            const st = await api<{ status: string; credited: number; excess: number }>(
              `/api/deposit/status?signature=${encodeURIComponent(signature)}`,
            ).catch(() => null);
            if (!st || st.status === "PENDING") continue;
            await refresh();
            if (st.status === "CREDITED") return { credited: st.credited, excess: st.excess };
            if (st.status === "FAILED") return { error: tr("La transaction a échoué sur le réseau. Aucun USDC n'a bougé.") };
            if (st.status === "DROPPED") return { error: tr("La transaction n'est jamais arrivée. Aucun USDC n'a bougé, réessaie.") };
            return { error: tr("Dépôt reçu mais non attribué : contacte le support.") };
          }
          return { error: tr("Le réseau est lent : ton dépôt sera crédité dès qu'il sera confirmé.") };
        } catch (e) {
          return { error: tr((e as Error).message || "Dépôt impossible.") };
        }
      },

      withdraw: async (amount, onSending) => {
        const err = checkWithdraw(amount, balance + (live ? account.excess : 0));
        if (err) return { error: tr(err) };
        if (!live) {
          const a = entry({ type: "RETRAIT", label: "Retrait USDC vers le wallet (démo)", amount: -amount });
          setDemo((d) => ({ ...d, balance: round2(d.balance - amount), activity: [a, ...d.activity].slice(0, 50) }));
          return { status: "CONFIRMED", signature: null };
        }
        try {
          const r = await api<{ id: string; status: WithdrawStatus }>("/api/withdraw", {
            method: "POST",
            body: JSON.stringify({ amount }),
          });
          await refresh(); // le compte est débité dès la demande
          if (r.status === "REVIEW") return { status: r.status, signature: null };
          onSending?.();
          // Suivi jusqu'à l'arrivée définitive (~15 s), au plus 1 min 30.
          let last: WithdrawStatus = r.status;
          for (let i = 0; i < 30; i++) {
            await sleep(3000);
            const st = await api<{ status: WithdrawStatus; signature: string | null }>(
              `/api/withdraw/status?id=${encodeURIComponent(r.id)}`,
            ).catch(() => null);
            if (!st) continue;
            last = st.status;
            if (st.status === "CONFIRMED" || st.status === "REFUNDED" || st.status === "REVIEW") {
              await refresh();
              return { status: st.status, signature: st.signature };
            }
            // Toujours en file après plusieurs essais : la réserve est à recharger, inutile d'attendre ici.
            if (st.status === "QUEUED" && i >= 3) break;
          }
          return { status: last, signature: null };
        } catch (e) {
          return { error: tr((e as Error).message || "Retrait impossible.") };
        }
      },

      placeBet: async (bet, open) => {
        const err = checkBet(bet.amount, balance, stakedOn(bet.marketSlug), open);
        if (err) return tr(err);
        if (live) {
          try {
            const r = await api<{ account: AccountData }>("/api/bets", {
              method: "POST",
              body: JSON.stringify({ marketSlug: bet.marketSlug, kolId: bet.kolId, amount: bet.amount }),
            });
            setAccount(r.account);
            return null;
          } catch (e) {
            return tr((e as Error).message);
          }
        }
        const b: Bet = { ...bet, id: crypto.randomUUID(), createdAt: Date.now() };
        const a = entry({ type: "MISE", label: `${bet.kolName} · ${bet.marketTitle}`, amount: -bet.amount });
        setDemo((d) => ({
          ...d,
          balance: round2(d.balance - bet.amount),
          bets: [b, ...d.bets],
          activity: [a, ...d.activity].slice(0, 50),
        }));
        return null;
      },
    };
  }, [ready, session, account, demo, modal, signIn, disconnect, refresh, tr]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
