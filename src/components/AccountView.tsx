"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Languages, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { useWallet, type Activity } from "@/lib/wallet";
import { cents, shortWallet, usd } from "@/lib/format";
import { INTL_LOCALE, fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { CopyButton } from "./CopyButton";
import { LanguageSelect } from "./LanguageSelect";

export function AccountView() {
  const w = useWallet();
  const { locale, t } = useI18n();
  const ta = t.account;
  const sideLabel = (s: string) => (s === "OUI" ? t.common.yes : t.common.no);
  const activityLabel = (a: Activity) => {
    if (a.type === "DEPOT") return ta.depositLabel;
    if (a.type === "RETRAIT") return ta.withdrawLabel;
    if (a.side && a.outcome) return `${sideLabel(a.side)} · ${a.outcome}`;
    return a.label;
  };

  if (!w.ready) return null;

  if (!w.connected) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center fade-up">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold-soft text-gold-3"><Wallet size={26} /></div>
        <h1 className="text-xl font-bold">{ta.connectTitle}</h1>
        <p className="mt-2 text-sm text-muted">{ta.connectText}</p>
        <button onClick={() => w.openModal("connect")} className="btn-gold mt-5 w-full py-3">{t.nav.login}</button>
        <div id="parametres" className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 text-left">
          <span className="flex items-center gap-2 text-sm font-semibold"><Languages size={16} className="text-gold-3" /> {ta.language}</span>
          <LanguageSelect />
        </div>
      </div>
    );
  }

  const invested = w.positions.reduce((s, p) => s + p.shares * p.avgPrice, 0);
  const value = w.positions.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const potential = w.positions.reduce((s, p) => s + p.shares, 0);
  const pnl = value - invested;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 fade-up">
        <div className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-ink" style={{ background: "linear-gradient(135deg,#ffd34d,#f7b801)" }}>
          {w.address!.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{ta.title}</h1>
          <div className="mono flex items-center gap-1 text-sm text-muted">
            {shortWallet(w.address!)} <CopyButton value={w.address!} />
            <span className="pill-muted ml-1 py-0">{w.provider}</span>
          </div>
        </div>
        <button onClick={w.disconnect} className="btn-ghost ml-auto"><LogOut size={14} /> {ta.logout}</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        <div className="card p-5" style={{ background: "linear-gradient(135deg,#fff,#fff6d6)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{ta.available}</div>
          <div className="mono mt-1 text-3xl font-bold">{usd(w.balance)}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => w.openModal("deposit")} className="btn-gold flex-1 py-2"><ArrowDownToLine size={14} /> {t.nav.deposit}</button>
            <button onClick={() => w.openModal("withdraw")} className="btn-ghost flex-1 py-2"><ArrowUpFromLine size={14} /> {ta.withdraw}</button>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{ta.positionsValue}</div>
          <div className="mono mt-1 text-3xl font-bold">{usd(value)}</div>
          <div className="mt-1 text-xs text-muted">{fmt(ta.openPositions, { n: w.positions.length })}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{ta.unrealized}</div>
          <div className={`mono mt-1 text-3xl font-bold ${pnl >= 0 ? "text-up" : "text-down"}`}>{usd(pnl, { sign: true })}</div>
          <div className="mt-1 text-xs text-muted">{fmt(ta.invested, { amount: usd(invested) })}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{ta.maxGain}</div>
          <div className="mono mt-1 text-3xl font-bold text-up">{usd(potential)}</div>
          <div className="mt-1 text-xs text-muted">{ta.ifAllWin}</div>
        </div>
      </div>

      <section id="positions" className="card fade-up">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold">{ta.positions}</h2>
          <Link href="/" className="text-sm font-semibold text-gold-3 hover:underline">{ta.seeMarkets}</Link>
        </div>
        {w.positions.length === 0 ? (
          <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">{ta.noPositions}</p>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2">{ta.cols.market}</th>
                  <th className="px-3 py-2">{ta.cols.pick}</th>
                  <th className="px-3 py-2 text-right">{ta.cols.shares}</th>
                  <th className="px-3 py-2 text-right">{ta.cols.avg}</th>
                  <th className="px-3 py-2 text-right">{ta.cols.current}</th>
                  <th className="px-3 py-2 text-right">{ta.cols.value}</th>
                  <th className="px-3 py-2 text-right">{ta.cols.ifWon}</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {w.positions.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="max-w-[260px] truncate px-5 py-3"><Link href={`/market/${p.marketSlug}`} className="font-medium hover:text-gold-3">{t.markets[p.marketSlug]?.title ?? p.marketTitle}</Link></td>
                    <td className="px-3 py-3"><span className={p.side === "OUI" ? "pill-up" : "pill-down"}>{sideLabel(p.side)} · {p.outcome}</span></td>
                    <td className="mono px-3 py-3 text-right">{p.shares.toFixed(2)}</td>
                    <td className="mono px-3 py-3 text-right">{cents(p.avgPrice)}</td>
                    <td className="mono px-3 py-3 text-right">{cents(p.currentPrice)}</td>
                    <td className="mono px-3 py-3 text-right font-semibold">{usd(p.shares * p.currentPrice)}</td>
                    <td className="mono px-3 py-3 text-right font-semibold text-up">{usd(p.shares)}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => w.sell(p.id)} className="btn-ghost py-1 text-xs">{ta.sell}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card fade-up">
        <h2 className="px-5 py-4 font-bold">{ta.history}</h2>
        {w.activity.length === 0 ? (
          <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">{ta.noHistory}</p>
        ) : (
          <ul className="border-t border-line">
            {w.activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-b border-line px-5 py-3 text-sm last:border-b-0">
                <span className={`pill py-0.5 ${a.type === "DEPOT" || a.type === "VENTE" ? "bg-up-soft text-up" : "bg-cream-2 text-muted"}`}>{ta.activityTypes[a.type]}</span>
                <span className="flex-1 truncate">{activityLabel(a)}</span>
                <span className={`mono font-semibold ${a.amount >= 0 ? "text-up" : "text-ink"}`}>{usd(a.amount, { sign: true })}</span>
                <span className="hidden text-xs text-muted sm:inline">{new Date(a.at).toLocaleString(INTL_LOCALE[locale], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="parametres" className="card scroll-mt-28 fade-up">
        <h2 className="px-5 py-4 font-bold">{ta.settings}</h2>
        <div className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-soft text-gold-3"><Languages size={18} /></div>
          <div className="flex-1">
            <div className="font-semibold">{ta.language}</div>
            <div className="text-xs text-muted">{ta.languageHint}</div>
          </div>
          <LanguageSelect />
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white/60 p-4 text-xs text-muted fade-up">
        <ShieldCheck size={18} className="shrink-0 text-up" />
        <p>
          {ta.nonCustodialA}<Link href="/conditions" className="underline">{t.footer.terms}</Link>.
        </p>
      </div>
    </div>
  );
}
