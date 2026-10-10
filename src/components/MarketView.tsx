"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban, Bookmark, CheckCircle2, ChevronDown, Clock, Code2, ExternalLink, Link2, Send, Trophy } from "lucide-react";
import type { Market, Period } from "@/data/markets";
import type { Kol } from "@/data/kols";
import { Avatar } from "./Avatar";
import { BetPanel } from "./BetPanel";
import { Countdown } from "./Countdown";
import { CopyButton } from "./CopyButton";
import { PnlChart } from "./PnlChart";
import { Podium } from "./Podium";
import { type Bet, useWallet } from "@/lib/wallet";
import { MAX_STAKE_PER_MARKET } from "@/lib/limits";
import { odds } from "@/lib/pot";
import { useNow } from "@/lib/useNow";
import { CORRECTION_HOURS, RESOLVE_DELAY_HOURS, type Phase, marketPhase } from "@/lib/challenge-calendar";
import { dateFr, fmtOdds, pct, pnlClass, shortWallet, usd } from "@/lib/format";

/** Activité d'exemple pour les données mock (sans base). */
const MOCK_ACTIVITY = [
  { id: "1", who: "7Gx2…xVq", kolId: "cooker", amount: 250, ago: "il y a 12 s" },
  { id: "2", who: "Bq91…aa4", kolId: "zeropnl", amount: 40, ago: "il y a 48 s" },
  { id: "3", who: "3Fkd…m0P", kolId: "cented", amount: 120, ago: "il y a 2 min" },
  { id: "4", who: "9zLm…Qe7", kolId: "decu", amount: 75, ago: "il y a 3 min" },
  { id: "5", who: "Hh3s…k2R", kolId: "cooker", amount: 500, ago: "il y a 5 min" },
];

function ago(at: string, now: number | null) {
  if (now === null) return "";
  const s = Math.max(0, Math.round((now - Date.parse(at)) / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

/** Ajoute les mises de démo du joueur au pot (les vraies mises seront déjà comptées par le serveur). */
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
/** « lundi 19 oct., 12:00 UTC » */
const when = (ms: number) =>
  `${dateFr(new Date(ms).toISOString(), { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;

/** Où en est le défi : mises fermées, résultat proposé, payé ou annulé. */
function PhaseBanner({ market, phase, kols }: { market: Market; phase: Phase; kols: Kol[] }) {
  const winner = kols.find((k) => k.id === market.winnerId);
  const resultAt = Math.ceil((Date.parse(market.endsAt) + RESOLVE_DELAY_HOURS * HOUR) / HOUR) * HOUR;
  const payAt = market.proposedAt ? Date.parse(market.proposedAt) + CORRECTION_HOURS * HOUR : null;
  const nobodyOnWinner = winner && market.outcomes.every((o) => o.pool === 0);
  const box = (tone: string, icon: React.ReactNode, title: string, body?: React.ReactNode) => (
    <div className={`card flex items-start gap-3 p-4 fade-up ${tone}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="text-sm">
        <div className="font-bold">{title}</div>
        {body && <div className="mt-0.5 text-muted">{body}</div>}
      </div>
    </div>
  );
  switch (phase) {
    case "betting":
      return null;
    case "live":
      return box("", <Clock size={18} className="text-gold-3" />, "Défi en cours : les mises sont fermées.",
        <>Le PnL est compté jusqu&apos;au {dateFr(market.endsAt, { timeZone: "UTC", weekday: "long" })} 23:59 UTC. Résultat vers {when(resultAt)}.</>);
    case "counting":
      return box("", <Clock size={18} className="text-gold-3" />, "Défi terminé : résultat en préparation.",
        market.resolutionNote ?? <>Le PnL final de chaque KOL est lu vers {when(resultAt)}, puis affiché ici.</>);
    case "proposed":
      return box("border-gold", <Trophy size={18} className="text-gold-3" />,
        `Résultat proposé : ${winner?.name ?? "?"} gagne.`,
        <>{market.resolutionNote} {payAt && <>Pot payé automatiquement {when(payAt)}, sauf correction d&apos;une erreur de données.</>}</>);
    case "resolved":
      return box("border-up", <CheckCircle2 size={18} className="text-up" />,
        `Terminé : ${winner?.name ?? "?"} a gagné.`,
        nobodyOnWinner ? "Personne n'avait misé sur le gagnant : toutes les mises ont été remboursées." : <>{market.resolutionNote} Le pot a été versé aux gagnants.</>);
    case "cancelled":
      return box("border-down", <Ban size={18} className="text-down" />, "Défi annulé : toutes les mises ont été remboursées.", market.resolutionNote);
  }
}

/** PnL de chaque KOL sur la période exacte du défi. */
function ChallengeScores({ market, kols }: { market: Market; kols: Kol[] }) {
  const scores = market.scores ?? [];
  return (
    <div className="card overflow-hidden fade-up">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <h2 className="font-bold">{market.scoresFinal ? "Résultat du défi" : "Classement du défi, en direct"}</h2>
        <span className="text-xs text-muted">
          PnL réalisé{" "}
          {market.dataStart && market.dataEnd && (
            <>du {dateFr(`${market.dataStart}T12:00:00Z`, { timeZone: "UTC" })} au {dateFr(`${market.dataEnd}T12:00:00Z`, { timeZone: "UTC" })} (jours UTC)</>
          )}{" "}
          · Solana Tracker
        </span>
      </div>
      <ul>
        {scores.map((r, i) => {
          const k = kols.find((x) => x.id === r.kolId);
          if (!k) return null;
          const won = market.winnerId === r.kolId && (market.status === "PROPOSED" || market.status === "RESOLVED");
          return (
            <li key={r.kolId} className={`flex items-center gap-3 border-b border-line px-5 py-2.5 text-sm last:border-0 ${won ? "bg-gold-soft/40" : ""}`}>
              <span className="w-4 text-xs font-bold text-muted">{i + 1}</span>
              <Avatar kol={k} size={28} />
              <span className="flex-1 font-semibold">{k.name}</span>
              {won && <span className="pill-gold py-0 text-[10px]">{market.status === "RESOLVED" ? "gagnant" : "gagnant proposé"}</span>}
              <span className={`mono font-bold ${r.pnl === null ? "text-muted" : pnlClass(r.pnl)}`}>
                {r.pnl === null ? "indisponible" : usd(r.pnl, { sign: true, cents: true })}
              </span>
            </li>
          );
        })}
      </ul>
      {!market.scoresFinal && (
        <p className="border-t border-line px-5 py-2.5 text-xs text-muted">
          Mis à jour toutes les 3 heures. Le résultat officiel est relu en entier à la fin du défi.
        </p>
      )}
    </div>
  );
}

export function MarketView({ market: base, kols: KOLS, sibling, serverNow }: { market: Market; kols: Kol[]; sibling?: Market; serverNow: number }) {
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
  const leader = hasScores ? KOLS.find((k) => k.id === market.scores![0].kolId) : undefined;
  const activity = market.activity ? market.activity.map((a) => ({ ...a, ago: ago(a.at, now) })) : MOCK_ACTIVITY;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Header */}
        <div className="fade-up">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="pill-gold">Défi #{market.challenge}</span>
            <span className="pill-muted">KOL · {market.period}</span>
            <span className="pill-muted">{dateFr(market.startsAt, { timeZone: "UTC" })} → {dateFr(market.endsAt, { timeZone: "UTC" })} · UTC</span>
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
                Pot {usd(market.pool, { compact: true })} · {market.traders} joueurs · 0 frais
              </p>
            </div>
          </div>
        </div>

        {/* Stats + countdown */}
        <div className="card flex flex-wrap items-center justify-between gap-6 p-5 fade-up">
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Favori</div>
              <div className="mt-1 flex items-center gap-2 font-bold">
                <Avatar kol={market.outcomes[0].kol} size={22} /> {market.outcomes[0].kol.name}
                <span className="text-up">{pct(market.outcomes[0].prob)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                {leader ? `En tête · ${leader.name}` : `Leader PnL ${market.period}`}
              </div>
              {(() => {
                const v = leader ? (market.scores![0].pnl ?? 0) : Math.max(...KOLS.map((k) => k[market.period === "7D" ? "pnl7d" : "pnl30d"]));
                return <div className={`mono mt-1 text-xl font-bold ${pnlClass(v)}`}>{usd(v, { compact: true, sign: true })}</div>;
              })()}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Pot commun</div>
              <div className="mono mt-1 text-xl font-bold">{usd(market.pool, { compact: true })}</div>
            </div>
          </div>
          {phase === "betting" && <Countdown to={market.closesAt} />}
          {phase === "live" && <Countdown to={market.endsAt} label="Fin du défi" />}
          {phase === "proposed" && market.proposedAt && (
            <Countdown to={new Date(Date.parse(market.proposedAt) + CORRECTION_HOURS * HOUR).toISOString()} label="Paiement du pot" />
          )}
        </div>

        <PhaseBanner market={market} phase={phase} kols={KOLS} />

        {/* Chart */}
        <div className="card p-5 fade-up">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="font-bold">Course au PnL</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-down live-dot" /> PnL réalisé · Solana Tracker
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
                onClick={() => setSelectedId(k.id)}
                className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition ${selected.kol.id === k.id ? "bg-cream-2 font-semibold" : "text-muted hover:text-ink"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: k.color }} /> {k.name}
              </button>
            ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="card overflow-hidden fade-up">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid-cols-[1fr_120px_110px_150px]">
            <span>KOL</span>
            <span className="hidden text-right md:block">{hasScores ? "PnL du défi" : `PnL ${market.period}`}</span>
            <span className="text-right">% du pot</span>
            <span className="text-right md:text-center">Miser</span>
          </div>
          <ul className="stagger">
            {market.outcomes.map((o, i) => {
              const active = selected.kol.id === o.kol.id;
              return (
                <li
                  key={o.kol.id}
                  onClick={() => setSelectedId(o.kol.id)}
                  className={`grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-line px-5 py-3 transition md:grid-cols-[1fr_120px_110px_150px] ${active ? "bg-gold-soft/40" : "hover:bg-cream-2/60"}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-4 text-xs font-bold text-muted">{i + 1}</span>
                    <Avatar kol={o.kol} size={38} ring={active} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {o.kol.name}
                        {i === 0 && o.prob > 0 && <span className="pill-gold py-0 text-[10px]">favori</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <a href={`https://x.com/${o.kol.handle}`} target="_blank" rel="noreferrer" className="hover:text-ink" onClick={(e) => e.stopPropagation()}>@{o.kol.handle}</a>
                        <span>·</span>
                        <span className="mono whitespace-nowrap">{shortWallet(o.kol.wallet)}</span>
                        <CopyButton value={o.kol.wallet} />
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const v = hasScores ? (score(o.kol.id) ?? null) : o.kol[pnlKey];
                    return (
                      <div className={`mono hidden text-right font-semibold md:block ${v === null ? "text-muted" : pnlClass(v)}`}>
                        {v === null ? "—" : usd(v, { compact: true, sign: true })}
                      </div>
                    );
                  })()}
                  <div className="text-right">
                    <div className="text-lg font-bold">{pct(o.prob)}</div>
                    <div className="mono text-[11px] text-muted">{usd(o.pool, { compact: true })} misés</div>
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(o.kol.id);
                        // Sur mobile le panneau de mise est sous la liste : on l'amène à l'écran.
                        if (window.innerWidth < 1024) document.getElementById("miser")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`btn w-full py-2 ${active ? "bg-gold text-ink shadow-sm" : "btn-ghost"}`}
                    >
                      {open ? "Miser" : "Cote"} <span className="mono">{fmtOdds(odds(market.pool, o.pool))}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Podium avant le défi ; classement sur la période exacte pendant et après */}
        {hasScores ? (
          <ChallengeScores market={market} kols={KOLS} />
        ) : (
          <div className="fade-up">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-bold">Classement en direct · {period}</h2>
              <span className="text-xs text-muted">PnL réalisé sur le wallet listé</span>
            </div>
            <Podium kols={KOLS} period={period} />
          </div>
        )}

        {/* Pot breakdown */}
        <div className="card p-5 fade-up">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Répartition du pot</h2>
            <span className="mono text-sm font-semibold">{usd(market.pool)}</span>
          </div>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-cream-2">
            {market.outcomes.map((o) => (
              <span key={o.kol.id} style={{ width: `${o.prob * 100}%`, background: o.kol.color }} title={`${o.kol.name} ${pct(o.prob)}`} />
            ))}
          </div>
          <ul className="space-y-1.5 text-sm">
            {market.outcomes.map((o) => (
              <li key={o.kol.id} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.kol.color }} />
                <span className="flex-1 truncate font-medium">{o.kol.name}</span>
                <span className="mono text-muted">{usd(o.pool)}</span>
                <span className="mono w-12 text-right font-semibold">{pct(o.prob)}</span>
                <span className="mono w-14 text-right text-muted">{fmtOdds(odds(market.pool, o.pool))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            0 frais : 100 % du pot revient à ceux qui ont misé sur le KOL gagnant, au prorata de leur mise.
            La cote = ce que rapporte 1 $ misé si ce KOL gagne.
          </p>
        </div>

        {/* Activity */}
        <div className="card fade-up">
          <button onClick={() => setShowActivity((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 font-bold">
            <span>Activité</span>
            <ChevronDown size={16} className={`text-muted transition ${showActivity ? "rotate-180" : ""}`} />
          </button>
          {showActivity && (
            <ul className="border-t border-line pop">
              {activity.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">Aucune mise pour l&apos;instant. Sois le premier.</li>}
              {activity.map((a) => {
                const k = KOLS.find((x) => x.id === a.kolId) ?? KOLS[0];
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="mono grid h-7 w-7 place-items-center rounded-full bg-cream-2 text-[10px] font-bold">{a.who.slice(0, 2)}</span>
                    <span className="mono text-xs text-muted">{a.who}</span>
                    <span>a misé sur</span>
                    <Avatar kol={k} size={18} /> <span className="font-semibold">{k.name}</span>
                    <span className="mono ml-auto font-semibold">{usd(a.amount)}</span>
                    <span className="hidden text-xs text-muted sm:inline">{a.ago}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Rules */}
        <div className="card p-5 fade-up" id="regles">
          <h2 className="mb-3 font-bold">Règles</h2>
          <ol className="space-y-2 text-sm text-muted">
            {market.rules.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-soft text-[11px] font-bold text-gold-3">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="pill-muted">Pot commun · 0 frais</span>
            <span className="pill-muted">Max {usd(MAX_STAKE_PER_MARKET)} par compte</span>
            <span className="pill-muted">Résultat publié, payé {CORRECTION_HOURS} h plus tard</span>
            <span className="pill-muted">Source : Solana Tracker (on-chain)</span>
          </div>
        </div>

        {/* Traders & wallets */}
        <div className="card p-5 fade-up">
          <h2 className="mb-3 font-bold">Traders &amp; wallets suivis</h2>
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
        <BetPanel market={market} outcome={selected} open={open} />
        {sibling && (
          <Link href={`/market/${sibling.slug}`} className="card card-hover flex items-center gap-3 p-4">
            <div className="flex -space-x-2">
              {sibling.outcomes.slice(0, 3).map((o) => <Avatar key={o.kol.id} kol={o.kol} size={26} className="ring-2 ring-white" />)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{sibling.title}</div>
              <div className="text-xs text-muted">
                {marketPhase(sibling, now ?? serverNow) === "betting" ? "Mises ouvertes" : sibling.period} · pot {usd(sibling.pool, { compact: true })}
              </div>
            </div>
            <span className="font-bold text-up">{pct(sibling.outcomes[0].prob)}</span>
          </Link>
        )}
      </aside>
    </div>
  );
}
