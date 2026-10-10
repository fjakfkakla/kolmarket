/** Réseau Solana utilisé : devnet (USDC de test) tant que NEXT_PUBLIC_SOLANA_CLUSTER ne vaut pas « mainnet ». */
export const CLUSTER: "mainnet" | "devnet" = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet" ? "mainnet" : "devnet";

/** Identifiant de chaîne du Wallet Standard (`solana:devnet`, `solana:mainnet`). */
export const WALLET_CHAIN = `solana:${CLUSTER}` as const;
