"use client";

import { useSyncExternalStore } from "react";
import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import { StandardConnect, type StandardConnectFeature } from "@wallet-standard/features";
import { SolanaSignMessage, type SolanaSignMessageFeature } from "@solana/wallet-standard-features";

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

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

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
    const msg = (e as Error)?.message ?? "";
    if (/reject|denied|cancel|declin|closed/i.test(msg)) throw new Error("Demande refusée dans le wallet.");
    throw e instanceof Error ? e : new Error("Connexion impossible.");
  }
  return post("/api/auth/verify", { signature: toBase64(signature), walletApp: wallet.name });
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
