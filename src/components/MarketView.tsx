"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import type { Market, Outcome, Period } from "@/data/markets";
import type { Kol } from "@/data/kols";
import { Avatar } from "./Avatar";
import { Countdown } from "./Countdown";
import { CopyButton } from "./CopyButton";
import { PnlChart } from "./PnlChart";
import { Podium } from "./Podium";
import { ShareButtons } from "./ShareButtons";
import { TradePanel } from "./TradePanel";
import { cents, dateFr, pct, shortWallet, usd } from "@/lib/format";

const ACTIVITY = [
  { who: "7Gx2…xVq", side: "OUI", kol: "Cooker", amt: 250, price: 0.33, ago: "12 s" },
  { who: "Bq91…aa4", side: "NON", kol: "zeropnl", amt: 40, price: 0.93, ago: "48 s" },
  { who: "3Fkd…m0P", side: "OUI", kol: "Cented", amt: 120, price: 0.22, ago: "2 min" },
  { who: "9zLm…Qe7", side: "OUI", kol: "decu", amt: 75, price: 0.21, ago: "3 min" },
  { who: "Hh3s…k2R", side: "NON", kol: "Cooker", amt: 500, price: 0.67, ago: "5 min" },
];

export function OutcomeRow({
  outcome,
  rank,
  pnl,
  active,
  side,
  onPick,
}: {
  outcome: Outcome;
  rank: number;
  pnl: number;
  active: boolean;
  side: "OUI" | "NON";
  onPick: (side: "OUI" | "NON") => void;
}) {
  const o = outcome;
  return (
    <li
      onClick={() => onPick(side)}
      className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition md:grid-cols-[1fr_120px_260px] md:px-5 ${
        active ? "bg-blue-soft/60" : "hover:bg-paper-2"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="num w-4 shrink-0 text-center text-[13px] font-bold text-faint">{rank}</span>
        <Avatar kol={o.kol} size={44} ring={active} />
        <div className="min-w-0">
          <div className="truncate text-[16px] font-bold">{o.kol.name}</div>
          <div className="num text-[13px] font-semibold text-up">{usd(pnl, { compact: true, sign: true })} PnL</div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 md:justify-center">
        <span className="num font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]">{pct(o.prob)}</span>
        <span className={`num flex items-center gap-0.5 text-[12.5px] font-bold ${o.change24h >= 0 ? "text-up" : "text-down"}`}>
          {o.change24h >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(o.change24h).toFixed(1).replace(".", ",")}
        </span>
      </div>
      <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick("OUI");
          }}
          className={`h-11 ${active && side === "OUI" ? "plaque plaque-up" : "soft-up"}`}
        >
          Oui <span className="num">{cents(o.prob)}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick("NON");
          }}
          className={`h-11 ${active && side === "NON" ? "plaque plaque-down" : "soft-down"}`}
        >
          Non <span className="num">{cents(1 - o.prob)}</span>
        </button>
      </div>
    </li>
  );
}

export function MarketView({ market, kols: KOLS, sibling }: { market: Market; kols: Kol[]; sibling?: Market }) {
  const [selected, setSelected] = useState(market.outcomes[0]);
  const [side, setSide] = useState<"OUI" | "NON">("OUI");
  const [period, setPeriod] = useState<Period>(market.period);
  const [open, setOpen] = useState<"book" | "activity" | null>("activity");
  const pnlKey = market.period === "7D" ? "pnl7d" : "pnl30d";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        {/* Tête */}
        <header className="fade-up">
          <div className="flex items-start gap-4">
            <div className="hidden shrink-0 -space-x-3 sm:flex">
              {market.outcomes.slice(0, 3).map((o) => (
                <Avatar key={o.kol.id} kol={o.kol} size={52} className="ring-[3px] ring-paper" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="chip-blue">KOL · {market.period === "7D" ? "7 jours" : "30 jours"}</span>
                <span className="chip">Défi #{market.challenge}</span>
                <span className="chip">{dateFr(market.startsAt)} → {dateFr(market.endsAt)}</span>
              </div>
              <h1 className="display text-[28px] md:text-[34px]">{market.title}</h1>
            </div>
            <ShareButtons />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {market.outcomes.slice(0, 4).map((o) => (
              <button key={o.kol.id} onClick={() => setSelected(o)} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.kol.color }} />
                {o.kol.name} <span className="num font-bold text-ink">{pct(o.prob)}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Graphique */}
        <section className="card p-4 fade-up md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">Course au PnL</h2>
            <div className="seg ml-auto">
              {(["7D", "30D"] as Period[]).map((p) => (
                <button key={p} className="seg-item" data-active={period === p} onClick={() => setPeriod(p)}>
                  {p === "7D" ? "7 jours" : "30 jours"}
                </button>
              ))}
            </div>
          </div>
          <PnlChart kols={KOLS} period={period} highlight={selected.kol.id} />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3.5 text-[14px] font-semibold text-muted">
            <span><span className="num font-bold text-ink">{usd(market.volume)}</span> Vol.</span>
            <span><span className="num font-bold text-ink">{usd(market.pool, { compact: true })}</span> dans le pool</span>
            <span><span className="num font-bold text-ink">{market.traders}</span> traders</span>
            <span className="ml-auto"><Countdown to={market.closesAt} compact /></span>
          </div>
        </section>

        {/* Résultats */}
        <section className="card overflow-hidden fade-up">
          <div className="hidden grid-cols-[1fr_120px_260px] gap-4 border-b border-line px-5 py-3 text-[13px] font-bold text-faint md:grid">
            <span>Trader</span>
            <span className="text-center">Chances</span>
            <span className="text-center">Acheter</span>
          </div>
          <ul className="divide-y divide-line">
            {market.outcomes.map((o, i) => (
              <OutcomeRow
                key={o.kol.id}
                outcome={o}
                rank={i + 1}
                pnl={o.kol[pnlKey]}
                active={selected.kol.id === o.kol.id}
                side={side}
                onPick={(s) => {
                  setSelected(o);
                  setSide(s);
                }}
              />
            ))}
          </ul>
        </section>

        {/* Classement */}
        <section className="fade-up">
          <h2 className="mb-3 font-display text-[22px] font-extrabold tracking-[-0.02em]">Classement {period === "7D" ? "7 jours" : "30 jours"}</h2>
          <Podium kols={KOLS} period={period} />
        </section>

        {/* Carnet d'ordres et activité */}
        <section className="card overflow-hidden fade-up">
          <button onClick={() => setOpen(open === "book" ? null : "book")} className="flex w-full items-center justify-between px-5 py-4 text-left">
            <span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">
              Carnet d&apos;ordres <span className="ml-1.5 font-sans text-[14px] font-semibold text-muted">{selected.kol.name} · {side === "OUI" ? "Oui" : "Non"}</span>
            </span>
            <ChevronDown size={18} className={`text-muted transition ${open === "book" ? "rotate-180" : ""}`} />
          </button>
          {open === "book" && (
            <div className="pop grid border-t border-line text-[14px] md:grid-cols-2">
              {(["Achat", "Vente"] as const).map((col, ci) => (
                <div key={col} className={ci === 0 ? "border-b border-line md:border-b-0 md:border-r" : ""}>
                  <div className="grid grid-cols-3 px-5 py-2 text-[13px] font-bold text-faint">
                    <span>{col}</span>
                    <span className="text-right">Prix</span>
                    <span className="text-right">Total</span>
                  </div>
                  {[0, 1, 2, 3, 4].map((r) => {
                    const base = side === "OUI" ? selected.prob : 1 - selected.prob;
                    const p = ci === 0 ? base - 0.01 * (r + 1) : base + 0.01 * (r + 1);
                    const qty = Math.round(400 + ((r * 977 + ci * 311) % 2600));
                    const wid = Math.min(100, (qty / 3000) * 100);
                    return (
                      <div key={r} className="relative grid grid-cols-3 px-5 py-1.5">
                        <span className="absolute inset-y-0 left-0" style={{ width: `${wid}%`, background: ci === 0 ? "rgba(0,160,60,.09)" : "rgba(229,72,77,.09)" }} />
                        <span className="num relative font-semibold">{qty.toLocaleString("fr-FR")}</span>
                        <span className={`num relative text-right font-bold ${ci === 0 ? "text-up" : "text-down"}`}>{cents(Math.max(0.01, Math.min(0.99, p)))}</span>
                        <span className="num relative text-right font-semibold text-muted">{usd(qty * p)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setOpen(open === "activity" ? null : "activity")} className="flex w-full items-center justify-between border-t border-line px-5 py-4 text-left">
            <span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">Activité</span>
            <ChevronDown size={18} className={`text-muted transition ${open === "activity" ? "rotate-180" : ""}`} />
          </button>
          {open === "activity" && (
            <ul className="pop divide-y divide-line border-t border-line">
              {ACTIVITY.map((a, i) => {
                const k = KOLS.find((x) => x.name === a.kol) ?? KOLS[0];
                return (
                  <li key={i} className="flex items-center gap-3 px-5 py-3 text-[14px]">
                    <Avatar kol={k} size={30} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-muted">{a.who}</span> a pris{" "}
                      <span className={`font-bold ${a.side === "OUI" ? "text-up" : "text-down"}`}>{a.side === "OUI" ? "Oui" : "Non"}</span> sur{" "}
                      <span className="font-bold">{a.kol}</span> à <span className="num font-semibold">{cents(a.price)}</span>
                    </span>
                    <span className="num font-bold">{usd(a.amt)}</span>
                    <span className="hidden w-14 text-right text-[13px] font-semibold text-faint sm:inline">{a.ago}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Règles */}
        <section className="card p-5 fade-up" id="regles">
          <h2 className="mb-3 font-display text-[19px] font-extrabold tracking-[-0.02em]">Règles</h2>
          <ol className="space-y-2.5 text-[15px] text-ink-2">
            {market.rules.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-soft text-[12.5px] font-bold text-blue">{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">Résolution : multisig 2/3 et 24 h de contestation</span>
            <span className="chip">Source : wallets publics, on-chain</span>
          </div>
        </section>

        {/* Wallets suivis */}
        <section className="card p-5 fade-up">
          <h2 className="mb-3 font-display text-[19px] font-extrabold tracking-[-0.02em]">Wallets suivis</h2>
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
                <a href={`https://x.com/${k.handle}`} target="_blank" rel="noreferrer" className="round" title={`@${k.handle} sur X`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.8-8.9L0 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L6.4 3.9H4.4L17.7 20z" />
                  </svg>
                </a>
                <a href={`https://solscan.io/account/${k.wallet}`} target="_blank" rel="noreferrer" className="round" title="Voir sur Solscan">
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <TradePanel
          marketSlug={market.slug}
          marketTitle={market.title}
          question={market.question}
          choice={{
            id: selected.kol.id,
            name: selected.kol.name,
            prob: selected.prob,
            visual: <Avatar kol={selected.kol} size={46} ring />,
            media: { kind: "kol", avatar: selected.kol.avatar, color: selected.kol.color },
          }}
          side={side}
          onSide={setSide}
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
              <div className="num text-[13px] font-semibold text-muted">{usd(sibling.volume, { compact: true })} Vol.</div>
            </div>
            <span className="num font-display text-[20px] font-extrabold text-blue">{pct(sibling.outcomes[0].prob)}</span>
          </Link>
        )}
      </aside>
    </div>
  );
}
