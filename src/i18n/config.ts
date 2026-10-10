export const LOCALES = ["en", "fr", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** Langue par défaut : anglais, à l'arrivée sur le site comme une fois connecté. */
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "mc_locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};

/** Locale BCP 47 utilisée pour formater dates et nombres. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
};

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Remplace les `{clé}` d'un texte traduit. */
export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
