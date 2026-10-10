import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo size={24} />
          <p className="max-w-xs text-sm text-muted">
            Le marché de prédiction des KOLs crypto. Parie sur ceux qui performent vraiment, données
            on-chain à l&apos;appui.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Marchés</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/market/kol-top-profit-7d" className="hover:text-gold-3">Top KOL · 7 jours</Link></li>
            <li><Link href="/market/kol-top-profit-30d" className="hover:text-gold-3">Top KOL · 30 jours</Link></li>
            <li><span className="text-muted/60">Memecoins (bientôt)</span></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Compte</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/compte" className="hover:text-gold-3">Mon portefeuille</Link></li>
            <li><Link href="/compte#mises" className="hover:text-gold-3">Mes mises</Link></li>
            <li><Link href="/comment-ca-marche" className="hover:text-gold-3">Comment ça marche</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Légal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/conditions" className="hover:text-gold-3">Conditions d&apos;utilisation</Link></li>
            <li><Link href="/conditions#risques" className="hover:text-gold-3">Avertissement sur les risques</Link></li>
            <li><Link href="/conditions#confidentialite" className="hover:text-gold-3">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        © 2026 Marketcoins · Les marchés de prédiction comportent un risque de perte en capital. Réservé aux adultes.
      </div>
    </footer>
  );
}
