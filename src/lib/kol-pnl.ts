import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readState, writeState } from "./app-state";
import { addDays, daysBetween, isoDay } from "./challenge-calendar";
import { TrackerError, walletPnlHistory } from "./solanatracker";

/**
 * Synchro du PnL des KOLs : PnL réalisé jour par jour (pnl_snapshots), puis stats 7 et 30 jours
 * (kol_stats). Une requête par KOL, toutes les 3 h : ~1 700 requêtes par mois pour 7 KOLs.
 */

const EVERY_MS = 3 * 3600_000;
const RETRY_AFTER_FAILURE_MS = 30 * 60_000;
const WINDOW_DAYS = 35; // couvre les stats 30 jours et le mois en cours
const round2 = (n: number) => Math.round(n * 100) / 100;

type SyncState = { at: string; ok: boolean };

export async function syncKolPnl(db: SupabaseClient, key: string, { force = false, now = new Date() } = {}) {
  const last = await readState<SyncState>(db, "pnl_sync");
  if (!force && last) {
    const age = now.getTime() - Date.parse(last.at);
    if (age < (last.ok ? EVERY_MS : RETRY_AFTER_FAILURE_MS)) return { skipped: "synchro récente", at: last.at };
  }

  const { data: kols, error } = await db.from("kols").select("id, wallet").eq("active", true);
  if (error) throw new Error(`kols : ${error.message}`);
  const end = isoDay(now);
  const start = addDays(end, -(WINDOW_DAYS - 1));
  const dates = daysBetween(start, end);
  const results: Record<string, string> = {};

  for (const k of kols ?? []) {
    try {
      const h = await walletPnlHistory(key, k.wallet, start, end);
      const byDate = new Map(h.days.map((d) => [d.date, d]));
      // Chaque jour de la fenêtre est écrit, à 0 s'il n'y a pas eu d'activité : les courbes restent justes.
      const rows = dates.map((date) => {
        const d = byDate.get(date);
        return {
          kol_id: k.id,
          snapshot_date: date,
          realized_pnl_usd: round2(d?.realized ?? 0),
          volume_usd: round2(d?.volume ?? 0),
          source: "solanatracker",
        };
      });
      const up = await db.from("pnl_snapshots").upsert(rows, { onConflict: "kol_id,snapshot_date" });
      if (up.error) throw new Error(`pnl_snapshots : ${up.error.message}`);
      // Les chiffres de démonstration du seed disparaissent dès qu'on a les vrais.
      const del = await db.from("pnl_snapshots").delete().eq("kol_id", k.id).eq("source", "seed");
      if (del.error) throw new Error(`pnl_snapshots : ${del.error.message}`);

      const stats = (["7D", "30D"] as const).map((period) => {
        const from = addDays(end, period === "7D" ? -6 : -29);
        const days = dates.filter((d) => d >= from).map((d) => byDate.get(d)).filter((d) => d !== undefined);
        const trading = days.filter((d) => d.trades > 0);
        return {
          kol_id: k.id,
          period,
          pnl_usd: round2(days.reduce((s, d) => s + (d.realized ?? 0), 0)),
          volume_usd: round2(days.reduce((s, d) => s + d.volume, 0)),
          trades: days.reduce((s, d) => s + d.trades, 0),
          // Part des jours de trading terminés en positif
          win_rate: trading.length ? round2((100 * trading.filter((d) => (d.realized ?? 0) > 0).length) / trading.length) : null,
          updated_at: now.toISOString(),
        };
      });
      const st = await db.from("kol_stats").upsert(stats, { onConflict: "kol_id,period" });
      if (st.error) throw new Error(`kol_stats : ${st.error.message}`);
      results[k.id] = "ok";
    } catch (e) {
      results[k.id] = (e as Error).message;
      // Limite atteinte ou clé refusée : on s'arrête, la prochaine synchro reprendra.
      if (e instanceof TrackerError && (e.temporary || e.unauthorized)) break;
    }
  }

  const ok = Object.values(results).some((r) => r === "ok");
  await writeState(db, "pnl_sync", { at: now.toISOString(), ok, results });
  return { ok, results };
}
