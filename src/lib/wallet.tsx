"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * État wallet côté client, mocké pour l'instant.
 * À remplacer par @solana/wallet-adapter (Phantom, Solflare, Backpack)
 * et une lecture du solde USDC on-chain. Aucune clé privée ne transite ici.
 */

export type Position = {
  id: string;
  marketSlug: string;
  marketTitle: string;
  outcome: string;
  side: "OUI" | "NON";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  createdAt: number;
};

export type Activity = {
  id: string;
  type: "DEPOT" | "RETRAIT" | "ACHAT" | "VENTE";
  /** Libellé brut (repli) ; l'affichage est traduit à partir du type, du côté et du résultat. */
  label: string;
  side?: Position["side"];
  outcome?: string;
  amount: number;
  at: number;
};

type Modal = "connect" | "deposit" | "withdraw" | null;

type WalletState = {
  ready: boolean;
  connected: boolean;
  address: string | null;
  provider: string | null;
  balance: number;
  positions: Position[];
  activity: Activity[];
  modal: Modal;
  openModal: (m: Modal) => void;
  connect: (provider: string) => void;
  disconnect: () => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  buy: (p: Omit<Position, "id" | "createdAt">, cost: number) => boolean;
  sell: (positionId: string) => void;
};

const Ctx = createContext<WalletState | null>(null);
const KEY = "marketcoins.wallet.v1";

const DEMO_ADDRESS = "7Gx2kQmFpZ9vN4tLd8sH3rWcA1eB6yU5oP0jK2nM9xVq";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [modal, setModal] = useState<Modal>(null);

  // Hydrate from localStorage after mount (never during SSR) to avoid markup mismatches.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          setConnected(!!s.connected);
          setProvider(s.provider ?? null);
          setBalance(Number(s.balance) || 0);
          setPositions(Array.isArray(s.positions) ? s.positions : []);
          setActivity(Array.isArray(s.activity) ? s.activity : []);
        }
      } catch {}
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ connected, provider, balance, positions, activity }));
    } catch {}
  }, [ready, connected, provider, balance, positions, activity]);

  const log = useCallback((a: Omit<Activity, "id" | "at">) => {
    setActivity((prev) => [{ ...a, id: crypto.randomUUID(), at: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      ready,
      connected,
      address: connected ? DEMO_ADDRESS : null,
      provider,
      balance,
      positions,
      activity,
      modal,
      openModal: setModal,
      connect: (p) => {
        setProvider(p);
        setConnected(true);
        setModal(null);
      },
      disconnect: () => {
        setConnected(false);
        setProvider(null);
      },
      deposit: (amount) => {
        setBalance((b) => Math.round((b + amount) * 100) / 100);
        log({ type: "DEPOT", label: "Dépôt USDC (Solana)", amount });
        setModal(null);
      },
      withdraw: (amount) => {
        if (amount > balance) return false;
        setBalance((b) => Math.round((b - amount) * 100) / 100);
        log({ type: "RETRAIT", label: "Retrait USDC vers le wallet", amount: -amount });
        setModal(null);
        return true;
      },
      buy: (p, cost) => {
        if (cost > balance) return false;
        setBalance((b) => Math.round((b - cost) * 100) / 100);
        setPositions((prev) => [{ ...p, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev]);
        log({ type: "ACHAT", label: `${p.side} · ${p.outcome}`, side: p.side, outcome: p.outcome, amount: -cost });
        return true;
      },
      sell: (id) => {
        setPositions((prev) => {
          const pos = prev.find((x) => x.id === id);
          if (pos) {
            const proceeds = Math.round(pos.shares * pos.currentPrice * 100) / 100;
            setBalance((b) => Math.round((b + proceeds) * 100) / 100);
            log({ type: "VENTE", label: `${pos.side} · ${pos.outcome}`, side: pos.side, outcome: pos.outcome, amount: proceeds });
          }
          return prev.filter((x) => x.id !== id);
        });
      },
    }),
    [ready, connected, provider, balance, positions, activity, modal, log],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
