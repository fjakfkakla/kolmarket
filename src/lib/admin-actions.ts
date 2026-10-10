import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminAction } from "./admin-message";
import { isSolanaAddress } from "./auth";
import { MAX_CUSTOM_DAYS, customChallengeSpec, daysBetween, isoDay } from "./challenge-calendar";
import { CHALLENGE_FIELDS, type ChallengeRow, resolveMarket } from "./challenges";
import { trackerKey } from "./solanatracker";
import { LAUNCH_MS, setLaunchAt } from "./launch";

/** Refus attendu (saisie invalide, défi dans le mauvais état) : le message est montré tel quel. */
export class AdminError extends Error {}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const fail = (msg: string): never => {
  throw new AdminError(msg);
};
const check = (ok: unknown, msg: string) => {
  if (!ok) fail(msg);
};

async function rpc(db: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn} : ${error.message}`);
  return data;
}

async function market(db: SupabaseClient, id: string) {
  const { data, error } = await db.from("markets").select(CHALLENGE_FIELDS).eq("id", id).maybeSingle();
  if (error) throw new Error(`markets : ${error.message}`);
  return (data as unknown as ChallengeRow | null) ?? fail("Défi inconnu.");
}

/** Identifiant d'un KOL tiré de son nom : « Mr. Frog » → « mrfrog ». */
const kolIdFrom = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);

/** Exécute une action admin déjà vérifiée (signature, journal). Renvoie le compte rendu affiché. */
export async function runAdminAction(db: SupabaseClient, a: AdminAction, now = new Date()): Promise<string> {
  switch (a.action) {
    case "create_challenge": {
      const title = a.title.trim();
      check(title.length >= 10 && title.length <= 120, "Titre : entre 10 et 120 caractères.");
      check(DAY.test(a.start) && DAY.test(a.end) && !Number.isNaN(Date.parse(a.start)) && !Number.isNaN(Date.parse(a.end)), "Dates invalides.");
      check(a.start > isoDay(now), "Le défi doit commencer au plus tôt demain (heure UTC) : les mises ferment à son départ.");
      check(a.end >= a.start, "La fin doit être après le début.");
      check(daysBetween(a.start, a.end).length <= MAX_CUSTOM_DAYS, `${MAX_CUSTOM_DAYS} jours au maximum.`);
      const kolIds = [...new Set(a.kolIds)];
      check(kolIds.length >= 2, "Choisis au moins 2 KOLs.");
      const kols = await db.from("kols").select("id").in("id", kolIds).eq("active", true);
      if (kols.error) throw new Error(`kols : ${kols.error.message}`);
      check(kols.data?.length === kolIds.length, "Un des KOLs choisis n'existe pas ou n'est plus actif.");

      const spec = customChallengeSpec(title, a.start, a.end);
      const max = await db.from("markets").select("challenge_no").order("challenge_no", { ascending: false, nullsFirst: false }).limit(1);
      if (max.error) throw new Error(`markets : ${max.error.message}`);
      // Plusieurs défis sur les mêmes dates : -2, -3…
      for (let n = 1; n <= 9; n++) {
        const slug = n === 1 ? spec.slug : `${spec.slug}-${n}`;
        const ins = await db
          .from("markets")
          .insert({
            slug,
            title: spec.title,
            question: spec.question,
            category: "KOL",
            period: spec.period,
            challenge_no: Number(max.data?.[0]?.challenge_no ?? 0) + 1,
            data_start: spec.dataStart,
            data_end: spec.dataEnd,
            starts_at: spec.startsAt,
            closes_at: spec.closesAt,
            ends_at: spec.endsAt,
            status: "OPEN",
            featured: false,
            rules: spec.rules,
          })
          .select("id")
          .single();
        if (ins.error?.code === "23505") continue;
        if (ins.error) throw new Error(`markets : ${ins.error.message}`);
        const out = await db.from("outcomes").insert(kolIds.map((kol_id, position) => ({ market_id: ins.data.id, kol_id, position })));
        if (out.error) throw new Error(`outcomes : ${out.error.message}`);
        return `Défi créé : /market/${slug}`;
      }
      return fail("Trop de défis sur ces dates.");
    }

    case "add_kol": {
      const name = a.name.trim();
      const handle = a.handle.trim().replace(/^@/, "");
      const wallet = a.wallet.trim();
      check(name.length >= 2 && name.length <= 30, "Nom : entre 2 et 30 caractères.");
      check(/^[A-Za-z0-9_]{1,15}$/.test(handle), "Handle X invalide (lettres, chiffres, _ ; 15 caractères maximum).");
      check(isSolanaAddress(wallet), "Adresse de wallet Solana invalide.");
      check(/^#[0-9a-fA-F]{6}$/.test(a.color), "Couleur invalide.");
      const base = kolIdFrom(name);
      check(base.length >= 2, "Le nom doit contenir des lettres ou des chiffres.");
      for (let n = 1; n <= 9; n++) {
        const id = n === 1 ? base : `${base}${n}`;
        const ins = await db.from("kols").insert({ id, name, handle, wallet, color: a.color.toLowerCase(), active: true });
        if (!ins.error) return `${name} ajouté : il entre dans les défis aux mises ouvertes d'ici 10 minutes.`;
        if (ins.error.code !== "23505") throw new Error(`kols : ${ins.error.message}`);
        const taken = await db.from("kols").select("id, name").eq("wallet", wallet).maybeSingle();
        if (taken.data) fail(`Ce wallet est déjà suivi (${taken.data.name}).`);
      }
      return fail("Identifiant déjà pris : choisis un autre nom.");
    }

    case "set_kol_active": {
      const up = await db.from("kols").update({ active: a.active }).eq("id", a.kolId).select("name");
      if (up.error) throw new Error(`kols : ${up.error.message}`);
      check(up.data?.length, "KOL inconnu.");
      return a.active
        ? `${up.data![0].name} est de nouveau actif : il entre dans les défis aux mises ouvertes.`
        : `${up.data![0].name} est retiré des prochains défis (les défis déjà ouverts le gardent).`;
    }

    case "resolve_now": {
      const m = await market(db, a.marketId);
      check(m.status === "OPEN" || m.status === "CLOSED", "Ce défi a déjà un résultat.");
      check(m.data_start, "Ce défi n'a pas de dates de données.");
      check(Date.parse(m.ends_at) <= now.getTime(), "Le défi n'est pas encore terminé.");
      const key = trackerKey() ?? fail("SOLANATRACKER_API_KEY manquante.");
      return `Résultat : ${await resolveMarket(db, key, m, now, { force: true })}`;
    }

    case "propose_winner": {
      const m = await market(db, a.marketId);
      check(["OPEN", "CLOSED", "PROPOSED"].includes(m.status), "Ce défi est déjà payé ou annulé.");
      check(Date.parse(m.ends_at) <= now.getTime(), "Le défi n'est pas encore terminé.");
      check(m.outcomes.some((o) => o.kol_id === a.kolId), "Ce KOL ne fait pas partie du défi.");
      const note = a.note.trim();
      check(note.length >= 5, "Explique ta décision en quelques mots : elle est affichée aux joueurs.");
      const ok = await rpc(db, "propose_result", { p_market: m.id, p_winning_kol: a.kolId, p_note: note });
      check(ok, "Proposition refusée.");
      const src = await db.from("markets").update({ result_source: "manual" }).eq("id", m.id);
      if (src.error) throw new Error(`markets : ${src.error.message}`);
      return "Gagnant proposé : le pot sera payé dans 24 h, sans relecture des chiffres.";
    }

    case "settle_now": {
      const m = await market(db, a.marketId);
      check(m.status === "PROPOSED", "Il faut d'abord un gagnant proposé.");
      const status = await rpc(db, "settle_market", { p_market: m.id, p_min_age: "0 seconds" });
      return status === "RESOLVED" ? "Pot payé." : `Statut : ${status}`;
    }

    case "cancel_market": {
      const m = await market(db, a.marketId);
      check(["DRAFT", "OPEN", "CLOSED", "PROPOSED"].includes(m.status), "Ce défi est déjà payé ou annulé.");
      const reason = a.reason.trim();
      check(reason.length >= 5, "Donne la raison : elle est affichée aux joueurs.");
      const status = await rpc(db, "cancel_market", { p_market: m.id, p_reason: reason });
      return status === "CANCELLED" ? "Défi annulé : toutes les mises sont remboursées." : `Statut : ${status}`;
    }

    case "start_launch": {
      const at = new Date(now.getTime() + LAUNCH_MS).toISOString();
      await setLaunchAt(db, at);
      return `Chrono lancé : l'app s'ouvre le ${at.slice(0, 16).replace("T", " ")} UTC.`;
    }

    case "reset_launch": {
      await setLaunchAt(db, null);
      return "Chrono arrêté : l'app est fermée au public.";
    }
  }
}
