export type Kol = {
  id: string;
  name: string;
  handle: string;
  wallet: string;
  avatar: string | null;
  color: string;
  /** PnL réalisé, en USD */
  pnl7d: number;
  pnl30d: number;
  volume7d: number;
  winRate: number;
  trades7d: number;
  /** PnL cumulé jour par jour sur les 7 derniers jours (USD). */
  series7d: number[];
  series30d: number[];
};

function walk(start: number, steps: number, end: number, seed: number): number[] {
  // Deterministic pseudo-random walk from start to end (no Math.random: stable SSR).
  const out: number[] = [start];
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = 1; i < steps; i++) {
    const target = start + ((end - start) * i) / (steps - 1);
    out.push(Math.round(target + (rnd() - 0.5) * Math.abs(end - start) * 0.35));
  }
  out[steps - 1] = end;
  return out;
}

export const KOLS: Kol[] = [
  {
    id: "cooker",
    name: "Cooker",
    handle: "CookerFlips",
    wallet: "8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6",
    avatar: "/kols/cooker.jpg",
    color: "#f59e0b",
    pnl7d: 39600,
    pnl30d: 112400,
    volume7d: 188000,
    winRate: 61,
    trades7d: 142,
    series7d: walk(0, 7, 39600, 11),
    series30d: walk(0, 30, 112400, 12),
  },
  {
    id: "cented",
    name: "Cented",
    handle: "Cented7",
    wallet: "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o",
    avatar: "/kols/cented.jpg",
    color: "#3b82f6",
    pnl7d: 29400,
    pnl30d: 96800,
    volume7d: 70000,
    winRate: 58,
    trades7d: 89,
    series7d: walk(0, 7, 29400, 21),
    series30d: walk(0, 30, 96800, 22),
  },
  {
    id: "decu",
    name: "decu",
    handle: "notdecu",
    wallet: "4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9",
    avatar: "/kols/decu.jpg",
    color: "#8b5cf6",
    pnl7d: 28800,
    pnl30d: 71200,
    volume7d: 125000,
    winRate: 54,
    trades7d: 203,
    series7d: walk(0, 7, 28800, 31),
    series30d: walk(0, 30, 71200, 32),
  },
  {
    id: "chester",
    name: "chester",
    handle: "Chestererer",
    wallet: "PMJA8UQDyWTFw2Smhyp9jGA6aTaP7jKHR7BPudrgyYN",
    avatar: "/kols/chester.jpg",
    color: "#10b981",
    pnl7d: 19200,
    pnl30d: 44900,
    volume7d: 54000,
    winRate: 63,
    trades7d: 61,
    series7d: walk(0, 7, 19200, 41),
    series30d: walk(0, 30, 44900, 42),
  },
  {
    id: "blu6k",
    name: "blu6k",
    handle: "blu6k",
    wallet: "8Ltv5royXzxVG3tAhVhRnfXrzapS5Dwqt1ocxprgu6YP",
    avatar: "/kols/blu6k.jpg",
    color: "#06b6d4",
    pnl7d: 17100,
    pnl30d: 38300,
    volume7d: 35000,
    winRate: 66,
    trades7d: 47,
    series7d: walk(0, 7, 17100, 51),
    series30d: walk(0, 30, 38300, 52),
  },
  {
    id: "zeropnl",
    name: "zeropnl",
    handle: "zeropnl",
    wallet: "4xY9T1Q7foJzJsJ6YZDSsfp9zkzeZsXnxd45SixduMmr",
    avatar: null,
    color: "#ef4444",
    pnl7d: 12400,
    pnl30d: 25100,
    volume7d: 41000,
    winRate: 49,
    trades7d: 118,
    series7d: walk(0, 7, 12400, 61),
    series30d: walk(0, 30, 25100, 62),
  },
  {
    id: "trustnoest",
    name: "trunoest",
    handle: "trunoest",
    wallet: "ardinRsN1mNYVeoJWTBsWeYeXvuR9UUDGMsCDKpb6AT",
    avatar: "/kols/trustnoest.jpg",
    color: "#ec4899",
    pnl7d: 8900,
    pnl30d: 31700,
    volume7d: 22000,
    winRate: 57,
    trades7d: 38,
    series7d: walk(0, 7, 8900, 71),
    series30d: walk(0, 30, 31700, 72),
  },
];

export const kolById = (id: string) => KOLS.find((k) => k.id === id);
