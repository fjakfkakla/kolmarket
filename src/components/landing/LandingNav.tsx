import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "../Logo";

const LINKS = [
  { label: "Trade the KOL", href: "#kol-anchor" },
  { label: "Memecoins", href: "#coins" },
  { label: "0 % de frais", href: "#frais" },
];

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-paper/88 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-4 md:h-[84px] md:px-8">
        <Logo size={26} href="/" />
        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-[15px] font-bold text-muted transition hover:bg-white hover:text-ink hover:shadow-[inset_0_0_0_1px_#e6e9f2]">
              {l.label}
            </a>
          ))}
        </nav>
        <Link href="/app" className="plaque ml-auto h-11 rounded-full px-5 text-[15px] lg:ml-0 md:h-12 md:px-6">
          <span className="sm:hidden">Lancer l&apos;app</span>
          <span className="hidden sm:inline">Lancer l&apos;application</span>
          <ArrowRight size={17} />
        </Link>
      </div>
    </header>
  );
}
