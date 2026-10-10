import "server-only";
import { createHash } from "node:crypto";
import {
  type Address,
  type KeyPairSigner,
  type Signature,
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  isSolanaError,
  partiallySignTransactionMessageWithSigners,
  pipe,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import { CLUSTER } from "./cluster";

/**
 * Accès à Solana côté serveur, via Alchemy (variable ALCHEMY_API).
 *
 * - Coffre : adresse publique VAULT_ADDRESS. Les dépôts arrivent sur son compte USDC.
 *   Sa clé n'est jamais sur le serveur pour les dépôts.
 * - Wallet chaud : FEE_PAYER_SECRET_KEY. Il paie le réseau pour les joueurs (0 frais) et envoie
 *   les retraits depuis une petite réserve d'USDC, rechargée à la main depuis le coffre.
 *   Si sa clé fuit, la perte se limite à cette réserve et à quelques SOL.
 */

const USDC_MINTS = {
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC de test de Circle
} as const;
export const USDC_DECIMALS = 6;

type Rpc = ReturnType<typeof createSolanaRpc>;

export type SolanaConfig = {
  rpc: Rpc;
  mint: Address;
  vault: Address;
  vaultAta: Address;
  feePayer: KeyPairSigner;
  /** Compte USDC du wallet chaud (réserve des retraits). */
  hotAta: Address;
};

function rpcUrl(): string | null {
  // SOLANA_RPC_URL ne sert qu'aux tests locaux ; en production on passe par Alchemy.
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  const key = process.env.ALCHEMY_API;
  return key ? `https://solana-${CLUSTER}.g.alchemy.com/v2/${key}` : null;
}

function mintAddress(): Address {
  // Un autre token « USDC » n'est accepté que sur devnet (tests). Sur mainnet, seul le vrai USDC compte.
  if (CLUSTER === "devnet" && process.env.USDC_MINT) return address(process.env.USDC_MINT);
  return address(USDC_MINTS[CLUSTER]);
}

function secretBytes(raw: string): Uint8Array {
  const s = raw.trim();
  // Format Phantom (base58) ou solana-keygen (tableau JSON de 64 octets).
  const bytes = s.startsWith("[") ? Uint8Array.from(JSON.parse(s) as number[]) : new Uint8Array(getBase58Encoder().encode(s));
  if (bytes.length !== 64) throw new Error("FEE_PAYER_SECRET_KEY doit contenir 64 octets");
  return bytes;
}

let config: Promise<SolanaConfig | null> | null = null;

/** Configuration Solana, ou null si les dépôts ne sont pas encore configurés. */
export function solanaConfig(): Promise<SolanaConfig | null> {
  config ??= (async () => {
    const url = rpcUrl();
    const vaultRaw = process.env.VAULT_ADDRESS;
    const secret = process.env.FEE_PAYER_SECRET_KEY;
    if (!url || !vaultRaw || !secret) return null;
    const mint = mintAddress();
    const vault = address(vaultRaw);
    const [vaultAta] = await findAssociatedTokenPda({ owner: vault, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    const feePayer = await createKeyPairSignerFromBytes(secretBytes(secret));
    if (feePayer.address === vault) throw new Error("Le payeur des frais doit être un autre wallet que le coffre");
    const [hotAta] = await findAssociatedTokenPda({ owner: feePayer.address, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    return { rpc: createSolanaRpc(url), mint, vault, vaultAta, feePayer, hotAta };
  })().catch((e) => {
    config = null;
    console.error("[solana] configuration invalide :", (e as Error).message);
    return null;
  });
  return config;
}

/** Empreinte des octets d'un message de transaction. */
export const sha256 = (bytes: { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }) =>
  createHash("sha256").update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)).digest("hex");

export class DepositError extends Error {}

let vaultAtaReady = false;

/**
 * Prépare la transaction de dépôt : USDC du wallet du joueur → compte USDC du coffre.
 * La plateforme est payeuse des frais et signe en premier ; le joueur signe ensuite dans son wallet.
 * Toute modification de la transaction par la suite invaliderait notre signature.
 */
export async function buildDepositTransaction(cfg: SolanaConfig, owner: Address, amountMicro: bigint) {
  const [source] = await findAssociatedTokenPda({ owner, mint: cfg.mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });

  const held = await cfg.rpc
    .getTokenAccountBalance(source, { commitment: "confirmed" })
    .send()
    .then((r) => BigInt(r.value.amount))
    .catch(() => 0n);
  if (held < amountMicro) {
    throw new DepositError(`Ton wallet n'a que ${Number(held) / 10 ** USDC_DECIMALS} USDC sur ${CLUSTER === "devnet" ? "devnet" : "Solana"}.`);
  }

  // Le compte USDC du coffre est créé une fois, au premier dépôt, aux frais de la plateforme.
  if (!vaultAtaReady) {
    const info = await cfg.rpc.getAccountInfo(cfg.vaultAta, { commitment: "confirmed", encoding: "base64" }).send();
    vaultAtaReady = info.value !== null;
  }

  const { value: blockhash } = await cfg.rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const instructions = [
    ...(vaultAtaReady
      ? []
      : [getCreateAssociatedTokenIdempotentInstruction({ payer: cfg.feePayer, ata: cfg.vaultAta, owner: cfg.vault, mint: cfg.mint })]),
    getTransferCheckedInstruction({
      source,
      mint: cfg.mint,
      destination: cfg.vaultAta,
      authority: createNoopSigner(owner),
      amount: amountMicro,
      decimals: USDC_DECIMALS,
    }),
  ];
  const message = pipe(
    createTransactionMessage({ version: "legacy" }) /* accepté par tous les wallets */,
    (m) => setTransactionMessageFeePayerSigner(cfg.feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const tx = await partiallySignTransactionMessageWithSigners(message);
  return { wire: getBase64EncodedWireTransaction(tx) as string, messageHash: sha256(tx.messageBytes) };
}

/** Envoie la transaction signée par le joueur, après avoir vérifié que c'est exactement celle préparée. */
export async function sendSignedDeposit(cfg: SolanaConfig, wireBase64: string, messageHash: string, owner: Address): Promise<Signature> {
  let tx;
  try {
    tx = getTransactionDecoder().decode(getBase64Encoder().encode(wireBase64));
  } catch {
    throw new DepositError("Transaction illisible.");
  }
  if (sha256(tx.messageBytes) !== messageHash) throw new DepositError("Ton wallet a modifié la transaction. Réessaie.");
  if (!tx.signatures[owner] || !tx.signatures[cfg.feePayer.address]) throw new DepositError("Signature manquante.");
  try {
    return await cfg.rpc
      .sendTransaction(getBase64EncodedWireTransaction(tx), { encoding: "base64", preflightCommitment: "confirmed" })
      .send();
  } catch (e) {
    console.error("[solana] envoi du dépôt :", (e as Error).message);
    throw new DepositError("Le réseau a refusé la transaction. Vérifie ton solde USDC et réessaie.");
  }
}

export type VaultTx =
  | { kind: "pending" }
  | { kind: "failed" | "ignored"; slot: bigint; blockTime: Date | null }
  | { kind: "deposit"; sender: string | null; amount: bigint; slot: bigint; blockTime: Date | null };

/**
 * Lit une transaction du coffre une fois définitive (« finalized ») et en déduit le dépôt :
 * montant = ce que le compte USDC du coffre a gagné ; expéditeur = le seul wallet dont l'USDC a baissé.
 * On ne se fie qu'à la chaîne, jamais à ce que dit le navigateur ou le webhook.
 */
export async function readVaultTransaction(cfg: SolanaConfig, signature: Signature): Promise<VaultTx> {
  const tx = await cfg.rpc
    .getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0, encoding: "json" })
    .send();
  if (!tx || !tx.meta) return { kind: "pending" };
  const slot = BigInt(tx.slot);
  const blockTime = tx.blockTime ? new Date(Number(tx.blockTime) * 1000) : null;
  if (tx.meta.err) return { kind: "failed", slot, blockTime };

  const deltas = new Map<string, bigint>(); // propriétaire → variation d'USDC
  const add = (owner: string | undefined, mint: string, amount: string, sign: 1n | -1n) => {
    if (!owner || mint !== cfg.mint) return;
    deltas.set(owner, (deltas.get(owner) ?? 0n) + sign * BigInt(amount));
  };
  for (const b of tx.meta.preTokenBalances ?? []) add(b.owner, b.mint, b.uiTokenAmount.amount, -1n);
  for (const b of tx.meta.postTokenBalances ?? []) add(b.owner, b.mint, b.uiTokenAmount.amount, 1n);

  const received = deltas.get(cfg.vault) ?? 0n;
  if (received <= 0n) return { kind: "ignored", slot, blockTime };
  const senders = [...deltas].filter(([owner, d]) => owner !== cfg.vault && d < 0n).map(([owner]) => owner);
  return { kind: "deposit", sender: senders.length === 1 ? senders[0] : null, amount: received, slot, blockTime };
}

/** Une transaction envoyée qui n'existe nulle part après expiration de son blockhash ne passera plus. */
export async function isSignatureKnown(cfg: SolanaConfig, signature: Signature): Promise<boolean> {
  const { value } = await cfg.rpc.getSignatureStatuses([signature], { searchTransactionHistory: true }).send();
  return value[0] !== null;
}

/** Dernières signatures sur le compte USDC du coffre (les plus récentes d'abord). */
export async function recentVaultSignatures(cfg: SolanaConfig, before?: Signature) {
  return cfg.rpc.getSignaturesForAddress(cfg.vaultAta, { limit: 100, commitment: "confirmed", ...(before ? { before } : {}) }).send();
}

async function usdcBalance(cfg: SolanaConfig, ata: Address, commitment: "confirmed" | "finalized"): Promise<bigint> {
  const r = await cfg.rpc
    .getTokenAccountBalance(ata, { commitment })
    .send()
    .catch(() => null);
  return r ? BigInt(r.value.amount) : 0n;
}

/** USDC détenus par le coffre (définitif). */
export const vaultBalanceMicro = (cfg: SolanaConfig) => usdcBalance(cfg, cfg.vaultAta, "finalized");

/** USDC de la réserve des retraits (wallet chaud). */
export const hotBalanceMicro = (cfg: SolanaConfig, commitment: "confirmed" | "finalized" = "confirmed") =>
  usdcBalance(cfg, cfg.hotAta, commitment);

/**
 * Transaction de retrait : réserve du wallet chaud → compte USDC du joueur (créé au besoin, à nos frais).
 * Entièrement signée par le wallet chaud. Sa signature identifie la transaction : on l'enregistre
 * avant l'envoi pour toujours savoir si l'argent est parti.
 */
export async function buildWithdrawalTransaction(cfg: SolanaConfig, destination: Address, amountMicro: bigint) {
  const [destinationAta] = await findAssociatedTokenPda({ owner: destination, mint: cfg.mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const exists = (await cfg.rpc.getAccountInfo(destinationAta, { commitment: "confirmed", encoding: "base64" }).send()).value !== null;
  const { value: blockhash } = await cfg.rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const instructions = [
    ...(exists
      ? []
      : [getCreateAssociatedTokenIdempotentInstruction({ payer: cfg.feePayer, ata: destinationAta, owner: destination, mint: cfg.mint })]),
    getTransferCheckedInstruction({
      source: cfg.hotAta,
      mint: cfg.mint,
      destination: destinationAta,
      authority: cfg.feePayer,
      amount: amountMicro,
      decimals: USDC_DECIMALS,
    }),
  ];
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayerSigner(cfg.feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const tx = await signTransactionMessageWithSigners(message);
  return {
    wire: getBase64EncodedWireTransaction(tx),
    signature: getSignatureFromTransaction(tx) as string,
    lastValidBlockHeight: Number(blockhash.lastValidBlockHeight),
  };
}

/** Refus avant diffusion (simulation) : la transaction n'est jamais partie, on peut la refaire sans risque. */
export class NotBroadcastError extends Error {}

export async function sendWireTransaction(cfg: SolanaConfig, wire: ReturnType<typeof getBase64EncodedWireTransaction>) {
  try {
    await cfg.rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" }).send();
  } catch (e) {
    if (isSolanaError(e, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE)) {
      throw new NotBroadcastError((e as Error).message);
    }
    // Autre erreur (réseau, délai) : elle a peut-être été diffusée. On ne refait rien avant expiration.
    throw e;
  }
}

/** État d'une transaction : définitive, en cours, échouée, ou inconnue du réseau. */
export async function signatureState(cfg: SolanaConfig, signature: string): Promise<"finalized" | "pending" | "failed" | "unknown"> {
  const { value } = await cfg.rpc.getSignatureStatuses([signature as Signature], { searchTransactionHistory: true }).send();
  const st = value[0];
  if (st) {
    if (st.err) return "failed";
    return st.confirmationStatus === "finalized" ? "finalized" : "pending";
  }
  // Deuxième avis avant de conclure « inconnue » (un nœud en retard pourrait l'ignorer à tort) :
  // une transaction jugée inconnue peut être refaite, il ne faut donc jamais se tromper dans ce sens.
  const tx = await cfg.rpc
    .getTransaction(signature as Signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0, encoding: "json" })
    .send();
  if (!tx) return "unknown";
  return tx.meta?.err ? "failed" : "pending";
}

export async function currentBlockHeight(cfg: SolanaConfig): Promise<number> {
  return Number(await cfg.rpc.getBlockHeight({ commitment: "confirmed" }).send());
}
