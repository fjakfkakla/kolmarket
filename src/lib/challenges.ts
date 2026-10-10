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

type DueMarket = {
  id: string;
  slug: string;
  data_start: string;
  data_end: string;
  ends_at: string;
  outcomes: { kol_id: string; kols: { name: string; wallet: string } | null }[];
};

type KolResult = { kolId: string; name: string; pnl: number | null; days: number; problem: string | null };

/** Lit le PnL de chaque KOL sur la période du défi. Renvoie null si la source est momentanément indisponible. */
async function fetchResults(key: string, m: DueMarket): Promise<KolResult[] | null> {
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

/** Propose le gagnant des défis terminés depuis 12 h (au plus un essai par heure et par défi). */
export async function resolveChallenges(db: SupabaseClient, key: string, now = new Date()) {
  const due = await db
    .from("markets")
    .select("id, slug, data_start, data_end, ends_at, outcomes!outcomes_market_id_fkey(kol_id, kols(name, wallet))")
    .in("status", ["OPEN", "CLOSED"])
    .not("data_start", "is", null)
    .lte("ends_at", new Date(now.getTime() - RESOLVE_DELAY_HOURS * HOUR).toISOString())
    .order("ends_at")
    .limit(5);
  if (due.error) throw new Error(`markets : ${due.error.message}`);
  const done: Record<string, string> = {};

  for (const m of (due.data ?? []) as unknown as DueMarket[]) {
    const stateKey = `resolve:${m.id}`;
    const last = await readState<{ at: string }>(db, stateKey);
    if (last && now.getTime() - Date.parse(last.at) < HOUR) {
      done[m.slug] = "essai récent";
      continue;
    }
    await writeState(db, stateKey, { at: now.toISOString() });
    const giveUp = now.getTime() > Date.parse(m.ends_at) + GIVE_UP_HOURS * HOUR;

    const results = await fetchResults(key, m);
    if (!results) {
      done[m.slug] = "source indisponible, nouvel essai dans l'heure";
      if (!giveUp) continue;
    }
    if (results) {
      const rows = results.map((r) => ({
        market_id: m.id,
        kol_id: r.kolId,
        realized_pnl_usd: r.pnl,
        days_counted: r.days,
        source: "solanatracker",
        fetched_at: now.toISOString(),
      }));
      const up = await db.from("market_results").upsert(rows, { onConflict: "market_id,kol_id" });
      if (up.error) throw new Error(`market_results : ${up.error.message}`);
    }

    const problems = results ? results.filter((r) => r.problem) : [];
    if (!results || problems.length) {
      const who = problems.map((p) => p.name).join(", ");
      if (giveUp) {
        const reason = results
          ? `Données indisponibles ou incohérentes pour ${who} : toutes les mises sont remboursées.`
          : "Source des données indisponible : toutes les mises sont remboursées.";
        done[m.slug] = await rpcText(db, "cancel_market", { p_market: m.id, p_reason: reason });
      } else {
        const note = `En attente de données fiables pour ${who} : nouvel essai automatique dans l'heure.`;
        const up = await db.from("markets").update({ resolution_note: note }).eq("id", m.id);
        if (up.error) throw new Error(`markets : ${up.error.message}`);
        console.warn(`[défis] ${m.slug} :`, problems.map((p) => `${p.name} → ${p.problem}`).join(" ; "));
        done[m.slug] = `en attente : ${who}`;
      }
      continue;
    }

    const ranked = [...results].sort((a, b) => b.pnl! - a.pnl!);
    const [first, second] = ranked;
    if (!first) {
      done[m.slug] = await rpcText(db, "cancel_market", { p_market: m.id, p_reason: "Aucun KOL dans ce défi : mises remboursées." });
      continue;
    }
    if (second && Math.round(first.pnl! * 100) === Math.round(second.pnl! * 100)) {
      const tied = ranked.filter((r) => Math.round(r.pnl! * 100) === Math.round(first.pnl! * 100)).map((r) => r.name);
      const reason = `Égalité entre ${tied.join(" et ")} (${usd(first.pnl!)}) : toutes les mises sont remboursées.`;
      done[m.slug] = await rpcText(db, "cancel_market", { p_market: m.id, p_reason: reason });
      continue;
    }
    const note = second
      ? `${first.name} gagne avec ${usd(first.pnl!)} de PnL réalisé, devant ${second.name} (${usd(second.pnl!)}).`
      : `${first.name} gagne avec ${usd(first.pnl!)} de PnL réalisé.`;
    const { data, error } = await db.rpc("propose_result", { p_market: m.id, p_winning_kol: first.kolId, p_note: note });
    if (error) throw new Error(`propose_result : ${error.message}`);
    done[m.slug] = data ? `proposé : ${first.kolId}` : "déjà traité";
  }
  return done;
}

async function rpcText(db: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn} : ${error.message}`);
  return String(data);
}

/** Paie les défis dont le résultat est affiché depuis 24 h sans correction. */
export async function settleChallenges(db: SupabaseClient, now = new Date()) {
  const due = await db
    .from("markets")
    .select("id, slug")
    .eq("status", "PROPOSED")
    .lte("proposed_at", new Date(now.getTime() - CORRECTION_HOURS * HOUR).toISOString())
    .limit(10);
  if (due.error) throw new Error(`markets : ${due.error.message}`);
  const done: Record<string, string> = {};
  for (const m of due.data ?? []) {
    done[m.slug as string] = await rpcText(db, "settle_market", { p_market: m.id, p_min_age: `${CORRECTION_HOURS} hours` });
  }
  return done;
}
