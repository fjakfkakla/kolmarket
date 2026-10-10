import "server-only";
import { KOLS, type Kol } from "@/data/kols";
import { MARKETS, type Market, type MarketStatus, type Outcome, type Period } from "@/data/markets";
import { addDays, isoDay } from "./challenge-calendar";
import { aliasPeriod, currentChallenge } from "./market-select";
import { supabase } from "./supabase";

/**
 * Couche d'accès aux données.
 * Si Supabase est configuré (variables d'environnement), on lit la base.
 * Sinon, ou en cas d'erreur, on retombe sur les données mock pour que le site
 * reste toujours affichable.
 */

type KolRow = { id: string; name: string; handle: string; wallet: string; avatar_url: string | null; color: string };
type StatRow = { kol_id: string; period: Period; pnl_usd: number; volume_usd: number; win_rate: number | null; trades: number | null };
type SeriesRow = { kol_id: string; snapshot_date: string; cumulative_pnl_usd: number };
type MarketRow = {
  id: string; slug: string; title: string; question: string; category: string; period: Period;
  challenge_no: number | null; starts_at: string; ends_at: string; closes_at: string; status: MarketStatus;
  rules: string[]; featured: boolean; data_start: string | null; data_end: string | null;
  proposed_at: string | null; resolved_at: string | null; resolution_note: string | null; winning_outcome_id: string | null;
  outcomes: { id: string; kol_id: string; position: number }[];
};
type ResultRow = { market_id: string; kol_id: string; realized_pnl_usd: number | null };
type SnapRow = { kol_id: string; snapshot_date: string; realized_pnl_usd: number };
type PoolRow = { outcome_id: string; pool_micro: number };
type RecentRow = { id: string; market_id: string; kol_id: string; amount_micro: number; created_at: string; wallet_short: string };
type StatsRow = { market_id: string; volume_usd: number; pool_usd: number; traders: number };

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Série cumulée des `n` derniers jours, ramenée à 0 au premier point. */
function windowSeries(rows: SeriesRow[], n: number): number[] {
  const last = rows.slice(-n).map((r) => num(r.cumulative_pnl_usd));
  if (last.length === 0) return Array(n).fill(0);
  const base = last.length > 1 ? last[0] : 0;
  const series = last.map((v) => Math.round(v - base));
  while (series.length < n) series.unshift(0);
  return series;
}

export async function getKols(): Promise<Kol[]> {
  const sb = supabase();
  if (!sb) return KOLS;
  try {
    const [kols, stats, series] = await Promise.all([
      sb.from("kols").select("id,name,handle,wallet,avatar_url,color").eq("active", true),
      sb.from("kol_stats").select("kol_id,period,pnl_usd,volume_usd,win_rate,trades"),
      sb.from("kol_pnl_series").select("kol_id,snapshot_date,cumulative_pnl_usd").order("snapshot_date"),
    ]);
    if (kols.error || stats.error || series.error || !kols.data?.length) throw kols.error ?? stats.error ?? series.error ?? new Error("vide");

    const statFor = (id: string, p: Period) => (stats.data as StatRow[]).find((s) => s.kol_id === id && s.period === p);
    return (kols.data as KolRow[]).map((k) => {
      const s7 = statFor(k.id, "7D");
      const s30 = statFor(k.id, "30D");
      const rows = (series.data as SeriesRow[]).filter((r) => r.kol_id === k.id);
      return {
        id: k.id,
        name: k.name,
        handle: k.handle,
        wallet: k.wallet,
        avatar: k.avatar_url,
        color: k.color,
        pnl7d: num(s7?.pnl_usd),
        pnl30d: num(s30?.pnl_usd),
        volume7d: num(s7?.volume_usd),
        winRate: num(s7?.win_rate),
        trades7d: num(s7?.trades),
        series7d: windowSeries(rows, 7),
        series30d: windowSeries(rows, 30),
      };
    }).sort((a, b) => b.pnl7d - a.pnl7d);
  } catch (e) {
    console.error("[data] getKols → mock :", (e as Error).message);
    return KOLS;
  }
}

export async function getMarkets(): Promise<Market[]> {
  const sb = supabase();
  if (!sb) return MARKETS;
  try {
    const today = isoDay(new Date());
    const [kols, markets, stats, pools, recent, results, snaps] = await Promise.all([
      getKols(),
      sb.from("markets")
        .select(
          "id,slug,title,question,category,period,challenge_no,starts_at,ends_at,closes_at,status,rules,featured," +
            "data_start,data_end,proposed_at,resolved_at,resolution_note,winning_outcome_id," +
            "outcomes!outcomes_market_id_fkey(id,kol_id,position)",
        )
        .neq("status", "DRAFT")
        .order("challenge_no"),
      sb.from("market_stats").select("market_id,volume_usd,pool_usd,traders"),
      sb.from("outcome_pools").select("outcome_id,pool_micro"),
      sb.from("recent_bets").select("id,market_id,kol_id,amount_micro,created_at,wallet_short").order("created_at", { ascending: false }).limit(200),
      sb.from("market_results").select("market_id,kol_id,realized_pnl_usd"),
      // PnL jour par jour récent : classement en direct des défis en cours (un mois au plus)
      sb.from("pnl_snapshots").select("kol_id,snapshot_date,realized_pnl_usd").gte("snapshot_date", addDays(today, -40)),
    ]);
    if (markets.error || !markets.data?.length) throw markets.error ?? new Error("aucun marché");
    if (pools.error || recent.error) throw pools.error ?? recent.error;
    // Sans la migration 0005, pas de résultats ni de classement : le reste s'affiche quand même.
    if (results.error) console.error("[data] market_results :", results.error.message);
    if (snaps.error) console.error("[data] pnl_snapshots :", snaps.error.message);
    const resultRows = (results.data ?? []) as ResultRow[];
    const snapRows = (snaps.data ?? []) as SnapRow[];
    const poolOf = new Map((pools.data as PoolRow[]).map((p) => [p.outcome_id, num(p.pool_micro) / 1e6]));
    const kolById = new Map(kols.map((k) => [k.id, k]));
    const statFor = (id: string) => (stats.data as StatsRow[] | null)?.find((s) => s.market_id === id);

    return (markets.data as unknown as MarketRow[]).map((m) => {
      const st = statFor(m.id);
      // Pot commun, à partir des vraies mises : `pool` = misé sur le KOL, `prob` = sa part du pot.
      const rows = m.outcomes.map((o) => ({ o, pool: poolOf.get(o.id) ?? 0 }));
      const pot = rows.reduce((s, r) => s + r.pool, 0);
      const outcomes: Outcome[] = rows
        .sort((a, b) => b.pool - a.pool || a.o.position - b.o.position)
        .map(({ o, pool }) => ({ kol: kolById.get(o.kol_id), prob: pot > 0 ? pool / pot : 0, pool, change24h: 0 }))
        .filter((o): o is Outcome => Boolean(o.kol));
      const winner = m.outcomes.find((o) => o.id === m.winning_outcome_id);
      // Résultat définitif s'il a été lu, sinon somme en direct des journées déjà écoulées du défi.
      const final = resultRows.filter((r) => r.market_id === m.id);
      let scores: Market["scores"];
      if (final.length) {
        scores = final.map((r) => ({ kolId: r.kol_id, pnl: r.realized_pnl_usd === null ? null : num(r.realized_pnl_usd) }));
      } else if (m.data_start && m.data_end && m.data_start <= today && snapRows.length) {
        const end = m.data_end < today ? m.data_end : today;
        scores = m.outcomes.map((o) => ({
          kolId: o.kol_id,
          pnl: snapRows
            .filter((r) => r.kol_id === o.kol_id && r.snapshot_date >= m.data_start! && r.snapshot_date <= end)
            .reduce((sum, r) => sum + num(r.realized_pnl_usd), 0),
        }));
      }
      const activity = (recent.data as RecentRow[])
        .filter((r) => r.market_id === m.id)
        .slice(0, 20)
        .map((r) => ({ id: r.id, who: r.wallet_short, kolId: r.kol_id, amount: num(r.amount_micro) / 1e6, at: r.created_at }));
      return {
        slug: m.slug,
        title: m.title,
        question: m.question,
        category: "KOL",
        period: m.period,
        challenge: m.challenge_no ?? 0,
        startsAt: m.starts_at,
        endsAt: m.ends_at,
        closesAt: m.closes_at,
        volume: num(st?.volume_usd),
        pool: pot,
        traders: num(st?.traders),
        rules: m.rules ?? [],
        featured: m.featured,
        outcomes,
        activity,
        status: m.status,
        dataStart: m.data_start ?? undefined,
        dataEnd: m.data_end ?? undefined,
        winnerId: winner?.kol_id ?? null,
        proposedAt: m.proposed_at,
        resolvedAt: m.resolved_at,
        resolutionNote: m.resolution_note,
        scores: scores?.sort((a, b) => (b.pnl ?? -Infinity) - (a.pnl ?? -Infinity)),
        scoresFinal: final.length > 0,
      };
    });
  } catch (e) {
    console.error("[data] getMarkets → mock :", (e as Error).message);
    return MARKETS;
  }
}

/** Heure de la requête : les pages sont rendues à chaque visite (force-dynamic). */
export const requestTime = () => Date.now();

export async function getMarket(slug: string): Promise<Market | null> {
  const all = await getMarkets();
  const period = aliasPeriod(slug);
  return all.find((m) => m.slug === slug) ?? (period ? (currentChallenge(all, period, Date.now()) ?? null) : null);
}
