import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readState, writeState } from "./app-state";
import { isAdmin } from "./admin";
import { readSession } from "./auth";
import { supabaseAdmin } from "./supabase";

/**
 * Lancement public. Tant que l'heure d'ouverture n'est pas passée, l'app est fermée :
 * seuls les wallets admin y entrent, les autres voient le chrono.
 * L'heure est posée depuis /admin (action signée « start_launch ») dans app_state.
 * Sans Supabase (mode démo, données mock), rien n'est verrouillé.
 */

export const LAUNCH_MS = 7 * 24 * 3600_000;
const KEY = "launch";

export type Launch = {
  /** Heure d'ouverture (ms), `null` tant que le chrono n'est pas lancé. */
  at: number | null;
  open: boolean;
};

export async function setLaunchAt(db: SupabaseClient, at: string | null) {
  await writeState(db, KEY, { at });
}

export async function getLaunch(now = Date.now()): Promise<Launch> {
  const db = supabaseAdmin();
  if (!db) return { at: null, open: true };
  try {
    const v = await readState<{ at: string | null }>(db, KEY);
    const at = v?.at ? Date.parse(v.at) : NaN;
    if (Number.isNaN(at)) return { at: null, open: false };
    return { at, open: now >= at };
  } catch (e) {
    // Base illisible : on reste fermé
    console.error("[launch]", (e as Error).message);
    return { at: null, open: false };
  }
}

/** L'app est-elle accessible à ce visiteur ? Ouverte à tous, ou session d'un wallet admin. */
export async function canEnterApp(sessionToken: string | undefined): Promise<boolean> {
  if ((await getLaunch()).open) return true;
  return isAdmin((await readSession(sessionToken))?.address);
}
