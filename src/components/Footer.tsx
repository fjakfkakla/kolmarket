import Link from "next/link";
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
      { label: "Accueil", href: "/" },
    ],
  },
];

/** Le pied : la marque et sa phrase, les sections, l'accès. Rien d'autre (DA §14.2). */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo size={24} />
          <p className="display mt-6 text-[clamp(2.1rem,4.2vw,3.4rem)]">
            Trade <span className="text-blue">the future.</span>
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 font-display text-[18px] font-extrabold tracking-[-0.02em]">{c.title}</h4>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block text-[15px] font-semibold text-[#4a5468] transition hover:translate-x-[3px] hover:text-blue active:translate-y-px">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1200px] border-t border-line px-4 py-5 text-[15px] font-semibold text-faint">© 2026 Marketcoins</div>
    </footer>
  );
}
