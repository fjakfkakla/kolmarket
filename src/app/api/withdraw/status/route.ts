import { NextResponse, type NextRequest } from "next/server";
import { requireAccount } from "@/lib/api";
import { fail } from "@/lib/auth";
import { solanaConfig } from "@/lib/solana";
import { type WithdrawalStatus, processWithdrawal } from "@/lib/withdrawals";

/** Suivi d'un retrait du joueur connecté ; fait avancer l'envoi au passage. */
export async function GET(req: NextRequest) {
  const auth = await requireAccount(req, { write: false });
  if (!auth.ok) return auth.response;
  const cfg = await solanaConfig();
  if (!cfg) return fail(503, "Les retraits ne sont pas encore ouverts.");

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail(400, "Retrait inconnu.");
  const { data: w } = await auth.db
    .from("withdrawals")
    .select("account_id, status, amount_micro, signature")
    .eq("id", id)
    .maybeSingle();
  if (!w || w.account_id !== auth.session.accountId) return fail(404, "Retrait inconnu.");

  const status = await processWithdrawal(cfg, auth.db, id).catch((e: Error) => {
    console.error("[retraits] suivi :", e.message);
    return w.status as WithdrawalStatus;
  });
  const { data: after } = await auth.db.from("withdrawals").select("signature").eq("id", id).single();
  return NextResponse.json(
    { status, amount: Number(w.amount_micro) / 1e6, signature: status === "CONFIRMED" ? after?.signature : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
