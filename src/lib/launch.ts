import "server-only";
import type { Market } from "@/data/markets";

/**
 * Date de lancement réglable depuis Railway (variable `LAUNCH_AT`).
 * Si elle est définie, elle remplace le début du défi et la fermeture des
 * mises de chaque marché (c'est la cible du chrono), et la fin est décalée
 * d'autant pour garder la même durée. Lue à chaque requête.
 */
function launchAt(): number | null {
  const raw = process.env.LAUNCH_AT?.trim();
  if (!raw) return null;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) {
    console.error(`[launch] LAUNCH_AT invalide, ignorée : "${raw}"`);
    return null;
  }
  return t;
}

export function applyLaunch(markets: Market[]): Market[] {
  const t = launchAt();
  if (t === null) return markets;
  return markets.map((m) => {
    const duration = new Date(m.endsAt).getTime() - new Date(m.startsAt).getTime();
    const start = new Date(t).toISOString();
    return { ...m, startsAt: start, closesAt: start, endsAt: new Date(t + duration).toISOString() };
  });
}
