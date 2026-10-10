import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountData, Activity, Bet } from "./account-types";
import { MAX_STAKE_PER_MARKET, MIN_BET } from "./limits";
import { MICRO, toMicro } from "./deposits";

const usd = (micro: number | string | null) => Number(micro ?? 0) / MICRO;

type BetRow = {
  id: string;
  amount_micro: number;
  created_at: string;
  markets: { slug: string; title: string } | null;
  outcomes: { kol_id: string; kols: { name: string } | null } | null;
};
type LedgerRow = {
  id: number;
  kind: string;
  bucket: string;
  amount_micro: number;
  created_at: string;
  bet_id: string | null;
  withdrawal_id: string | null;
};

const WITHDRAWAL_STATE: Record<string, string> = {
  REVIEW: "en vérification",
  QUEUED: "en attente",
  SENDING: "envoi en cours",
  CONFIRMED: "arrivé",
  REFUNDED: "annulé",
};

const KIND: Record<string, Activity["type"]> = {
  DEPOSIT: "DEPOT",
  WITHDRAWAL: "RETRAIT",
  BET: "MISE",
  PAYOUT: "GAIN",
  REFUND: "REMBOURSEMENT",
  ADJUSTMENT: "AJUSTEMENT",
};

const LABEL: Record<string, string> = {
  WITHDRAWAL: "Retrait USDC vers ton wallet",
  PAYOUT: "Gain",
  REFUND: "Remboursement",
  ADJUSTMENT: "Ajustement",
};

/** Solde, mises et historique d'un compte, lus dans le registre. */
export async function accountSummary(db: SupabaseClient, accountId: string, depositsEnabled: boolean): Promise<AccountData> {
  const [bal, bets, ledger, withdrawals] = await Promise.all([
    db.rpc("account_balance", { p_account: accountId }).single<{ play_micro: number; excess_micro: number; in_play_micro: number }>(),
    db
      .from("bets")
      .select("id, amount_micro, created_at, markets(slug, title), outcomes(kol_id, kols(name))")
      .eq("account_id", accountId)
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("ledger_entries")
      .select("id, kind, bucket, amount_micro, created_at, bet_id, withdrawal_id")
      .eq("account_id", accountId)
      .order("id", { ascending: false })
      .limit(50),
    db.from("withdrawals").select("id, status").eq("account_id", accountId).order("created_at", { ascending: false }).limit(50),
  ]);
  const err = bal.error ?? bets.error ?? ledger.error ?? withdrawals.error;
  if (err) throw new Error(`compte : ${err.message}`);

  const betList: Bet[] = ((bets.data ?? []) as unknown as BetRow[]).map((b) => ({
    id: b.id,
    marketSlug: b.markets?.slug ?? "",
    marketTitle: b.markets?.title ?? "",
    kolId: b.outcomes?.kol_id ?? "",
    kolName: b.outcomes?.kols?.name ?? b.outcomes?.kol_id ?? "",
    amount: usd(b.amount_micro),
    createdAt: Date.parse(b.created_at),
  }));
  const betById = new Map(betList.map((b) => [b.id, b]));
  const withdrawalState = new Map((withdrawals.data ?? []).map((w) => [w.id as string, WITHDRAWAL_STATE[w.status as string] ?? w.status]));

  const activity: Activity[] = ((ledger.data ?? []) as LedgerRow[]).map((l) => {
    const bet = l.bet_id ? betById.get(l.bet_id) : undefined;
    const label =
      l.kind === "DEPOSIT"
        ? l.bucket === "EXCESS"
          ? "Dépôt USDC au-delà du plafond (à retirer)"
          : "Dépôt USDC"
        : l.kind === "BET"
          ? bet
            ? `${bet.kolName} · ${bet.marketTitle}`
            : "Mise"
          : l.kind === "WITHDRAWAL" && l.withdrawal_id
            ? `${LABEL.WITHDRAWAL} · ${withdrawalState.get(l.withdrawal_id) ?? "en attente"}`
            : (LABEL[l.kind] ?? l.kind);
    return { id: String(l.id), type: KIND[l.kind] ?? "AJUSTEMENT", label, amount: usd(l.amount_micro), at: Date.parse(l.created_at) };
  });

  return {
    balance: usd(bal.data?.play_micro ?? 0),
    excess: usd(bal.data?.excess_micro ?? 0),
    inPlay: usd(bal.data?.in_play_micro ?? 0),
    bets: betList,
    activity,
    depositsEnabled,
  };
}

const BET_ERRORS: Record<string, string> = {
  COMPTE_BLOQUE: "Ton compte est en cours de vérification.",
  MARCHE_INCONNU: "Ce marché n'existe pas.",
  MISES_FERMEES: "Les mises sont fermées sur ce marché.",
  KOL_INCONNU: "Ce KOL ne fait pas partie du marché.",
  MISE_TROP_PETITE: `Mise minimum : ${MIN_BET} $.`,
  SOLDE_INSUFFISANT: "Solde insuffisant. Dépose des USDC.",
};

/** Place une mise. Renvoie un message d'erreur, ou null si c'est fait. */
export async function placeBet(db: SupabaseClient, accountId: string, marketSlug: string, kolId: string, amount: number): Promise<string | null> {
  const { error } = await db.rpc("place_bet", {
    p_account: accountId,
    p_market_slug: marketSlug,
    p_kol_id: kolId,
    p_amount: toMicro(amount),
    p_min: toMicro(MIN_BET),
    p_max_per_market: toMicro(MAX_STAKE_PER_MARKET),
  });
  if (!error) return null;
  if (error.message === "PLAFOND_MARCHE") {
    const left = usd(error.details);
    return left > 0
      ? `Tu peux encore miser ${left} $ sur ce marché (maximum ${MAX_STAKE_PER_MARKET} $).`
      : `Tu as atteint le maximum de ${MAX_STAKE_PER_MARKET} $ sur ce marché.`;
  }
  const known = BET_ERRORS[error.message];
  if (!known) console.error("[mises] place_bet :", error.message);
  return known ?? "Mise impossible pour le moment.";
}
