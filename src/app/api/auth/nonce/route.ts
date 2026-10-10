import { NextResponse, type NextRequest } from "next/server";
import { NONCE_COOKIE, NONCE_TTL_S, cookieBase, fail, isSolanaAddress, newSiwsFields, sealNonce, siteUrl, siwsMessage } from "@/lib/auth";

/** Étape 1 : prépare le message à signer pour cette adresse. */
export async function POST(req: NextRequest) {
  const site = siteUrl(req);
  if (!site) return fail(403, "Origine refusée.");

  const body = await req.json().catch(() => null);
  if (!isSolanaAddress(body?.address)) return fail(400, "Adresse Solana invalide.");

  try {
    const fields = newSiwsFields(site, body.address);
    const res = NextResponse.json({ message: siwsMessage(fields) });
    res.cookies.set(NONCE_COOKIE, sealNonce(fields), {
      ...cookieBase(site),
      sameSite: "strict",
      path: "/api/auth",
      maxAge: NONCE_TTL_S,
    });
    return res;
  } catch (e) {
    console.error("[auth] nonce :", (e as Error).message);
    return fail(500, "Connexion indisponible pour le moment.");
  }
}
