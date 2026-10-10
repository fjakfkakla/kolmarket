import "server-only";

/**
 * Client Solana Tracker (PnL V2) : PnL réalisé jour par jour d'un wallet, en journées UTC.
 * Offre gratuite : 2 500 requêtes par mois, 3 par seconde. Clé dans SOLANATRACKER_API_KEY.
 */

export const trackerKey = () => process.env.SOLANATRACKER_API_KEY?.trim() || null;
const base = () => (process.env.SOLANATRACKER_BASE_URL?.trim() || "https://data.solanatracker.io").replace(/\/$/, "");

export type PnlDay = {
  date: string;
  /** PnL réalisé ce jour-là, en USD ; null si la source ne le donne pas. */
  realized: number | null;
  volume: number;
  trades: number;
};

export type PnlHistory = {
  days: PnlDay[];
  /** Total réalisé sur la plage selon la source, pour contrôler la somme des jours. */
  totalRealized: number | null;
  tradingDays: number | null;
};

export class TrackerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
  /** Erreur passagère (limite de requêtes, panne) : réessayer plus tard, sans conclure. */
  get temporary() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
  /** Clé absente ou refusée : inutile d'insister. */
  get unauthorized() {
    return this.status === 401 || this.status === 403;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

/** Au plus 3 requêtes par seconde, comme l'exige l'offre gratuite. */
async function throttle() {
  const wait = lastCall + 400 - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** PnL jour par jour du wallet, du jour UTC `start` au jour `end` inclus. */
export async function walletPnlHistory(key: string, wallet: string, start: string, end: string): Promise<PnlHistory> {
  await throttle();
  const url = `${base()}/v2/pnl/wallets/${encodeURIComponent(wallet)}/history?start=${start}&end=${end}&limit=1000`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "x-api-key": key, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new TrackerError(`Solana Tracker injoignable : ${(e as Error).message}`, 0);
  }
  if (!res.ok) throw new TrackerError(`Solana Tracker : HTTP ${res.status}`, res.status);
  const body = (await res.json().catch(() => null)) as {
    days?: unknown;
    summary?: { totals?: { realizedPnl?: unknown }; days?: { trading?: unknown } };
  } | null;
  if (!body || !Array.isArray(body.days)) throw new TrackerError("Solana Tracker : réponse inattendue", 502);

  type RawDay = {
    date?: unknown;
    activity?: { pnl?: { realized?: unknown }; volume?: { total?: unknown }; counts?: { buys?: unknown; sells?: unknown } };
  };
  const days = (body.days as RawDay[])
    .filter((d): d is RawDay & { date: string } => typeof d?.date === "string" && DAY.test(d.date))
    .map((d) => ({
      date: d.date,
      realized: num(d.activity?.pnl?.realized),
      volume: num(d.activity?.volume?.total) ?? 0,
      trades: (num(d.activity?.counts?.buys) ?? 0) + (num(d.activity?.counts?.sells) ?? 0),
    }));
  return {
    days,
    totalRealized: num(body.summary?.totals?.realizedPnl),
    tradingDays: num(body.summary?.days?.trading),
  };
}
