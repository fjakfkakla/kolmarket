import { NextResponse, type NextRequest } from "next/server";
import { accountSummary, placeBet } from "@/lib/account";
import { requireAccount } from "@/lib/api";
import { fail } from "@/lib/auth";
import { isCents } from "@/lib/limits";
import { solanaConfig } from "@/lib/solana";

/** Place une mise sur un KOL. Tout est vérifié en base, sous verrou (solde, plafond par marché, fermeture). */
export async function POST(req: NextRequest) {
  const auth = await requireAccount(req, { write: true });
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (typeof body?.marketSlug !== "string" || typeof body?.kolId !== "string" || !Number.isFinite(amount)) {
    return fail(400, "Mise invalide.");
  }
  if (!isCents(amount)) return fail(400, "Montant invalide (au centime près).");

  try {
    const refused = await placeBet(auth.db, auth.session.accountId, body.marketSlug, body.kolId, amount);
    if (refused) return fail(400, refused);
    const account = await accountSummary(auth.db, auth.session.accountId, (await solanaConfig()) !== null);
    return NextResponse.json({ account });
  } catch (e) {
    console.error("[mises]", (e as Error).message);
    return fail(500, "Mise indisponible pour le moment.");
  }
}
