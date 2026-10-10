"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { MAX_STAKE_PER_MARKET } from "@/lib/limits";
import { estimatePayout, odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export type BetChoice = {
  /** Identifiant du résultat (le KOL, ou le coin). */
  id: string;
  name: string;
  /** Montant déjà misé sur ce résultat. */
  pool: number;
  /** Part du pot, 0..1 */
  prob: number;
  visual: ReactNode;
};

const QUICK = [10, 50, 100];

/**
 * Le ticket du pot commun : une mise sur un résultat, la cote qu'elle donne, le gain estimé.
 * 0 frais : 100 % du pot revient à ceux qui ont misé sur le gagnant.
 */
export function BetPanel({
  marketSlug,
  marketTitle,
  question,
  pot,
  choice,
  open,
  soon = false,
}: {
  marketSlug: string;
  marketTitle: string;
  question: string;
  /** Pot commun du marché. */
  pot: number;
  choice: BetChoice;
  open: boolean;
  /** Marché affiché mais pas encore ouvert aux vraies mises. */
  soon?: boolean;
}) {
  const { t } = useI18n();
  const tp = t.market.panel;
  const w = useWallet();
  const router = useRouter();
  const [raw, setRaw] = useState("10");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const parsed = Number(raw);
  const amount = Number.isFinite(parsed) ? Math.min(parsed, MAX_STAKE_PER_MARKET) : 0;
  const setAmount = (v: number) => {
    const c = Math.max(0, Math.min(MAX_STAKE_PER_MARKET, Math.round(v * 100) / 100));
    setRaw(c > 0 ? String(c) : "");
    setMsg(null);
  };

  const staked = w.stakedOn(marketSlug);
  const left = Math.max(0, MAX_STAKE_PER_MARKET - staked);
  const current = odds(pot, choice.pool);
  const after = odds(pot + amount, choice.pool + amount);
  const payout = estimatePayout(pot, choice.pool, amount);
  const closed = !open || (soon && w.live);

  const submit = async () => {
    setMsg(null);
    if (!w.connected) return w.openModal("connect");
    setBusy(true);
    const err = await w.placeBet({ marketSlug, marketTitle, kolId: choice.id, kolName: choice.name, amount }, open);
    setBusy(false);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: fmt(tp.placed, { amount: usd(amount), name: choice.name }) });
    // En mode réel, le pot vient du serveur : on le recharge pour voir la nouvelle cote.
    if (!err && w.live) router.refresh();
  };

  return (
    <div id="bet" className="card scroll-mt-32 p-5 lg:sticky lg:top-[132px]">
      <div className="mb-4 flex items-center gap-3">
        {choice.visual}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-muted">{question}</div>
          <div className="truncate font-display text-[19px] font-extrabold tracking-[-0.02em]">{choice.name}</div>
        </div>
        <div className="text-right">
          <div className="num font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-blue">{fmtOdds(current, t.common.open)}</div>
          <div className="mt-1 text-[12px] font-bold text-faint">{tp.odds}</div>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl bg-paper-2 px-3.5 py-2.5 text-[14px]">
        <span className="font-semibold text-muted">{tp.poolShare}</span>
        <span className="num font-bold">
          {pct(choice.prob)} · {fmt(t.market.staked, { amount: usd(choice.pool, { compact: true }) })}
        </span>
      </div>

      {!closed && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-bold">{tp.yourBet}</div>
              {w.connected && (
                <button onClick={() => setAmount(Math.floor(Math.min(w.balance, left)))} className="num text-[13px] font-semibold text-muted hover:text-blue">
                  {fmt(tp.balance, { amount: usd(w.balance, { cents: true }) })}
                </button>
              )}
            </div>
            <label className="relative flex min-w-0 flex-1 items-center justify-end">
              <span className={`-mr-0.5 font-display text-[40px] font-extrabold leading-none ${amount ? "text-ink" : "text-faint"}`}>$</span>
              <input
                inputMode="decimal"
                aria-label={tp.amountAria}
                value={raw}
                placeholder="0"
                onChange={(e) => {
                  const v = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
                  const [i, ...d] = v.split(".");
                  setRaw(d.length ? `${i}.${d.join("").slice(0, 2)}` : i);
                  setMsg(null);
                }}
                className="num min-w-0 bg-transparent text-right font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-ink outline-none placeholder:text-faint"
                style={{ width: `calc(${Math.max(1, raw.length)}ch + 2px)`, padding: 0 }}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-1.5">
            {QUICK.map((v) => (
              <button key={v} onClick={() => setAmount(amount + v)} className="ghost h-8 rounded-full px-3 text-[13px]">
                +${v}
              </button>
            ))}
            <button onClick={() => setAmount(Math.floor(Math.min(w.connected ? w.balance : MAX_STAKE_PER_MARKET, left)))} className="ghost h-8 rounded-full px-3 text-[13px]">
              {t.common.max}
            </button>
          </div>

          <dl className="mt-5 space-y-1.5 rounded-2xl bg-paper-2 p-3.5 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-muted">{tp.oddsAfter}</dt>
              <dd className="num font-bold">{fmtOdds(after, t.common.open)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{tp.fees}</dt>
              <dd className="font-bold text-blue">0 %</dd>
            </div>
            {w.connected && (
              <div className="flex justify-between">
                <dt className="text-muted">{tp.alreadyStaked}</dt>
                <dd className="num font-bold">
                  {usd(staked)} / {usd(MAX_STAKE_PER_MARKET)}
                </dd>
              </div>
            )}
            <div className="flex items-end justify-between border-t border-line pt-2.5">
              <dt className="font-bold">{tp.payout}</dt>
              <dd className="num text-right font-display text-[22px] font-extrabold leading-none text-up">
                {usd(Math.floor(payout * 100) / 100, { cents: true })}
              </dd>
            </div>
          </dl>
        </>
      )}

      {msg && (
        <p className={`pop mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-semibold ${msg.ok ? "bg-up-soft text-up-deep" : "bg-down-soft text-down-deep"}`}>
          {msg.ok && <Check size={16} strokeWidth={3} />} {msg.text}
        </p>
      )}

      {closed ? (
        <button disabled className="plaque plaque-ink mt-4 h-[52px] w-full text-[16px]">
          <Lock size={16} /> {soon && open ? tp.openingSoon : tp.closed}
        </button>
      ) : (
        <button onClick={submit} disabled={busy || amount <= 0} className="plaque mt-4 h-[52px] w-full text-[16px]">
          {w.connected ? (
            <>
              {fmt(tp.cta, { amount: usd(amount), name: choice.name.length > 16 ? tp.them : choice.name })} <ArrowRight size={17} />
            </>
          ) : (
            <>
              {tp.connect} <ArrowRight size={17} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
