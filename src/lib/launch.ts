import { supabaseAdmin } from "./supabase";

/**
 * Lancement public, réglé par la variable d'environnement CHRONO (Railway).
 *
 * - CHRONO=GO    : le chrono part. L'heure de départ est enregistrée en base (app_state,
 *                  clé `launch_start`) au premier démarrage, donc un redéploiement (changer CA,
 *                  par exemple) ne le relance pas. L'accès ouvre 7 jours après le départ.
 * - CHRONO=RESET : retour à l'état de base : heure de départ effacée, tout fermé, chrono figé
 *                  sur 7 jours. Remettre GO le relance de zéro.
 * - absente      : état de base (ou LAUNCH_START=<date ISO> si elle est définie, ancien réglage).
 *
 * Tant que l'accès n'est pas ouvert, seule la landing (/) répond (voir proxy.ts).
 */

export const LAUNCH_MS = 7 * 24 * 3600_000;
const KEY = "launch_start";

export type Launch = {
  /** Départ du chrono (ms), `null` tant qu'il n'est pas lancé. */
  start: number | null;
  /** Ouverture de l'accès (ms), `null` tant que le chrono n'est pas lancé. */
  at: number | null;
  open: boolean;
};

/** Départ lu une fois par process : la variable ne change qu'avec un redéploiement. */
let startPromise: Promise<number | null> | null = null;

export async function getLaunch(now = Date.now()): Promise<Launch> {
  startPromise ??= resolveStart().catch((e) => {
    // Base injoignable : départ = démarrage du serveur, et on réessaie dans une minute
    console.error(`[chrono] ${e instanceof Error ? e.message : e}`);
    setTimeout(() => (startPromise = null), 60_000).unref?.();
    return processStart();
  });
  const start = await startPromise;
  if (start === null) return { start: null, at: null, open: false };
  const at = start + LAUNCH_MS;
  return { start, at, open: now >= at };
}

async function resolveStart(): Promise<number | null> {
  const mode = process.env.CHRONO?.trim().toUpperCase();
  const db = supabaseAdmin();

  if (mode === "RESET") {
    if (db) {
      const { error } = await db.from("app_state").delete().eq("key", KEY);
      if (error) throw new Error(`effacement du départ : ${error.message}`);
    }
    console.log("[chrono] CHRONO=RESET → chrono remis à l'état de base");
    return null;
  }

  if (mode === "GO") {
    if (!db) {
      console.warn("[chrono] CHRONO=GO sans Supabase : départ = démarrage du serveur (repart à chaque redéploiement)");
      return processStart();
    }
    // Premier GO : on écrit maintenant ; sinon on garde le départ déjà enregistré.
    const { error } = await db
      .from("app_state")
      .upsert({ key: KEY, value: new Date().toISOString() }, { onConflict: "key", ignoreDuplicates: true });
    if (error) throw new Error(`écriture du départ : ${error.message}`);
    const { data, error: readError } = await db.from("app_state").select("value").eq("key", KEY).maybeSingle();
    if (readError) throw new Error(`lecture du départ : ${readError.message}`);
    const start = Date.parse(String(data?.value ?? ""));
    if (Number.isNaN(start)) throw new Error("départ enregistré illisible");
    console.log(`[chrono] CHRONO=GO → lancé le ${new Date(start).toISOString()}`);
    return start;
  }

  const fixed = Date.parse(process.env.LAUNCH_START?.trim() ?? "");
  return Number.isNaN(fixed) ? null : fixed;
}

function processStart() {
  return Math.floor((Date.now() - process.uptime() * 1000) / 1000) * 1000;
}
