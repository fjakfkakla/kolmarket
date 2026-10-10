/**
 * Lancement public, réglé uniquement par la variable d'environnement LAUNCH_START (Railway).
 * Aucune page, aucune route, aucune base : rien à trouver ni à attaquer.
 *
 * - LAUNCH_START absente : tout est fermé, la landing affiche le chrono figé sur 7 jours.
 * - LAUNCH_START=2026-10-12T18:00:00Z : le chrono part à cette heure et l'accès ouvre 7 jours plus tard.
 *
 * Tant que l'accès n'est pas ouvert, seule la landing (/) répond (voir proxy.ts).
 */

export const LAUNCH_MS = 7 * 24 * 3600_000;

export type Launch = {
  /** Départ du chrono (ms), `null` tant qu'il n'est pas lancé. */
  start: number | null;
  /** Ouverture de l'accès (ms), `null` tant que le chrono n'est pas lancé. */
  at: number | null;
  open: boolean;
};

export function getLaunch(now = Date.now()): Launch {
  const start = Date.parse(process.env.LAUNCH_START?.trim() ?? "");
  if (Number.isNaN(start)) return { start: null, at: null, open: false };
  const at = start + LAUNCH_MS;
  return { start, at, open: now >= at };
}
