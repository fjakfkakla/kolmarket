import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { canEnterApp } from "@/lib/launch";

/**
 * Verrou de lancement : avant l'ouverture publique, les pages de l'app affichent le chrono
 * (même adresse, contenu remplacé avant tout rendu). Seuls les wallets admin passent.
 * /admin reste accessible : c'est là que l'admin se connecte et lance le chrono.
 */
export async function proxy(req: NextRequest) {
  if (await canEnterApp(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/launch", req.url));
}

export const config = {
  matcher: ["/app/:path*", "/market/:path*", "/compte/:path*", "/comment-ca-marche/:path*", "/conditions/:path*"],
};
