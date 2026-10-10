import type { Locale } from "./config";

/**
 * Messages renvoyés par /api/admin (réussites, refus, journal) : le serveur les écrit en français,
 * on les traduit à l'affichage. Texte exact d'abord, puis motifs ; un message inconnu est rendu tel quel.
 */

type Tr = Record<Exclude<Locale, "fr">, string>;

const EXACT: Record<string, Tr> = {
  "Action impossible pour le moment.": { en: "Action unavailable right now.", es: "Acción no disponible por ahora." },
  "Action invalide.": { en: "Invalid action.", es: "Acción no válida." },
  "Adresse de wallet Solana invalide.": { en: "Invalid Solana wallet address.", es: "Dirección de wallet de Solana no válida." },
  "Date invalide.": { en: "Invalid date.", es: "Fecha no válida." },
  "Défi inconnu.": { en: "Unknown challenge.", es: "Reto desconocido." },
  "Identifiant déjà pris : choisis un autre nom.": { en: "ID already taken: pick another name.", es: "Identificador ya en uso: elige otro nombre." },
  "Introuvable.": { en: "Not found.", es: "No encontrado." },
  "Nonce invalide.": { en: "Invalid nonce.", es: "Nonce no válido." },
  "SOLANATRACKER_API_KEY manquante.": { en: "SOLANATRACKER_API_KEY is missing.", es: "Falta SOLANATRACKER_API_KEY." },
  "Signature expirée : vérifie l'heure de ton appareil et recommence.": {
    en: "Signature expired: check your device's clock and try again.",
    es: "Firma caducada: revisa la hora de tu dispositivo y vuelve a intentarlo.",
  },
  "Signature invalide.": { en: "Invalid signature.", es: "Firma no válida." },
  "Signature déjà utilisée.": { en: "Signature already used.", es: "Firma ya utilizada." },
  "Solana Tracker ne connaît pas ce wallet.": { en: "Solana Tracker doesn't know this wallet.", es: "Solana Tracker no conoce esta wallet." },
  "Trop de défis sur ces dates.": { en: "Too many challenges on these dates.", es: "Demasiados retos en estas fechas." },
  "Titre : entre 10 et 120 caractères.": { en: "Title: between 10 and 120 characters.", es: "Título: entre 10 y 120 caracteres." },
  "Le défi doit commencer au plus tôt demain (heure UTC) : les mises ferment à son départ.": {
    en: "The challenge must start tomorrow at the earliest (UTC): betting closes when it starts.",
    es: "El reto debe empezar mañana como pronto (hora UTC): las apuestas cierran al empezar.",
  },
  "La fin doit être après le début.": { en: "The end must be after the start.", es: "El final debe ser posterior al inicio." },
  "Nom : entre 2 et 30 caractères.": { en: "Name: between 2 and 30 characters.", es: "Nombre: entre 2 y 30 caracteres." },
  "Handle X invalide (lettres, chiffres, _ ; 15 caractères maximum).": {
    en: "Invalid X handle (letters, digits, _; 15 characters max).",
    es: "Handle de X no válido (letras, números, _; 15 caracteres máximo).",
  },
  "Ce défi a déjà un résultat.": { en: "This challenge already has a result.", es: "Este reto ya tiene un resultado." },
  "Ce défi n'a pas de dates de données.": { en: "This challenge has no data dates.", es: "Este reto no tiene fechas de datos." },
  "Le défi n'est pas encore terminé.": { en: "The challenge isn't over yet.", es: "El reto aún no ha terminado." },
  "Ce défi est déjà payé ou annulé.": { en: "This challenge is already paid out or cancelled.", es: "Este reto ya está pagado o anulado." },
  "Ce KOL ne fait pas partie du défi.": { en: "This KOL isn't part of the challenge.", es: "Este KOL no participa en el reto." },
  "Explique ta décision en quelques mots : elle est affichée aux joueurs.": {
    en: "Explain your decision in a few words: it is shown to players.",
    es: "Explica tu decisión en pocas palabras: se muestra a los jugadores.",
  },
  "Proposition refusée.": { en: "Proposal rejected.", es: "Propuesta rechazada." },
  "Gagnant proposé : le pot sera payé dans 24 h, sans relecture des chiffres.": {
    en: "Winner proposed: the pool will be paid out in 24h, without re-checking the figures.",
    es: "Ganador propuesto: el bote se pagará en 24 h, sin volver a revisar las cifras.",
  },
  "Il faut d'abord un gagnant proposé.": { en: "A proposed winner is needed first.", es: "Primero hace falta un ganador propuesto." },
  "Pot payé.": { en: "Pool paid out.", es: "Bote pagado." },
  "Donne la raison : elle est affichée aux joueurs.": { en: "Give the reason: it is shown to players.", es: "Indica el motivo: se muestra a los jugadores." },
  "Défi annulé : toutes les mises sont remboursées.": { en: "Challenge cancelled: all bets are refunded.", es: "Reto anulado: todas las apuestas se reembolsan." },
  "Chiffres instables après 3 republications : décision manuelle.": {
    en: "Figures unstable after 3 republications: manual decision needed.",
    es: "Cifras inestables tras 3 republicaciones: decisión manual.",
  },
  "essai récent": { en: "recent attempt", es: "intento reciente" },
  "déjà traité": { en: "already processed", es: "ya procesado" },
  "source indisponible, nouvel essai dans l'heure": { en: "source unavailable, retrying within the hour", es: "fuente no disponible, nuevo intento en la próxima hora" },
};

const PATTERNS: { re: RegExp; tr: Record<Exclude<Locale, "fr">, (m: RegExpMatchArray, sub: (s: string) => string) => string> }[] = [
  { re: /^Défi créé : (.+)$/, tr: { en: (m) => `Challenge created: ${m[1]}`, es: (m) => `Reto creado: ${m[1]}` } },
  {
    re: /^(.+) ajouté : il entre dans les défis aux mises ouvertes d'ici 10 minutes\.$/,
    tr: { en: (m) => `${m[1]} added: joins open challenges within 10 minutes.`, es: (m) => `${m[1]} añadido: entra en los retos con apuestas abiertas en 10 minutos.` },
  },
  {
    re: /^(.+) est de nouveau actif : il entre dans les défis aux mises ouvertes\.$/,
    tr: { en: (m) => `${m[1]} is active again: joins challenges open for betting.`, es: (m) => `${m[1]} vuelve a estar activo: entra en los retos con apuestas abiertas.` },
  },
  {
    re: /^(.+) est retiré des prochains défis \(les défis déjà ouverts le gardent\)\.$/,
    tr: { en: (m) => `${m[1]} is removed from upcoming challenges (already open ones keep him).`, es: (m) => `${m[1]} queda fuera de los próximos retos (los ya abiertos lo mantienen).` },
  },
  { re: /^Ce wallet est déjà suivi \((.+)\)\.$/, tr: { en: (m) => `This wallet is already tracked (${m[1]}).`, es: (m) => `Esta wallet ya está en seguimiento (${m[1]}).` } },
  { re: /^Vérification impossible : (.+)$/, tr: { en: (m) => `Check failed: ${m[1]}`, es: (m) => `Comprobación imposible: ${m[1]}` } },
  { re: /^Journal admin indisponible \((.+)\)\.$/, tr: { en: (m) => `Admin log unavailable (${m[1]}).`, es: (m) => `Registro admin no disponible (${m[1]}).` } },
  { re: /^Statut : (.+)$/, tr: { en: (m) => `Status: ${m[1]}`, es: (m) => `Estado: ${m[1]}` } },
  { re: /^proposé : (.+)$/, tr: { en: (m) => `proposed: ${m[1]}`, es: (m) => `propuesto: ${m[1]}` } },
  { re: /^en attente : (.+)$/, tr: { en: (m) => `waiting: ${m[1]}`, es: (m) => `en espera: ${m[1]}` } },
  { re: /^Résultat : (.+)$/, tr: { en: (m, sub) => `Result: ${sub(m[1])}`, es: (m, sub) => `Resultado: ${sub(m[1])}` } },
  { re: /^refusé : (.+)$/, tr: { en: (m, sub) => `rejected: ${sub(m[1])}`, es: (m, sub) => `rechazado: ${sub(m[1])}` } },
];

export function translateAdminMessage(msg: string | null | undefined, locale: Locale): string {
  if (!msg) return msg ?? "";
  if (locale === "fr") return msg;
  const exact = EXACT[msg];
  if (exact) return exact[locale];
  const sub = (s: string) => translateAdminMessage(s, locale);
  for (const p of PATTERNS) {
    const m = msg.match(p.re);
    if (m) return p.tr[locale](m, sub);
  }
  return msg;
}
