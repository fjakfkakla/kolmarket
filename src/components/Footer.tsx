import { AppLink } from "./landing/AppLink";
import { getI18n } from "@/i18n/server";
import { LanguageSelect } from "./LanguageSelect";
import { Logo } from "./Logo";

/** Le pied : la marque et sa phrase, les sections, l'accès, et le choix de la langue (DA §14.2). Liens via AppLink : chrono avant le lancement. */
export async function Footer() {
  const { t } = await getI18n();
  const f = t.landing.footer;
  const COLS = [
    {
      title: f.markets,
      links: [
        { label: f.challenge7d, href: "/market/kol-top-profit-7d" },
        { label: f.challenge30d, href: "/market/kol-top-profit-30d" },
        { label: f.race500m, href: "/market/premier-500m-mcap" },
        { label: f.allMarkets, href: "/app" },
      ],
    },
    {
      title: f.access,
      links: [
        { label: f.account, href: "/account" },
        { label: f.bets, href: "/account#bets" },
        { label: t.common.howItWorks, href: "/how-it-works" },
        { label: f.terms, href: "/terms" },
        { label: f.home, href: "/" },
      ],
    },
  ];
  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo size={24} href="/" />
          <p className="display mt-6 text-[clamp(2.1rem,4.2vw,3.4rem)]">
            {t.landing.titles.footer[0]} <span className="text-blue">{t.landing.titles.footer[1]}</span>
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 font-display text-[18px] font-extrabold tracking-[-0.02em]">{c.title}</h4>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <AppLink href={l.href} className="inline-block text-[15px] font-semibold text-[#4a5468] transition hover:translate-x-[3px] hover:text-blue active:translate-y-px">
                    {l.label}
                  </AppLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-5 text-[15px] font-semibold text-faint">
        <span>© 2026 Marketcoins</span>
        <LanguageSelect />
      </div>
    </footer>
  );
}
