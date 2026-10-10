import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSelect } from "./LanguageSelect";
import { getI18n } from "@/i18n/server";

export async function Footer() {
  const { t } = await getI18n();
  const f = t.footer;
  return (
    <footer className="mt-16 border-t border-line bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo size={24} />
          <p className="max-w-xs text-sm text-muted">{f.tagline}</p>
          <LanguageSelect />
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{f.markets}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/market/kol-top-profit-7d" className="hover:text-gold-3">{f.top7}</Link></li>
            <li><Link href="/market/kol-top-profit-30d" className="hover:text-gold-3">{f.top30}</Link></li>
            <li><span className="text-muted/60">{f.memecoinsSoon}</span></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{f.account}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/compte" className="hover:text-gold-3">{f.wallet}</Link></li>
            <li><Link href="/compte#positions" className="hover:text-gold-3">{f.positions}</Link></li>
            <li><Link href="/compte#parametres" className="hover:text-gold-3">{f.settings}</Link></li>
            <li><Link href="/comment-ca-marche" className="hover:text-gold-3">{t.common.howItWorks}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{f.legal}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/conditions" className="hover:text-gold-3">{f.terms}</Link></li>
            <li><Link href="/conditions#risques" className="hover:text-gold-3">{f.risks}</Link></li>
            <li><Link href="/conditions#confidentialite" className="hover:text-gold-3">{f.privacy}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">{f.copyright}</div>
    </footer>
  );
}
