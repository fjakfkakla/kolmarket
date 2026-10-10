"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Search } from "lucide-react";
import { Logo } from "./Logo";
import { useWallet } from "@/lib/wallet";
import { usd } from "@/lib/format";

const CATEGORIES = [
  { label: "Tendances", href: "/app" },
  { label: "KOL", href: "/app?cat=kol" },
  { label: "Memecoins", href: "/app?cat=memes" },
  { label: "Défi 7 jours", href: "/market/kol-top-profit-7d" },
  { label: "Défi 30 jours", href: "/market/kol-top-profit-30d" },
  { label: "Course à 1 Md$", href: "/market/premier-1md-fdv" },
];

export function Nav() {
  const w = useWallet();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 md:gap-5">
        <Logo size={24} />

        <label className="relative hidden max-w-md flex-1 md:block">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input h-11 rounded-full bg-paper-2 pl-10" placeholder="Rechercher un KOL, un coin, un marché" />
        </label>

        <nav className="ml-auto flex items-center gap-2">
          <Link href="/comment-ca-marche" className="round h-10 w-10" title="Comment ça marche" aria-label="Comment ça marche">
            <CircleHelp size={18} />
          </Link>

          {!w.ready ? (
            <span className="h-10 w-44" aria-hidden />
          ) : w.connected ? (
            <>
              <Link
                href="/compte"
                className={`hidden items-center gap-4 rounded-2xl px-3 py-1 transition hover:bg-paper-2 sm:flex ${pathname === "/compte" ? "bg-paper-2" : ""}`}
              >
                <span className="text-right leading-tight">
                  <span className="block text-[12px] font-bold text-faint">Portefeuille</span>
                  <span className="num block font-display text-[16px] font-extrabold text-ink">{usd(w.balance + w.inPlay + w.excess, { cents: true })}</span>
                </span>
                <span className="text-right leading-tight">
                  <span className="block text-[12px] font-bold text-faint">Disponible</span>
                  <span className="num block font-display text-[16px] font-extrabold text-up">{usd(w.balance, { cents: true })}</span>
                </span>
              </Link>
              <button onClick={() => w.openModal("deposit")} className="plaque h-10 px-4">
                Déposer
              </button>
              <Link
                href="/compte"
                aria-label="Mon compte"
                className="coin h-10 w-10 text-[14px] transition hover:-translate-y-0.5"
                style={{ ["--coin" as string]: "linear-gradient(150deg,#4a76ff,#1652f0 50%,#0e3fd0)" }}
              >
                <span>{w.address!.slice(0, 2)}</span>
              </Link>
            </>
          ) : (
            <>
              <button onClick={() => w.openModal("connect")} className="ghost hidden h-10 rounded-full px-4 sm:inline-flex">
                Se connecter
              </button>
              <button onClick={() => w.openModal("connect")} className="plaque h-10 px-4">
                S&apos;inscrire
              </button>
            </>
          )}
        </nav>
      </div>

      <div className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto px-4 pb-2.5 scrollbar-none">
        {CATEGORIES.map((c) => {
          const active = c.href === pathname;
          return (
            <Link
              key={c.label}
              href={c.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-bold transition ${
                active ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink hover:shadow-[inset_0_0_0_1px_#e6e9f2]"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
