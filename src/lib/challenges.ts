import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORRECTION_HOURS,
  GIVE_UP_HOURS,
  RESOLVE_DELAY_HOURS,
  type Period,
  upcomingChallenge,
} from "./challenge-calendar";
import { readState, writeState } from "./app-state";
import { TrackerError, walletPnlHistory } from "./solanatracker";

/**
 * Vie des défis, appelée par la tâche planifiée :
 * 1. ensureChallenges : le prochain défi 7 jours et le prochain 30 jours existent, mises ouvertes ;
 * 2. resolveChallenges : 12 h après la fin, PnL de chaque KOL sur la période → gagnant proposé ;
 * 3. settleChallenges : 24 h après la proposition, le pot est payé.
 */

const HOUR = 3600_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

export async function ensureChallenges(db: SupabaseClient, now = new Date()) {
  const { data: kols, error } = await db.from("kols").select("id").eq("active", true).order("id");
  if (error) throw new Error(`kols : ${error.message}`);
  const done: Record<string, string> = {};

  for (const period of ["7D", "30D"] as Period[]) {
    const spec = upcomingChallenge(period, now);
    const found = await db.from("markets").select("id, status, closes_at").eq("slug", spec.slug).maybeSingle();
    if (found.error) throw new Error(`markets : ${found.error.message}`);
    let id = found.data?.id as string | undefined;

    const text = { title: spec.title, question: spec.question, rules: spec.rules };
    if (!id) {
      const max = await db.from("markets").select("challenge_no").order("challenge_no", { ascending: false, nullsFirst: false }).limit(1);
      if (max.error) throw new Error(`markets : ${max.error.message}`);
      const ins = await db
        .from("markets")
        .upsert(
          {
            slug: spec.slug,
            ...text,
            category: "KOL",
            period,
            challenge_no: Number(max.data?.[0]?.challenge_no ?? 0) + 1,
            data_start: spec.dataStart,
            data_end: spec.dataEnd,
            starts_at: spec.startsAt,
            closes_at: spec.closesAt,
            ends_at: spec.endsAt,
            status: "OPEN",
            featured: false,
          },
          { onConflict: "slug", ignoreDuplicates: true },
        )
        .select("id");
      if (ins.error) throw new Error(`markets : ${ins.error.message}`);
      id = ins.data?.[0]?.id;
      if (!id) {
        const again = await db.from("markets").select("id").eq("slug", spec.slug).single();
        if (again.error) throw new Error(`markets : ${again.error.message}`);
        id = again.data.id as string;
      }
      done[period] = `créé : ${spec.slug}`;
    } else if (found.data?.status === "OPEN" && Date.parse(found.data.closes_at) > now.getTime()) {
      // Tant que les mises sont ouvertes, le texte suit le modèle (corrections de règles comprises).
      const up = await db.from("markets").update(text).eq("id", id);
      if (up.error) throw new Error(`markets : ${up.error.message}`);
      done[period] = `ouvert : ${spec.slug}`;
    } else {
      done[period] = `${found.data?.status} : ${spec.slug}`;
    }

    // Tous les KOLs actifs participent aux défis dont les mises sont ouvertes.
    if (Date.parse(spec.closesAt) > now.getTime()) {
      const rows = (kols ?? []).map((k, i) => ({ market_id: id, kol_id: k.id, position: i }));
      const out = await db.from("outcomes").upsert(rows, { onConflict: "market_id,kol_id", ignoreDuplicates: true });
      if (out.error) throw new Error(`outcomes : ${out.error.message}`);
    }

    // Le défi 7 jours aux mises ouvertes est mis en avant sur l'accueil.
    if (period === "7D") {
      const off = await db.from("markets").update({ featured: false }).eq("featured", true).neq("id", id);
      const on = await db.from("markets").update({ featured: true }).eq("id", id);
      if (off.error || on.error) throw new Error(`markets : ${(off.error ?? on.error)!.message}`);
    }
  }
  return done;
}

/** Défi tel que lu pour sa résolution ou son paiement. */
export type ChallengeRow = {
  id: string;
  slug: string;
  status: string;
  data_start: string;
  data_end: string;
  ends_at: string;
  result_source: "auto" | "manual" | null;
  winning_outcome_id: string | null;
  outcomes: { id: string; kol_id: string; kols: { name: string; wallet: string } | null }[];
};
export const CHALLENGE_FIELDS =
  "id, slug, status, data_start, data_end, ends_at, result_source, winning_outcome_id, outcomes!outcomes_market_id_fkey(id, kol_id, kols(name, wallet))";

type KolResult = { kolId: string; name: string; pnl: number | null; days: number; problem: string | null };

/** Lit le PnL de chaque KOL sur la période du défi. Renvoie null si la source est momentanément indisponible. */
async function fetchResults(key: string, m: ChallengeRow): Promise<KolResult[] | null> {
  const out: KolResult[] = [];
  for (const o of m.outcomes) {
    const name = o.kols?.name ?? o.kol_id;
    if (!o.kols?.wallet) {
      out.push({ kolId: o.kol_id, name, pnl: null, days: 0, problem: "wallet inconnu" });
      continue;
    }
    try {
      const h = await walletPnlHistory(key, o.kols.wallet, m.data_start, m.data_end);
      const days = h.days.filter((d) => d.date >= m.data_start && d.date <= m.data_end);
      const traded = days.filter((d) => d.trades > 0);
      if (traded.some((d) => d.realized === null)) {
        out.push({ kolId: o.kol_id, name, pnl: null, days: days.length, problem: "PnL d'une journée manquant" });
        continue;
      }
      const sum = round2(days.reduce((s, d) => s + (d.realized ?? 0), 0));
      // Contrôle : la somme des journées doit retrouver le total annoncé par la source.
      const total = h.totalRealized;
      const coherent = total === null ? traded.length === 0 : Math.abs(sum - total) <= Math.max(1, Math.abs(total) * 0.001);
      out.push({ kolId: o.kol_id, name, pnl: sum, days: days.length, problem: coherent ? null : `total incohérent (${sum} vs ${total})` });
    } catch (e) {
      if (e instanceof TrackerError && (e.temporary || e.unauthorized)) return null;
      out.push({ kolId: o.kol_id, name, pnl: null, days: 0, problem: (e as Error).message });
    }
  }
  return out;
}

type Verdict =
  | { kind: "unavailable" }
  | { kind: "wait"; who: string; problems: KolResult[] }
  | { kind: "empty" }
  | { kind: "tie"; names: string[]; pnl: number }
  | { kind: "winner"; first: KolResult; second?: KolResult };

/** Ce que disent les chiffres : gagnant, égalité, ou données pas encore fiables. */
function judge(results: KolResult[] | null): Verdict {
  if (!results) return { kind: "unavailable" };
  const problems = results.filter((r) => r.problem);
  if (problems.length) return { kind: "wait", who: problems.map((p) => p.name).join(", "), problems };
  const ranked = [...results].sort((a, b) => b.pnl! - a.pnl!);
  const [first, second] = ranked;
  if (!first) return { kind: "empty" };
  const cents = (r: KolResult) => Math.round(r.pnl! * 100);
  if (second && cents(first) === cents(second)) {
    return { kind: "tie", names: ranked.filter((r) => cents(r) === cents(first)).map((r) => r.name), pnl: first.pnl! };
  }
  return { kind: "winner", first, second };
}

async function saveResults(db: SupabaseClient, marketId: string, results: KolResult[], now: Date) {
  const rows = results.map((r) => ({
    market_id: marketId,
    kol_id: r.kolId,
    realized_pnl_usd: r.pnl,
    days_counted: r.days,
    source: "solanatracker",
    fetched_at: now.toISOString(),
  }));
  const up = await db.from("market_results").upsert(rows, { onConflict: "market_id,kol_id" });
  if (up.error) throw new Error(`market_results : ${up.error.message}`);
}

/** Applique un verdict définitif : égalité ou défi vide → annulé et remboursé ; sinon gagnant proposé (24 h). */
async function apply(db: SupabaseClient, m: ChallengeRow, v: Verdict & { kind: "tie" | "empty" | "winner" }, prefix = "") {
  if (v.kind === "empty") return rpcText(db, "cancel_market", { p_market: m.id, p_reason: "Aucun KOL dans ce défi : mises remboursées." });
  if (v.kind === "tie") {
    const reason = `${prefix}Égalité entre ${v.names.join(" et ")} (${usd(v.pnl)}) : toutes les mises sont remboursées.`;
    return rpcText(db, "cancel_market", { p_market: m.id, p_reason: reason });
  }
  const { first, second } = v;
  const note =
    prefix +
    (second
      ? `${first.name} gagne avec ${usd(first.pnl!)} de PnL réalisé, devant ${second.name} (${usd(second.pnl!)}).`
      : `${first.name} gagne avec ${usd(first.pnl!)} de PnL réalisé.`);
  const { data, error } = await db.rpc("propose_result", { p_market: m.id, p_winning_kol: first.kolId, p_note: note });
  if (error) throw new Error(`propose_result : ${error.message}`);
  if (!data) return "déjà traité";
  const src = await db.from("markets").update({ result_source: "auto" }).eq("id", m.id);
  if (src.error) throw new Error(`markets : ${src.error.message}`);
  return `proposé : ${first.kolId}`;
}

/**
 * Lit le résultat d'un défi terminé et le propose (ou annule). Au plus un essai par heure,
 * sauf `force` (bouton de la page admin).
 */
export async function resolveMarket(db: SupabaseClient, key: string, m: ChallengeRow, now = new Date(), { force = false } = {}) {
  const stateKey = `resolve:${m.id}`;
  if (!force) {
    const last = await readState<{ at: string }>(db, stateKey);
    if (last && now.getTime() - Date.parse(last.at) < HOUR) return "essai récent";
  }
  await writeState(db, stateKey, { at: now.toISOString() });
  const giveUp = now.getTime() > Date.parse(m.ends_at) + GIVE_UP_HOURS * HOUR;

  const results = await fetchResults(key, m);
  if (results) await saveResults(db, m.id, results, now);
  const v = judge(results);

  if (v.kind === "unavailable" || v.kind === "wait") {
    if (giveUp) {
      const reason =
        v.kind === "wait"
          ? `Données indisponibles ou incohérentes pour ${v.who} : toutes les mises sont remboursées.`
          : "Source des données indisponible : toutes les mises sont remboursées.";
      return rpcText(db, "cancel_market", { p_market: m.id, p_reason: reason });
    }
    if (v.kind === "unavailable") return "source indisponible, nouvel essai dans l'heure";
    const note = `En attente de données fiables pour ${v.who} : nouvel essai automatique dans l'heure.`;
    const up = await db.from("markets").update({ resolution_note: note }).eq("id", m.id);
    if (up.error) throw new Error(`markets : ${up.error.message}`);
    console.warn(`[défis] ${m.slug} :`, v.problems.map((p) => `${p.name} → ${p.problem}`).join(" ; "));
    return `en attente : ${v.who}`;
  }
  return apply(db, m, v);
}

/** Propose le gagnant des défis terminés depuis 12 h. */
export async function resolveChallenges(db: SupabaseClient, key: string, now = new Date()) {
  const due = await db
    .from("markets")
    .select(CHALLENGE_FIELDS)
    .in("status", ["OPEN", "CLOSED"])
    .not("data_start", "is", null)
    .lte("ends_at", new Date(now.getTime() - RESOLVE_DELAY_HOURS * HOUR).toISOString())
    .order("ends_at")
    .limit(5);
  if (due.error) throw new Error(`markets : ${due.error.message}`);
  const done: Record<string, string> = {};
  for (const m of (due.data ?? []) as unknown as ChallengeRow[]) done[m.slug] = await resolveMarket(db, key, m, now);
  return done;
}

async function rpcText(db: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn} : ${error.message}`);
  return String(data);
}

/** Au-delà de 3 republications, les chiffres sont jugés instables : la décision revient à l'admin. */
const MAX_REPUBLISH = 3;
export type RecheckState = { at: string; count: number; blocked?: boolean; reason?: string };

/** Un chiffre a-t-il bougé depuis la publication ? (plus de 1 $ et de 0,1 %) */
const moved = (now: number | null, before: number | null) =>
  now === null || before === null ? now !== before : Math.abs(now - before) > Math.max(1, Math.abs(before) * 0.001);

/**
 * Paie les défis dont le résultat est affiché depuis 24 h. Juste avant, le PnL de chaque KOL est relu :
 * si le gagnant a changé ou si un chiffre a bougé, rien n'est payé, le résultat est republié et les
 * 24 h repartent. Source indisponible : nouvel essai dans l'heure. Résultat décidé dans /admin : payé tel quel.
 */
export async function settleChallenges(db: SupabaseClient, key: string | null, now = new Date()) {
  const due = await db
    .from("markets")
    .select(CHALLENGE_FIELDS)
    .eq("status", "PROPOSED")
    .lte("proposed_at", new Date(now.getTime() - CORRECTION_HOURS * HOUR).toISOString())
    .order("proposed_at")
    .limit(5);
  if (due.error) throw new Error(`markets : ${due.error.message}`);
  const done: Record<string, string> = {};
  const pay = (m: ChallengeRow) => rpcText(db, "settle_market", { p_market: m.id, p_min_age: `${CORRECTION_HOURS} hours` });

  for (const m of (due.data ?? []) as unknown as ChallengeRow[]) {
    if (m.result_source === "manual") {
      done[m.slug] = await pay(m);
      continue;
    }
    if (!key) {
      done[m.slug] = "relecture impossible : SOLANATRACKER_API_KEY manquante";
      continue;
    }
    const stateKey = `recheck:${m.id}`;
    const state = await readState<RecheckState>(db, stateKey);
    if (state?.blocked) {
      done[m.slug] = "décision manuelle requise (voir /admin)";
      continue;
    }
    if (state && now.getTime() - Date.parse(state.at) < HOUR) {
      done[m.slug] = "relecture récente";
      continue;
    }
    const count = state?.count ?? 0;
    await writeState(db, stateKey, { at: now.toISOString(), count });

    const results = await fetchResults(key, m);
    const v = judge(results);
    if (v.kind === "unavailable" || v.kind === "wait") {
      done[m.slug] = v.kind === "wait" ? `relecture en attente : ${v.who}` : "relecture : source indisponible, nouvel essai dans l'heure";
      continue;
    }

    const stored = await db.from("market_results").select("kol_id, realized_pnl_usd").eq("market_id", m.id);
    if (stored.error) throw new Error(`market_results : ${stored.error.message}`);
    const before = new Map((stored.data ?? []).map((r) => [r.kol_id as string, r.realized_pnl_usd === null ? null : Number(r.realized_pnl_usd)]));
    const winner = m.outcomes.find((o) => o.id === m.winning_outcome_id)?.kol_id;
    const same = v.kind === "winner" && v.first.kolId === winner && results!.every((r) => !moved(r.pnl, before.get(r.kolId) ?? null));
    if (same) {
      done[m.slug] = await pay(m);
      continue;
    }

    // Les chiffres ont changé depuis la publication : on republie, sans payer.
    if (count + 1 > MAX_REPUBLISH) {
      const reason = "Chiffres instables après 3 republications : décision manuelle.";
      await writeState(db, stateKey, { at: now.toISOString(), count, blocked: true, reason });
      console.warn(`[défis] ${m.slug} : ${reason}`);
      done[m.slug] = "décision manuelle requise (voir /admin)";
      continue;
    }
    await writeState(db, stateKey, { at: now.toISOString(), count: count + 1 });
    await saveResults(db, m.id, results!, now);
    done[m.slug] = `relu et republié (${await apply(db, m, v, "Résultat relu avant paiement : ")})`;
  }
  return done;
}
