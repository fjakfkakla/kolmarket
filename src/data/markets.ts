import { KOLS, type Kol } from "./kols";

export type Period = "7D" | "30D";

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

/** Règles communes à tous les défis en pot commun. */
export const POT_RULES = [
  "Pot commun, 0 frais : ceux qui ont misé sur le KOL gagnant se partagent 100 % du pot, au prorata de leur mise. Si personne n'a misé sur le gagnant, tout le monde est remboursé.",
  "Les mises ferment au début de la période. Pas de revente : chaque mise reste en jeu jusqu'au résultat. Le gain affiché avant la fermeture est une estimation.",
  "Mise maximale : 1000 $ par compte sur ce marché.",
];

export const MARKETS: Market[] = [
  {
    slug: "kol-top-profit-7d",
    title: "Quel KOL fera le plus de profit sur 7 jours ?",
    question: "Quel KOL fera le plus de profit ?",
    category: "KOL",
    period: "7D",
    challenge: 1,
    startsAt: "2026-10-13T00:00:00+02:00",
    endsAt: "2026-10-19T20:00:00+02:00",
    closesAt: "2026-10-13T00:00:00+02:00",
    volume: 31940,
    pool: 31940,
    traders: 312,
    featured: true,
    rules: [
      "Le KOL gagnant est celui dont le wallet Solana listé affiche le PnL réalisé le plus élevé entre le lundi 13 octobre 00:00 et le dimanche 19 octobre 20:00 (heure de Paris).",
      "Le PnL est mesuré en USD sur les ventes effectivement réalisées, hors positions ouvertes. Source : données on-chain publiques du wallet.",
      ...POT_RULES,
      "En cas d'égalité, de wallet changé ou de données indisponibles, le marché est annulé et toutes les mises sont remboursées.",
    ],
    outcomes: outcomesFromPnl("7D", 31940),
  },
  {
    slug: "kol-top-profit-30d",
    title: "Quel KOL fera le plus de profit sur 30 jours ?",
    question: "Quel KOL fera le plus de profit ?",
    category: "KOL",
    period: "30D",
    challenge: 2,
    startsAt: "2026-10-13T00:00:00+02:00",
    endsAt: "2026-11-11T20:00:00+01:00",
    closesAt: "2026-10-13T00:00:00+02:00",
    volume: 12300,
    pool: 12300,
    traders: 141,
    rules: [
      "Le KOL gagnant est celui dont le wallet Solana listé affiche le PnL réalisé le plus élevé sur 30 jours, du 13 octobre 00:00 au 11 novembre 20:00 (heure de Paris).",
      "Le PnL est mesuré en USD sur les ventes réalisées, hors positions ouvertes.",
      ...POT_RULES,
      "En cas d'égalité ou de données indisponibles, le marché est annulé et remboursé.",
    ],
    outcomes: outcomesFromPnl("30D", 12300),
  },
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
