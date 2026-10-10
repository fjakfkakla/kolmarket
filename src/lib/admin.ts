import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type AdminAction, adminMessage, parseAdminAction } from "./admin-message";
import { SESSION_COOKIE, fail, isSolanaAddress, readSession, type Session, verifySignature } from "./auth";
import { requireAccount } from "./api";

/**
 * Accès admin : la session doit appartenir à un wallet listé dans ADMIN_WALLETS (Railway),
 * et chaque action qui change quelque chose est signée par ce wallet, avec un nonce à usage unique.
 */

export const adminWallets = () =>
  (process.env.ADMIN_WALLETS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isSolanaAddress);

export const isAdmin = (address: string | null | undefined) => Boolean(address) && adminWallets().includes(address!);

/** Pour la page /admin : la session courante, et si elle est admin. */
export async function adminSession(): Promise<{ session: Session | null; admin: boolean }> {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return { session, admin: isAdmin(session?.address) };
}

/** Garde des routes /api/admin : 404 pour qui n'est pas admin (rien à apprendre). */
export async function requireAdmin(req: NextRequest) {
  const auth = await requireAccount(req, { write: true });
  if (!auth.ok) return auth;
  if (!isAdmin(auth.session.address)) return { ok: false as const, response: fail(404, "Introuvable.") };
  return auth;
}

const SIGNATURE_WINDOW_MS = 10 * 60_000;

/**
 * Vérifie une action signée et l'inscrit au journal (le nonce unique empêche de rejouer une signature).
 * Renvoie l'action et l'identifiant de la ligne du journal, ou un message d'erreur.
 */
export async function verifySignedAction(
  db: SupabaseClient,
  wallet: string,
  body: unknown,
): Promise<{ action: AdminAction; logId: number } | { error: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const action = parseAdminAction(b.action);
  if (!action) return { error: "Action invalide." };
  if (typeof b.nonce !== "string" || !/^[0-9a-f]{32}$/.test(b.nonce)) return { error: "Nonce invalide." };
  if (typeof b.issuedAt !== "string" || Number.isNaN(Date.parse(b.issuedAt))) return { error: "Date invalide." };
  if (Math.abs(Date.now() - Date.parse(b.issuedAt)) > SIGNATURE_WINDOW_MS) {
    return { error: "Signature expirée : vérifie l'heure de ton appareil et recommence." };
  }
  let sig: Buffer;
  try {
    sig = Buffer.from(String(b.signature), "base64");
  } catch {
    return { error: "Signature invalide." };
  }
  const message = await adminMessage(action, b.nonce, b.issuedAt);
  if (sig.length !== 64 || !verifySignature(wallet, message, new Uint8Array(sig))) return { error: "Signature invalide." };

  const marketId = "marketId" in action ? action.marketId : null;
  if (marketId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(marketId)) return { error: "Défi inconnu." };
  const { data, error } = await db
    .from("admin_actions")
    .insert({ wallet, action: action.action, market_id: marketId, details: action, nonce: b.nonce, signature: sig.toString("base64") })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Signature déjà utilisée." };
    if (error.code === "23503") return { error: "Défi inconnu." };
    return { error: `Journal admin indisponible (${error.message}).` };
  }
  return { action, logId: data.id as number };
}

export async function logOutcome(db: SupabaseClient, logId: number, outcome: string) {
  const { error } = await db.from("admin_actions").update({ outcome }).eq("id", logId);
  if (error) console.error("[admin] journal :", error.message);
}
