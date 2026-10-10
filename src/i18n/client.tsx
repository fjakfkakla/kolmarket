"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INTL_LOCALE, type Locale } from "./config";
import type { ClientDictionary } from "./messages";
import { setLocaleAction } from "./actions";

type I18n = { locale: Locale; intl: string; t: ClientDictionary; setLocale: (l: Locale) => void; pending: boolean };

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: ClientDictionary; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const setLocale = (l: Locale) =>
    start(async () => {
      await setLocaleAction(l);
      router.refresh();
    });
  return <Ctx.Provider value={{ locale, intl: INTL_LOCALE[locale], t: dict, setLocale, pending }}>{children}</Ctx.Provider>;
}

/** Messages côté navigateur. Côté serveur, utiliser `getI18n()` de `@/i18n/server`. */
export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used within I18nProvider");
  return v;
}
