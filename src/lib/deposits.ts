import "server-only";
import type { Signature } from "@solana/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEPOSIT_CAP } from "./limits";
import { type SolanaConfig, isSignatureKnown, readVaultTransaction, recentVaultSignatures, vaultBalanceMicro } from "./solana";

/**
 * Détection et crédit des dépôts.
 * Trois déclencheurs appellent la même logique, sans risque de double crédit :
 * - le navigateur du joueur, qui suit son dépôt juste après l'envoi ;
 * - le webhook Alchemy, à chaque mouvement sur le coffre ;
 * - la tâche planifiée /api/cron/sync, filet de sécurité.
 */

export const MICRO = 1_000_000;
export const toMicro = (usd: number) => Math.round(usd * MICRO);
const CAP_MICRO = toMicro(DEPOSIT_CAP);
const DROP_AFTER_MS = 3 * 60_000; // un blockhash expire en ~1 min 30 : au-delà, la transaction ne passera plus

export type SignatureStatus = "PENDING" | "CREDITED" | "UNMATCHED" | "IGNORED" | "FAILED" | "DROPPED";

async function rpcText(db: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<SignatureStatus> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn} : ${error.message}`);
  return data as SignatureStatus;
}

/** Enregistre une signature à suivre (idempotent). */
export async function trackSignature(db: SupabaseClient, signature: string) {
  const { error } = await db.from("vault_signatures").upsert({ signature }, { onConflict: "signature", ignoreDuplicates: true });
  if (error) throw new Error(`vault_signatures : ${error.message}`);
}

/** Traite une signature : rien tant qu'elle n'est pas définitive, puis crédit, échec ou rejet. */
export async function processSignature(cfg: SolanaConfig, db: SupabaseClient, signature: string): Promise<SignatureStatus> {
  await trackSignature(db, signature);
  const { data: row, error } = await db.from("vault_signatures").select("status, first_seen_at").eq("signature", signature).single();
  if (error || !row) throw new Error(`vault_signatures : ${error?.message ?? "introuvable"}`);
  if (row.status !== "PENDING") return row.status as SignatureStatus;

  const tx = await readVaultTransaction(cfg, signature as Signature);
  if (tx.kind === "pending") {
    const old = Date.now() - Date.parse(row.first_seen_at) > DROP_AFTER_MS;
    if (old && !(await isSignatureKnown(cfg, signature as Signature))) {
      return rpcText(db, "mark_signature", { p_signature: signature, p_status: "DROPPED", p_slot: null, p_block_time: null });
    }
    return "PENDING";
  }
  const when = { p_slot: Number(tx.slot), p_block_time: tx.blockTime?.toISOString() ?? null };
  if (tx.kind === "deposit") {
    return rpcText(db, "credit_deposit", {
      p_signature: signature,
      p_sender: tx.sender,
      p_amount: Number(tx.amount),
      p_cap: CAP_MICRO,
      ...when,
    });
  }
  return rpcText(db, "mark_signature", { p_signature: signature, p_status: tx.kind === "failed" ? "FAILED" : "IGNORED", ...when });
}

/** Repère les nouvelles transactions du coffre puis traite tout ce qui est en attente. */
export async function syncVault(cfg: SolanaConfig, db: SupabaseClient) {
  let discovered = 0;
  let before: Signature | undefined;
  for (let page = 0; page < 3; page++) {
    const sigs = await recentVaultSignatures(cfg, before);
    if (sigs.length === 0) break;
    const list = sigs.map((s) => s.signature as string);
    const { data, error } = await db.from("vault_signatures").select("signature").in("signature", list);
    if (error) throw new Error(`vault_signatures : ${error.message}`);
    const known = new Set((data ?? []).map((r) => r.signature as string));
    const fresh = list.filter((s) => !known.has(s));
    if (fresh.length) {
      const { error: e } = await db
        .from("vault_signatures")
        .upsert(fresh.map((signature) => ({ signature })), { onConflict: "signature", ignoreDuplicates: true });
      if (e) throw new Error(`vault_signatures : ${e.message}`);
    }
    discovered += fresh.length;
    // On s'arrête dès qu'on retombe sur l'historique déjà connu.
    if (fresh.length < list.length || sigs.length < 100) break;
    before = sigs[sigs.length - 1].signature;
  }

  return { discovered, ...(await processPending(cfg, db)) };
}

/** Traite les signatures en attente, les plus anciennes d'abord. */
export async function processPending(cfg: SolanaConfig, db: SupabaseClient) {
  const { data: pending, error } = await db
    .from("vault_signatures")
    .select("signature")
    .eq("status", "PENDING")
    .order("first_seen_at")
    .limit(25);
  if (error) throw new Error(`vault_signatures : ${error.message}`);
  const results: Partial<Record<SignatureStatus, number>> = {};
  let interrupted = false;
  for (const { signature } of pending ?? []) {
    try {
      const status = await processSignature(cfg, db, signature as string);
      results[status] = (results[status] ?? 0) + 1;
    } catch (e) {
      // Limite de requêtes ou panne réseau : on s'arrête là, le reste repassera à la prochaine synchro.
      console.error("[dépôts] traitement interrompu :", (e as Error).message);
      interrupted = true;
      break;
    }
  }
  return { results, interrupted };
}

/** Contrôle : le coffre doit détenir au moins ce que la plateforme doit aux joueurs. */
export async function checkSolvency(cfg: SolanaConfig, db: SupabaseClient) {
  const vault = Number(await vaultBalanceMicro(cfg));
  const { data, error } = await db.rpc("liabilities_micro");
  if (error) throw new Error(`liabilities_micro : ${error.message}`);
  const liabilities = Number(data);
  const ok = vault >= liabilities;
  await db.from("solvency_checks").insert({ vault_micro: vault, liabilities_micro: liabilities, ok });
  if (!ok) console.error(`[coffre] ALERTE : coffre ${vault / MICRO} USDC < engagements ${liabilities / MICRO} USDC`);
  return { vault: vault / MICRO, liabilities: liabilities / MICRO, ok };
}
