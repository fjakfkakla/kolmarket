import type { CoinOutcome } from "./coins";

/**
 * Les paris memecoins montrés sur la landing (données mock) : prix à une date, au-dessus / en dessous,
 * hausse ou baisse, face-à-face, x2, record… Toujours sur les 4 coins de la course (vrais logos).
 * Même règle partout : pot commun, 0 frais. `prob` = part du pot misée sur ce résultat.
 *
 * Prix de référence (10-12 oct. 2026) : $ANSEM ≈ 0,137 $ (136,6 M$), $CATE ≈ 0,054 $ (54,2 M$),
 * $BATON ≈ 0,0166 $ (16,6 M$), $FONE ≈ 0,0056 $ (5,5 M$), $QI ≈ 0,0018 $ (1,7 M$).
 * CASHCAT et AI se lisent en market cap.
 */

/**
 * Coins en plus de ceux de la course, montrés seulement dans cet écran. Vrais logos (public/coins),
 * repris des métadonnées on-chain via Jupiter le 12 oct. 2026.
 */
export const EXTRA_COINS: CoinOutcome[] = [
  {
    id: "baton", name: "baton", ticker: "BATON", mark: "B", logo: "/coins/baton.webp",
    mint: "Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump", tint: ["#f3ece2", "#d3c8b7", "#9c8f7a"],
    prob: 0, pool: 0, change24h: 15.8, mcap: 16_560_000, series: [],
  },
  {
    id: "fone", name: "apeonfone", ticker: "FONE", mark: "F", logo: "/coins/fone.webp",
    mint: "CTPoyCwkjMvoJwU4xvZZqoD8tiYk6yDchySiN5gGpump", tint: ["#e2d3c2", "#b39f88", "#7a6650"],
    prob: 0, pool: 0, change24h: 18.6, mcap: 5_510_000, series: [],
  },
  {
    id: "qi", name: "Quantum Inu", ticker: "QI", mark: "QI", logo: "/coins/qi.webp",
    mint: "8TiMkgvsrat9tM2esko8zVTt99LZLpefUM4SnZaziXaQ", tint: ["#8fb2e6", "#43638a", "#1d3352"],
    prob: 0, pool: 0, change24h: -6.9, mcap: 1_700_000, series: [],
  },
];

export type BetKind = "range" | "binary" | "updown" | "versus" | "multi";

/** Clés des titres dans t.landing.markets.titles */
export type BetTitle = "price" | "above" | "below" | "upDown" | "versus" | "double" | "ath" | "mcapOn" | "volume" | "flip";

export type BetChoice = {
  /** Libellé neutre (prix, ticker) ; vide pour Oui / Non / Hausse / Baisse, traduits à l'affichage. */
  label: string;
  /** Coin affiché devant le choix (id dans COIN_MARKETS). */
  coin?: string;
  /** "yes" | "no" | "up" | "down" pour les libellés traduits. */
  word?: "yes" | "no" | "up" | "down";
  prob: number;
};

export type CoinBet = {
  id: string;
  kind: BetKind;
  title: BetTitle;
  /** Paramètres du titre : {ticker}, {a}, {b}, {price}, {date}. */
  params: Record<string, string>;
  /** Coin principal (logo de la carte). */
  coin: string;
  /** Second coin pour un face-à-face. */
  coin2?: string;
  closesAt: string;
  pool: number;
  isNew?: boolean;
  choices: BetChoice[];
  /** Historique de la part du pot du premier choix (pour la carte à la une). */
  series?: number[][];
};

function walk(end: number, seed: number, n = 36): number[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
  const start = Math.min(0.9, Math.max(0.04, end + rnd() * 0.3));
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const v = start + (end - start) * t * t * (3 - 2 * t) + (i && i < n - 1 ? rnd() * 0.05 : 0);
    return i === n - 1 ? end : Math.min(0.95, Math.max(0.02, v));
  });
}

const OCT31 = "2026-10-31T23:59:00+01:00";
const SUNDAY = "2026-10-18T23:59:00+02:00";
const NOV30 = "2026-11-30T23:59:00+01:00";

const yesNo = (p: number): BetChoice[] => [
  { label: "", word: "yes", prob: p },
  { label: "", word: "no", prob: 1 - p },
];

/** Le marché à la une : le prix de $BATON au 31 octobre, en tranches. */
export const FEATURED_BET: CoinBet = {
  id: "baton-price-oct31",
  kind: "range",
  title: "price",
  params: { ticker: "BATON" },
  coin: "baton",
  closesAt: OCT31,
  pool: 64_180,
  isNew: true,
  choices: [
    { label: "$0.015 – $0.02", prob: 0.33 },
    { label: "$0.01 – $0.015", prob: 0.26 },
    { label: "$0.02 – $0.03", prob: 0.21 },
    { label: "< $0.01", prob: 0.12 },
    { label: "> $0.03", prob: 0.08 },
  ],
};
FEATURED_BET.series = FEATURED_BET.choices.slice(0, 3).map((c, i) => walk(c.prob, 101 + i * 7));

/** Les deux cartes à côté de la une, puis la grille : les 7 coins mélangés. */
export const COIN_BETS: CoinBet[] = [
  { id: "fone-above-001", kind: "binary", title: "above", params: { ticker: "FONE", price: "$0.01" }, coin: "fone", closesAt: OCT31, pool: 38_420, isNew: true, choices: yesNo(0.31) },
  {
    id: "qi-updown-week", kind: "updown", title: "upDown", params: { ticker: "QI" }, coin: "qi", closesAt: SUNDAY, pool: 21_760,
    choices: [{ label: "", word: "up", prob: 0.46 }, { label: "", word: "down", prob: 0.54 }],
  },
  {
    id: "baton-vs-fone-week", kind: "versus", title: "versus", params: { a: "BATON", b: "FONE" }, coin: "baton", coin2: "fone", closesAt: SUNDAY, pool: 29_310,
    choices: [{ label: "$BATON", coin: "baton", prob: 0.55 }, { label: "$FONE", coin: "fone", prob: 0.45 }],
  },
  {
    id: "volume-sunday", kind: "multi", title: "volume", params: {}, coin: "ansem", closesAt: SUNDAY, pool: 31_400,
    choices: [
      { label: "$ANSEM", coin: "ansem", prob: 0.38 },
      { label: "$BATON", coin: "baton", prob: 0.27 },
      { label: "$CASHCAT", coin: "cashcat", prob: 0.19 },
      { label: "$FONE", coin: "fone", prob: 0.1 },
      { label: "$AI", coin: "ai", prob: 0.06 },
    ],
  },
  { id: "qi-2x-nov30", kind: "binary", title: "double", params: { ticker: "QI" }, coin: "qi", closesAt: NOV30, pool: 11_940, isNew: true, choices: yesNo(0.24) },
  { id: "ansem-above-015", kind: "binary", title: "above", params: { ticker: "ANSEM", price: "$0.15" }, coin: "ansem", closesAt: OCT31, pool: 41_870, choices: yesNo(0.38) },
  {
    id: "fone-mcap-oct31", kind: "range", title: "mcapOn", params: { ticker: "FONE" }, coin: "fone", closesAt: OCT31, pool: 16_520,
    choices: [
      { label: "$5M – $10M", prob: 0.44 },
      { label: "< $5M", prob: 0.36 },
      { label: "> $10M", prob: 0.2 },
    ],
  },
  { id: "cashcat-ath-oct", kind: "binary", title: "ath", params: { ticker: "CASHCAT" }, coin: "cashcat", closesAt: OCT31, pool: 19_090, choices: yesNo(0.27) },
  { id: "qi-flips-fone", kind: "binary", title: "flip", params: { a: "QI", b: "FONE" }, coin: "qi", coin2: "fone", closesAt: NOV30, pool: 8_730, isNew: true, choices: yesNo(0.14) },
  { id: "cate-below-005", kind: "binary", title: "below", params: { ticker: "CATE", price: "$0.05" }, coin: "cate", closesAt: OCT31, pool: 18_240, choices: yesNo(0.44) },
];
