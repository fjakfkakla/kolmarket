import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fail, isSolanaAddress } from "@/lib/auth";
import { addDays, isoDay } from "@/lib/challenge-calendar";
import { TrackerError, trackerKey, walletPnlHistory } from "@/lib/solanatracker";

/** Avant d'ajouter un KOL : Solana Tracker connaît-il ce wallet ? PnL des 7 derniers jours. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const wallet = typeof body?.wallet === "string" ? body.wallet.trim() : "";
  if (!isSolanaAddress(wallet)) return fail(400, "Adresse de wallet Solana invalide.");
  const key = trackerKey();
  if (!key) return fail(503, "SOLANATRACKER_API_KEY manquante.");

  const end = isoDay(new Date());
  try {
    const h = await walletPnlHistory(key, wallet, addDays(end, -6), end);
    const pnl = Math.round(h.days.reduce((s, d) => s + (d.realized ?? 0), 0) * 100) / 100;
    const trades = h.days.reduce((s, d) => s + d.trades, 0);
    return NextResponse.json({ pnl7d: pnl, trades7d: trades, activeDays: h.days.filter((d) => d.trades > 0).length });
  } catch (e) {
    if (e instanceof TrackerError && e.status === 404) return fail(404, "Solana Tracker ne connaît pas ce wallet.");
    return fail(502, `Vérification impossible : ${(e as Error).message}`);
  }
}
