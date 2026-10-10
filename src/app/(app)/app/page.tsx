import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BinaryCard } from "@/components/BinaryCard";
import { OutcomeCoin } from "@/components/Coin";
import { CoinMarketCard, MarketCard } from "@/components/MarketCard";
import { Countdown } from "@/components/Countdown";
import { COIN_MARKETS } from "@/data/coins";
import { BINARY_MARKETS } from "@/data/markets";
import { getKols, getMarkets, requestTime } from "@/lib/data";
import { pct, pnlClass, usd } from "@/lib/format";
import { currentChallenge, currentMarkets } from "@/lib/market-select";
import { marketPhase } from "@/lib/challenge-calendar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marchés" };

type Cat = "all" | "kol" | "memes";

export default async function AppHome({ searchParams }: { searchParams: Promise<{ period?: string; cat?: string }> }) {
  const [sp, ALL, KOLS] = await Promise.all([searchParams, getMarkets(), getKols()]);
  const now = requestTime();
  const period = sp.period === "7D" || sp.period === "30D" ? sp.period : null;
  const cat: Cat = sp.cat === "kol" || sp.cat === "memes" ? sp.cat : "all";
  // Défis à mises ouvertes, en cours, ou terminés depuis moins d'une semaine
  const MARKETS = currentMarkets(ALL, now);
  const featured = currentChallenge(ALL, "7D", now) ?? MARKETS[0] ?? ALL[0];
  const featuredOpen = marketPhase(featured, now) === "betting";

  const markets = period ? MARKETS.filter((m) => m.period === period) : MARKETS;
  const binaries = period ? BINARY_MARKETS.filter((b) => b.period === period) : BINARY_MARKETS;
  const showKol = cat !== "memes";
  const showMemes = cat !== "kol" && !period;

  const FILTERS: { label: string; href: string; active: boolean }[] = [
    { label: "Tous", href: "/app", active: cat === "all" && !period },
    { label: "KOL", href: "/app?cat=kol", active: cat === "kol" && !period },
    { label: "Memecoins", href: "/app?cat=memes", active: cat === "memes" },
    { label: "7 jours", href: "/app?period=7D", active: period === "7D" },
    { label: "30 jours", href: "/app?period=30D", active: period === "30D" },
  ];

  return (
    <div className="space-y-8">
      {/* Le défi en vedette, sur la planche */}
      <section className="planche fade-up p-6 md:p-8">
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="chip bg-white/16 text-white">Défi #{featured.challenge}</span>
              <span className="chip bg-white/16 text-white">KOL · 7 jours</span>
              <span className="chip bg-white/16 text-white">Pot commun · 0 frais</span>
            </div>
            <h1 className="display max-w-2xl text-[32px] md:text-[46px]">
              Quel KOL fera le plus de profit <span className="text-blue-sky">cette semaine ?</span>
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href={`/market/${featured.slug}`} className="pill-white">
                {featuredOpen ? "Miser maintenant" : "Voir le défi"} <ArrowRight size={18} />
              </Link>
              <div className="flex -space-x-2.5">
                {KOLS.map((k) => (
                  <Avatar key={k.id} kol={k} size={36} className="ring-[3px] ring-[#3a64ff]" />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-[22px] bg-white p-5 text-ink shadow-[0_24px_44px_-26px_rgba(5,18,60,.7)] md:w-[300px]">
            {featuredOpen ? <Countdown to={featured.closesAt} /> : <Countdown to={featured.endsAt} label="Fin du défi" />}
            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between">
                <span className="font-semibold text-muted">Favori</span>
                <span className="flex items-center gap-1.5 font-bold">
                  <Avatar kol={featured.outcomes[0].kol} size={20} /> {featured.outcomes[0].kol.name}
                  <span className="num text-blue">{pct(featured.outcomes[0].prob)}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-muted">Pot commun</span>
                <span className="num font-bold">{usd(featured.pool, { compact: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-muted">Frais</span>
                <span className="font-bold text-blue">0 %</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-5">
          <nav className="flex gap-1.5 overflow-x-auto scrollbar-none lg:flex-col" aria-label="Filtres">
            {FILTERS.map((f) => (
              <Link
                key={f.label}
                href={f.href}
                className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-bold transition lg:rounded-2xl ${
                  f.active ? "bg-ink text-white" : "bg-white text-muted shadow-[inset_0_0_0_1px_#e6e9f2] hover:text-ink"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
          <div className="card hidden p-2 lg:block">
            <div className="px-3 pb-1 pt-2 font-display text-[16px] font-extrabold tracking-[-0.02em]">KOLs suivis</div>
            {KOLS.map((k) => (
              <Link key={k.id} href={`/market/${featured.slug}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-semibold text-ink-2 transition hover:bg-paper-2">
                <Avatar kol={k} size={26} /> <span className="flex-1 truncate">{k.name}</span>
                <span className={`num text-[13px] font-bold ${pnlClass(k.pnl7d)}`}>{usd(k.pnl7d, { compact: true, sign: true })}</span>
              </Link>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-9">
          {showKol && markets.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-[24px] font-extrabold tracking-[-0.025em]">Défis KOL</h2>
              <div className="stagger grid gap-4 sm:grid-cols-2">
                {markets.map((m) => (
                  <MarketCard key={m.slug} market={m} now={now} />
                ))}
              </div>
            </section>
          )}

          {showMemes && (
            <section>
              <h2 className="mb-3 flex items-center gap-2.5 font-display text-[24px] font-extrabold tracking-[-0.025em]">
                Memecoins
                <span className="flex -space-x-1.5">
                  {COIN_MARKETS[0].outcomes.slice(1, 4).map((o) => (
                    <OutcomeCoin key={o.id} outcome={o} size={22} />
                  ))}
                </span>
              </h2>
              <div className="stagger grid gap-4 sm:grid-cols-2">
                {COIN_MARKETS.map((m) => (
                  <CoinMarketCard key={m.slug} market={m} />
                ))}
              </div>
            </section>
          )}

          {showKol && binaries.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-[24px] font-extrabold tracking-[-0.025em]">Oui ou Non</h2>
              <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {binaries.map((b) => (
                  <BinaryCard key={b.slug} market={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
