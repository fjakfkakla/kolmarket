/**
 * Calendrier des défis, en journées UTC (c'est ainsi que Solana Tracker compte le PnL) :
 * - 7 jours : chaque semaine, du lundi 00:00 au dimanche 23:59 UTC ;
 * - 30 jours : chaque mois calendaire.
 * Les mises sont ouvertes jusqu'au départ du défi. Fonctions pures : utilisables partout.
 */

export type Period = "7D" | "30D";

/** Le résultat est proposé 12 h après la fin (données du dernier jour complètes), payé 24 h plus tard. */
export const RESOLVE_DELAY_HOURS = 12;
export const CORRECTION_HOURS = 24;
/** Sans données exploitables 72 h après la fin, le défi est annulé et remboursé. */
export const GIVE_UP_HOURS = 72;

const DAY_MS = 86_400_000;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Règles communes à tous les défis en pot commun. */
export const POT_RULES = [
  "Pot commun, 0 frais : ceux qui ont misé sur le KOL gagnant se partagent 100 % du pot, au prorata de leur mise. Si personne n'a misé sur le gagnant, tout le monde est remboursé.",
  "Les mises ferment au début de la période. Pas de revente : chaque mise reste en jeu jusqu'au résultat. Le gain affiché avant la fermeture est une estimation.",
  "Mise maximale : 1000 $ par compte sur ce marché.",
];

/** « 2026-10-12 » */
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const utc = (day: string) => new Date(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => isoDay(new Date(utc(day).getTime() + n * DAY_MS));

/** Tous les jours de `start` à `end` inclus. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const dayNum = (d: Date) => (d.getUTCDate() === 1 ? "1er" : String(d.getUTCDate()));

/** « lundi 12 octobre », « dimanche 1er novembre » ; sans le jour de la semaine si `weekday` est faux. */
export function dayFr(day: string, weekday = true) {
  const d = utc(day);
  return `${weekday ? `${WEEKDAYS[d.getUTCDay()]} ` : ""}${dayNum(d)} ${MONTHS[d.getUTCMonth()]}`;
}

/** « du 12 au 18 octobre », « du 28 septembre au 4 octobre » */
function rangeFr(start: string, end: string) {
  const a = utc(start);
  const b = utc(end);
  const left = a.getUTCMonth() === b.getUTCMonth() ? dayNum(a) : dayFr(start, false);
  return `du ${left} au ${dayFr(end, false)}`;
}

export type ChallengeSpec = {
  period: Period;
  slug: string;
  title: string;
  question: string;
  /** Premier et dernier jour UTC comptés. */
  dataStart: string;
  dataEnd: string;
  startsAt: string;
  closesAt: string;
  endsAt: string;
  rules: string[];
};

/** Règles d'un défi qui compte les journées UTC de `dataStart` à `dataEnd`. */
function rulesFor(dataStart: string, dataEnd: string) {
  return [
    `Gagnant : le KOL dont le wallet principal affiche le plus gros PnL réalisé, en USD, du ${dayFr(dataStart)} 00:00 au ${dayFr(dataEnd)} 23:59, heure UTC.`,
    "PnL réalisé : gains et pertes des ventes faites pendant le défi, positions encore ouvertes exclues. Source : Solana Tracker, journée UTC par journée UTC. Les positions jugées suspectes, par exemple des tokens reçus sans achat, comptent pour zéro.",
    `Résultat proposé le ${dayFr(addDays(dataEnd, 1))} vers 12:00 UTC, avec le PnL de chaque KOL. Il est payé ${CORRECTION_HOURS} h plus tard : ce délai sert à corriger une erreur de données.`,
    ...POT_RULES,
    "En cas d'égalité, de données indisponibles ou incohérentes, le défi est annulé et toutes les mises sont remboursées.",
  ];
}

const timesFor = (dataStart: string, dataEnd: string) => ({
  startsAt: `${dataStart}T00:00:00.000Z`,
  closesAt: `${dataStart}T00:00:00.000Z`,
  endsAt: `${dataEnd}T23:59:59.000Z`,
});

/** Durée maximale d'un défi créé à la main, en jours. */
export const MAX_CUSTOM_DAYS = 31;

/** Défi créé dans /admin : titre et dates au choix (journées UTC, de 1 à 31 jours). */
export function customChallengeSpec(title: string, dataStart: string, dataEnd: string): ChallengeSpec {
  return {
    period: daysBetween(dataStart, dataEnd).length <= 7 ? "7D" : "30D",
    slug: `defi-${dataStart}-${dataEnd}`,
    title,
    question: "Quel KOL fera le plus de profit ?",
    dataStart,
    dataEnd,
    ...timesFor(dataStart, dataEnd),
    rules: rulesFor(dataStart, dataEnd),
  };
}

/** Le défi d'une période qui commence le jour UTC `dataStart` (un lundi, ou un 1er du mois). */
export function challengeSpec(period: Period, dataStart: string): ChallengeSpec {
  const start = utc(dataStart);
  const dataEnd =
    period === "7D" ? addDays(dataStart, 6) : isoDay(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)));
  return {
    period,
    slug: period === "7D" ? `kol-7d-${dataStart}` : `kol-30d-${dataStart.slice(0, 7)}`,
    title:
      period === "7D"
        ? `Quel KOL fera le plus de profit ${rangeFr(dataStart, dataEnd)} ?`
        : `Quel KOL fera le plus de profit en ${MONTHS[start.getUTCMonth()]} ?`,
    question: "Quel KOL fera le plus de profit ?",
    dataStart,
    dataEnd,
    ...timesFor(dataStart, dataEnd),
    rules: rulesFor(dataStart, dataEnd),
  };
}

/** Les défis du calendrier automatique (les autres sont créés dans /admin). */
export const isAutoChallenge = (slug: string) => /^kol-(7d|30d)-/.test(slug);

/** Le prochain défi de la période, celui dont le départ est strictement après `now` : ses mises sont ouvertes. */
export function upcomingChallenge(period: Period, now: Date): ChallengeSpec {
  if (period === "30D") {
    return challengeSpec(period, isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))));
  }
  const today = isoDay(now);
  let monday = addDays(today, (8 - utc(today).getUTCDay()) % 7);
  if (utc(monday).getTime() <= now.getTime()) monday = addDays(monday, 7);
  return challengeSpec(period, monday);
}

export type MarketStatus = "DRAFT" | "OPEN" | "CLOSED" | "PROPOSED" | "RESOLVED" | "CANCELLED";

/**
 * Étape d'un défi pour l'affichage :
 * betting (mises ouvertes) → live (en cours) → counting (terminé, résultat en préparation)
 * → proposed (gagnant affiché, paiement sous 24 h) → resolved, ou cancelled.
 */
export type Phase = "betting" | "live" | "counting" | "proposed" | "resolved" | "cancelled";

export function marketPhase(m: { status: MarketStatus; closesAt: string; endsAt: string }, now: number): Phase {
  if (m.status === "RESOLVED") return "resolved";
  if (m.status === "CANCELLED") return "cancelled";
  if (m.status === "PROPOSED") return "proposed";
  if (now < Date.parse(m.closesAt)) return "betting";
  if (now <= Date.parse(m.endsAt)) return "live";
  return "counting";
}
