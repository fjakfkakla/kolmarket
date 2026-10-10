/**
 * Démarrage du serveur : lance le planificateur des tâches (défis, PnL, paiements, dépôts, retraits).
 * Actif d'office sur Railway ; ailleurs avec SCHEDULER=on. SCHEDULER=off le coupe.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const mode = process.env.SCHEDULER?.trim().toLowerCase() ?? (process.env.RAILWAY_ENVIRONMENT_ID ? "on" : "off");
  if (mode !== "on") return;
  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
