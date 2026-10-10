"use client";

import { Globe } from "lucide-react";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function LanguageSelect({ className = "" }: { className?: string }) {
  const { locale, setLocale, pending, t } = useI18n();
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <Globe size={15} className="pointer-events-none absolute left-3 text-muted" />
      <select
        aria-label={t.footer.language}
        value={locale}
        disabled={pending}
        onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
        className="input cursor-pointer appearance-none py-2 pl-9 pr-8 text-sm font-semibold disabled:opacity-60"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-xs text-muted">▾</span>
    </label>
  );
}
