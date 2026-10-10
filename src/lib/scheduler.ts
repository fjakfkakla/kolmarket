import "server-only";
import { runScheduledJobs } from "./jobs";

/**
 * Planificateur intégré au serveur : lance les tâches toutes les 10 minutes, sans service en plus.
 * Démarré par src/instrumentation.ts sur un serveur qui tourne en continu (Railway).
 */

const EVERY_MS = 10 * 60_000;
const FIRST_RUN_MS = 30_000;

type Global = typeof globalThis & { __marketcoinsScheduler?: boolean };

export function startScheduler() {
  const g = globalThis as Global;
  if (g.__marketcoinsScheduler) return;
  g.__marketcoinsScheduler = true;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await runScheduledJobs();
      console.log(`[tâches] ${r.ok ? "ok" : "à vérifier"} :`, JSON.stringify(r));
    } catch (e) {
      console.error("[tâches] échec :", (e as Error).message);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, FIRST_RUN_MS);
  setInterval(tick, EVERY_MS);
  console.log("[tâches] planificateur démarré : toutes les 10 minutes");
}
