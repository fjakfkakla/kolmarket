import type { BinaryMarket, Market } from "@/data/markets";
import type { CoinMarket } from "@/data/coins";
import { CORRECTION_HOURS, addDays, isAutoChallenge } from "@/lib/challenge-calendar";
import { usd } from "@/lib/format";
import { fmt } from "./config";
import type { ClientDictionary } from "./messages";

/**
 * Traduction des contenus de marché à l'affichage. Les textes stockés (base, données mock)
 * sont en français et ne changent jamais : ces helpers renvoient une copie dont les textes
 * sont traduits, avec repli sur le texte d'origine pour tout ce qui n'est pas reconnu.
 * Utilisables côté serveur (`t` de getI18n()) comme côté client (`t` de useI18n()).
 */

/** Ce dont les helpers ont besoin : le `t` de getI18n() ou de useI18n(). */
export type ContentT = Pick<ClientDictionary, "app">;

type Content = ContentT["app"]["content"];
type CoinText = Content["coinMarkets"]["premier-500m-mcap"];

/** Question fixe des défis KOL, telle que stockée. */
const FR_QUESTION = "Quel KOL fera le plus de profit ?";
/** Début de la première règle générée par `rulesFor` (challenge-calendar). */
const FR_RULES_START = "Gagnant : le KOL";

const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const dayNum = (c: Content, d: Date) => (d.getUTCDate() === 1 ? c.firstDay : String(d.getUTCDate()));

/** « Monday, October 12 » / « lunes 12 de octubre » ; `day` = « 2026-10-12 » (jour UTC). */
export function challengeDay(day: string, t: ContentT, weekday = true): string {
  const c = t.app.content;
  const d = utc(day);
  const vars = { weekday: c.weekdays[d.getUTCDay()], day: dayNum(c, d), month: c.months[d.getUTCMonth()] };
  return fmt(weekday ? c.dateLong : c.dateShort, vars);
}

/** « from October 12 to 18 » / « del 12 al 18 de octubre ». */
function challengeRange(start: string, end: string, t: ContentT): string {
  const c = t.app.content;
  const a = utc(start);
  const b = utc(end);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return fmt(c.rangeSameMonth, { a: dayNum(c, a), b: dayNum(c, b), month: c.months[b.getUTCMonth()] });
  }
  return fmt(c.rangeCrossMonth, { a: dayNum(c, a), monthA: c.months[a.getUTCMonth()], b: dayNum(c, b), monthB: c.months[b.getUTCMonth()] });
}

/**
 * Titre d'un défi du calendrier automatique, recalculé dans la langue de `t`
 * (même logique que `challengeSpec` dans lib/challenge-calendar.ts).
 */
export function challengeTitle(period: Market["period"], dataStart: string, dataEnd: string, t: ContentT): string {
  const ch = t.app.content.challenge;
  return period === "7D"
    ? fmt(ch.title7d, { range: challengeRange(dataStart, dataEnd, t) })
    : fmt(ch.title30d, { month: t.app.content.months[utc(dataStart).getUTCMonth()] });
}

/** Règles d'un défi qui compte les journées UTC de `dataStart` à `dataEnd` (cf. `rulesFor`), traduites. */
export function challengeRules(dataStart: string, dataEnd: string, t: ContentT): string[] {
  const r = t.app.content.challenge.rules;
  return [
    fmt(r.winner, { start: challengeDay(dataStart, t), end: challengeDay(dataEnd, t) }),
    r.realized,
    fmt(r.proposed, { day: challengeDay(addDays(dataEnd, 1), t), hours: CORRECTION_HOURS }),
    ...r.pot,
    r.tie,
  ];
}

/**
 * Défi KOL traduit : `title` (défis automatiques `kol-7d-*` / `kol-30d-*` uniquement — un titre
 * saisi dans /admin reste tel quel), `question` (si c'est la question standard), `rules`
 * (si ce sont les règles générées) et `resolutionNote` (cf. localizeResolutionNote).
 * En français (langue source), renvoie le marché inchangé.
 */
export function localizeMarket<M extends Market>(m: M, t: ContentT): M {
  const c = t.app.content;
  if (c.keepOriginal) return m;
  const out: M = { ...m };
  const dated = Boolean(m.dataStart && m.dataEnd);
  if (dated && isAutoChallenge(m.slug)) out.title = challengeTitle(m.period, m.dataStart!, m.dataEnd!, t);
  if (m.question === FR_QUESTION) out.question = c.challenge.question;
  if (dated && m.rules[0]?.startsWith(FR_RULES_START)) out.rules = challengeRules(m.dataStart!, m.dataEnd!, t);
  if (m.resolutionNote) out.resolutionNote = localizeResolutionNote(m.resolutionNote, t);
  return out;
}

/**
 * Marché memecoin traduit par slug : `title`, `question`, `target`, `rules` et le nom des
 * résultats sans ticker (ex. « Aucun d'ici le 25 décembre »). Repli sur le texte d'origine.
 */
export function localizeCoinMarket<M extends CoinMarket>(m: M, t: ContentT): M {
  const c = t.app.content;
  if (c.keepOriginal) return m;
  const tr = (c.coinMarkets as Record<string, CoinText | undefined>)[m.slug];
  if (!tr) return m;
  const names = tr.outcomes as Record<string, string | undefined>;
  return {
    ...m,
    title: tr.title,
    question: tr.question,
    target: tr.target,
    rules: tr.rules,
    outcomes: m.outcomes.map((o) => (names[o.id] ? { ...o, name: names[o.id]! } : o)),
  };
}

/** Marché Oui / Non traduit par slug (`title`), repli sur le texte d'origine. */
export function localizeBinary<B extends BinaryMarket>(b: B, t: ContentT): B {
  const c = t.app.content;
  if (c.keepOriginal) return b;
  const title = (c.binary as Record<string, string | undefined>)[b.slug];
  return title ? { ...b, title } : b;
}

/** « +1 234,56 $ » (format fr de lib/challenges.ts) → « +$1,234.56 ». */
function pnlText(fr: string): string {
  const m = /^([+−-])([\d\s  ]+),(\d{2})\s?\$$/.exec(fr.trim());
  if (!m) return fr;
  const n = Number(`${m[2].replace(/[\s  ]/g, "")}.${m[3]}`) * (m[1] === "+" ? 1 : -1);
  return n === 0 ? "+$0.00" : usd(n, { sign: true, cents: true });
}

const PNL = "([+−-][\\d\\s\\u00a0\\u202f]+,\\d{2}\\s?\\$)";
const PREFIX = "(Résultat relu avant paiement : )?";
const NOTE_PATTERNS = {
  winner: new RegExp(`^${PREFIX}(.+) gagne avec ${PNL} de PnL réalisé, devant (.+) \\(${PNL}\\)\\.$`, "u"),
  winnerAlone: new RegExp(`^${PREFIX}(.+) gagne avec ${PNL} de PnL réalisé\\.$`, "u"),
  tie: new RegExp(`^${PREFIX}Égalité entre (.+) \\(${PNL}\\) : toutes les mises sont remboursées\\.$`, "u"),
  dataIssue: /^Données indisponibles ou incohérentes pour (.+) : toutes les mises sont remboursées\.$/u,
  waiting: /^En attente de données fiables pour (.+) : nouvel essai automatique dans l'heure\.$/u,
};

/**
 * Note de résultat / d'annulation (`market.resolutionNote`) traduite. Les notes générées
 * automatiquement (lib/challenges.ts) sont reconnues et réécrites ; une note saisie à la main
 * dans /admin est renvoyée telle quelle.
 */
export function localizeResolutionNote(note: string | null | undefined, t: ContentT): string | null {
  if (!note) return note ?? null;
  const c = t.app.content;
  if (c.keepOriginal) return note;
  const n = c.notes;
  if (note === "Aucun KOL dans ce défi : mises remboursées.") return n.noKols;
  if (note === "Source des données indisponible : toutes les mises sont remboursées.") return n.sourceDown;
  const pre = (p: string | undefined) => (p ? n.reviewedPrefix : "");
  let m = NOTE_PATTERNS.winner.exec(note);
  if (m) return pre(m[1]) + fmt(n.winner, { name: m[2], pnl: pnlText(m[3]), second: m[4], pnl2: pnlText(m[5]) });
  m = NOTE_PATTERNS.winnerAlone.exec(note);
  if (m) return pre(m[1]) + fmt(n.winnerAlone, { name: m[2], pnl: pnlText(m[3]) });
  m = NOTE_PATTERNS.tie.exec(note);
  if (m) return pre(m[1]) + fmt(n.tie, { names: m[2].split(" et ").join(n.and), pnl: pnlText(m[3]) });
  m = NOTE_PATTERNS.dataIssue.exec(note);
  if (m) return fmt(n.dataIssue, { who: m[1] });
  m = NOTE_PATTERNS.waiting.exec(note);
  if (m) return fmt(n.waiting, { who: m[1] });
  return note;
}
