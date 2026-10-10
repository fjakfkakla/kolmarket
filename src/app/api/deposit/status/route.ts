import { NextResponse, type NextRequest } from "next/server";
import { requireAccount } from "@/lib/api";
import { fail } from "@/lib/auth";
import { processSignature } from "@/lib/deposits";
import { solanaConfig } from "@/lib/solana";

/** Suit un dépôt : PENDING tant que la transaction n'est pas définitive, puis CREDITED (ou FAILED, DROPPED…). */
export async function GET(req: NextRequest) {
  const auth = await requireAccount(req, { write: false });
  if (!auth.ok) return auth.response;
  const cfg = await solanaConfig();
  if (!cfg) return fail(503, "Les dépôts ne sont pas encore ouverts.");

  const signature = req.nextUrl.searchParams.get("signature") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) return fail(400, "Signature invalide.");
  try {
    // Seulement les signatures déjà connues (envoyées par /submit ou vues sur le coffre) :
    // on n'enregistre pas n'importe quelle signature soumise par un navigateur.
    const { data: known } = await auth.db.from("vault_signatures").select("signature").eq("signature", signature).maybeSingle();
    if (!known) return fail(404, "Dépôt inconnu.");
    // Limite de requêtes ou réseau lent : on répond avec l'état connu, le navigateur réessaiera.
    const status = await processSignature(cfg, auth.db, signature).catch(async (e: Error) => {
      console.error("[dépôt] suivi :", e.message);
      const { data } = await auth.db.from("vault_signatures").select("status").eq("signature", signature).single();
      return (data?.status ?? "PENDING") as Awaited<ReturnType<typeof processSignature>>;
    });
    const { data } = await auth.db
      .from("vault_signatures")
      .select("play_micro, excess_micro, account_id")
      .eq("signature", signature)
      .single();
    const mine = data?.account_id === auth.session.accountId;
    return NextResponse.json(
      {
        status,
        credited: mine ? Number(data?.play_micro ?? 0) / 1e6 : 0,
        excess: mine ? Number(data?.excess_micro ?? 0) / 1e6 : 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[dépôt] suivi :", (e as Error).message);
    return fail(500, "Suivi indisponible pour le moment.");
  }
}
