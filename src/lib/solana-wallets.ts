"use client";

import { useSyncExternalStore } from "react";
import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import { StandardConnect, type StandardConnectFeature } from "@wallet-standard/features";
import {
  SolanaSignMessage,
  SolanaSignTransaction,
  type SolanaSignMessageFeature,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import { WALLET_CHAIN } from "./cluster";

/**
 * Détection des wallets via le Wallet Standard : Phantom, Solflare, Backpack, Coinbase Wallet,
 * OKX, Trust… Tout wallet Solana compatible apparaît tout seul, sans code spécifique.
 */

const isSolanaWallet = (w: Wallet) =>
  w.chains.some((c) => c.startsWith("solana:")) && StandardConnect in w.features && SolanaSignMessage in w.features;

let source: readonly Wallet[] | null = null;
let filtered: readonly Wallet[] = [];
const NONE: readonly Wallet[] = [];

function snapshot() {
  const all = getWallets().get();
  if (all !== source) {
    source = all;
    filtered = all.filter(isSolanaWallet);
  }
  return filtered;
}

function subscribe(cb: () => void) {
  const { on } = getWallets();
  const offs = [on("register", cb), on("unregister", cb)];
  return () => offs.forEach((off) => off());
}

export function useSolanaWallets(): readonly Wallet[] {
  return useSyncExternalStore(subscribe, snapshot, () => NONE);
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Connexion impossible.");
  return data as T;
}

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const rejected = (e: unknown) => /reject|denied|cancel|declin|closed/i.test((e as Error)?.message ?? "");

/** Connecte le wallet, fait signer le message de connexion et ouvre la session côté serveur. */
export async function signInWithWallet(wallet: Wallet): Promise<{ address: string; walletApp: string }> {
  let signature: Uint8Array;
  try {
    const { accounts } = await (wallet.features as StandardConnectFeature)[StandardConnect].connect();
    const account = accounts.find((a) => a.chains.some((c) => c.startsWith("solana:"))) ?? accounts[0];
    if (!account) throw new Error("Aucun compte autorisé dans le wallet.");

    const { message } = await post<{ message: string }>("/api/auth/nonce", { address: account.address });
    const [signed] = await (wallet.features as SolanaSignMessageFeature)[SolanaSignMessage].signMessage({
      account,
      message: new TextEncoder().encode(message),
    });
    signature = signed.signature;
  } catch (e) {
    if (rejected(e)) throw new Error("Demande refusée dans le wallet.");
    throw e instanceof Error ? e : new Error("Connexion impossible.");
  }
  return post("/api/auth/verify", { signature: toBase64(signature), walletApp: wallet.name });
}

const findWallet = (walletName: string | null) =>
  getWallets()
    .get()
    .filter(isSolanaWallet)
    .find((w) => w.name === walletName);

async function sessionAccount(wallet: Wallet, address: string) {
  const { accounts } = await (wallet.features as StandardConnectFeature)[StandardConnect].connect();
  const account = accounts.find((a) => a.address === address);
  if (!account) throw new Error(`Sélectionne le compte ${address.slice(0, 4)}…${address.slice(-4)} dans ${wallet.name}.`);
  return account;
}

/** Fait signer un message texte (actions admin) par le wallet de la session. Renvoie la signature en base64. */
export async function signMessageWith(walletName: string | null, address: string, text: string): Promise<string> {
  const wallet = findWallet(walletName);
  if (!wallet) throw new Error(`Ouvre ${walletName ?? "ton wallet"} pour signer.`);
  try {
    const account = await sessionAccount(wallet, address);
    const [signed] = await (wallet.features as SolanaSignMessageFeature)[SolanaSignMessage].signMessage({
      account,
      message: new TextEncoder().encode(text),
    });
    return toBase64(signed.signature);
  } catch (e) {
    if (rejected(e)) throw new Error("Signature refusée dans le wallet.");
    throw e instanceof Error ? e : new Error("Signature impossible.");
  }
}

/**
 * Fait signer une transaction préparée par le serveur, avec le wallet utilisé à la connexion.
 * Le wallet doit être sur le même compte que la session, sinon on refuse.
 */
export async function signTransactionWith(walletName: string | null, address: string, transactionB64: string): Promise<string> {
  const wallet = findWallet(walletName);
  if (!wallet) throw new Error(`Ouvre ${walletName ?? "ton wallet"} pour signer le dépôt.`);
  if (!(SolanaSignTransaction in wallet.features)) throw new Error(`${wallet.name} ne sait pas signer cette transaction.`);
  try {
    const account = await sessionAccount(wallet, address);
    const [out] = await (wallet.features as SolanaSignTransactionFeature)[SolanaSignTransaction].signTransaction({
      account,
      transaction: fromBase64(transactionB64),
      chain: WALLET_CHAIN,
    });
    return toBase64(out.signedTransaction);
  } catch (e) {
    if (rejected(e)) throw new Error("Dépôt annulé dans le wallet.");
    throw e instanceof Error ? e : new Error("Signature impossible.");
  }
}

export async function fetchSession(): Promise<{ address: string; walletApp: string | null } | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await res.json();
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function signOut() {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => null);
}

/** Liens pour ouvrir le site dans le navigateur intégré d'un wallet (mobile). */
export function openInWalletLinks(href: string, origin: string) {
  const url = encodeURIComponent(href);
  const ref = encodeURIComponent(origin);
  return [
    { name: "Phantom", href: `https://phantom.app/ul/browse/${url}?ref=${ref}` },
    { name: "Solflare", href: `https://solflare.com/ul/v1/browse/${url}?ref=${ref}` },
  ];
}

export const INSTALL_LINKS = [
  { name: "Phantom", href: "https://phantom.com" },
  { name: "Solflare", href: "https://solflare.com" },
  { name: "Backpack", href: "https://backpack.app" },
];
