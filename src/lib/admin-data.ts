import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketStatus, Period } from "./challenge-calendar";
import type { RecheckState } from "./challenges";

/** Données de la page /admin : tous les défis (y compris annulés), tous les KOLs, le journal. */

export type AdminMarket = {
  id: string;
  slug: string;
  title: string;
  period: Period;
  status: MarketStatus;
  startsAt: string;
  closesAt: string;
  endsAt: string;
  dataStart: string | null;
  dataEnd: string | null;
  proposedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  resultSource: "auto" | "manual" | null;
  winnerId: string | null;
  pot: number;
  players: number;
  outcomes: { kolId: string; pool: number }[];
  results: { kolId: string; pnl: number | null }[];
  recheck: RecheckState | null;
};

export type AdminKol = {
  id: string;
  name: string;
  handle: string;
  wallet: string;
  color: string;
  avatar: string | null;
  active: boolean;
  pnl7d: number | null;
};

export type AdminLog = { id: number; at: string; wallet: string; action: string; target: string | null; outcome: string | null };

export type AdminData = { markets: AdminMarket[]; kols: AdminKol[]; log: AdminLog[]; trackerKey: boolean };

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export async function loadAdminData(db: SupabaseClient): Promise<AdminData> {
  const [markets, pools, stats, results, kols, kolStats, rechecks, log] = await Promise.all([
    db
      .from("markets")
      .select(
        "id,slug,title,period,status,starts_at,closes_at,ends_at,data_start,data_end,proposed_at,resolved_at,resolution_note," +
          "result_source,winning_outcome_id,outcomes!outcomes_market_id_fkey(id,kol_id,position)",
      )
      .order("starts_at", { ascending: false })
      .limit(60),
    db.from("outcome_pools").select("outcome_id,pool_micro"),
    db.from("market_stats").select("market_id,pool_usd,traders"),
    db.from("market_results").select("market_id,kol_id,realized_pnl_usd"),
    db.from("kols").select("id,name,handle,wallet,color,avatar_url,active").order("name"),
    db.from("kol_stats").select("kol_id,pnl_usd").eq("period", "7D"),
    db.from("app_state").select("key,value").like("key", "recheck:%"),
    db.from("admin_actions").select("id,at,wallet,action,details,outcome").order("at", { ascending: false }).limit(30),
  ]);
  const err = [markets, pools, stats, results, kols, kolStats, rechecks, log].find((r) => r.error)?.error;
  if (err) throw new Error(`admin : ${err.message}`);

  type Row = {
    id: string; slug: string; title: string; period: Period; status: MarketStatus; starts_at: string; closes_at: string; ends_at: string;
    data_start: string | null; data_end: string | null; proposed_at: string | null; resolved_at: string | null; resolution_note: string | null;
    result_source: "auto" | "manual" | null; winning_outcome_id: string | null; outcomes: { id: string; kol_id: string; position: number }[];
  };
  const poolOf = new Map((pools.data ?? []).map((p) => [p.outcome_id as string, num(p.pool_micro) / 1e6]));
  const statOf = new Map((stats.data ?? []).map((s) => [s.market_id as string, s]));
  const recheckOf = new Map((rechecks.data ?? []).map((r) => [(r.key as string).slice("recheck:".length), r.value as RecheckState]));
  const pnlOf = new Map((kolStats.data ?? []).map((s) => [s.kol_id as string, num(s.pnl_usd)]));

  return {
    markets: ((markets.data ?? []) as unknown as Row[]).map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      period: m.period,
      status: m.status,
      startsAt: m.starts_at,
      closesAt: m.closes_at,
      endsAt: m.ends_at,
      dataStart: m.data_start,
      dataEnd: m.data_end,
      proposedAt: m.proposed_at,
      resolvedAt: m.resolved_at,
      resolutionNote: m.resolution_note,
      resultSource: m.result_source,
      winnerId: m.outcomes.find((o) => o.id === m.winning_outcome_id)?.kol_id ?? null,
      pot: num(statOf.get(m.id)?.pool_usd),
      players: num(statOf.get(m.id)?.traders),
      outcomes: [...m.outcomes].sort((a, b) => a.position - b.position).map((o) => ({ kolId: o.kol_id, pool: poolOf.get(o.id) ?? 0 })),
      results: (results.data ?? [])
        .filter((r) => r.market_id === m.id)
        .map((r) => ({ kolId: r.kol_id as string, pnl: r.realized_pnl_usd === null ? null : num(r.realized_pnl_usd) }))
        .sort((a, b) => (b.pnl ?? -Infinity) - (a.pnl ?? -Infinity)),
      recheck: recheckOf.get(m.id) ?? null,
    })),
    kols: (kols.data ?? []).map((k) => ({
      id: k.id as string,
      name: k.name as string,
      handle: k.handle as string,
      wallet: k.wallet as string,
      color: k.color as string,
      avatar: (k.avatar_url as string | null) ?? null,
      active: Boolean(k.active),
      pnl7d: pnlOf.has(k.id as string) ? pnlOf.get(k.id as string)! : null,
    })),
    log: (log.data ?? []).map((l) => {
      const d = (l.details ?? {}) as Record<string, unknown>;
      const target = (d.slug ?? d.kolId ?? d.name ?? d.title ?? null) as string | null;
      return { id: l.id as number, at: l.at as string, wallet: l.wallet as string, action: l.action as string, target, outcome: l.outcome as string | null };
    }),
    trackerKey: Boolean(process.env.SOLANATRACKER_API_KEY?.trim()),
  };
}
