import { NextResponse, type NextRequest } from "next/server";
import {
  NONCE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieBase,
  createSession,
  fail,
  openNonce,
 
  siteUrl,
  siwsMessage,
  verifySignature,
} from "@/lib/auth";

/** Étape 2 : vérifie la signature, crée le compte au besoin et ouvre la session. */
export async function POST(req: NextRequest) {
  const site = siteUrl(req);
  if (!site) return fail(403, "Origine refusée.");

  const body = await req.json().catch(() => null);
  const signature = typeof body?.signature === "string" ? Buffer.from(body.signature, "base64") : null;
  const walletApp = typeof body?.walletApp === "string" ? body.walletApp.slice(0, 40) : null;
  if (!signature) return fail(400, "Signature manquante.");

  try {
    const fields = openNonce(req.cookies.get(NONCE_COOKIE)?.value);
    if (!fields || fields.domain !== site.host) return fail(400, "Demande expirée, recommence la connexion.");
    if (!verifySignature(fields.address, siwsMessage(fields), signature)) return fail(401, "Signature invalide.");

    const token = await createSession(fields, walletApp, req.headers.get("user-agent"));
    if (!token) return fail(401, "Signature déjà utilisée, recommence la connexion.");

    const res = NextResponse.json({ address: fields.address, walletApp });
    res.cookies.set(NONCE_COOKIE, "", { ...cookieBase(site), sameSite: "strict", path: "/api/auth", maxAge: 0 });
    res.cookies.set(SESSION_COOKIE, token, { ...cookieBase(site), sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
    return res;
  } catch (e) {
    console.error("[auth] verify :", (e as Error).message);
    return fail(500, "Connexion indisponible pour le moment.");
  }
}
