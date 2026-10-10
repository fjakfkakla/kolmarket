"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { markPrice, useWallet, type PositionMedia } from "@/lib/wallet";
import { useNow } from "@/lib/useNow";
import { cents, usd } from "@/lib/format";

export type TradeChoice = {
  id: string;
  name: string;
  prob: number;
  visual: ReactNode;
  media: PositionMedia;
};

const QUICK = [1, 5, 10, 100];

/** Le ticket : choisir Oui ou Non, un montant, et ce que ça rapporte. Frais 0 %. */
export function TradePanel({
  marketSlug,
  marketTitle,
  question,
  choice,
  side,
  onSide,
  sticky = true,
}: {
  marketSlug: string;
  marketTitle: string;
  question: string;
  choice: TradeChoice;
  side: "OUI" | "NON";
  onSide: (s: "OUI" | "NON") => void;
  sticky?: boolean;
}) {
  const w = useWallet();
  const now = useNow();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [raw, setRaw] = useState("");
  const parsed = Number(raw.replace(",", "."));
  const amount = Number.isFinite(parsed) ? Math.min(parsed, 1_000_000) : 0;
  const setAmount = (fn: number | ((a: number) => number)) => {
    const v = typeof fn === "function" ? fn(amount) : fn;
    setRaw(v > 0 ? String(Math.round(v * 100) / 100).replace(".", ",") : "");
    setDone(null);
  };
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const price = side === "OUI" ? choice.prob : 1 - choice.prob;
  const shares = price > 0 ? amount / price : 0;
  const profit = shares - amount;
  const mine = w.positions.filter((p) => p.marketSlug === marketSlug && p.outcome === choice.name);

  const submit = () => {
    setErr(null);
    setDone(null);
    if (!w.connected) return w.openModal("connect");
    if (amount <= 0) return setErr("Choisis un montant.");
    if (amount > w.balance) return setErr(`Solde insuffisant : ${usd(w.balance, { cents: true })} disponible.`);
    w.buy(
      {
        marketSlug,
        marketTitle,
        outcome: choice.name,
        side,
        shares: Math.round(shares * 100) / 100,
        avgPrice: price,
        currentPrice: price,
        media: choice.media,
      },
      amount,
    );
    setRaw("");
    setDone(`${shares.toFixed(2).replace(".", ",")} parts ${side === "OUI" ? "Oui" : "Non"} sur ${choice.name}`);
  };

  return (
    <div className={`card p-5 ${sticky ? "lg:sticky lg:top-[132px]" : ""}`}>
      <div className="mb-4 flex items-center gap-3">
        {choice.visual}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-muted">{question}</div>
          <div className="truncate font-display text-[19px] font-extrabold tracking-[-0.02em]">{choice.name}</div>
        </div>
      </div>

      <div className="mb-4 flex items-end gap-5 border-b border-line">
        <button className="tab" data-active={tab === "buy"} onClick={() => setTab("buy")}>Acheter</button>
        <button className="tab" data-active={tab === "sell"} onClick={() => setTab("sell")}>
          Vendre{mine.length > 0 && <span className="ml-1.5 rounded-full bg-relief px-1.5 text-[12px] text-ink-2">{mine.length}</span>}
        </button>
        <span className="ml-auto pb-2.5 text-[13px] font-bold text-muted">Au marché</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onSide("OUI")}
          className={`h-12 text-[16px] ${side === "OUI" ? "plaque plaque-up" : "soft-up"}`}
          aria-pressed={side === "OUI"}
        >
          Oui <span className="num">{cents(choice.prob)}</span>
        </button>
        <button
          onClick={() => onSide("NON")}
          className={`h-12 text-[16px] ${side === "NON" ? "plaque plaque-down" : "soft-down"}`}
          aria-pressed={side === "NON"}
        >
          Non <span className="num">{cents(1 - choice.prob)}</span>
        </button>
      </div>

      {tab === "buy" ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-bold">Montant</div>
              {w.connected && (
                <button onClick={() => setAmount(Math.floor(w.balance))} className="num text-[13px] font-semibold text-muted hover:text-blue">
                  Solde {usd(w.balance, { cents: true })}
                </button>
              )}
            </div>
            <label className="relative flex min-w-0 flex-1 items-center justify-end">
              <span className={`-mr-0.5 font-display text-[40px] font-extrabold leading-none ${amount ? "text-ink" : "text-faint"}`}>$</span>
              <input
                inputMode="decimal"
                aria-label="Montant en dollars"
                value={raw}
                placeholder="0"
                onChange={(e) => {
                  const v = e.target.value.replace(".", ",").replace(/[^\d,]/g, "");
                  const [i, ...d] = v.split(",");
                  setRaw(d.length ? `${i},${d.join("").slice(0, 2)}` : i);
                  setDone(null);
                }}
                className="num min-w-0 bg-transparent text-right font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-ink outline-none placeholder:text-faint"
                style={{ width: `calc(${Math.max(1, raw.length)}ch + 2px)`, padding: 0 }}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-1.5">
            {QUICK.map((v) => (
              <button key={v} onClick={() => setAmount((a) => a + v)} className="ghost h-8 rounded-full px-3 text-[13px]">
                +${v}
              </button>
            ))}
            {w.connected && (
              <button onClick={() => setAmount(Math.floor(w.balance))} className="ghost h-8 rounded-full px-3 text-[13px]">Max</button>
            )}
          </div>

          {amount > 0 && (
            <dl className="pop mt-5 space-y-1.5 rounded-2xl bg-paper-2 p-3.5 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-muted">Prix moyen</dt>
                <dd className="num font-bold">{cents(price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Parts</dt>
                <dd className="num font-bold">{shares.toFixed(2).replace(".", ",")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Frais</dt>
                <dd className="font-bold text-blue">0 %</dd>
              </div>
              <div className="flex items-end justify-between border-t border-line pt-2.5">
                <dt className="font-bold">Gain si {side === "OUI" ? "Oui" : "Non"} gagne</dt>
                <dd className="num text-right font-display text-[22px] font-extrabold leading-none text-up">
                  {usd(shares, { cents: true })}
                  <span className="ml-1.5 font-sans text-[13px] font-bold">+{Math.round((profit / Math.max(amount, 0.01)) * 100)} %</span>
                </dd>
              </div>
            </dl>
          )}

          {err && <p className="mt-3 text-[14px] font-semibold text-down-deep">{err}</p>}
          {done && (
            <p className="pop mt-3 flex items-center gap-2 rounded-xl bg-up-soft px-3 py-2 text-[14px] font-semibold text-up-deep">
              <Check size={16} strokeWidth={3} /> {done}
            </p>
          )}

          <button onClick={submit} className="plaque mt-4 h-[52px] w-full text-[16px]">
            {w.connected ? "Négocier" : "Se connecter pour trader"} <ArrowRight size={17} />
          </button>
        </>
      ) : (
        <div>
          {mine.length === 0 ? (
            <p className="py-6 text-center text-[15px] font-semibold text-muted">Aucune part sur ce choix</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((p) => {
                const px = markPrice(p, now || p.createdAt);
                const value = p.shares * px;
                const pnl = value - p.shares * p.avgPrice;
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold">
                        {p.side === "OUI" ? "Oui" : "Non"} · <span className="num">{p.shares.toFixed(2).replace(".", ",")}</span> parts
                      </div>
                      <div className="num text-[13px] font-semibold text-muted">
                        {cents(p.avgPrice)} → {cents(px)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num font-bold">{usd(value, { cents: true })}</div>
                      <div className={`num text-[13px] font-bold ${pnl >= 0 ? "text-up" : "text-down"}`}>{usd(pnl, { sign: true, cents: true })}</div>
                    </div>
                    <button onClick={() => w.sell(p.id, px)} className="plaque plaque-ink h-9 px-3 text-[13px]">Vendre</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
