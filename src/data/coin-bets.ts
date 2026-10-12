/**
 * Les paris memecoins montrés sur la landing (données mock) : prix à une date, au-dessus / en dessous,
 * hausse ou baisse, face-à-face, x2, record… Toujours sur les 4 coins de la course (vrais logos).
 * Même règle partout : pot commun, 0 frais. `prob` = part du pot misée sur ce résultat.
 *
 * Prix de référence (10 oct. 2026, DexScreener) : tokens pump.fun à 1 Md d'offre, donc
 * $ANSEM ≈ 0,137 $ (136,6 M$) et $CATE ≈ 0,054 $ (54,2 M$). CASHCAT et AI se lisent en market cap.
 */

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

/** Le marché à la une : le prix de $ANSEM au 31 octobre, en tranches. */
export const FEATURED_BET: CoinBet = {
  id: "ansem-price-oct31",
  kind: "range",
  title: "price",
  params: { ticker: "ANSEM" },
  coin: "ansem",
  closesAt: OCT31,
  pool: 84_320,
  choices: [
    { label: "$0.13 – $0.16", prob: 0.34 },
    { label: "$0.10 – $0.13", prob: 0.27 },
    { label: "$0.16 – $0.20", prob: 0.19 },
    { label: "< $0.10", prob: 0.12 },
    { label: "> $0.20", prob: 0.08 },
  ],
};
FEATURED_BET.series = FEATURED_BET.choices.slice(0, 3).map((c, i) => walk(c.prob, 101 + i * 7));

export const COIN_BETS: CoinBet[] = [
  { id: "ansem-above-015", kind: "binary", title: "above", params: { ticker: "ANSEM", price: "$0.15" }, coin: "ansem", closesAt: OCT31, pool: 41_870, choices: yesNo(0.38) },
  { id: "cate-below-005", kind: "binary", title: "below", params: { ticker: "CATE", price: "$0.05" }, coin: "cate", closesAt: OCT31, pool: 18_240, choices: yesNo(0.44) },
  {
    id: "cashcat-updown-week", kind: "updown", title: "upDown", params: { ticker: "CASHCAT" }, coin: "cashcat", closesAt: SUNDAY, pool: 27_510, isNew: true,
    choices: [{ label: "", word: "up", prob: 0.57 }, { label: "", word: "down", prob: 0.43 }],
  },
  {
    id: "ai-vs-cate-week", kind: "versus", title: "versus", params: { a: "AI", b: "CATE" }, coin: "ai", coin2: "cate", closesAt: SUNDAY, pool: 22_960,
    choices: [{ label: "$AI", coin: "ai", prob: 0.61 }, { label: "$CATE", coin: "cate", prob: 0.39 }],
  },
  {
    id: "volume-sunday", kind: "multi", title: "volume", params: {}, coin: "ansem", closesAt: SUNDAY, pool: 31_400,
    choices: [
      { label: "$ANSEM", coin: "ansem", prob: 0.42 },
      { label: "$CASHCAT", coin: "cashcat", prob: 0.27 },
      { label: "$AI", coin: "ai", prob: 0.19 },
      { label: "$CATE", coin: "cate", prob: 0.12 },
    ],
  },
  { id: "cate-2x-nov30", kind: "binary", title: "double", params: { ticker: "CATE" }, coin: "cate", closesAt: NOV30, pool: 12_830, isNew: true, choices: yesNo(0.21) },
  { id: "ansem-ath-oct", kind: "binary", title: "ath", params: { ticker: "ANSEM" }, coin: "ansem", closesAt: OCT31, pool: 26_090, choices: yesNo(0.29) },
  {
    id: "cashcat-mcap-oct31", kind: "range", title: "mcapOn", params: { ticker: "CASHCAT" }, coin: "cashcat", closesAt: OCT31, pool: 19_660,
    choices: [
      { label: "$100M – $150M", prob: 0.46 },
      { label: "< $100M", prob: 0.31 },
      { label: "> $150M", prob: 0.23 },
    ],
  },
  { id: "ai-below-80m", kind: "binary", title: "below", params: { ticker: "AI", price: "$80M MC" }, coin: "ai", closesAt: OCT31, pool: 14_150, choices: yesNo(0.33) },
  { id: "cate-flips-ai", kind: "binary", title: "flip", params: { a: "CATE", b: "AI" }, coin: "cate", coin2: "ai", closesAt: NOV30, pool: 9_870, isNew: true, choices: yesNo(0.17) },
];
