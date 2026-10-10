/** Montants en dollars, au format US quelle que soit la langue (« $1,234.5 », « $1.2K »). */
export const usd = (n: number, opts: { compact?: boolean; sign?: boolean; cents?: boolean } = {}) => {
  const { compact = false, sign = false, cents = false } = opts;
  const abs = Math.abs(n);
  let body: string;
  if (compact && abs >= 1_000_000_000) body = `${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  else if (compact && abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  else if (compact && abs >= 1000) body = `${(abs / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  else body = abs.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
  const prefix = n < 0 ? "−" : sign && n > 0 ? "+" : "";
  return `${prefix}$${body}`;
};

/** Couleur d'un PnL : vert s'il est positif ou nul, rouge sinon. */
export const pnlClass = (n: number) => (n >= 0 ? "text-up" : "text-down");

/** Une part en pourcentage ; sous 1 %, on l'écrit comme Polymarket. */
export const pct = (p: number) => (p > 0 && p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);

export const signedPct = (r: number) => `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r * 100).toFixed(1)}%`;

/** Cote du pot commun : « ×4.8 ». `free` (traduit, ex. t.common.open) si personne n'a encore misé. */
export const fmtOdds = (x: number | null, free = "Open") =>
  x === null ? free : `×${x.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: x < 2 ? 2 : 1 })}`;

export const shortWallet = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

/** Date courte dans la langue de l'interface (`intl` = INTL_LOCALE[locale], ex. « Oct 13 » / « 13 oct. »). */
export const fmtDate = (iso: string, intl: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(iso).toLocaleString(intl, {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
    ...opts,
  });

/** @deprecated utiliser fmtDate(iso, intl) */
export const dateFr = (iso: string, opts: Intl.DateTimeFormatOptions = {}) => fmtDate(iso, "fr-FR", opts);
