"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ExternalLink, LogOut, TrendingDown, TrendingUp } from "lucide-react";
import { markPrice, useWallet, type Activity, type Position } from "@/lib/wallet";
import { useNow } from "@/lib/useNow";
import { cents, shortWallet, signedPct, usd } from "@/lib/format";
import { Coin } from "./Coin";
import { CopyButton } from "./CopyButton";
import { LogoMark } from "./Logo";
import Image from "next/image";

export const PROVIDERS: Record<string, { tint: [string, string, string]; letter: string }> = {
  Phantom: { tint: ["#c4b8ff", "#ab9ff2", "#8a7be0"], letter: "P" },
  Solflare: { tint: ["#ffa25c", "#fc7227", "#e0560b"], letter: "S" },
  Backpack: { tint: ["#ff7476", "#e33e3f", "#c22526"], letter: "B" },
  Email: { tint: ["#5b80ff", "#2e5cff", "#1f45e0"], letter: "@" },
};

const RANGES = [
  { id: "1J", ms: 86400000 },
  { id: "1S", ms: 7 * 86400000 },
  { id: "1M", ms: 30 * 86400000 },
  { id: "Tout", ms: Infinity },
] as const;

function PositionMediaView({ p, size = 40 }: { p: Position; size?: number }) {
  const m = p.media;
  if (m?.kind === "coin") {
    return (
      <Coin tint={m.tint} size={size}>
        <span>{m.mark || "∅"}</span>
      </Coin>
    );
  }
  if (m?.kind === "kol" && m.avatar) {
    return <Image src={m.avatar} alt={p.outcome} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const color = m?.kind === "kol" ? m.color : "#2e5cff";
  return (
    <Coin tint={[color, color, color]} size={size}>
      <span>{p.outcome.slice(0, 2).toUpperCase()}</span>
    </Coin>
  );
}

/** Le profit cumulé : chaque vente ajoute son réalisé, le dernier point ajoute le latent. */
function pnlTimeline(activity: Activity[], unrealized: number, now: number) {
  const events = [...activity].reverse();
  const pts: { t: number; v: number }[] = [];
  let cum = 0;
  if (events.length) pts.push({ t: events[0].at, v: 0 });
  for (const e of events) {
    if (e.type === "VENTE" && typeof e.pnl === "number") {
      cum += e.pnl;
      pts.push({ t: e.at, v: cum });
    }
  }
  pts.push({ t: now, v: cum + unrealized });
  return { pts, realized: cum };
}

function AreaChart({ pts, from, to }: { pts: { t: number; v: number }[]; from: number; to: number }) {
  const W = 1000;
  const H = 1000;
  const vis = pts.filter((p) => p.t >= from);
  const before = [...pts].reverse().find((p) => p.t < from);
  const series = [{ t: from, v: before ? before.v : vis[0]?.v ?? 0 }, ...vis];
  const vals = series.map((p) => p.v);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const span = hi - lo || 1;
  const x = (t: number) => ((t - from) / Math.max(1, to - from)) * W;
  const y = (v: number) => 60 + ((hi - v) / span) * (H - 120);
  let d = "";
  series.forEach((p, i) => {
    const px = x(p.t), py = y(p.v);
    d += i === 0 ? `M${px},${py}` : `H${px}V${py}`;
  });
  d += `H${W}`;
  const last = series[series.length - 1]?.v ?? 0;
  const color = last >= (series[0]?.v ?? 0) ? "#00a03c" : "#e5484d";
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

const TYPE: Record<Activity["type"], { label: string; tint: [string, string, string]; icon: React.ReactNode }> = {
  DEPOT: { label: "Dépôt", tint: ["#2fd36d", "#00a03c", "#007e26"], icon: <ArrowDownLeft size={16} strokeWidth={2.6} /> },
  RETRAIT: { label: "Retrait", tint: ["#8a93a8", "#5b6478", "#3d4558"], icon: <ArrowUpRight size={16} strokeWidth={2.6} /> },
  ACHAT: { label: "Achat", tint: ["#5b80ff", "#2e5cff", "#1f45e0"], icon: <TrendingUp size={16} strokeWidth={2.6} /> },
  VENTE: { label: "Vente", tint: ["#2a3245", "#141a2c", "#0a0f1e"], icon: <TrendingDown size={16} strokeWidth={2.6} /> },
};

export function AccountView() {
  const w = useWallet();
  const now = useNow();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("Tout");
  const [tab, setTab] = useState<"positions" | "history">("positions");

  const t = now;
  const rows = useMemo(
    () =>
      w.positions.map((p) => {
        const px = markPrice(p, t);
        const cost = p.shares * p.avgPrice;
        const value = p.shares * px;
        return { p, px, cost, value, pnl: value - cost };
      }),
    [w.positions, t],
  );
  const invested = rows.reduce((s, r) => s + r.cost, 0);
  const value = rows.reduce((s, r) => s + r.value, 0);
  const unrealized = value - invested;
  const potential = rows.reduce((s, r) => s + r.p.shares, 0);
  const { pts, realized } = useMemo(() => pnlTimeline(w.activity, unrealized, t), [w.activity, unrealized, t]);

  if (!w.ready) return <div className="h-96" />;

  if (!w.connected) {
    return (
      <div className="card fade-up mx-auto mt-6 max-w-md p-8 text-center">
        <div className="mx-auto mb-5 w-fit">
          <LogoMark size={56} />
        </div>
        <h1 className="display text-[30px]">Connecte ton wallet</h1>
        <button onClick={() => w.openModal("connect")} className="plaque mt-6 h-[52px] w-full text-[16px]">
          Se connecter <ArrowRight size={17} />
        </button>
      </div>
    );
  }

  const r = RANGES.find((x) => x.id === range)!;
  const from = r.ms === Infinity ? Math.min(pts[0]?.t ?? t, t - 3600000) : t - r.ms;
  const startV = [...pts].reverse().find((p) => p.t <= from)?.v ?? 0;
  const pnlRange = (pts[pts.length - 1]?.v ?? 0) - startV;
  const prov = PROVIDERS[w.provider ?? "Phantom"] ?? PROVIDERS.Phantom;

  return (
    <div className="space-y-6">
      <h1 className="display fade-up text-[32px]">Mon compte</h1>

      <div className="stagger grid gap-4 lg:grid-cols-2">
        {/* Portefeuille */}
        <section className="card flex flex-col p-5 md:p-6">
          <h2 className="text-[15px] font-bold text-muted">Portefeuille</h2>
          <div className="num mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.035em]">{usd(w.balance + value, { cents: true })}</div>
          <div className={`num mt-2 flex items-center gap-1 text-[15px] font-bold ${unrealized >= 0 ? "text-up" : "text-down"}`}>
            {unrealized >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {usd(unrealized, { sign: true, cents: true })}
            <span className="font-semibold">({signedPct(invested ? unrealized / invested : 0)})</span>
            <span className="ml-1 font-semibold text-muted">sur tes positions</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div>
              <div className="text-[13px] font-bold text-faint">Cash disponible</div>
              <div className="num font-display text-[22px] font-extrabold tracking-[-0.02em]">{usd(w.balance, { cents: true })}</div>
            </div>
            <div>
              <div className="text-[13px] font-bold text-faint">En positions</div>
              <div className="num font-display text-[22px] font-extrabold tracking-[-0.02em]">{usd(value, { cents: true })}</div>
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
          <div className={`num mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] ${pnlRange > 0 ? "text-up" : pnlRange < 0 ? "text-down" : "text-ink"}`}>
            {usd(pnlRange, { sign: true, cents: true })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={realized >= 0 ? "chip-up" : "chip-down"}>Réalisé {usd(realized, { sign: true, cents: true })}</span>
            <span className={unrealized >= 0 ? "chip-up" : "chip-down"}>Latent {usd(unrealized, { sign: true, cents: true })}</span>
          </div>
          <div className="relative mt-auto h-[132px] pt-4">
            <div className="absolute inset-x-0 bottom-0 top-4">
              <AreaChart pts={pts} from={from} to={t} />
            </div>
          </div>
        </section>
      </div>

      {/* Le wallet : la carte de visite */}
      <section className="card fade-up flex flex-wrap items-center gap-4 p-5">
        <Coin tint={prov.tint} size={52}>
          <span>{prov.letter}</span>
        </Coin>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[20px] font-extrabold tracking-[-0.02em]">{w.provider ?? "Wallet"}</span>
            <span className="chip">Solana</span>
            <span className="chip-blue">USDC</span>
          </div>
          <div className="num mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-muted">
            <span className="hidden break-all md:inline">{w.address}</span>
            <span className="md:hidden">{shortWallet(w.address!)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton value={w.address!} label="Copier l'adresse" />
          <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer" className="round" title="Voir sur Solscan">
            <ExternalLink size={14} />
          </a>
          <button onClick={w.disconnect} className="round" title="Déconnecter le wallet" aria-label="Déconnecter le wallet">
            <LogOut size={14} />
          </button>
        </div>
      </section>

      {/* Positions et historique */}
      <section id="positions" className="card fade-up overflow-hidden">
        <div className="flex items-end gap-6 border-b border-line px-5 pt-4">
          <button className="tab" data-active={tab === "positions"} onClick={() => setTab("positions")}>
            Positions <span className="num ml-1 text-faint">{w.positions.length}</span>
          </button>
          <button className="tab" data-active={tab === "history"} onClick={() => setTab("history")}>
            Historique <span className="num ml-1 text-faint">{w.activity.length}</span>
          </button>
          {tab === "positions" && w.positions.length > 0 && (
            <span className="chip-up mb-2 ml-auto hidden sm:inline-flex">Si tout gagne {usd(potential, { cents: true })}</span>
          )}
        </div>

        {tab === "positions" ? (
          w.positions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-muted">Aucune position</p>
              <Link href="/app" className="plaque mt-4 h-11 px-5">
                Voir les marchés <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1fr_150px_110px_120px_100px_92px] gap-3 border-b border-line px-5 py-2.5 text-[13px] font-bold text-faint lg:grid">
                <span>Marché</span>
                <span className="text-right">Prix moyen → actuel</span>
                <span className="text-right">Valeur</span>
                <span className="text-right">Profit / Perte</span>
                <span className="text-right">Si gagné</span>
                <span />
              </div>
              <ul className="divide-y divide-line">
                {rows.map(({ p, px, value: v, pnl, cost }) => (
                  <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-5 py-3.5 lg:grid-cols-[1fr_150px_110px_120px_100px_92px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <PositionMediaView p={p} />
                      <div className="min-w-0">
                        <Link href={`/market/${p.marketSlug}`} className="line-clamp-1 text-[15px] font-bold hover:text-blue">
                          {p.marketTitle}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-muted">
                          <span className={p.side === "OUI" ? "chip-up h-6" : "chip-down h-6"}>
                            {p.side === "OUI" ? "Oui" : "Non"} · {p.outcome}
                          </span>
                          <span className="num">{p.shares.toFixed(2).replace(".", ",")} parts</span>
                        </div>
                      </div>
                    </div>
                    <div className="num text-right text-[14px] font-semibold text-muted lg:order-none">
                      {cents(p.avgPrice)} → <span className="font-bold text-ink">{cents(px)}</span>
                    </div>
                    <div className="num hidden text-right font-bold lg:block">{usd(v, { cents: true })}</div>
                    <div className={`num text-right font-bold ${pnl >= 0 ? "text-up" : "text-down"}`}>
                      {usd(pnl, { sign: true, cents: true })}
                      <div className="text-[12.5px] font-semibold">{signedPct(cost ? pnl / cost : 0)}</div>
                    </div>
                    <div className="num text-right font-bold text-ink-2">{usd(p.shares, { cents: true })}</div>
                    <button onClick={() => w.sell(p.id, px)} className="plaque plaque-ink col-span-2 h-10 text-[14px] lg:col-span-1">
                      Vendre
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : w.activity.length === 0 ? (
          <p className="px-5 py-12 text-center font-display text-[20px] font-extrabold tracking-[-0.02em] text-muted">Aucune opération</p>
        ) : (
          <ul className="divide-y divide-line">
            {w.activity.map((a) => {
              const T = TYPE[a.type];
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-[15px]">
                  <Coin tint={T.tint} size={34}>
                    {T.icon}
                  </Coin>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{T.label}</div>
                    <div className="truncate text-[13px] font-semibold text-muted">{a.label}</div>
                  </div>
                  {typeof a.pnl === "number" && (
                    <span className={`${a.pnl >= 0 ? "chip-up" : "chip-down"} hidden sm:inline-flex`}>{usd(a.pnl, { sign: true, cents: true })}</span>
                  )}
                  <span className={`num w-28 text-right font-bold ${a.amount >= 0 ? "text-up" : "text-ink"}`}>{usd(a.amount, { sign: true, cents: true })}</span>
                  <span className="hidden w-32 text-right text-[13px] font-semibold text-faint md:inline">
                    {new Date(a.at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
