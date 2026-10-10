import { NextResponse, type NextRequest } from "next/server";
import { address } from "@solana/kit";
import { requireAccount } from "@/lib/api";
import { fail, seal } from "@/lib/auth";
import { toMicro } from "@/lib/deposits";
import { MIN_DEPOSIT, checkDeposit, isCents } from "@/lib/limits";
import { DepositError, buildDepositTransaction, solanaConfig } from "@/lib/solana";

const TOKEN_TTL_S = 120;

/** Prépare la transaction de dépôt que le joueur signera dans son wallet. */
export async function POST(req: NextRequest) {
  const auth = await requireAccount(req, { write: true });
  if (!auth.ok) return auth.response;
  const cfg = await solanaConfig();
  if (!cfg) return fail(503, "Les dépôts ne sont pas encore ouverts.");

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT) return fail(400, `Dépôt minimum : ${MIN_DEPOSIT} $.`);
  if (!isCents(amount)) return fail(400, "Montant invalide (au centime près).");

  try {
    const { data: bal, error } = await auth.db
      .rpc("account_balance", { p_account: auth.session.accountId })
      .single<{ play_micro: number; in_play_micro: number }>();
    if (error) throw new Error(error.message);
    const refused = checkDeposit(amount, Number(bal.play_micro) / 1e6, Number(bal.in_play_micro) / 1e6);
    if (refused) return fail(400, refused);

    const { wire, messageHash } = await buildDepositTransaction(cfg, address(auth.session.address), BigInt(toMicro(amount)));
    const token = seal("deposit", { h: messageHash, a: auth.session.address, exp: Date.now() + TOKEN_TTL_S * 1000 });
    return NextResponse.json({ transaction: wire, token });
  } catch (e) {
    if (e instanceof DepositError) return fail(400, e.message);
    console.error("[dépôt] préparation :", (e as Error).message);
    return fail(500, "Dépôt indisponible pour le moment.");
  }
}
