import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";

const COLS = [
  {
    title: "Marchés",
    links: [
      { label: "Défi 7 jours", href: "/market/kol-top-profit-7d" },
      { label: "Défi 30 jours", href: "/market/kol-top-profit-30d" },
      { label: "Course à 1 Md$", href: "/market/premier-1md-fdv" },
      { label: "Tous les marchés", href: "/app" },
    ],
  },
  {
    title: "Accès",
    links: [
      { label: "Mon compte", href: "/compte" },
      { label: "Mes mises", href: "/compte#mises" },
      { label: "Comment ça marche", href: "/comment-ca-marche" },
      { label: "Conditions", href: "/conditions" },
    ],
  },
];

const FACTS = ["USDC sur Solana", "0 % de frais", "PnL lu on-chain"];

/** Le pied noir : la phrase et l'action, les liens, puis le nom en très grand, rogné par le bas. */
export function Footer() {
  return (
    <footer className="mt-20 overflow-hidden bg-ink text-white">
      <div className="mx-auto max-w-[1200px] px-4 pt-14 md:pt-20">
        <div className="flex flex-col gap-8 border-b border-white/10 pb-12 md:flex-row md:items-end md:justify-between">
          <p className="display text-[clamp(2.4rem,5vw,4.4rem)]">
            Trade <span className="accent text-volt">the future.</span>
          </p>
          <Link href="/app" className="pill-volt self-start md:self-auto">
            Lancer l&apos;application <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo size={22} on="plank" href="/" />
            <ul className="mt-6 flex flex-wrap gap-2">
              {FACTS.map((f) => (
                <li key={f} className="rounded-full border border-white/15 px-3 py-1 text-[13px] font-bold text-white/75">
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">{c.title}</h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block text-[15px] font-semibold text-white/85 transition hover:translate-x-[3px] hover:text-volt">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-5 text-[13px] font-semibold text-white/45 md:flex-row md:justify-between">
          <span>© 2026 Marketcoins</span>
          <span>Les marchés de prédiction comportent un risque de perte. Réservé aux majeurs.</span>
        </div>
      </div>

      {/* le nom, en très grand, qui sort par le bas de la page */}
      <div className="pointer-events-none select-none px-2 text-center leading-none" aria-hidden>
        <span className="display -mb-[0.2em] block whitespace-nowrap text-[17.5vw] text-blue md:text-[16vw]">
          Market<span className="accent text-white/90">coins</span>
        </span>
      </div>
    </footer>
  );
}
