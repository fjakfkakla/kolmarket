import { NextResponse, type NextRequest } from "next/server";
import { accountSummary } from "@/lib/account";
import { requireAccount } from "@/lib/api";
import { solanaConfig } from "@/lib/solana";
import { supabaseAdmin } from "@/lib/supabase";
import { processWithdrawal } from "@/lib/withdrawals";

/** Solde, mises et historique du joueur connecté. `live: false` = pas de base, l'interface reste en démo. */
export async function GET(req: NextRequest) {
  if (!supabaseAdmin()) return NextResponse.json({ live: false });
  const auth = await requireAccount(req, { write: false });
  if (!auth.ok) return auth.response;
  try {
    const cfg = await solanaConfig();
    // Les retraits du joueur encore en attente repartent à chaque visite (en plus de la tâche planifiée).
    if (cfg) {
      const { data: open } = await auth.db
        .from("withdrawals")
        .select("id")
        .eq("account_id", auth.session.accountId)
        .in("status", ["QUEUED", "SENDING"])
        .limit(3);
      for (const { id } of open ?? []) {
        await processWithdrawal(cfg, auth.db, id as string).catch((e: Error) => console.error("[retraits] à la visite :", e.message));
      }
    }
    const account = await accountSummary(auth.db, auth.session.accountId, cfg !== null);
    return NextResponse.json({ live: true, account }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[compte]", (e as Error).message);
    return NextResponse.json({ error: "Compte indisponible pour le moment." }, { status: 500 });
  }
}
