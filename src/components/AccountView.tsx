"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ExternalLink, LogOut, RotateCcw, SlidersHorizontal, Trophy, Wallet } from "lucide-react";
import type { Market } from "@/data/markets";
import { COIN_MARKETS } from "@/data/coins";
import { type Activity, type Bet, useWallet } from "@/lib/wallet";
import { DEPOSIT_CAP, depositRoom } from "@/lib/limits";
import { payoutOf } from "@/lib/pot";
import { useNow } from "@/lib/useNow";
import { CLUSTER } from "@/lib/cluster";
import { marketPhase } from "@/lib/challenge-calendar";
import { fmtOdds, pnlClass, shortWallet, usd } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Coin, OutcomeCoin } from "./Coin";
import { CopyButton } from "./CopyButton";
import { LogoMark } from "./Logo";

const BLUE: [string, string, string] = ["#4a76ff", "#1652f0", "#0e3fd0"];
const GREEN: [string, string, string] = ["#2fd36d", "#00a03c", "#007e26"];
const SLATE: [string, string, string] = ["#8a93a8", "#5b6478", "#3d4558"];
const INK: [string, string, string] = ["#2a3245", "#141a2c", "#0a0f1e"];
const GOLD: [string, string, string] = ["#ffd45c", "#f0b429", "#dc9a06"];

const RANGES = [
  { id: "1J", ms: 86400000 },
  { id: "1S", ms: 7 * 86400000 },
  { id: "1M", ms: 30 * 86400000 },
  { id: "Tout", ms: Infinity },
] as const;

/** Où en est une mise encore en jeu, d'après l'étape de son défi. */
function betState(m: Market | undefined, kolId: string, now: number | null) {
  if (!m) return "En attente du résultat";
  switch (marketPhase(m, now ?? 0)) {
    case "betting":
      return "Mises ouvertes";
    case "live":
      return "Défi en cours";
    case "counting":
      return "Résultat en préparation";
    case "proposed":
      return m.winnerId === kolId ? "Gagnant proposé, paiement sous 24 h" : "Résultat proposé : autre KOL";
    default:
      return "Paiement en cours";
  }
}

/** Ce qu'a rapporté une mise terminée : le gain net, 0 si remboursée. */
const settledGain = (b: Bet) => (b.status === "WON" ? (b.payout ?? 0) - b.amount : b.status === "LOST" ? -b.amount : 0);

const TYPE: Record<Activity["type"], { label: string; tint: [string, string, string]; icon: React.ReactNode }> = {
  DEPOT: { label: "Dépôt", tint: GREEN, icon: <ArrowDownLeft size={16} strokeWidth={2.6} /> },
  RETRAIT: { label: "Retrait", tint: SLATE, icon: <ArrowUpRight size={16} strokeWidth={2.6} /> },
  MISE: { label: "Mise", tint: BLUE, icon: <ArrowRight size={16} strokeWidth={2.6} /> },
  GAIN: { label: "Gain", tint: GOLD, icon: <Trophy size={15} strokeWidth={2.6} /> },
  REMBOURSEMENT: { label: "Remboursement", tint: SLATE, icon: <RotateCcw size={15} strokeWidth={2.6} /> },
  AJUSTEMENT: { label: "Ajustement", tint: INK, icon: <SlidersHorizontal size={15} strokeWidth={2.6} /> },
};

/** Le profit cumulé des mises terminées, dans le temps. */
function AreaChart({ pts, from, to }: { pts: { t: number; v: number }[]; from: number; to: number }) {
  const W = 1000;
  const H = 1000;
  const before = [...pts].reverse().find((p) => p.t < from);
  const series = [{ t: from, v: before ? before.v : 0 }, ...pts.filter((p) => p.t >= from), { t: to, v: pts.length ? pts[pts.length - 1].v : 0 }];
  const vals = series.map((p) => p.v);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const span = hi - lo || 1;
  const x = (t: number) => ((t - from) / Math.max(1, to - from)) * W;
  const y = (v: number) => 60 + ((hi - v) / span) * (H - 120);
  let d = "";
  series.forEach((p, i) => {
    d += i === 0 ? `M${x(p.t)},${y(p.v)}` : `H${x(p.t)}V${y(p.v)}`;
  });
  const color = series[series.length - 1].v >= series[0].v ? "#00a03c" : "#e5484d";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="pnl-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#d6dcee" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
      <path d={`${d}V${H}H0Z`} fill="url(#pnl-fill)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function AccountView({ markets }: { markets: Market[] }) {
  const w = useWallet();
  const now = useNow();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("Tout");
  const [tab, setTab] = useState<"bets" | "settled" | "history">("bets");

  // Gain estimé de chaque mise avec le pot actuel. En démo, les mises du joueur ne sont pas dans les pots
  // venus du serveur : on les y ajoute pour que le calcul reste juste. En réel, elles y sont déjà.
  const rows = useMemo(
    () =>
      w.bets.map((b) => {
        const coin = COIN_MARKETS.find((x) => x.slug === b.marketSlug);
        const m = markets.find((x) => x.slug === b.marketSlug);
        const kol = m?.outcomes.find((x) => x.kol.id === b.kolId);
        const co = coin?.outcomes.find((x) => x.id === b.kolId);
        const mine = w.live ? [] : w.bets.filter((x) => x.marketSlug === b.marketSlug);
        const pot = (m?.pool ?? coin?.pool ?? 0) + mine.reduce((s, x) => s + x.amount, 0);
        const pool = (kol?.pool ?? co?.pool ?? 0) + mine.filter((x) => x.kolId === b.kolId).reduce((s, x) => s + x.amount, 0);
        const visual = kol ? (
          <Avatar kol={kol.kol} size={40} />
        ) : co ? (
          <OutcomeCoin outcome={co} size={40} />
        ) : (
          <Coin tint={BLUE} size={40}>
            <span>{b.kolName.slice(0, 2)}</span>
          </Coin>
        );
        return { bet: b, visual, cote: pool > 0 ? pot / pool : null, payout: payoutOf(pot, pool, b.amount), state: coin ? "Mises ouvertes" : betState(m, b.kolId, now) };
      }),
    [w.bets, w.live, markets, now],
  );

  // Meilleur cas : sur chaque marché, le résultat qui rapporterait le plus parmi ceux misés.
  const best = Object.values(
    rows.reduce<Record<string, Record<string, number>>>((acc, r) => {
      const byKol = (acc[r.bet.marketSlug] ??= {});
      byKol[r.bet.kolId] = (byKol[r.bet.kolId] ?? 0) + r.payout;
      return acc;
    }, {}),
  ).reduce((s, byKol) => s + Math.max(...Object.values(byKol)), 0);

  const pts = useMemo(
    () =>
      [...w.settled]
        .sort((a, b) => a.createdAt - b.createdAt)
        .reduce<{ t: number; v: number }[]>((acc, b) => {
          const prev = acc.length ? acc[acc.length - 1].v : 0;
          acc.push({ t: b.createdAt, v: Math.round((prev + settledGain(b)) * 100) / 100 });
          return acc;
        }, []),
    [w.settled],
  );
  const realized = pts.length ? pts[pts.length - 1].v : 0;

  if (!w.ready) return <div className="h-96" />;

  if (!w.connected) {
    return (
      <div className="card fade-up mx-auto mt-6 max-w-md p-8 text-center">
        <div className="mx-auto mb-5 w-fit">
          <LogoMark size={56} />
        </div>
        <h1 className="display text-[30px]">Connecte ton wallet</h1>
        <button onClick={() => w.openModal("connect")} className="plaque mt-6 h-[52px] w-full text-[16px]">
          <Wallet size={17} /> Se connecter
        </button>
      </div>
    );
  }

  const t = now ?? 0;
  const r = RANGES.find((x) => x.id === range)!;
  const from = r.ms === Infinity ? Math.min(pts[0]?.t ?? t, t - 86400000) : t - r.ms;
  const startV = [...pts].reverse().find((p) => p.t < from)?.v ?? 0;
  const pnlRange = realized - startV;
  const room = depositRoom(w.balance, w.inPlay);
  const used = Math.min(1, (w.balance + w.inPlay) / DEPOSIT_CAP);
  const net = CLUSTER === "devnet" ? "devnet" : null;

  return (
    <div className="space-y-6">
      <div className="fade-up flex flex-wrap items-center gap-3">
        <h1 className="display text-[32px]">Mon compte</h1>
        {!w.live ? <span className="chip">Démo</span> : net && <span className="chip">{net}</span>}
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-2">
        {/* Portefeuille */}
        <section className="card flex flex-col p-5 md:p-6">
          <h2 className="text-[15px] font-bold text-muted">Portefeuille</h2>
          <div className="num mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.035em]">{usd(w.balance + w.inPlay + w.excess, { cents: true })}</div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3">
            <div>
              <div className="text-[13px] font-bold text-faint">Disponible</div>
              <div className="num font-display text-[22px] font-extrabold tracking-[-0.02em] text-up">{usd(w.balance, { cents: true })}</div>
            </div>
            <div>
              <div className="text-[13px] font-bold text-faint">En jeu</div>
              <div className="num font-display text-[22px] font-extrabold tracking-[-0.02em]">{usd(w.inPlay, { cents: true })}</div>
            </div>
            {w.excess > 0 && (
              <div>
                <div className="text-[13px] font-bold text-faint">À retirer</div>
                <div className="num font-display text-[22px] font-extrabold tracking-[-0.02em]">{usd(w.excess, { cents: true })}</div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-[13px] font-bold">
              <span className="text-faint">Dépôt possible</span>
              <span className="num">
                {usd(room)} <span className="text-faint">/ {usd(DEPOSIT_CAP)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-relief">
              <div className="h-full rounded-full bg-blue" style={{ width: `${used * 100}%` }} />
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2.5 pt-5">
            <button onClick={() => w.openModal("deposit")} className="plaque h-12 text-[15px]">
              <ArrowDownLeft size={17} strokeWidth={2.6} /> Déposer
            </button>
            <button onClick={() => w.openModal("withdraw")} className="ghost h-12 rounded-[14px] text-[15px]">
              <ArrowUpRight size={17} strokeWidth={2.6} /> Retirer
            </button>
          </div>
        </section>

        {/* Profit / Perte */}
        <section className="card flex flex-col p-5 md:p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-muted">Profit / Perte</h2>
            <div className="seg ml-auto">
              {RANGES.map((x) => (
                <button key={x.id} className="seg-item px-3 py-1" data-active={range === x.id} onClick={() => setRange(x.id)}>
                  {x.id}
                </button>
              ))}
            </div>
          </div>
          <div className={`num mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] ${pnlRange === 0 ? "text-ink" : pnlClass(pnlRange)}`}>
            {usd(pnlRange, { sign: true, cents: true })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={realized >= 0 ? "chip-up" : "chip-down"}>Réalisé {usd(realized, { sign: true, cents: true })}</span>
            <span className="chip">En jeu {usd(w.inPlay, { cents: true })}</span>
            {best > 0 && <span className="chip-blue">Gain max estimé {usd(Math.floor(best * 100) / 100, { cents: true })}</span>}
          </div>
          <div className="relative mt-auto h-[132px] pt-4">
            <div className="absolute inset-x-0 bottom-0 top-4">
              <AreaChart pts={pts} from={from} to={Math.max(t, from + 1)} />
            </div>
          </div>
        </section>
      </div>

      {/* Le wallet : la carte de visite */}
      <section className="card fade-up flex flex-wrap items-center gap-4 p-5">
        <Coin tint={BLUE} size={52}>
          <Wallet size={22} strokeWidth={2.4} />
        </Coin>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[20px] font-extrabold tracking-[-0.02em]">{w.provider ?? "Wallet"}</span>
            <span className="chip">Solana{net ? ` · ${net}` : ""}</span>
            <span className="chip-blue">Retraits vers ce wallet uniquement</span>
          </div>
          <div className="num mt-1 text-[14px] font-semibold text-muted">
            <span className="hidden break-all md:inline">{w.address}</span>
            <span className="md:hidden">{shortWallet(w.address!)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton value={w.address!} label="Copier l'adresse" />
          <a
            href={`https://solscan.io/account/${w.address}${CLUSTER === "devnet" ? "?cluster=devnet" : ""}`}
            target="_blank"
            rel="noreferrer"
            className="round"
            title="Voir sur Solscan"
          >
            <ExternalLink size={14} />
          </a>
          <button onClick={w.disconnect} className="round" title="Déconnecter le wallet" aria-label="Déconnecter le wallet">
            <LogOut size={14} />
          </button>
        </div>
      </section>

      {/* Mises, terminées, historique */}
      <section id="mises" className="card fade-up scroll-mt-32 overflow-hidden">
        <div className="flex items-end gap-6 overflow-x-auto border-b border-line px-5 pt-4 scrollbar-none">
          <button className="tab shrink-0" data-active={tab === "bets"} onClick={() => setTab("bets")}>
            Mises <span className="num ml-1 text-faint">{w.bets.length}</span>
          </button>
          <button className="tab shrink-0" data-active={tab === "settled"} onClick={() => setTab("settled")}>
            Terminées <span className="num ml-1 text-faint">{w.settled.length}</span>
          </button>
          <button className="tab shrink-0" data-active={tab === "history"} onClick={() => setTab("history")}>
            Historique <span className="num ml-1 text-faint">{w.activity.length}</span>
          </button>
        </div>

        {tab === "bets" &&
          (rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-muted">Aucune mise</p>
              <Link href="/app" className="plaque mt-4 h-11 px-5">
                Voir les marchés <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1fr_100px_100px_120px_210px] gap-3 border-b border-line px-5 py-2.5 text-[13px] font-bold text-faint lg:grid">
                <span>Marché</span>
                <span className="text-right">Mise</span>
                <span className="text-right">Cote</span>
                <span className="text-right">Si gagné</span>
                <span className="text-right">Statut</span>
              </div>
              <ul className="divide-y divide-line">
                {rows.map(({ bet, visual, cote, payout, state }) => (
                  <li key={bet.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-5 py-3.5 lg:grid-cols-[1fr_100px_100px_120px_210px]">
                    <div className="flex min-w-0 items-center gap-3">
                      {visual}
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-bold">{bet.kolName}</div>
                        <Link href={`/market/${bet.marketSlug}`} className="line-clamp-1 text-[13px] font-semibold text-muted hover:text-blue">
                          {bet.marketTitle}
                        </Link>
                      </div>
                    </div>
                    <div className="num text-right font-bold">{usd(bet.amount, { cents: true })}</div>
                    <div className="num hidden text-right font-bold text-blue lg:block">{fmtOdds(cote)}</div>
                    <div className="num text-right font-display text-[17px] font-extrabold text-up">≈ {usd(Math.floor(payout * 100) / 100, { cents: true })}</div>
                    <div className="text-right">
                      <span className="chip">{state}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ))}

        {tab === "settled" &&
          (w.settled.length === 0 ? (
            <p className="px-5 py-12 text-center font-display text-[20px] font-extrabold tracking-[-0.02em] text-muted">Aucune mise terminée</p>
          ) : (
            <ul className="divide-y divide-line">
              {w.settled.map((b) => {
                const g = settledGain(b);
                return (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3.5 text-[15px]">
                    <span className={b.status === "WON" ? "chip-up" : b.status === "LOST" ? "chip-down" : "chip"}>
                      {b.status === "WON" ? "Gagnée" : b.status === "LOST" ? "Perdue" : "Remboursée"}
                    </span>
                    <Link href={`/market/${b.marketSlug}`} className="min-w-0 flex-1 truncate font-semibold hover:text-blue">
                      {b.kolName} · <span className="text-muted">{b.marketTitle}</span>
                    </Link>
                    <span className="num hidden text-[13px] font-semibold text-muted sm:inline">mise {usd(b.amount)}</span>
                    <span className={`num w-24 text-right font-display text-[17px] font-extrabold ${b.status === "REFUNDED" ? "text-muted" : pnlClass(g)}`}>
                      {b.status === "REFUNDED" ? "±$0" : usd(g, { sign: true, cents: true })}
                    </span>
                  </li>
                );
              })}
            </ul>
          ))}

        {tab === "history" &&
          (w.activity.length === 0 ? (
            <p className="px-5 py-12 text-center font-display text-[20px] font-extrabold tracking-[-0.02em] text-muted">Aucune opération</p>
          ) : (
            <ul className="divide-y divide-line">
              {w.activity.map((a) => {
                const T = TYPE[a.type] ?? TYPE.AJUSTEMENT;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-[15px]">
                    <Coin tint={T.tint} size={34}>
                      {T.icon}
                    </Coin>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{T.label}</div>
                      <div className="truncate text-[13px] font-semibold text-muted">{a.label}</div>
                    </div>
                    <span className={`num w-28 text-right font-bold ${a.amount >= 0 ? "text-up" : "text-ink"}`}>{usd(a.amount, { sign: true, cents: true })}</span>
                    <span className="hidden w-32 text-right text-[13px] font-semibold text-faint md:inline">
                      {new Date(a.at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                );
              })}
            </ul>
          ))}
      </section>
    </div>
  );
}
