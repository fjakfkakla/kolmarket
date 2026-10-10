import "server-only";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, fail, readSession, siteUrl, type Session } from "./auth";
import { isAdmin } from "./admin";
import { getLaunch } from "./launch";
import { supabaseAdmin } from "./supabase";

type Ok = { ok: true; session: Session & { accountId: string }; db: SupabaseClient; site: URL | null };
type Ko = { ok: false; response: Response };

/**
 * Garde commune des routes d'argent : session valide, base configurée,
 * et pour les écritures (POST), requête venue du site lui-même.
 */
export async function requireAccount(req: NextRequest, opts: { write: boolean; beforeLaunch?: boolean }): Promise<Ok | Ko> {
  const site = siteUrl(req);
  if (opts.write && !site) return { ok: false, response: fail(403, "Origine refusée.") };
  const db = supabaseAdmin();
  if (!db) return { ok: false, response: fail(503, "Base de données non configurée.") };
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session?.accountId) return { ok: false, response: fail(401, "Connecte-toi d'abord.") };
  // Avant le lancement public, seuls les wallets admin peuvent miser ou préparer un dépôt
  // (un retrait, ou un dépôt déjà envoyé, passe toujours : l'argent ne reste jamais bloqué)
  if (opts.write && !opts.beforeLaunch && !isAdmin(session.address) && !(await getLaunch()).open) {
    return { ok: false, response: fail(403, "Marketcoins n'est pas encore ouvert.") };
  }
  return { ok: true, session: session as Ok["session"], db, site };
}
