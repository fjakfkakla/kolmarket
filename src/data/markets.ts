import { KOLS, type Kol } from "./kols";
import { type Period, challengeSpec } from "@/lib/challenge-calendar";
import type { MarketStatus } from "@/lib/challenge-calendar";

export type { MarketStatus, Period } from "@/lib/challenge-calendar";

export type Outcome = {
  kol: Kol;
  /** Part du pot misée sur ce KOL, 0..1 (le « % » affiché). */
  prob: number;
  /** Montant misé sur ce KOL, en USD. */
  pool: number;
  /** Variation de la part du pot sur 24h, en points */
  change24h: number;
};

/** Mise récente affichée dans « Activité » (adresse raccourcie). */
export type MarketActivity = { id: string; who: string; kolId: string; amount: number; at: string };

export type Market = {
  slug: string;
  title: string;
  question: string;
  category: "KOL";
  period: Period;
  /** Numéro du défi */
  challenge: number;
  startsAt: string;
  endsAt: string;
  closesAt: string;
  volume: number;
  /** Pot commun : total misé sur le marché, en USD. */
  pool: number;
  traders: number;
  rules: string[];
  outcomes: Outcome[];
  featured?: boolean;
  /** Dernières vraies mises ; absent avec les données mock. */
  activity?: MarketActivity[];
  status: MarketStatus;
  /** Premier et dernier jour UTC comptés dans le défi. */
  dataStart?: string;
  dataEnd?: string;
  /** KOL gagnant, proposé (PROPOSED) ou définitif (RESOLVED). */
  winnerId?: string | null;
  proposedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  /** PnL réalisé de chaque KOL sur la période du défi : en direct pendant le défi, définitif ensuite. */
  scores?: { kolId: string; pnl: number | null }[];
  scoresFinal?: boolean;
};

/** Répartition mock du pot : le meilleur PnL attire le plus de mises. */
function outcomesFromPnl(period: Period, pot: number): Outcome[] {
  const key = period === "7D" ? "pnl7d" : "pnl30d";
  const weights = KOLS.map((k) => Math.pow(Math.max(k[key], 1000), 1.35));
  const total = weights.reduce((a, b) => a + b, 0);
  const changes = [2.4, -0.8, 1.1, -1.6, 0.6, -0.9, -0.8];
  return KOLS.map((kol, i) => ({ kol, prob: weights[i] / total, pool: Math.round((pot * weights[i]) / total), change24h: changes[i] }))
    .sort((a, b) => b.prob - a.prob);
}

/** Données de démonstration (sans base) : les deux premiers défis, au format des vrais. */
function mockMarket(spec: ReturnType<typeof challengeSpec>, challenge: number, pool: number, traders: number, featured: boolean): Market {
  return {
    slug: spec.slug,
    title: spec.title,
    question: spec.question,
    category: "KOL",
    period: spec.period,
    challenge,
    startsAt: spec.startsAt,
    endsAt: spec.endsAt,
    closesAt: spec.closesAt,
    dataStart: spec.dataStart,
    dataEnd: spec.dataEnd,
    status: "OPEN",
    volume: pool,
    pool,
    traders,
    featured,
    rules: spec.rules,
    outcomes: outcomesFromPnl(spec.period, pool),
  };
}

export const MARKETS: Market[] = [
  mockMarket(challengeSpec("7D", "2026-10-12"), 1, 31940, 312, true),
  mockMarket(challengeSpec("30D", "2026-11-01"), 2, 12300, 141, false),
];

export const marketBySlug = (slug: string) => MARKETS.find((m) => m.slug === slug);

/** Marchés secondaires Oui / Non : un pot commun à deux issues. */
export type BinaryMarket = {
  slug: string;
  title: string;
  kolId: string;
  period: Period;
  /** Part du pot misée sur Oui, 0..1 */
  yes: number;
  /** Pot total, en USD */
  pool: number;
};

export const BINARY_MARKETS: BinaryMarket[] = [
  { slug: "cooker-50k-7d", title: "Cooker dépassera-t-il +50K$ de profit cette semaine ?", kolId: "cooker", period: "7D", yes: 0.34, pool: 9120 },
  { slug: "cented-top3-7d", title: "Cented finira-t-il dans le top 3 sur 7 jours ?", kolId: "cented", period: "7D", yes: 0.71, pool: 6480 },
  { slug: "decu-positive-7d", title: "decu terminera-t-il la semaine en positif ?", kolId: "decu", period: "7D", yes: 0.82, pool: 4310 },
  { slug: "blu6k-winrate-30d", title: "blu6k gardera-t-il un winrate > 60 % sur 30 jours ?", kolId: "blu6k", period: "30D", yes: 0.57, pool: 2890 },
  { slug: "chester-beats-cooker-7d", title: "chester battra-t-il Cooker sur 7 jours ?", kolId: "chester", period: "7D", yes: 0.18, pool: 5260 },
  { slug: "zeropnl-100k-30d", title: "zeropnl atteindra-t-il +100K$ sur 30 jours ?", kolId: "zeropnl", period: "30D", yes: 0.09, pool: 1740 },
];
