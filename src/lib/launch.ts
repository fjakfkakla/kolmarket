import "server-only";
import type { Market } from "@/data/markets";

const DAY = 86_400_000;
const durationMs = (m: Market) => (m.period === "30D" ? 30 : 7) * DAY;

/**
 * Chrono piloté depuis Railway par la variable `CHRONO` :
 * - `NO`    → chrono figé sur la durée du défi (7 j ou 30 j), il ne défile pas ;
 * - `NOW`   → le défi démarre au démarrage du serveur (Railway redéploie dès
 *             qu'on change la variable) et le chrono défile jusqu'à la fin ;
 * - une date ISO (ex. `2026-10-20T20:00:00+02:00`) → le défi démarre à cette date ;
 * - absente → dates de la base (ou du mock), comme avant.
 */
export function applyLaunch(markets: Market[]): Market[] {
  const raw = process.env.CHRONO?.trim();
  if (!raw) return markets;

  if (raw.toUpperCase() === "NO") {
    return markets.map((m) => ({ ...m, chronoFrozenMs: durationMs(m) }));
  }

  let start: number;
  if (raw.toUpperCase() === "NOW") {
    // Heure de démarrage du process : identique pour toutes les pages.
    start = Math.floor((Date.now() - process.uptime() * 1000) / 1000) * 1000;
    logOnce(`[chrono] CHRONO=NOW → lancé le ${new Date(start).toISOString()}`);
  } else {
    start = new Date(raw).getTime();
    if (Number.isNaN(start)) {
      logOnce(`[chrono] CHRONO invalide, ignorée : "${raw}"`);
      return markets;
    }
  }

  return markets.map((m) => {
    const end = new Date(start + durationMs(m)).toISOString();
    return { ...m, startsAt: new Date(start).toISOString(), endsAt: end, closesAt: end };
  });
}

let logged = "";
function logOnce(msg: string) {
  if (logged === msg) return;
  logged = msg;
  console.log(msg);
}
