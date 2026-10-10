import { NextResponse, type NextRequest } from "next/server";
import { address } from "@solana/kit";
import { requireAccount } from "@/lib/api";
import { fail, unseal } from "@/lib/auth";
import { trackSignature } from "@/lib/deposits";
import { DepositError, sendSignedDeposit, solanaConfig } from "@/lib/solana";

/** Envoie la transaction signée par le joueur. Le crédit n'a lieu qu'une fois la transaction définitive. */
export async function POST(req: NextRequest) {
  const auth = await requireAccount(req, { write: true });
  if (!auth.ok) return auth.response;
  const cfg = await solanaConfig();
  if (!cfg) return fail(503, "Les dépôts ne sont pas encore ouverts.");

  const body = await req.json().catch(() => null);
  const intent = unseal<{ h: string; a: string; exp: number }>("deposit", body?.token);
  if (!intent || intent.exp < Date.now() || intent.a !== auth.session.address) return fail(400, "Demande expirée, recommence le dépôt.");
  if (typeof body?.transaction !== "string") return fail(400, "Transaction manquante.");

  try {
    const signature = await sendSignedDeposit(cfg, body.transaction, intent.h, address(auth.session.address));
    await trackSignature(auth.db, signature);
    return NextResponse.json({ signature });
  } catch (e) {
    if (e instanceof DepositError) return fail(400, e.message);
    console.error("[dépôt] envoi :", (e as Error).message);
    return fail(500, "Dépôt indisponible pour le moment.");
  }
}
