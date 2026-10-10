export const usd = (n: number, opts: { compact?: boolean; sign?: boolean } = {}) => {
  const { compact = false, sign = false } = opts;
  const abs = Math.abs(n);
  let body: string;
  if (compact && abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  else if (compact && abs >= 1000) body = `${(abs / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  else body = abs.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const prefix = n < 0 ? "−" : sign ? "+" : "";
  return `${prefix}$${body}`;
};

export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const cents = (p: number) => `${Math.round(p * 100)}¢`;

/** Cote du pot commun : « ×4,8 ». Tiret si personne n'a encore misé. */
export const fmtOdds = (x: number | null) =>
  x === null ? "—" : `×${x.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: x < 2 ? 2 : 1 })}`;

export const shortWallet = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export const dateFr = (iso: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
    ...opts,
  });
