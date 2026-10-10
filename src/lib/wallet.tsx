"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * État wallet côté client, mocké pour l'instant.
 * À remplacer par @solana/wallet-adapter (Phantom, Solflare, Backpack)
 * et une lecture du solde USDC on-chain. Aucune clé privée ne transite ici.
 */

export type PositionMedia =
  | { kind: "kol"; avatar: string | null; color: string }
  | { kind: "coin"; mark: string; tint: [string, string, string] };

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
  media?: PositionMedia;
};

export type Activity = {
  id: string;
  type: "DEPOT" | "RETRAIT" | "ACHAT" | "VENTE";
  label: string;
  amount: number;
  at: number;
  /** Profit ou perte réalisé (ventes seulement). */
  pnl?: number;
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
  sell: (positionId: string, price?: number) => void;
};

const Ctx = createContext<WalletState | null>(null);
const KEY = "marketcoins.wallet.v1";

const DEMO_ADDRESS = "7Gx2kQmFpZ9vN4tLd8sH3rWcA1eB6yU5oP0jK2nM9xVq";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Prix de marché d'une position, simulé : il ondule doucement autour du prix d'achat
 * en attendant le vrai carnet d'ordres. Déterministe (id + temps), donc stable entre deux rendus.
 */
export function markPrice(p: Pick<Position, "id" | "avgPrice" | "createdAt">, now: number) {
  let h = 0;
  for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
  const phase = (h % 628) / 100;
  const minutes = Math.max(0, (now - p.createdAt) / 60000);
  const ramp = Math.min(1, minutes / 2);
  const swing = 0.16 * Math.sin(minutes / 3.1 + phase) + 0.06 * Math.sin(minutes / 0.9 + phase * 2);
  return Math.min(0.99, Math.max(0.01, p.avgPrice * (1 + swing * ramp)));
}

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
    setActivity((prev) => [{ ...a, id: crypto.randomUUID(), at: Date.now() }, ...prev].slice(0, 80));
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
        setBalance((b) => round2(b + amount));
        log({ type: "DEPOT", label: "Dépôt USDC depuis le wallet", amount });
      },
      withdraw: (amount) => {
        if (amount > balance) return false;
        setBalance((b) => round2(b - amount));
        log({ type: "RETRAIT", label: "Retrait USDC vers le wallet", amount: -amount });
        setModal(null);
        return true;
      },
      buy: (p, cost) => {
        if (cost > balance) return false;
        setBalance((b) => round2(b - cost));
        setPositions((prev) => [{ ...p, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev]);
        log({ type: "ACHAT", label: `${p.side === "OUI" ? "Oui" : "Non"} · ${p.outcome}`, amount: -cost });
        return true;
      },
      sell: (id, price) => {
        const pos = positions.find((x) => x.id === id);
        if (!pos) return;
        const px = price ?? markPrice(pos, Date.now());
        const proceeds = round2(pos.shares * px);
        setBalance((b) => round2(b + proceeds));
        setPositions((prev) => prev.filter((x) => x.id !== id));
        log({
          type: "VENTE",
          label: `${pos.side === "OUI" ? "Oui" : "Non"} · ${pos.outcome}`,
          amount: proceeds,
          pnl: round2(proceeds - pos.shares * pos.avgPrice),
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
