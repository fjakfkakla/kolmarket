import { NextResponse, type NextRequest } from "next/server";
import { logOutcome, requireAdmin, verifySignedAction } from "@/lib/admin";
import { AdminError, runAdminAction } from "@/lib/admin-actions";
import { fail } from "@/lib/auth";

/** Action admin signée par le wallet admin : vérifiée, inscrite au journal, puis exécutée. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const signed = await verifySignedAction(auth.db, auth.session.address, await req.json().catch(() => null));
  if ("error" in signed) return fail(400, signed.error);
  try {
    const message = await runAdminAction(auth.db, signed.action);
    await logOutcome(auth.db, signed.logId, message);
    return NextResponse.json({ message });
  } catch (e) {
    const known = e instanceof AdminError;
    if (!known) console.error("[admin]", signed.action.action, (e as Error).message);
    await logOutcome(auth.db, signed.logId, `refusé : ${(e as Error).message}`);
    return fail(known ? 400 : 500, known ? (e as Error).message : "Action impossible pour le moment.");
  }
}
