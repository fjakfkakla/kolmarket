"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Wallet } from "@wallet-standard/base";
import { checkBet, checkDeposit, checkWithdraw } from "./limits";
import { fetchSession, signInWithWallet, signOut } from "./solana-wallets";

/**
 * Compte du joueur côté navigateur.
 * La connexion est réelle (signature du wallet, session serveur).
 * Le solde et les mises sont encore une démo, gardée dans le navigateur par adresse,
 * en attendant le registre et les dépôts USDC (étape 2).
 */

export type Bet = {
  id: string;
  marketSlug: string;
  marketTitle: string;
  kolId: string;
  kolName: string;
  amount: number;
  createdAt: number;
};

export type Activity = {
  id: string;
  type: "DEPOT" | "RETRAIT" | "MISE";
  label: string;
  amount: number;
  at: number;
};

type Modal = "connect" | "deposit" | "withdraw" | null;

type Demo = { owner: string | null; balance: number; bets: Bet[]; activity: Activity[] };

type WalletState = {
  ready: boolean;
  connected: boolean;
  address: string | null;
  provider: string | null;
  balance: number;
  bets: Bet[];
  /** Total misé, encore en jeu. */
  inPlay: number;
  activity: Activity[];
  modal: Modal;
  openModal: (m: Modal) => void;
  signIn: (wallet: Wallet) => Promise<void>;
  disconnect: () => Promise<void>;
  stakedOn: (marketSlug: string) => number;
  /** Les actions renvoient un message d'erreur, ou null si c'est fait. */
  deposit: (amount: number) => string | null;
  withdraw: (amount: number) => string | null;
  placeBet: (bet: Omit<Bet, "id" | "createdAt">, open: boolean) => string | null;
};

const Ctx = createContext<WalletState | null>(null);
const EMPTY: Demo = { owner: null, balance: 0, bets: [], activity: [] };
const demoKey = (address: string) => `marketcoins.demo.v2.${address}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

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

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<{ address: string; walletApp: string | null } | null>(null);
  const [demo, setDemo] = useState<Demo>(EMPTY);
  const [modal, setModal] = useState<Modal>(null);

  // Reprend la session existante (cookie httpOnly, vérifié par le serveur).
  useEffect(() => {
    let alive = true;
    fetchSession().then((s) => {
      if (!alive) return;
      setSession(s);
      setDemo(s ? loadDemo(s.address) : EMPTY);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!demo.owner) return;
    try {
      const { balance, bets, activity } = demo;
      localStorage.setItem(demoKey(demo.owner), JSON.stringify({ balance, bets, activity }));
    } catch {}
  }, [demo]);

  const signIn = useCallback(async (wallet: Wallet) => {
    const s = await signInWithWallet(wallet);
    setSession(s);
    setDemo(loadDemo(s.address));
    setModal(null);
  }, []);

  const disconnect = useCallback(async () => {
    await signOut();
    setSession(null);
    setDemo(EMPTY);
  }, []);

  const value = useMemo<WalletState>(() => {
    const inPlay = round2(demo.bets.reduce((s, b) => s + b.amount, 0));
    const stakedOn = (slug: string) => round2(demo.bets.filter((b) => b.marketSlug === slug).reduce((s, b) => s + b.amount, 0));
    const entry = (a: Omit<Activity, "id" | "at">): Activity => ({ ...a, id: crypto.randomUUID(), at: Date.now() });

    return {
      ready,
      connected: Boolean(session),
      address: session?.address ?? null,
      provider: session?.walletApp ?? null,
      balance: demo.balance,
      bets: demo.bets,
      inPlay,
      activity: demo.activity,
      modal,
      openModal: setModal,
      signIn,
      disconnect,
      stakedOn,
      deposit: (amount) => {
        const err = checkDeposit(amount, demo.balance, inPlay);
        if (err) return err;
        const a = entry({ type: "DEPOT", label: "Dépôt USDC (démo)", amount });
        setDemo((d) => ({ ...d, balance: round2(d.balance + amount), activity: [a, ...d.activity].slice(0, 50) }));
        return null;
      },
      withdraw: (amount) => {
        const err = checkWithdraw(amount, demo.balance);
        if (err) return err;
        const a = entry({ type: "RETRAIT", label: "Retrait USDC vers le wallet (démo)", amount: -amount });
        setDemo((d) => ({ ...d, balance: round2(d.balance - amount), activity: [a, ...d.activity].slice(0, 50) }));
        return null;
      },
      placeBet: (bet, open) => {
        const err = checkBet(bet.amount, demo.balance, stakedOn(bet.marketSlug), open);
        if (err) return err;
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
  }, [ready, session, demo, modal, signIn, disconnect]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
