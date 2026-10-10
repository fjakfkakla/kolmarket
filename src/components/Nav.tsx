"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Search } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSelect } from "./LanguageSelect";
import { useI18n } from "@/i18n/client";
import { useWallet } from "@/lib/wallet";
import { usd } from "@/lib/format";

const CATEGORIES = [
  { key: "trending", href: "/app" },
  { key: "kol", href: "/app?cat=kol" },
  { key: "memecoins", href: "/app?cat=memes" },
  { key: "challenge7d", href: "/market/kol-top-profit-7d" },
  { key: "challenge30d", href: "/market/kol-top-profit-30d" },
  { key: "race1b", href: "/market/premier-1md-fdv" },
] as const;

export function Nav() {
  const w = useWallet();
  const pathname = usePathname();
  const { t } = useI18n();
  const n = t.app.nav;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 md:gap-5">
        <Logo size={24} />

        <label className="relative hidden max-w-md flex-1 md:block">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input h-11 rounded-full bg-paper-2 pl-10" placeholder={n.search} />
        </label>

        <nav className="ml-auto flex items-center gap-2">
          <Link href="/how-it-works" className="round h-10 w-10" title={t.common.howItWorks} aria-label={t.common.howItWorks}>
            <CircleHelp size={18} />
          </Link>

          {!w.ready ? (
            <span className="h-10 w-44" aria-hidden />
          ) : w.connected ? (
            <>
              <Link
                href="/account"
                className={`hidden items-center gap-4 rounded-2xl px-3 py-1 transition hover:bg-paper-2 sm:flex ${pathname === "/account" ? "bg-paper-2" : ""}`}
              >
                <span className="text-right leading-tight">
                  <span className="block text-[12px] font-bold text-faint">{n.portfolio}</span>
                  <span className="num block font-display text-[16px] font-extrabold text-ink">{usd(w.balance + w.inPlay + w.excess, { cents: true })}</span>
                </span>
                <span className="text-right leading-tight">
                  <span className="block text-[12px] font-bold text-faint">{n.available}</span>
                  <span className="num block font-display text-[16px] font-extrabold text-up">{usd(w.balance, { cents: true })}</span>
                </span>
              </Link>
              <button onClick={() => w.openModal("deposit")} className="plaque h-10 px-4">
                {n.deposit}
              </button>
              <Link
                href="/account"
                aria-label={n.myAccount}
                className="coin h-10 w-10 text-[14px] transition hover:-translate-y-0.5"
                style={{ ["--coin" as string]: "linear-gradient(150deg,#4a76ff,#1652f0 50%,#0e3fd0)" }}
              >
                <span>{w.address!.slice(0, 2)}</span>
              </Link>
            </>
          ) : (
            <>
              <button onClick={() => w.openModal("connect")} className="ghost hidden h-10 rounded-full px-4 sm:inline-flex">
                {n.logIn}
              </button>
              <button onClick={() => w.openModal("connect")} className="plaque h-10 px-4">
                {n.signUp}
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
              key={c.key}
              href={c.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-bold transition ${
                active ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink hover:shadow-[inset_0_0_0_1px_#e6e9f2]"
              }`}
            >
              {n[c.key]}
            </Link>
          );
        })}
        <LanguageSelect className="ml-auto shrink-0" />
      </div>
    </header>
  );
}
