import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/auth";
import { processPending, syncVault } from "@/lib/deposits";
import { solanaConfig } from "@/lib/solana";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

/**
 * Webhook Alchemy « Address Activity » sur le coffre.
 * On ne lit pas le contenu : il sert seulement de signal. On va relire la chaîne nous-mêmes,
 * et on n'y croit que si la signature HMAC du corps est bonne.
 */
export async function POST(req: NextRequest) {
  const key = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  if (!key) return fail(503, "Webhook non configuré.");
  const raw = await req.text();
  const given = Buffer.from(req.headers.get("x-alchemy-signature") ?? "", "hex");
  const expected = createHmac("sha256", key).update(raw, "utf8").digest();
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return fail(401, "Signature invalide.");

  const cfg = await solanaConfig();
  const db = supabaseAdmin();
  if (!cfg || !db) return fail(503, "Dépôts non configurés.");
  try {
    const first = await syncVault(cfg, db);
    // Le webhook arrive avant que la transaction soit définitive (~15 s) : on repasse une fois.
    if (!first.results.PENDING) return NextResponse.json({ ok: true, ...first });
    await new Promise((r) => setTimeout(r, 20_000));
    return NextResponse.json({ ok: true, discovered: first.discovered, ...(await processPending(cfg, db)) });
  } catch (e) {
    console.error("[webhook]", (e as Error).message);
    return fail(500, "Erreur de traitement.");
  }
}
