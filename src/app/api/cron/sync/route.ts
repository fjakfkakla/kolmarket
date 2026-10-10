import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/auth";
import { checkSolvency, syncVault } from "@/lib/deposits";
import { solanaConfig } from "@/lib/solana";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

/**
 * Filet de sécurité planifié : rattrape les dépôts manqués et contrôle le coffre.
 * Appel : Authorization: Bearer <CRON_SECRET> (Vercel Cron l'envoie tout seul).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) return fail(401, "Non autorisé.");

  const cfg = await solanaConfig();
  const db = supabaseAdmin();
  if (!cfg || !db) return fail(503, "Dépôts non configurés.");
  // La synchro peut être interrompue (limite de requêtes) : le contrôle du coffre passe quand même.
  const sync = await syncVault(cfg, db).catch((e: Error) => {
    console.error("[cron] synchro :", e.message);
    return { error: "synchro interrompue" };
  });
  try {
    const solvency = await checkSolvency(cfg, db);
    return NextResponse.json({ ok: solvency.ok, sync, solvency });
  } catch (e) {
    console.error("[cron] contrôle du coffre :", (e as Error).message);
    return fail(500, "Contrôle du coffre impossible.");
  }
}
