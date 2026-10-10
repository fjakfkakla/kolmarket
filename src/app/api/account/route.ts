import { NextResponse, type NextRequest } from "next/server";
import { accountSummary } from "@/lib/account";
import { requireAccount } from "@/lib/api";
import { solanaConfig } from "@/lib/solana";
import { supabaseAdmin } from "@/lib/supabase";

/** Solde, mises et historique du joueur connecté. `live: false` = pas de base, l'interface reste en démo. */
export async function GET(req: NextRequest) {
  if (!supabaseAdmin()) return NextResponse.json({ live: false });
  const auth = await requireAccount(req, { write: false });
  if (!auth.ok) return auth.response;
  try {
    const account = await accountSummary(auth.db, auth.session.accountId, (await solanaConfig()) !== null);
    return NextResponse.json({ live: true, account }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[compte]", (e as Error).message);
    return NextResponse.json({ error: "Compte indisponible pour le moment." }, { status: 500 });
  }
}
