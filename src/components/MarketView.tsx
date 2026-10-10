"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, ChevronDown, Code2, ExternalLink, Link2, Send, TrendingDown, TrendingUp } from "lucide-react";
import type { Market, Period } from "@/data/markets";
import type { Kol } from "@/data/kols";
import { Avatar } from "./Avatar";
import { Countdown } from "./Countdown";
import { CopyButton } from "./CopyButton";
import { PnlChart } from "./PnlChart";
import { Podium } from "./Podium";
import { TradePanel } from "./TradePanel";
import { cents, fmtDate, pct, shortWallet, usd } from "@/lib/format";
import { INTL_LOCALE, fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

/** `ago` en secondes. */
const ACTIVITY = [
  { who: "7Gx2…xVq", side: "OUI", who2: "Cooker", amt: 250, price: 0.33, ago: 12 },
  { who: "Bq91…aa4", side: "NON", who2: "zeropnl", amt: 40, price: 0.93, ago: 48 },
  { who: "3Fkd…m0P", side: "OUI", who2: "Cented", amt: 120, price: 0.22, ago: 120 },
  { who: "9zLm…Qe7", side: "OUI", who2: "decu", amt: 75, price: 0.21, ago: 180 },
  { who: "Hh3s…k2R", side: "NON", who2: "Cooker", amt: 500, price: 0.67, ago: 300 },
];

export function MarketView({ market, kols: KOLS, sibling }: { market: Market; kols: Kol[]; sibling?: Market }) {
  const [selected, setSelected] = useState(market.outcomes[0]);
  const [side, setSide] = useState<"OUI" | "NON">("OUI");
  const [period, setPeriod] = useState<Period>(market.period);
  const [open, setOpen] = useState<"book" | "activity" | null>("activity");
  const pnlKey = period === "7D" ? "pnl7d" : "pnl30d";
  const { locale, t } = useI18n();
  const tm = t.market;
  const intl = INTL_LOCALE[locale];
  const sideLabel = (s: string) => (s === "OUI" ? t.common.yes : t.common.no);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Header */}
        <div className="fade-up">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="pill-gold">{fmt(t.common.challenge, { n: market.challenge })}</span>
            <span className="pill-muted">KOL · {market.period}</span>
            <span className="pill-muted">{fmtDate(market.startsAt, intl)} → {fmtDate(market.endsAt, intl)}</span>
            <span className="ml-auto flex items-center gap-1 text-muted">
              <Code2 size={16} className="cursor-pointer hover:text-ink" />
              <Link2 size={16} className="cursor-pointer hover:text-ink" />
              <Bookmark size={16} className="cursor-pointer hover:text-ink" />
            </span>
          </div>
          <div className="mt-3 flex items-start gap-4">
            <div className="flex -space-x-3">
              {market.outcomes.slice(0, 4).map((o) => (
                <Avatar key={o.kol.id} kol={o.kol} size={44} className="ring-2 ring-cream" />
              ))}
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight md:text-3xl">{market.title}</h1>
              <p className="mt-1 text-sm text-muted">
                {usd(market.volume, { compact: true })} {t.common.vol} · {market.traders} {t.common.traders} · {t.common.pool.toLowerCase()} {usd(market.pool, { compact: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats + countdown */}
        <div className="card flex flex-wrap items-center justify-between gap-6 p-5 fade-up">
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">{tm.favorite}</div>
              <div className="mt-1 flex items-center gap-2 font-bold">
                <Avatar kol={market.outcomes[0].kol} size={22} /> {market.outcomes[0].kol.name}
                <span className="text-up">{pct(market.outcomes[0].prob)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">{fmt(tm.pnlLeader, { period: market.period })}</div>
              <div className="mono mt-1 text-xl font-bold text-up">
                {usd(Math.max(...KOLS.map((k) => k[market.period === "7D" ? "pnl7d" : "pnl30d"])), { compact: true, sign: true })}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t.common.pool}</div>
              <div className="mono mt-1 text-xl font-bold">{usd(market.pool, { compact: true })}</div>
            </div>
          </div>
          <Countdown to={market.closesAt} />
        </div>

        {/* Chart */}
        <div className="card p-5 fade-up">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="font-bold">{tm.pnlRace}</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-down live-dot" /> {tm.updated}
            </span>
            <div className="seg ml-auto">
              {(["7D", "30D"] as Period[]).map((p) => (
                <button key={p} className="seg-item" data-active={period === p} onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <PnlChart kols={KOLS} period={period} highlight={selected.kol.id} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {KOLS.map((k) => (
              <button
                key={k.id}
                onClick={() => setSelected(market.outcomes.find((o) => o.kol.id === k.id)!)}
                className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition ${selected.kol.id === k.id ? "bg-cream-2 font-semibold" : "text-muted hover:text-ink"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: k.color }} /> {k.name}
              </button>
            ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="card overflow-hidden fade-up">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid-cols-[1fr_120px_90px_200px]">
            <span>{tm.outcome}</span>
            <span className="hidden text-right md:block">PnL {market.period}</span>
            <span className="text-right">{tm.chance}</span>
            <span className="text-right md:text-center">{tm.trade}</span>
          </div>
          <ul className="stagger">
            {market.outcomes.map((o, i) => {
              const active = selected.kol.id === o.kol.id;
              return (
                <li
                  key={o.kol.id}
                  onClick={() => setSelected(o)}
                  className={`grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-line px-5 py-3 transition md:grid-cols-[1fr_120px_90px_200px] ${active ? "bg-gold-soft/40" : "hover:bg-cream-2/60"}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-4 text-xs font-bold text-muted">{i + 1}</span>
                    <Avatar kol={o.kol} size={38} ring={active} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {o.kol.name}
                        {i === 0 && <span className="pill-gold py-0 text-[10px]">{tm.favoriteTag}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <a href={`https://x.com/${o.kol.handle}`} target="_blank" rel="noreferrer" className="hover:text-ink" onClick={(e) => e.stopPropagation()}>@{o.kol.handle}</a>
                        <span>·</span>
                        <span className="mono whitespace-nowrap">{shortWallet(o.kol.wallet)}</span>
                        <CopyButton value={o.kol.wallet} />
                      </div>
                    </div>
                  </div>
                  <div className="mono hidden text-right font-semibold text-up md:block">{usd(o.kol[pnlKey], { compact: true, sign: true })}</div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{pct(o.prob)}</div>
                    <div className={`flex items-center justify-end gap-0.5 text-[11px] ${o.change24h >= 0 ? "text-up" : "text-down"}`}>
                      {o.change24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {Math.abs(o.change24h).toFixed(1)} {tm.pts}
                    </div>
                  </div>
                  <div className="col-span-3 grid grid-cols-2 gap-2 md:col-span-1">
                    <button onClick={(e) => { e.stopPropagation(); setSelected(o); setSide("OUI"); }} className={`btn py-2 ${active && side === "OUI" ? "bg-up text-white" : "btn-up"}`}>
                      {t.common.yes} {cents(o.prob)}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelected(o); setSide("NON"); }} className={`btn py-2 ${active && side === "NON" ? "bg-down text-white" : "btn-down"}`}>
                      {t.common.no} {cents(1 - o.prob)}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Podium */}
        <div className="fade-up">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-bold">{fmt(tm.leaderboard, { period })}</h2>
            <span className="text-xs text-muted">{tm.leaderboardHint}</span>
          </div>
          <Podium kols={KOLS} period={period} />
        </div>

        {/* Order book / activity */}
        <div className="card fade-up">
          <button onClick={() => setOpen(open === "book" ? null : "book")} className="flex w-full items-center justify-between px-5 py-4 font-bold">
            <span>{tm.orderBook} <span className="ml-2 text-xs font-normal text-muted">{selected.kol.name} · {sideLabel(side)}</span></span>
            <span className="flex items-center gap-3 text-xs font-normal text-muted">{usd(market.volume * 0.12, { compact: true })} {t.common.vol} <ChevronDown size={16} className={`transition ${open === "book" ? "rotate-180" : ""}`} /></span>
          </button>
          {open === "book" && (
            <div className="grid gap-0 border-t border-line text-sm md:grid-cols-2 pop">
              {[tm.buyers, tm.sellers].map((col, ci) => (
                <div key={col} className={ci === 0 ? "border-b border-line md:border-b-0 md:border-r" : ""}>
                  <div className="grid grid-cols-3 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <span>{col}</span><span className="text-right">{tm.price}</span><span className="text-right">{tm.total}</span>
                  </div>
                  {[0, 1, 2, 3, 4].map((r) => {
                    const base = side === "OUI" ? selected.prob : 1 - selected.prob;
                    const p = ci === 0 ? base - 0.01 * (r + 1) : base + 0.01 * (r + 1);
                    const qty = Math.round(400 + ((r * 977 + ci * 311) % 2600));
                    const w = Math.min(100, (qty / 3000) * 100);
                    return (
                      <div key={r} className="relative grid grid-cols-3 px-5 py-1.5">
                        <span className="absolute inset-y-0 left-0 opacity-[0.12]" style={{ width: `${w}%`, background: ci === 0 ? "#16a34a" : "#dc2626" }} />
                        <span className="mono relative">{qty.toLocaleString(intl)}</span>
                        <span className={`mono relative text-right font-semibold ${ci === 0 ? "text-up" : "text-down"}`}>{cents(Math.max(0.01, Math.min(0.99, p)))}</span>
                        <span className="mono relative text-right text-muted">{usd(qty * p)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setOpen(open === "activity" ? null : "activity")} className="flex w-full items-center justify-between border-t border-line px-5 py-4 font-bold">
            <span>{tm.activity}</span>
            <ChevronDown size={16} className={`text-muted transition ${open === "activity" ? "rotate-180" : ""}`} />
          </button>
          {open === "activity" && (
            <ul className="border-t border-line pop">
              {ACTIVITY.map((a, i) => {
                const k = KOLS.find((x) => x.name === a.who2) ?? KOLS[0];
                return (
                  <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="mono grid h-7 w-7 place-items-center rounded-full bg-cream-2 text-[10px] font-bold">{a.who.slice(0, 2)}</span>
                    <span className="mono text-xs text-muted">{a.who}</span>
                    <span>{tm.bought}</span>
                    <span className={`font-semibold ${a.side === "OUI" ? "text-up" : "text-down"}`}>{sideLabel(a.side)}</span>
                    <Avatar kol={k} size={18} /> <span className="font-semibold">{a.who2}</span>
                    <span className="text-muted">{tm.at} {cents(a.price)}</span>
                    <span className="mono ml-auto font-semibold">{usd(a.amt)}</span>
                    <span className="hidden text-xs text-muted sm:inline">{a.ago < 60 ? fmt(tm.agoSec, { n: a.ago }) : fmt(tm.agoMin, { n: Math.round(a.ago / 60) })}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Rules */}
        <div className="card p-5 fade-up" id="regles">
          <h2 className="mb-3 font-bold">{tm.rules}</h2>
          <ol className="space-y-2 text-sm text-muted">
            {market.rules.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-soft text-[11px] font-bold text-gold-3">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="pill-muted">{tm.resolution}</span>
            <span className="pill-muted">{tm.source}</span>
          </div>
        </div>

        {/* Traders & wallets */}
        <div className="card p-5 fade-up">
          <h2 className="mb-3 font-bold">{tm.tracked}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {KOLS.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-gold">
                <Avatar kol={k} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{k.name}</div>
                  <div className="mono flex items-center gap-1 text-xs text-muted">{shortWallet(k.wallet)} <CopyButton value={k.wallet} /></div>
                </div>
                <div className="flex items-center gap-1 text-muted">
                  <a href={`https://x.com/${k.handle}`} target="_blank" rel="noreferrer" className="grid h-7 w-7 place-items-center rounded-md hover:bg-cream-2 hover:text-ink" title="X">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.8-8.9L0 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L6.4 3.9H4.4L17.7 20z"/></svg>
                  </a>
                  <a href={`https://solscan.io/account/${k.wallet}`} target="_blank" rel="noreferrer" className="grid h-7 w-7 place-items-center rounded-md hover:bg-cream-2 hover:text-ink" title="Solscan">
                    <ExternalLink size={13} />
                  </a>
                  <span className="grid h-7 w-7 place-items-center rounded-md" title="Telegram"><Send size={13} /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <TradePanel market={market} outcome={selected} side={side} onSide={setSide} />
        {sibling && (
          <Link href={`/market/${sibling.slug}`} className="card card-hover flex items-center gap-3 p-4">
            <div className="flex -space-x-2">
              {sibling.outcomes.slice(0, 3).map((o) => <Avatar key={o.kol.id} kol={o.kol} size={26} className="ring-2 ring-white" />)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{sibling.title}</div>
              <div className="text-xs text-muted">{sibling.period} · {usd(sibling.volume, { compact: true })} {t.common.vol}</div>
            </div>
            <span className="font-bold text-up">{pct(sibling.outcomes[0].prob)}</span>
          </Link>
        )}
      </aside>
    </div>
  );
}
