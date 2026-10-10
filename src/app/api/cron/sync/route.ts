import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/auth";
import { runScheduledJobs } from "@/lib/jobs";

export const maxDuration = 60;

/**
 * Lance les tâches planifiées à la demande : défis, PnL des KOLs, résultats, paiements,
 * dépôts manqués, retraits, contrôle du coffre. Sur Railway, le planificateur intégré le fait
 * déjà toutes les 10 minutes. Appel : Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) return fail(401, "Non autorisé.");

  const result = await runScheduledJobs();
  return NextResponse.json(result, { status: result.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}
