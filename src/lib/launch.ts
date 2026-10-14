/**
 * Lancement public : le chrono est lancé, l'heure de départ est écrite en dur ici.
 * L'accès ouvre 7 jours après LAUNCH_START. Pour le décaler, changer la date et pousser sur main.
 *
 * Tant que l'accès n'est pas ouvert, seule la landing (/) répond (voir proxy.ts).
 */

export const LAUNCH_MS = 7 * 24 * 3600_000;
export const LAUNCH_START = Date.parse("2026-10-14T19:00:26Z");

export type Launch = {
  /** Départ du chrono (ms). */
  start: number | null;
  /** Ouverture de l'accès (ms). */
  at: number | null;
  open: boolean;
};

export function getLaunch(now = Date.now()): Launch {
  const at = LAUNCH_START + LAUNCH_MS;
  return { start: LAUNCH_START, at, open: now >= at };
}
