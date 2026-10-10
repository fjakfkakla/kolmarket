"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { CoinMarket, CoinOutcome } from "@/data/coins";
import type { Market } from "@/data/markets";
import { Avatar } from "./Avatar";
import { BetPanel } from "./BetPanel";
import { OutcomeCoin } from "./Coin";
import { Countdown } from "./Countdown";
import { LineChart } from "./LineChart";
import { RaceCard } from "./RaceCard";
import { ShareButtons } from "./ShareButtons";
import { useWallet } from "@/lib/wallet";
import { odds } from "@/lib/pot";
import { fmtDate, fmtOdds, pct, usd } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

const RANGES = [
  { id: "1S", label: "range1w", points: 8 },
  { id: "1M", label: "range1m", points: 30 },
  { id: "ALL", label: "rangeAll", points: 0 },
] as const;

/** Les dates de l'axe : un point par jour, le dernier aujourd'hui. */
function axisLabels(n: number, every: number, intl: string) {
  const end = new Date("2026-10-10T12:00:00+02:00").getTime();
  return Array.from({ length: n }, (_, i) =>
    (n - 1 - i) % every === 0 && i > 1 ? fmtDate(new Date(end - (n - 1 - i) * 86400000).toISOString(), intl) : "",
  );
}

/** Ajoute les mises de démo du joueur au pot (le marché memecoin n'existe pas encore en base). */
function withMyBets(market: CoinMarket, bets: { marketSlug: string; kolId: string; amount: number }[]): CoinMarket {
  const mine = bets.filter((b) => b.marketSlug === market.slug);
  if (mine.length === 0) return market;
  const pool = market.pool + mine.reduce((s, b) => s + b.amount, 0);
  const outcomes = market.outcomes.map((o) => {
    const p = o.pool + mine.filter((b) => b.kolId === o.id).reduce((s, b) => s + b.amount, 0);
    return { ...o, pool: p, prob: pool > 0 ? p / pool : 0 };
  });
  return { ...market, pool, outcomes };
}

function CoinOutcomeRow({ o, pot, active, onPick }: { o: CoinOutcome; pot: number; active: boolean; onPick: (scroll: boolean) => void }) {
  const { t } = useI18n();
  return (
    <li
      onClick={() => onPick(false)}
      className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition md:grid-cols-[1fr_130px_160px] md:px-5 ${
        active ? "bg-blue-soft/60" : "hover:bg-paper-2"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <OutcomeCoin outcome={o} size={44} />
        <div className="min-w-0">
          <div className="truncate text-[16px] font-bold">
            {o.name}
            {o.ticker && <span className="ml-1.5 text-[14px] font-semibold text-muted">${o.ticker}</span>}
          </div>
          <div className="num text-[13px] font-semibold text-muted">{fmt(t.market.staked, { amount: usd(o.pool) })}</div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 md:justify-center">
        <span className="num font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]">{pct(o.prob)}</span>
        <span className={`num flex items-center gap-0.5 text-[12.5px] font-bold ${o.change24h >= 0 ? "text-up" : "text-down"}`}>
          {o.change24h >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(o.change24h).toFixed(1)}
        </span>
      </div>
      <div className="col-span-2 md:col-span-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick(true);
          }}
          className={`h-11 w-full ${active ? "plaque" : "soft-up"}`}
        >
          {t.market.bet} <span className="num">{fmtOdds(odds(pot, o.pool), t.common.open)}</span>
        </button>
      </div>
    </li>
  );
}

export function CoinMarketView({ market: base, related }: { market: CoinMarket; related: Market[] }) {
  const { t, intl } = useI18n();
  const tc = t.market.coin;
  const w = useWallet();
  // Pas encore en base : en démo, les mises du joueur s'ajoutent au pot.
  const market = useMemo(() => (w.live ? base : withMyBets(base, w.bets)), [base, w.bets, w.live]);
  const [selectedId, setSelectedId] = useState(base.outcomes[0].id);
  const selected = market.outcomes.find((o) => o.id === selectedId) ?? market.outcomes[0];
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("ALL");

  const { series, labels } = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    const cut = (v: number[]) => (r.points ? v.slice(-r.points) : v);
    const s = market.outcomes.map((o) => ({ id: o.id, label: o.ticker ? `$${o.ticker}` : tc.none, color: o.tint[1], values: cut(o.series) }));
    const n = s[0].values.length;
    return { series: s, labels: axisLabels(n, r.points === 8 ? 2 : r.points === 30 ? 7 : 14, intl) };
  }, [market, range, tc.none, intl]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <header className="fade-up">
          <div className="flex items-start gap-4">
            <div className="hidden shrink-0 -space-x-3 sm:flex">
              {market.outcomes.slice(1, 4).map((o) => (
                <span key={o.id} className="rounded-full ring-[3px] ring-paper">
                  <OutcomeCoin outcome={o} size={52} />
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="chip-blue">{tc.memecoins}</span>
                <span className="chip">{fmt(tc.raceTo, { target: market.target })}</span>
                <span className="chip">{tc.poolNoFees}</span>
                {w.live && <span className="chip">{tc.openingSoon}</span>}
              </div>
              <h1 className="display text-[28px] md:text-[34px]">{market.title}</h1>
            </div>
            <ShareButtons />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {market.outcomes.map((o) => (
              <button key={o.id} onClick={() => setSelectedId(o.id)} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.tint[1] }} />
                {o.ticker ? `$${o.ticker}` : tc.none} <span className="num font-bold text-ink">{pct(o.prob)}</span>
              </button>
            ))}
          </div>
        </header>

        <section className="card fade-up p-4 md:p-5">
          <LineChart
            series={series}
            domain={[0, 1]}
            ticks={[1, 0.75, 0.5, 0.25, 0]}
            format={(v) => `${Math.round(v * 100)}%`}
            xLabels={labels}
            highlight={selected.id}
            height={300}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3.5 text-[14px] font-semibold text-muted">
            <span>
              {t.common.pool} <span className="num font-bold text-ink">{usd(market.pool)}</span>
            </span>
            <span>
              <span className="num font-bold text-ink">{market.traders.toLocaleString(intl)}</span> {t.market.players}
            </span>
            <Countdown to={market.closesAt} compact />
            <div className="seg ml-auto">
              {RANGES.map((r) => (
                <button key={r.id} className="seg-item" data-active={range === r.id} onClick={() => setRange(r.id)}>
                  {tc[r.label]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="fade-up">
          <RaceCard outcomes={market.outcomes} label={market.target} />
        </section>

        <section className="card fade-up overflow-hidden">
          <div className="hidden grid-cols-[1fr_130px_160px] gap-4 border-b border-line px-5 py-3 text-[13px] font-bold text-faint md:grid">
            <span>{tc.outcome}</span>
            <span className="text-center">{t.market.colShare}</span>
            <span className="text-center">{t.market.bet}</span>
          </div>
          <ul className="divide-y divide-line">
            {market.outcomes.map((o) => (
              <CoinOutcomeRow
                key={o.id}
                o={o}
                pot={market.pool}
                active={selected.id === o.id}
                onPick={(scroll) => {
                  setSelectedId(o.id);
                  if (scroll && window.innerWidth < 1024) document.getElementById("miser")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            ))}
          </ul>
        </section>

        <section className="card fade-up p-5" id="regles">
          <h2 className="mb-3 font-display text-[19px] font-extrabold tracking-[-0.02em]">{t.market.rules}</h2>
          <ol className="space-y-2.5 text-[15px] text-ink-2">
            {market.rules.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-soft text-[12.5px] font-bold text-blue">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">{fmt(t.market.source, { src: "DexScreener" })}</span>
            <span className="chip">{fmt(tc.closesOn, { date: fmtDate(market.closesAt, intl, { year: "numeric" }) })}</span>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <BetPanel
          marketSlug={market.slug}
          marketTitle={market.title}
          question={market.question}
          pot={market.pool}
          open
          soon
          choice={{
            id: selected.id,
            name: selected.ticker ? `$${selected.ticker}` : tc.none,
            pool: selected.pool,
            prob: selected.prob,
            visual: <OutcomeCoin outcome={selected} size={46} />,
          }}
        />
        {related.map((m) => (
          <Link key={m.slug} href={`/market/${m.slug}`} className="card card-hover flex items-center gap-3 p-4">
            <div className="flex -space-x-2">
              {m.outcomes.slice(0, 3).map((o) => (
                <Avatar key={o.kol.id} kol={o.kol} size={30} className="ring-2 ring-white" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold">{m.title}</div>
              <div className="num text-[13px] font-semibold text-muted">{t.common.pool} {usd(m.pool, { compact: true })}</div>
            </div>
            <span className="num font-display text-[20px] font-extrabold text-blue">{pct(m.outcomes[0].prob)}</span>
          </Link>
        ))}
      </aside>
    </div>
  );
}
