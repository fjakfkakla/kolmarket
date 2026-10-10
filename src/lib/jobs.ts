import "server-only";
import { ensureChallenges, resolveChallenges, settleChallenges } from "./challenges";
import { checkSolvency, syncVault } from "./deposits";
import { syncKolPnl } from "./kol-pnl";
import { solanaConfig } from "./solana";
import { trackerKey } from "./solanatracker";
import { supabaseAdmin } from "./supabase";
import { processOpenWithdrawals } from "./withdrawals";

/**
 * Tâches planifiées, toutes les 10 minutes (planificateur intégré, ou /api/cron/sync).
 * Chaque étape est indépendante : si l'une échoue, les autres passent quand même.
 */
export async function runScheduledJobs() {
  const db = supabaseAdmin();
  if (!db) return { ok: false, error: "base non configurée" };
  const key = trackerKey();
  const out: Record<string, unknown> = {};
  let ok = true;
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      out[name] = await fn();
    } catch (e) {
      ok = false;
      console.error(`[tâches] ${name} :`, (e as Error).message);
      out[name] = { error: (e as Error).message };
    }
  };
  const noKey = async () => ({ skipped: "SOLANATRACKER_API_KEY manquante" });

  await step("defis", () => ensureChallenges(db));
  await step("pnl", () => (key ? syncKolPnl(db, key) : noKey()));
  await step("resultats", () => (key ? resolveChallenges(db, key) : noKey()));
  await step("paiements", () => settleChallenges(db));

  const cfg = await solanaConfig();
  if (cfg) {
    await step("depots", () => syncVault(cfg, db));
    await step("retraits", () => processOpenWithdrawals(cfg, db));
    await step("coffre", async () => {
      const s = await checkSolvency(cfg, db);
      if (!s.ok) ok = false;
      return s;
    });
  } else {
    out.depots = { skipped: "dépôts non configurés" };
  }
  return { ok, ...out };
}
