import { AppLink } from "./AppLink";
import { ArrowRight } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { Logo } from "../Logo";

export async function LandingNav() {
  const { t } = await getI18n();
  const LINKS = [
    { label: t.landing.nav.kols, href: "#kol-anchor" },
    { label: t.landing.nav.memecoins, href: "#coins" },
    { label: t.landing.nav.markets, href: "#markets" },
    { label: t.landing.nav.fees, href: "#fees" },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-paper/88 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-4 md:h-[84px] md:px-8">
        <Logo size={26} href="/" />
        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label={t.landing.nav.sections}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-[15px] font-bold text-muted transition hover:bg-white hover:text-ink hover:shadow-[inset_0_0_0_1px_#e6e9f2]">
              {l.label}
            </a>
          ))}
        </nav>
        <AppLink href="/app" className="plaque ml-auto h-11 px-5 text-[15px] lg:ml-0 md:h-12 md:px-6">
          <span className="sm:hidden">{t.common.launchApp}</span>
          <span className="hidden sm:inline">{t.landing.nav.launchLong}</span>
          <ArrowRight size={17} />
        </AppLink>
      </div>
    </header>
  );
}
