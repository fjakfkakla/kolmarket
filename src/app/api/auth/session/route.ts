import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, cookieBase, fail, readSession, revokeSession, siteUrl } from "@/lib/auth";

/** Session en cours : adresse du wallet connecté, ou null. */
export async function GET(req: NextRequest) {
  try {
    const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
    return NextResponse.json({ session }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[auth] session :", (e as Error).message);
    return NextResponse.json({ session: null }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** Déconnexion : la session est révoquée en base et le cookie effacé. */
export async function DELETE(req: NextRequest) {
  const site = siteUrl(req);
  if (!site) return fail(403, "Origine refusée.");
  try {
    await revokeSession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch (e) {
    console.error("[auth] logout :", (e as Error).message);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase(site), sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
