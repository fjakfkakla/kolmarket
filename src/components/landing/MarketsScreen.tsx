"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { COIN_MARKETS, type CoinOutcome } from "@/data/coins";
import { COIN_BETS, FEATURED_BET, type BetChoice, type CoinBet } from "@/data/coin-bets";
import { OutcomeCoin } from "../Coin";
import { LineChart } from "../LineChart";
import { fmtDate, fmtOdds, pct, usd } from "@/lib/format";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { AppLink } from "./AppLink";
import { BrowserBar, MiniAppNav } from "./KolScreen";

const COINS = new Map(COIN_MARKETS[0].outcomes.filter((o) => o.ticker).map((o) => [o.id, o]));
const coin = (id?: string) => (id ? COINS.get(id) : undefined) as CoinOutcome | undefined;
const LINES = ["#1652f0", "#1fc46f", "#8b6cf0"];

function useBetText() {
  const { t, intl } = useI18n();
  const M = t.landing.markets;
  const title = (b: CoinBet) => fmt(M.titles[b.title], { ...b.params, date: fmtDate(b.closesAt, intl) });
  const word = (c: BetChoice) => (c.word ? M[c.word] : c.label);
  return { M, title, word, intl };
}

/** Cote du pot commun pour une part donnée : 1 $ misé rapporte pot / mise sur ce résultat. */
const oddsOf = (p: number) => fmtOdds(p > 0 ? 1 / p : null);

function Foot({ b }: { b: CoinBet }) {
  const { M, intl } = useBetText();
  return (
    <div className="mt-auto flex items-center gap-2 pt-3 text-[11.5px] font-semibold text-faint">
      <span className="num">{fmt(M.pot, { amount: usd(b.pool, { compact: true }) })}</span>
      <span>·</span>
      <span>{fmt(M.ends, { date: fmtDate(b.closesAt, intl) })}</span>
      {b.isNew && <span className="chip-blue ml-auto h-5 px-2 text-[10.5px]">{M.isNew}</span>}
    </div>
  );
}

function Gauge({ p }: { p: number }) {
  const { M } = useBetText();
  return (
    <div className="relative grid h-[52px] w-[52px] shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className="h-[52px] w-[52px] -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" stroke="#eef1f9" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={p >= 0.5 ? "#00a03c" : "#1652f0"} strokeWidth="3.5" strokeDasharray={`${p * 94.2} 94.2`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-center leading-none">
        <span className="num block text-[12px] font-extrabold">{pct(p)}</span>
        <span className="block text-[9px] font-semibold text-faint">{M.chance}</span>
      </span>
    </div>
  );
}

function CardHead({ b, gauge }: { b: CoinBet; gauge?: number }) {
  const { title } = useBetText();
  const a = coin(b.coin);
  const c2 = coin(b.coin2);
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="relative shrink-0">
        {a && <OutcomeCoin outcome={a} size={38} />}
        {c2 && (
          <span className="absolute -bottom-1 -right-2 rounded-full ring-[2.5px] ring-white">
            <OutcomeCoin outcome={c2} size={20} />
          </span>
        )}
      </span>
      <div className="line-clamp-3 flex-1 text-[14.5px] font-bold leading-snug">{title(b)}</div>
      {gauge !== undefined && <Gauge p={gauge} />}
    </div>
  );
}

function BetCard({ b }: { b: CoinBet }) {
  const { M, word } = useBetText();
  const [x, y] = b.choices;

  return (
    <div className="card card-hover flex h-full flex-col p-4">
      {b.kind === "binary" && (
        <>
          <CardHead b={b} gauge={x.prob} />
          <div className="grid grid-cols-2 gap-2">
            <span className="soft-up h-9 rounded-[11px] text-[13px]">{M.yes} <span className="num">{oddsOf(x.prob)}</span></span>
            <span className="soft-down h-9 rounded-[11px] text-[13px]">{M.no} <span className="num">{oddsOf(y.prob)}</span></span>
          </div>
        </>
      )}

      {b.kind === "updown" && (
        <>
          <CardHead b={b} />
          <div className="mb-2 flex h-2 overflow-hidden rounded-full">
            <span className="bg-up" style={{ width: `${x.prob * 100}%` }} />
            <span className="bg-down" style={{ width: `${y.prob * 100}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="soft-up h-9 rounded-[11px] text-[13px]"><TrendingUp size={14} /> {word(x)} {pct(x.prob)}</span>
            <span className="soft-down h-9 rounded-[11px] text-[13px]"><TrendingDown size={14} /> {word(y)} {pct(y.prob)}</span>
          </div>
        </>
      )}

      {b.kind === "versus" && (
        <>
          <CardHead b={b} />
          <div className="mb-2 flex items-center justify-between text-[13px] font-bold">
            <span className="flex items-center gap-1.5">{coin(x.coin) && <OutcomeCoin outcome={coin(x.coin)!} size={22} />}{x.label} <span className="num text-blue">{pct(x.prob)}</span></span>
            <span className="text-[11px] text-faint">VS</span>
            <span className="flex items-center gap-1.5"><span className="num text-blue">{pct(y.prob)}</span> {y.label}{coin(y.coin) && <OutcomeCoin outcome={coin(y.coin)!} size={22} />}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full">
            <span className="bg-blue" style={{ width: `${x.prob * 100}%` }} />
            <span className="bg-blue-sky" style={{ width: `${y.prob * 100}%` }} />
          </div>
        </>
      )}

      {(b.kind === "multi" || b.kind === "range") && (
        <>
          <CardHead b={b} />
          <ul className="space-y-1.5">
            {b.choices.slice(0, 3).map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-[13px]">
                {coin(c.coin) && <OutcomeCoin outcome={coin(c.coin)!} size={20} />}
                <span className="num flex-1 truncate font-semibold">{c.label}</span>
                <span className="num w-9 text-right font-extrabold">{pct(c.prob)}</span>
                <span className="soft-up h-7 rounded-[9px] px-2 text-[11.5px]">{M.yes}</span>
                <span className="soft-down h-7 rounded-[9px] px-2 text-[11.5px]">{M.no}</span>
              </li>
            ))}
          </ul>
          {b.choices.length > 3 && <div className="mt-1.5 text-[11.5px] font-semibold text-faint">{fmt(M.more, { n: b.choices.length - 3 })}</div>}
        </>
      )}

      <Foot b={b} />
    </div>
  );
}

function FeaturedCard() {
  const { M, title } = useBetText();
  const b = FEATURED_BET;
  const a = coin(b.coin)!;
  const series = (b.series ?? []).map((values, i) => ({ id: b.choices[i].label, label: b.choices[i].label, color: LINES[i], values }));
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-3 flex items-center gap-3">
        <OutcomeCoin outcome={a} size={46} />
        <div className="min-w-0">
          <span className="chip-blue mb-1 h-6 gap-1 text-[11.5px]"><Flame size={12} /> {M.featured}</span>
          <div className="display text-[22px] leading-tight">{title(b)}</div>
        </div>
      </div>
      <div className="grid flex-1 gap-4 md:grid-cols-[1fr_1.1fr]">
        <ul className="space-y-1">
          {b.choices.map((c, i) => (
            <li key={c.label} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13.5px] odd:bg-relief-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LINES[i] ?? "#d6dcee" }} />
              <span className="num flex-1 font-bold">{c.label}</span>
              <span className="num w-10 text-right font-display text-[16px] font-extrabold">{pct(c.prob)}</span>
              <span className="soft-up h-8 rounded-[10px] px-2.5 text-[12px]">{M.yes} <span className="num">{oddsOf(c.prob)}</span></span>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <LineChart series={series} height={190} domain={[0, 0.5]} ticks={[0.4, 0.25, 0.1]} format={(v) => pct(v)} interactive={false} />
        </div>
      </div>
      <Foot b={b} />
    </div>
  );
}

/** Un écran de l'app « tous les marchés memecoins » : on voit qu'il y a bien plus qu'un pari. */
export function MarketsScreen() {
  const { t } = useI18n();
  const M = t.landing.markets;
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const side = COIN_BETS.slice(0, 2);
  const rest = COIN_BETS.slice(2);

  return (
    <section ref={ref} id="markets" className="relative px-4 py-20 md:px-8 md:py-28" aria-label={t.landing.nav.markets}>
      <div className="mx-auto max-w-[1240px]">
        <div className={`mx-auto mb-10 max-w-3xl text-center ${seen ? "fade-up" : "opacity-0"}`}>
          <span className="chip-blue h-7 text-[13px]">{M.kicker}</span>
          <h2 className="display mt-4 text-[clamp(36px,5vw,76px)]">
            Every move is a <span className="text-blue">market.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[56ch] text-[17px] font-medium leading-relaxed text-ink-2">{M.subtitle}</p>
        </div>

        <div className={`glass p-2.5 md:p-3 ${seen ? "fade-up" : "opacity-0"}`}>
          <div className="overflow-hidden rounded-[24px] bg-white text-ink">
            <BrowserBar url="marketcoins.app/app?cat=memecoins" />
            <div className="md:hidden"><MiniAppNav compact /></div>
            <div className="max-md:hidden"><MiniAppNav /></div>
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto border-b border-line px-5 py-2.5">
              {M.tabs.map((tab, i) => (
                <span key={tab} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${i === 0 ? "bg-ink text-white" : "bg-relief text-muted"}`}>{tab}</span>
              ))}
            </div>

            <div className={`space-y-4 bg-paper-2/60 p-4 md:p-5 ${seen ? "stagger" : ""}`}>
              <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
                <FeaturedCard />
                <div className="grid gap-4">
                  {side.map((b) => <BetCard key={b.id} b={b} />)}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {rest.map((b, i) => (
                  <div key={b.id} className={i >= 3 ? "max-sm:hidden" : ""}>
                    <BetCard b={b} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <AppLink href="/app?cat=memes" className="plaque h-12 px-6 text-[15px]">
            {M.seeAll} <ArrowRight size={17} />
          </AppLink>
        </div>
      </div>
    </section>
  );
}
