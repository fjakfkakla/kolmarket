import { NextResponse, type NextRequest } from "next/server";
import { getLaunch } from "@/lib/launch";

/**
 * Verrou de lancement : avant l'ouverture, seule la landing répond. Toute autre adresse
 * (pages, /admin, /api…) renvoie vers / ; une API renvoie 404. Personne n'entre, admin compris.
 * Restent servis : les fichiers de Next (_next) et les images publiques de la landing.
 */
const PUBLIC_FILE = /^\/(kols|coins)\/[\w.-]+\.(jpg|png|webp)$|^\/favicon\.ico$/;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/" || PUBLIC_FILE.test(pathname) || getLaunch().open) return NextResponse.next();
  if (pathname.startsWith("/api/")) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
