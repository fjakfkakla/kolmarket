"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Wallet } from "@wallet-standard/base";
import type { AccountData, Activity, Bet } from "./account-types";
import { checkBet, checkDeposit, checkWithdraw } from "./limits";
import { fetchSession, signInWithWallet, signOut, signTransactionWith } from "./solana-wallets";

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
  activity: Activity[];
  depositsEnabled: boolean;
  modal: Modal;
  openModal: (m: Modal) => void;
  signIn: (wallet: Wallet) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  stakedOn: (marketSlug: string) => number;
  deposit: (amount: number, onStep?: (s: DepositStep) => void) => Promise<DepositResult>;
  /** Renvoie un message d'erreur, ou null si c'est fait. */
  withdraw: (amount: number) => string | null;
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

  const load = useCallback(async (s: { address: string; walletApp: string | null } | null) => {
    setSession(s);
    if (!s) {
      setAccount(null);
      setDemo(EMPTY);
      return;
    }
    const acc = await fetchAccount().catch(() => null);
    setAccount(acc);
    setDemo(acc ? EMPTY : loadDemo(s.address));
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
      const s = await signInWithWallet(wallet);
      await load(s);
      setModal(null);
    },
    [load],
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
        if (err) return { error: err };
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
            if (st.status === "FAILED") return { error: "La transaction a échoué sur le réseau. Aucun USDC n'a bougé." };
            if (st.status === "DROPPED") return { error: "La transaction n'est jamais arrivée. Aucun USDC n'a bougé, réessaie." };
            return { error: "Dépôt reçu mais non attribué : contacte le support." };
          }
          return { error: "Le réseau est lent : ton dépôt sera crédité dès qu'il sera confirmé." };
        } catch (e) {
          return { error: (e as Error).message || "Dépôt impossible." };
        }
      },

      withdraw: (amount) => {
        if (live) return "Les retraits arrivent à la prochaine étape.";
        const err = checkWithdraw(amount, demo.balance);
        if (err) return err;
        const a = entry({ type: "RETRAIT", label: "Retrait USDC vers le wallet (démo)", amount: -amount });
        setDemo((d) => ({ ...d, balance: round2(d.balance - amount), activity: [a, ...d.activity].slice(0, 50) }));
        return null;
      },

      placeBet: async (bet, open) => {
        const err = checkBet(bet.amount, balance, stakedOn(bet.marketSlug), open);
        if (err) return err;
        if (live) {
          try {
            const r = await api<{ account: AccountData }>("/api/bets", {
              method: "POST",
              body: JSON.stringify({ marketSlug: bet.marketSlug, kolId: bet.kolId, amount: bet.amount }),
            });
            setAccount(r.account);
            return null;
          } catch (e) {
            return (e as Error).message;
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
  }, [ready, session, account, demo, modal, signIn, disconnect, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
