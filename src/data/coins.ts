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
  /** Adresse du token (mint Solana ou contrat EVM) : jamais affichée, elle sert à retrouver le token. */
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
    slug: "premier-500m-mcap",
    title: "Premier à toucher 500 M$ de market cap : ANSEM, CASHCAT, AI ou CATE ?",
    question: "Premier à toucher 500 M$ de market cap",
    category: "MEME",
    target: "500 M$",
    closesAt: "2026-12-31T23:59:00+01:00",
    pool: 398269,
    traders: 2140,
    rules: [
      "Le marché se résout sur le premier token de la liste dont la market cap (offre en circulation × prix) dépasse 500 millions de dollars, mesurée sur DexScreener, avant le 31 décembre 2026 à 23:59 (heure de Paris).",
      "La market cap doit tenir au-dessus de 500 M$ pendant au moins une heure pleine pour compter.",
      "Si aucun des tokens n'y arrive avant le 31 décembre, le résultat « Aucun » gagne.",
      "Pot commun, 0 frais : ceux qui ont misé sur le résultat gagnant se partagent tout le pot, au prorata de leur mise. Si personne n'a misé dessus, tout le monde est remboursé.",
    ],
    // Market caps et variations 24 h relevées sur DexScreener le 10 octobre 2026.
    outcomes: [
      {
        id: "none",
        name: "Aucun coin avant le 31 décembre",
        ticker: null,
        mark: "",
        tint: ["#4a76ff", "#1652f0", "#0e3fd0"],
        prob: 0.52,
        pool: 0,
        change24h: 1.4,
        mcap: null,
        series: path([[0, 0.46], [0.08, 0.55], [0.16, 0.5], [0.22, 0.57], [0.34, 0.54], [0.7, 0.5], [0.82, 0.55], [1, 0.52]], N, 7, 0.02),
      },
      {
        id: "ansem",
        name: "The Black Bull",
        ticker: "ANSEM",
        mark: "A",
        logo: "/coins/ansem.webp",
        mint: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump",
        tint: ["#7cf0b4", "#1fc46f", "#0e8a4c"],
        prob: 0.2,
        pool: 0,
        change24h: -0.6,
        mcap: 136_600_000,
        series: path([[0, 0.26], [0.1, 0.17], [0.3, 0.19], [0.5, 0.23], [0.8, 0.18], [1, 0.2]], N, 11, 0.014),
      },
      {
        id: "cashcat",
        name: "Cash Cat",
        ticker: "CASHCAT",
        mark: "C",
        logo: "/coins/cashcat.webp",
        mint: "0x020bfc650a365f8bb26819deaabf3e21291018b4",
        tint: ["#f9c8b4", "#e07a5f", "#b2503b"],
        prob: 0.14,
        pool: 0,
        change24h: 2.5,
        mcap: 113_000_000,
        series: path([[0, 0.12], [0.2, 0.15], [0.5, 0.11], [0.8, 0.16], [1, 0.14]], N, 17, 0.01),
      },
      {
        id: "ai",
        name: "Artificial Inu",
        ticker: "AI",
        mark: "AI",
        logo: "/coins/ai.webp",
        mint: "0x2e8c31162b855a2ffa90f6f8634643ad6f111e18",
        tint: ["#c9b8ff", "#8b6cf0", "#5b3fc4"],
        prob: 0.09,
        pool: 0,
        change24h: 5.1,
        mcap: 92_900_000,
        series: path([[0, 0.1], [0.3, 0.07], [0.6, 0.11], [1, 0.09]], N, 23, 0.006),
      },
      {
        id: "cate",
        name: "Catecoin",
        ticker: "CATE",
        mark: "C",
        logo: "/coins/cate.webp",
        mint: "Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump",
        tint: ["#fff0b3", "#e6c14a", "#b4901e"],
        prob: 0.05,
        pool: 0,
        change24h: -6.4,
        mcap: 54_200_000,
        series: path([[0, 0.06], [0.4, 0.04], [1, 0.05]], N, 29, 0.004),
      },
    ],
  },
];

// La part de chaque résultat donne ce qui est misé dessus.
for (const m of COIN_MARKETS) for (const o of m.outcomes) o.pool = Math.round(o.prob * m.pool);

export const coinMarketBySlug = (slug: string) => COIN_MARKETS.find((m) => m.slug === slug);
