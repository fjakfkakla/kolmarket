import { NextResponse } from "next/server";
import { CLUSTER } from "@/lib/cluster";
import { solanaConfig } from "@/lib/solana";

/** Adresses publiques du coffre : celle du compte USDC est à mettre dans le webhook Alchemy. */
export async function GET() {
  const cfg = await solanaConfig();
  if (!cfg) return NextResponse.json({ enabled: false, cluster: CLUSTER });
  return NextResponse.json({
    enabled: true,
    cluster: CLUSTER,
    vault: cfg.vault,
    vaultUsdcAccount: cfg.vaultAta,
    usdcMint: cfg.mint,
    feePayer: cfg.feePayer.address,
  });
}
