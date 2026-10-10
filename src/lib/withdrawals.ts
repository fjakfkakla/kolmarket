import "server-only";
import { address } from "@solana/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MIN_WITHDRAWAL, PLATFORM_DAILY_WITHDRAWALS, WITHDRAWAL_REVIEW_ABOVE } from "./limits";
import { MICRO, checkSolvency, toMicro } from "./deposits";
import {
  type SolanaConfig,
  NotBroadcastError,
  buildWithdrawalTransaction,
  currentBlockHeight,
  hotBalanceMicro,
  sendWireTransaction,
  signatureState,
} from "./solana";

/**
 * Retraits : USDC du wallet chaud → wallet du compte, et seulement celui-là.
 *
 * Règle d'or contre le double paiement : une transaction n'est refaite que si la précédente
 * a été refusée avant diffusion, a échoué on-chain, ou a expiré sans jamais arriver.
 * La signature est enregistrée avant chaque envoi (SENDING), puis on rapproche avec la chaîne.
 */

export type WithdrawalStatus = "REVIEW" | "QUEUED" | "SENDING" | "CONFIRMED" | "REFUNDED";

/** ~150 blocs ≈ 1 minute après l'expiration officielle, avant de considérer une transaction comme perdue. */
const EXPIRY_MARGIN_BLOCKS = 150;

const ERRORS: Record<string, string> = {
  COMPTE_BLOQUE: "Ton compte est en cours de vérification.",
  RETRAIT_TROP_PETIT: `Retrait minimum : ${MIN_WITHDRAWAL} $.`,
  SOLDE_INSUFFISANT: "Solde insuffisant.",
};

/** Débite le compte et crée le retrait. Renvoie l'identifiant, ou un message d'erreur. */
export async function requestWithdrawal(db: SupabaseClient, accountId: string, amount: number) {
  const { data, error } = await db
    .rpc("request_withdrawal", {
      p_account: accountId,
      p_amount: toMicro(amount),
      p_min: toMicro(MIN_WITHDRAWAL),
      p_review_above: toMicro(WITHDRAWAL_REVIEW_ABOVE),
      p_platform_daily: toMicro(PLATFORM_DAILY_WITHDRAWALS),
    })
    .single<{ id: string; status: WithdrawalStatus }>();
  if (error) {
    const known = ERRORS[error.message];
    if (!known) console.error("[retraits] demande :", error.message);
    return { error: known ?? "Retrait impossible pour le moment." };
  }
  return { id: data.id, status: data.status };
}

type Row = {
  id: string;
  destination: string;
  amount_micro: number;
  status: WithdrawalStatus;
  signature: string | null;
  last_valid_block_height: number | null;
};

async function rpcBool(db: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn} : ${error.message}`);
  return data === true;
}

const note = (db: SupabaseClient, id: string, message: string) =>
  db.from("withdrawals").update({ last_error: message }).eq("id", id).eq("status", "QUEUED");

/** Fait avancer un retrait d'un cran : rapproche ce qui est parti, envoie ce qui attend. */
export async function processWithdrawal(cfg: SolanaConfig, db: SupabaseClient, id: string): Promise<WithdrawalStatus> {
  const { data, error } = await db
    .from("withdrawals")
    .select("id, destination, amount_micro, status, signature, last_valid_block_height")
    .eq("id", id)
    .single<Row>();
  if (error || !data) throw new Error(`withdrawals : ${error?.message ?? "introuvable"}`);
  const w = data;

  if (w.status === "SENDING" && w.signature) {
    const state = await signatureState(cfg, w.signature);
    if (state === "finalized") {
      await rpcBool(db, "confirm_withdrawal", { p_id: id, p_signature: w.signature });
      return "CONFIRMED";
    }
    if (state === "pending") return "SENDING";
    // Inconnue mais blockhash pas encore expiré (+ ~1 min de marge pour les nœuds en retard) : elle peut encore arriver.
    if (state === "unknown" && (await currentBlockHeight(cfg)) <= Number(w.last_valid_block_height) + EXPIRY_MARGIN_BLOCKS) return "SENDING";
    // Échouée on-chain, ou expirée sans jamais arriver : aucun USDC n'est parti, on peut refaire.
    const reason = state === "failed" ? "transaction échouée on-chain" : "transaction expirée sans arriver";
    if (!(await rpcBool(db, "requeue_withdrawal", { p_id: id, p_signature: w.signature, p_error: reason }))) return "SENDING";
    w.status = "QUEUED";
    w.signature = null;
  }
  if (w.status !== "QUEUED") return w.status;

  // Jamais d'envoi si les fonds de la plateforme ne couvrent pas ce qu'elle doit.
  const solvency = await checkSolvency(cfg, db);
  if (!solvency.ok) {
    await note(db, id, "contrôle du coffre en échec : retraits suspendus");
    return "QUEUED";
  }
  if ((await hotBalanceMicro(cfg)) < BigInt(w.amount_micro)) {
    console.error(`[retraits] réserve insuffisante pour ${w.amount_micro / MICRO} USDC : recharger le wallet chaud ${cfg.feePayer.address}`);
    await note(db, id, "réserve des retraits à recharger");
    return "QUEUED";
  }

  const tx = await buildWithdrawalTransaction(cfg, address(w.destination), BigInt(w.amount_micro));
  const reserved = await rpcBool(db, "mark_withdrawal_sending", {
    p_id: id,
    p_prev_signature: null,
    p_signature: tx.signature,
    p_last_valid_block_height: tx.lastValidBlockHeight,
  });
  if (!reserved) return "SENDING"; // un autre traitement l'a pris

  try {
    await sendWireTransaction(cfg, tx.wire);
  } catch (e) {
    if (e instanceof NotBroadcastError) {
      console.error("[retraits] refusé avant envoi :", e.message);
      await rpcBool(db, "requeue_withdrawal", { p_id: id, p_signature: tx.signature, p_error: "refusé par le réseau avant envoi" });
      return "QUEUED";
    }
    console.error("[retraits] envoi incertain, rapprochement plus tard :", (e as Error).message);
  }
  return "SENDING";
}

/** Fait avancer tous les retraits en attente (tâche planifiée). */
export async function processOpenWithdrawals(cfg: SolanaConfig, db: SupabaseClient) {
  const { data, error } = await db
    .from("withdrawals")
    .select("id")
    .in("status", ["QUEUED", "SENDING"])
    .order("created_at")
    .limit(20);
  if (error) throw new Error(`withdrawals : ${error.message}`);
  const results: Partial<Record<WithdrawalStatus, number>> = {};
  for (const { id } of data ?? []) {
    try {
      const st = await processWithdrawal(cfg, db, id as string);
      results[st] = (results[st] ?? 0) + 1;
    } catch (e) {
      console.error("[retraits] traitement interrompu :", (e as Error).message);
      break;
    }
  }
  return results;
}
