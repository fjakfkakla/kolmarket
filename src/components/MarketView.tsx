"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban, CheckCircle2, ChevronDown, Clock, ExternalLink, Trophy } from "lucide-react";
import type { Market, Outcome, Period } from "@/data/markets";
import type { Kol } from "@/data/kols";
import { Avatar } from "./Avatar";
import { BetPanel } from "./BetPanel";
import { Coin } from "./Coin";
import { Countdown } from "./Countdown";
import { CopyButton } from "./CopyButton";
import { PnlChart } from "./PnlChart";
import { Podium } from "./Podium";
import { ShareButtons } from "./ShareButtons";
import { PHASE } from "./MarketCard";
import { type Bet, useWallet } from "@/lib/wallet";
import { MAX_STAKE_PER_MARKET } from "@/lib/limits";
import { odds } from "@/lib/pot";
import { useNow } from "@/lib/useNow";
import { CORRECTION_HOURS, RESOLVE_DELAY_HOURS, type Phase, marketPhase } from "@/lib/challenge-calendar";
import { fmtDate, fmtOdds, pct, pnlClass, shortWallet, usd } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import type { ClientDictionary } from "@/i18n/messages";

/** Activité d'exemple pour les données mock (sans base). */
const MOCK_ACTIVITY = [
  { id: "1", who: "7Gx2…xVq", kolId: "cooker", amount: 250, secs: 12 },
  { id: "2", who: "Bq91…aa4", kolId: "zeropnl", amount: 40, secs: 48 },
  { id: "3", who: "3Fkd…m0P", kolId: "cented", amount: 120, secs: 120 },
  { id: "4", who: "9zLm…Qe7", kolId: "decu", amount: 75, secs: 180 },
  { id: "5", who: "Hh3s…k2R", kolId: "cooker", amount: 500, secs: 300 },
];

type Ago = ClientDictionary["market"]["ago"];

function agoSecs(s: number, a: Ago) {
  if (s < 60) return fmt(a.s, { n: s });
  if (s < 3600) return fmt(a.min, { n: Math.floor(s / 60) });
  if (s < 86400) return fmt(a.h, { n: Math.floor(s / 3600) });
  return fmt(a.d, { n: Math.floor(s / 86400) });
}

function ago(at: string, now: number | null, a: Ago) {
  if (now === null) return "";
  return agoSecs(Math.max(0, Math.round((now - Date.parse(at)) / 1000)), a);
}

/** Ajoute les mises de démo du joueur au pot (les vraies mises sont déjà comptées par le serveur). */
function withMyBets(market: Market, bets: Bet[]): Market {
  const mine = bets.filter((b) => b.marketSlug === market.slug);
  if (mine.length === 0) return market;
  const extra = (kolId: string) => mine.filter((b) => b.kolId === kolId).reduce((s, b) => s + b.amount, 0);
  const pool = market.pool + mine.reduce((s, b) => s + b.amount, 0);
  const outcomes = market.outcomes.map((o) => {
    const p = o.pool + extra(o.kol.id);
    return { ...o, pool: p, prob: pool > 0 ? p / pool : 0 };
  });
  return { ...market, pool, outcomes };
}

const HOUR = 3600_000;
/** « Monday, Oct 19, 12:00 PM UTC » / « lundi 19 oct., 12:00 UTC » */
const when = (ms: number, intl: string) =>
  `${fmtDate(new Date(ms).toISOString(), intl, { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;

/** Où en est le défi : mises fermées, résultat proposé, payé ou annulé. */
function PhaseBanner({ market, phase, kols, now }: { market: Market; phase: Phase; kols: Kol[]; now: number }) {
  const { t, intl } = useI18n();
  const b = t.market.banner;
  const winner = kols.find((k) => k.id === market.winnerId);
  const resultAt = Math.ceil((Date.parse(market.endsAt) + RESOLVE_DELAY_HOURS * HOUR) / HOUR) * HOUR;
  const payAt = market.proposedAt ? Date.parse(market.proposedAt) + CORRECTION_HOURS * HOUR : null;
  const nobodyOnWinner = winner && market.outcomes.every((o) => o.pool === 0);
  const box = (tint: [string, string, string], icon: React.ReactNode, title: string, body?: React.ReactNode) => (
    <div className="card fade-up flex items-start gap-3.5 p-4">
      <Coin tint={tint} size={36}>
        {icon}
      </Coin>
      <div className="text-[15px]">
        <div className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{title}</div>
        {body && <div className="mt-0.5 text-ink-2">{body}</div>}
      </div>
    </div>
  );
  const BLUE: [string, string, string] = ["#4a76ff", "#1652f0", "#0e3fd0"];
  const GOLD: [string, string, string] = ["#ffd45c", "#f0b429", "#dc9a06"];
  const GREEN: [string, string, string] = ["#2fd36d", "#00a03c", "#007e26"];
  const SLATE: [string, string, string] = ["#8a93a8", "#5b6478", "#3d4558"];
  switch (phase) {
    case "betting":
      return null;
    case "live":
      return box(BLUE, <Clock size={17} strokeWidth={2.6} />, b.liveTitle,
        fmt(b.liveBody, { day: fmtDate(market.endsAt, intl, { timeZone: "UTC", weekday: "long" }), when: when(resultAt, intl) }));
    case "counting":
      return box(BLUE, <Clock size={17} strokeWidth={2.6} />, b.countingTitle,
        market.resolutionNote ?? fmt(b.countingBody, { when: when(resultAt, intl) }));
    case "proposed":
      return box(GOLD, <Trophy size={17} strokeWidth={2.6} />, fmt(b.proposedTitle, { name: winner?.name ?? "?" }),
        <>
          {market.resolutionNote}{" "}
          {payAt && payAt > now && fmt(b.proposedPayAt, { when: when(payAt, intl) })}
          {payAt && payAt <= now && b.proposedChecking}
        </>);
    case "resolved":
      return box(GREEN, <CheckCircle2 size={17} strokeWidth={2.6} />, fmt(b.resolvedTitle, { name: winner?.name ?? "?" }),
        nobodyOnWinner ? b.resolvedNobody : <>{market.resolutionNote} {b.resolvedPaid}</>);
    case "cancelled":
      return box(SLATE, <Ban size={17} strokeWidth={2.6} />, b.cancelledTitle, market.resolutionNote);
  }
}

/** PnL de chaque KOL sur la période exacte du défi. */
function ChallengeScores({ market, kols }: { market: Market; kols: Kol[] }) {
  const { t, intl } = useI18n();
  const sc = t.market.scores;
  const scores = market.scores ?? [];
  return (
    <section className="card fade-up overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-5 py-3.5">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">{market.scoresFinal ? sc.final : sc.standings}</h2>
        <span className="chip">
          {sc.realized}
          {market.dataStart && market.dataEnd && (
            <>
              {" "}
              {fmt(sc.range, {
                from: fmtDate(`${market.dataStart}T12:00:00Z`, intl, { timeZone: "UTC" }),
                to: fmtDate(`${market.dataEnd}T12:00:00Z`, intl, { timeZone: "UTC" }),
              })}
            </>
          )}
        </span>
        <span className="chip">Solana Tracker</span>
        {!market.scoresFinal && <span className="chip-blue">{sc.updated}</span>}
      </div>
      <ul className="divide-y divide-line">
        {scores.map((r, i) => {
          const k = kols.find((x) => x.id === r.kolId);
          if (!k) return null;
          const won = market.winnerId === r.kolId && (market.status === "PROPOSED" || market.status === "RESOLVED");
          return (
            <li key={r.kolId} className={`flex items-center gap-3 px-5 py-3 text-[15px] ${won ? "bg-blue-soft/60" : ""}`}>
              <span className="num w-4 text-center text-[13px] font-bold text-faint">{i + 1}</span>
              <Avatar kol={k} size={32} ring={won} />
              <span className="flex-1 font-bold">{k.name}</span>
              {won && <span className="chip-up">{market.status === "RESOLVED" ? sc.winner : sc.proposedWinner}</span>}
              <span className={`num font-display text-[18px] font-extrabold ${r.pnl === null ? "text-faint" : pnlClass(r.pnl)}`}>
                {r.pnl === null ? t.market.unavailable : usd(r.pnl, { sign: true, cents: true })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OutcomeRow({
  o,
  rank,
  pnl,
  pot,
  active,
  open,
  onPick,
}: {
  o: Outcome;
  rank: number;
  pnl: number | null;
  pot: number;
  active: boolean;
  open: boolean;
  onPick: (scroll: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <li
      onClick={() => onPick(false)}
      className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition md:grid-cols-[1fr_130px_120px_160px] md:px-5 ${
        active ? "bg-blue-soft/60" : "hover:bg-paper-2"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="num w-4 shrink-0 text-center text-[13px] font-bold text-faint">{rank}</span>
        <Avatar kol={o.kol} size={44} ring={active} />
        <div className="min-w-0">
          <div className="truncate text-[16px] font-bold">{o.kol.name}</div>
          <div className="flex items-center gap-1 text-[13px] font-semibold text-muted">
            <a href={`https://x.com/${o.kol.handle}`} target="_blank" rel="noreferrer" className="hover:text-blue" onClick={(e) => e.stopPropagation()}>
              @{o.kol.handle}
            </a>
            <CopyButton value={o.kol.wallet} />
          </div>
        </div>
      </div>
      <div className={`num hidden text-right font-bold md:block ${pnl === null ? "text-faint" : pnlClass(pnl)}`}>
        {pnl === null ? t.market.unavailable : usd(pnl, { compact: true, sign: true })}
      </div>
      <div className="text-right md:text-center">
        <div className="num font-display text-[26px] font-extrabold leading-none tracking-[-0.03em]">{pct(o.prob)}</div>
        <div className="num mt-0.5 text-[12.5px] font-semibold text-muted">{fmt(t.market.staked, { amount: usd(o.pool, { compact: true }) })}</div>
      </div>
      <div className="col-span-2 md:col-span-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick(true);
          }}
          className={`h-11 w-full ${active ? "plaque" : "soft-up"}`}
        >
          {open ? t.market.bet : t.market.odds} <span className="num">{fmtOdds(odds(pot, o.pool), t.common.open)}</span>
        </button>
      </div>
    </li>
  );
}

export function MarketView({ market: base, kols: KOLS, sibling, serverNow }: { market: Market; kols: Kol[]; sibling?: Market; serverNow: number }) {
  const { t, intl } = useI18n();
  const tm = t.market;
  const days = (p: Period) => (p === "7D" ? tm.days7 : tm.days30);
  const w = useWallet();
  // En démo, les mises du joueur ne sont pas dans les pots venus du serveur ; en réel, elles y sont déjà.
  const market = useMemo(() => (w.live ? base : withMyBets(base, w.bets)), [base, w.bets, w.live]);
  const [selectedId, setSelectedId] = useState(base.outcomes[0].kol.id);
  const selected = market.outcomes.find((o) => o.kol.id === selectedId) ?? market.outcomes[0];
  const [period, setPeriod] = useState<Period>(market.period);
  const [showActivity, setShowActivity] = useState(true);
  const now = useNow();
  const phase = marketPhase(market, now ?? serverNow);
  const open = phase === "betting";
  const pnlKey = period === "7D" ? "pnl7d" : "pnl30d";
  // Pendant et après le défi, on affiche le PnL sur sa période exacte ; avant, le PnL glissant.
  const score = (kolId: string) => market.scores?.find((r) => r.kolId === kolId)?.pnl;
  const hasScores = phase !== "betting" && Boolean(market.scores?.length);
  const activity = market.activity ? market.activity.map((a) => ({ ...a, ago: ago(a.at, now, tm.ago) }))
    : MOCK_ACTIVITY.map((a) => ({ ...a, ago: agoSecs(a.secs, tm.ago) }));
  const ph = PHASE[phase];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <header className="fade-up">
          <div className="flex items-start gap-4">
            <div className="hidden shrink-0 -space-x-3 sm:flex">
              {market.outcomes.slice(0, 3).map((o) => (
                <Avatar key={o.kol.id} kol={o.kol} size={52} className="ring-[3px] ring-paper" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className={ph.chip}>{tm.phase[phase]}</span>
                <span className="chip-blue">KOL · {days(market.period)}</span>
                <span className="chip">{fmt(tm.challengeN, { n: market.challenge })}</span>
                <span className="chip">
                  {fmtDate(market.startsAt, intl, { timeZone: "UTC" })} → {fmtDate(market.endsAt, intl, { timeZone: "UTC" })} UTC
                </span>
              </div>
              <h1 className="display text-[28px] md:text-[34px]">{market.title}</h1>
            </div>
            <ShareButtons />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {market.outcomes.slice(0, 4).map((o) => (
              <button key={o.kol.id} onClick={() => setSelectedId(o.kol.id)} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.kol.color }} />
                {o.kol.name} <span className="num font-bold text-ink">{pct(o.prob)}</span>
              </button>
            ))}
          </div>
        </header>

        <PhaseBanner market={market} phase={phase} kols={KOLS} now={now ?? serverNow} />

        <section className="card fade-up p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">{tm.pnlRace}</h2>
            <span className="chip">{tm.realizedSource}</span>
            <div className="seg ml-auto">
              {(["7D", "30D"] as Period[]).map((p) => (
                <button key={p} className="seg-item" data-active={period === p} onClick={() => setPeriod(p)}>
                  {days(p)}
                </button>
              ))}
            </div>
          </div>
          <PnlChart kols={KOLS} period={period} highlight={selected.kol.id} />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3.5 text-[14px] font-semibold text-muted">
            <span>
              {t.common.pool} <span className="num font-bold text-ink">{usd(market.pool)}</span>
            </span>
            <span>
              <span className="num font-bold text-ink">{market.traders}</span> {tm.players}
            </span>
            <span className="font-bold text-blue">{tm.noFees}</span>
            <span className="ml-auto">
              {phase === "betting" && <Countdown to={market.closesAt} compact />}
              {phase === "live" && <Countdown to={market.endsAt} compact />}
              {phase === "proposed" && market.proposedAt && (
                <Countdown to={new Date(Date.parse(market.proposedAt) + CORRECTION_HOURS * HOUR).toISOString()} compact />
              )}
            </span>
          </div>
        </section>

        <section className="card fade-up overflow-hidden">
          <div className="hidden grid-cols-[1fr_130px_120px_160px] gap-4 border-b border-line px-5 py-3 text-[13px] font-bold text-faint md:grid">
            <span>{tm.colKol}</span>
            <span className="text-right">{hasScores ? tm.colChallengePnl : fmt(tm.colPnl, { period: days(market.period) })}</span>
            <span className="text-center">{tm.colShare}</span>
            <span className="text-center">{open ? tm.bet : tm.odds}</span>
          </div>
          <ul className="divide-y divide-line">
            {market.outcomes.map((o, i) => (
              <OutcomeRow
                key={o.kol.id}
                o={o}
                rank={i + 1}
                pnl={hasScores ? (score(o.kol.id) ?? null) : o.kol[pnlKey]}
                pot={market.pool}
                active={selected.kol.id === o.kol.id}
                open={open}
                onPick={(scroll) => {
                  setSelectedId(o.kol.id);
                  // Sur mobile le ticket est sous la liste : on l'amène à l'écran.
                  if (scroll && window.innerWidth < 1024) document.getElementById("bet")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            ))}
          </ul>
        </section>

        {hasScores ? (
          <ChallengeScores market={market} kols={KOLS} />
        ) : (
          <section className="fade-up">
            <h2 className="mb-3 font-display text-[22px] font-extrabold tracking-[-0.02em]">{fmt(tm.leaderboard, { period: days(period) })}</h2>
            <Podium kols={KOLS} period={period} />
          </section>
        )}

        <section className="card fade-up p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">{tm.poolSplit}</h2>
            <span className="num font-display text-[19px] font-extrabold">{usd(market.pool)}</span>
          </div>
          <div className="mb-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-relief">
            {market.outcomes.map((o) => (
              <span key={o.kol.id} style={{ width: `${o.prob * 100}%`, background: o.kol.color }} title={`${o.kol.name} ${pct(o.prob)}`} />
            ))}
          </div>
          <ul className="space-y-2 text-[14px]">
            {market.outcomes.map((o) => (
              <li key={o.kol.id} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.kol.color }} />
                <span className="flex-1 truncate font-semibold">{o.kol.name}</span>
                <span className="num font-semibold text-muted">{usd(o.pool)}</span>
                <span className="num w-12 text-right font-bold">{pct(o.prob)}</span>
                <span className="num w-16 text-right font-bold text-blue">{fmtOdds(odds(market.pool, o.pool), t.common.open)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="chip-blue">{tm.allToWinners}</span>
            <span className="chip">{tm.oddsExplain}</span>
          </div>
        </section>

        <section className="card fade-up overflow-hidden">
          <button onClick={() => setShowActivity((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left">
            <span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">{tm.activity}</span>
            <ChevronDown size={18} className={`text-muted transition ${showActivity ? "rotate-180" : ""}`} />
          </button>
          {showActivity && (
            <ul className="pop divide-y divide-line border-t border-line">
              {activity.length === 0 && <li className="px-5 py-8 text-center text-[15px] font-semibold text-muted">{tm.noBets}</li>}
              {activity.map((a) => {
                const k = KOLS.find((x) => x.id === a.kolId) ?? KOLS[0];
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-[14px]">
                    <Avatar kol={k} size={30} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-muted">{a.who}</span> {tm.betOn} <span className="font-bold">{k.name}</span>
                    </span>
                    <span className="num font-bold">{usd(a.amount)}</span>
                    <span className="hidden w-14 text-right text-[13px] font-semibold text-faint sm:inline">{a.ago}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card fade-up p-5" id="rules">
          <h2 className="mb-3 font-display text-[19px] font-extrabold tracking-[-0.02em]">{tm.rules}</h2>
          <ol className="space-y-2.5 text-[15px] text-ink-2">
            {market.rules.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-soft text-[12.5px] font-bold text-blue">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">{tm.rulesPool}</span>
            <span className="chip">{fmt(tm.rulesMax, { amount: usd(MAX_STAKE_PER_MARKET) })}</span>
            <span className="chip">{fmt(tm.rulesPayout, { h: CORRECTION_HOURS })}</span>
            <span className="chip">{fmt(tm.source, { src: "Solana Tracker" })}</span>
          </div>
        </section>

        <section className="card fade-up p-5">
          <h2 className="mb-3 font-display text-[19px] font-extrabold tracking-[-0.02em]">{tm.trackedWallets}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {KOLS.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-line-2">
                <Avatar kol={k} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{k.name}</div>
                  <div className="num flex items-center gap-1 text-[13px] font-semibold text-muted">
                    {shortWallet(k.wallet)} <CopyButton value={k.wallet} />
                  </div>
                </div>
                <a href={`https://x.com/${k.handle}`} target="_blank" rel="noreferrer" className="round" title={fmt(tm.onX, { handle: k.handle })}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.8-8.9L0 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L6.4 3.9H4.4L17.7 20z" />
                  </svg>
                </a>
                <a href={`https://solscan.io/account/${k.wallet}`} target="_blank" rel="noreferrer" className="round" title={tm.solscan}>
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <BetPanel
          marketSlug={market.slug}
          marketTitle={market.title}
          question={market.question}
          pot={market.pool}
          open={open}
          choice={{ id: selected.kol.id, name: selected.kol.name, pool: selected.pool, prob: selected.prob, visual: <Avatar kol={selected.kol} size={46} ring /> }}
        />
        {sibling && (
          <Link href={`/market/${sibling.slug}`} className="card card-hover flex items-center gap-3 p-4">
            <div className="flex -space-x-2">
              {sibling.outcomes.slice(0, 3).map((o) => (
                <Avatar key={o.kol.id} kol={o.kol} size={30} className="ring-2 ring-white" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold">{sibling.title}</div>
              <div className="num text-[13px] font-semibold text-muted">
                {marketPhase(sibling, now ?? serverNow) === "betting" ? tm.phase.betting : days(sibling.period)} ·{" "}
                {fmt(tm.siblingPool, { amount: usd(sibling.pool, { compact: true }) })}
              </div>
            </div>
            <span className="num font-display text-[20px] font-extrabold text-blue">{pct(sibling.outcomes[0].prob)}</span>
          </Link>
        )}
      </aside>
    </div>
  );
}
