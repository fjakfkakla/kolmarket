export const usd = (n: number, opts: { compact?: boolean; sign?: boolean; cents?: boolean } = {}) => {
  const { compact = false, sign = false, cents = false } = opts;
  const abs = Math.abs(n);
  let body: string;
  if (compact && abs >= 1_000_000_000) body = `${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")} Md`;
  else if (compact && abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")}M`;
  else if (compact && abs >= 1000) body = `${(abs / 1000).toFixed(1).replace(/\.0$/, "").replace(".", ",")}K`;
  else
    body = abs.toLocaleString("fr-FR", {
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: 2,
    });
  const prefix = n < 0 ? "−" : sign && n > 0 ? "+" : "";
  return `${prefix}$${body}`;
};

/** Une probabilité en pourcentage ; sous 1 %, on l'écrit comme Polymarket. */
export const pct = (p: number) => (p > 0 && p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);

/** Le prix d'une part en cents : une décimale sous 10 ¢. */
export const cents = (p: number) => {
  const v = p * 100;
  if (v < 10 && Math.abs(v - Math.round(v)) > 0.05) return `${v.toFixed(1).replace(".", ",")}¢`;
  return `${Math.round(v)}¢`;
};

export const signedPct = (r: number) => `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r * 100).toFixed(1).replace(".", ",")} %`;

export const shortWallet = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export const dateFr = (iso: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
    ...opts,
  });
