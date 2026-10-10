import { NextResponse, type NextRequest } from "next/server";
import { requireAccount } from "@/lib/api";
import { fail } from "@/lib/auth";
import { isCents } from "@/lib/limits";
import { solanaConfig } from "@/lib/solana";
import { processWithdrawal, requestWithdrawal } from "@/lib/withdrawals";

/** Demande de retrait vers le wallet du compte. Le compte est débité tout de suite, l'envoi suit. */
export async function POST(req: NextRequest) {
  const auth = await requireAccount(req, { write: true, beforeLaunch: true });
  if (!auth.ok) return auth.response;
  const cfg = await solanaConfig();
  if (!cfg) return fail(503, "Les retraits ne sont pas encore ouverts.");

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!isCents(amount) || amount <= 0) return fail(400, "Montant invalide (au centime près).");

  try {
    const r = await requestWithdrawal(auth.db, auth.session.accountId, amount);
    if ("error" in r) return fail(400, r.error!);
    let status = r.status;
    if (status === "QUEUED") {
      status = await processWithdrawal(cfg, auth.db, r.id).catch((e: Error) => {
        console.error("[retraits] premier envoi :", e.message);
        return "QUEUED" as const;
      });
    }
    return NextResponse.json({ id: r.id, status });
  } catch (e) {
    console.error("[retraits]", (e as Error).message);
    return fail(500, "Retrait indisponible pour le moment.");
  }
}
