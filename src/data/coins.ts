/**
 * Marchés « memecoins » (données mock, pas encore en base) : la course d'un coin vers un palier
 * de market cap. Même règle que les défis KOL : un pot commun, 0 frais, et ceux qui ont misé
 * sur le bon résultat se partagent tout le pot.
 */

export type CoinOutcome = {
  id: string;
  /** Nom affiché */
  name: string;
  /** Ticker, sans le $ */
  ticker: string | null;
  /** Ce qu'on écrit sur la pièce quand il n'y a pas de logo. */
  mark: string;
  /** Le vrai logo du token (public/coins), repris de ses métadonnées on-chain. */
  logo?: string;
  /** Adresse du token sur Solana. */
  mint?: string;
  /** Dégradé de la pièce [clair, milieu, profond] ; la couleur de sa ligne est celle du milieu. */
  tint: [string, string, string];
  /** Part du pot misée sur ce résultat, 0..1 */
  prob: number;
  /** Montant misé sur ce résultat, en USD. */
  pool: number;
  /** Variation sur 24 h, en points */
  change24h: number;
  /** Market cap actuelle en dollars (null pour « Aucun ») */
  mcap: number | null;
  /** Historique de la part du pot, 0..1 */
  series: number[];
};

export type CoinMarket = {
  slug: string;
  title: string;
  question: string;
  category: "MEME";
  target: string;
  closesAt: string;
  /** Pot commun : total misé, en USD. */
  pool: number;
  traders: number;
  rules: string[];
  outcomes: CoinOutcome[];
};

/** Marche pseudo-aléatoire déterministe (pas de Math.random : rendu serveur stable). */
function path(points: [number, number][], steps: number, seed: number, noise = 0.025): number[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    let k = 0;
    while (k < points.length - 2 && t > points[k + 1][0]) k++;
    const [t0, v0] = points[k];
    const [t1, v1] = points[k + 1];
    const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
    const e = u * u * (3 - 2 * u);
    const v = v0 + (v1 - v0) * e + (i === 0 || i === steps - 1 ? 0 : rnd() * noise);
    out.push(Math.min(0.995, Math.max(0.004, v)));
  }
  return out;
}

const N = 42;

export const COIN_MARKETS: CoinMarket[] = [
  {
    slug: "premier-1md-fdv",
    title: "Premier à toucher 1 Md$ de market cap : TRUMP, WIF, ANSEM ou ARC ?",
    question: "Premier à toucher 1 Md$ de market cap",
    category: "MEME",
    target: "1 Md$",
    closesAt: "2026-12-25T23:59:00+01:00",
    pool: 398269,
    traders: 2140,
    rules: [
      "Le marché se résout sur le premier token de la liste dont la market cap (offre en circulation × prix) dépasse 1 milliard de dollars, mesurée sur DexScreener, avant le 25 décembre 2026 à 23:59 (heure de Paris).",
      "La market cap doit tenir au-dessus de 1 Md$ pendant au moins une heure pleine pour compter.",
      "Si aucun des tokens n'y arrive avant la date, le résultat « Aucun » gagne.",
      "Pot commun, 0 frais : ceux qui ont misé sur le résultat gagnant se partagent tout le pot, au prorata de leur mise. Si personne n'a misé dessus, tout le monde est remboursé.",
    ],
    outcomes: [
      {
        id: "none",
        name: "Aucun d'ici le 25 décembre",
        ticker: null,
        mark: "",
        tint: ["#4a76ff", "#1652f0", "#0e3fd0"],
        prob: 0.58,
        pool: 0,
        change24h: 2.1,
        mcap: null,
        series: path([[0, 0.5], [0.08, 0.6], [0.16, 0.55], [0.22, 0.62], [0.34, 0.6], [0.7, 0.56], [0.82, 0.6], [1, 0.58]], N, 7, 0.02),
      },
      {
        id: "trump",
        name: "Official Trump",
        ticker: "TRUMP",
        mark: "T",
        logo: "/coins/trump.webp",
        mint: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
        tint: ["#f5d77a", "#d4a62a", "#a67c00"],
        prob: 0.24,
        pool: 0,
        change24h: 1.8,
        mcap: 534_000_000,
        series: path([[0, 0.3], [0.1, 0.2], [0.3, 0.22], [0.5, 0.26], [0.8, 0.22], [1, 0.24]], N, 11, 0.014),
      },
      {
        id: "wif",
        name: "dogwifhat",
        ticker: "WIF",
        mark: "W",
        logo: "/coins/wif.webp",
        mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
        tint: ["#f9b8a8", "#e8836b", "#c25a44"],
        prob: 0.1,
        pool: 0,
        change24h: -1.6,
        mcap: 217_000_000,
        series: path([[0, 0.15], [0.2, 0.12], [0.5, 0.09], [0.8, 0.11], [1, 0.1]], N, 17, 0.01),
      },
      {
        id: "ansem",
        name: "The Black Bull",
        ticker: "ANSEM",
        mark: "A",
        logo: "/coins/ansem.webp",
        mint: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump",
        tint: ["#6fe8b9", "#10b981", "#059669"],
        prob: 0.055,
        pool: 0,
        change24h: -2.4,
        mcap: 136_000_000,
        series: path([[0, 0.05], [0.3, 0.04], [0.6, 0.07], [1, 0.055]], N, 23, 0.006),
      },
      {
        id: "arc",
        name: "AI Rig Complex",
        ticker: "ARC",
        mark: "AI",
        logo: "/coins/arc.webp",
        mint: "61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump",
        tint: ["#c7ccd9", "#6b7385", "#3b4252"],
        prob: 0.025,
        pool: 0,
        change24h: -0.7,
        mcap: 61_000_000,
        series: path([[0, 0.04], [0.4, 0.03], [1, 0.025]], N, 29, 0.004),
      },
    ],
  },
];

// La part de chaque résultat donne ce qui est misé dessus.
for (const m of COIN_MARKETS) for (const o of m.outcomes) o.pool = Math.round(o.prob * m.pool);

export const coinMarketBySlug = (slug: string) => COIN_MARKETS.find((m) => m.slug === slug);
