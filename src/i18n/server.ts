import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, INTL_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary } from "./messages";

/** Langue courante, lue dans le cookie. Anglais par défaut. */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** `t` = messages de la langue, `intl` = locale BCP 47 pour les dates. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, intl: INTL_LOCALE[locale], t: getDictionary(locale) };
}
