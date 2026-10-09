"use client";

import { useState } from "react";
import { ChevronDown, Info, Wallet } from "lucide-react";
import type { Market, Outcome } from "@/data/markets";
import { useWallet } from "@/lib/wallet";
import { cents, usd } from "@/lib/format";
import { Avatar } from "./Avatar";

export function TradePanel({
  market,
  outcome,
  side,
  onSide,
}: {
  market: Market;
  outcome: Outcome;
  side: "OUI" | "NON";
  onSide: (s: "OUI" | "NON") => void;
}) {
  const w = useWallet();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const price = side === "OUI" ? outcome.prob : 1 - outcome.prob;
  const shares = price > 0 ? amount / price : 0;
  const payout = shares; // 1$ par part gagnante
  const profit = payout - amount;
  const fee = amount * 0.02;

  const submit = () => {
    setMsg(null);
    if (!w.connected) return w.openModal("connect");
    if (amount <= 0) return setMsg({ ok: false, text: "Montant invalide." });
    const ok = w.buy(
      {
        marketSlug: market.slug,
        marketTitle: market.title,
        outcome: outcome.kol.name,
        side,
        shares: Math.round(shares * 100) / 100,
        avgPrice: price,
        currentPrice: price,
      },
      amount,
    );
    setMsg(ok ? { ok: true, text: `Position ouverte : ${shares.toFixed(1)} parts ${side} · ${outcome.kol.name}` } : { ok: false, text: "Solde insuffisant. Dépose des USDC." });
  };

  return (
    <div className="card sticky top-28 p-5">
      <div className="mb-4 flex items-center gap-3">
        <Avatar kol={outcome.kol} size={40} ring />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted">{market.question}</div>
          <div className="flex items-center gap-1 font-bold">
            {outcome.kol.name} <ChevronDown size={14} className="text-muted" />
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-5 border-b border-line">
        <button className="tab" data-active={tab === "buy"} onClick={() => setTab("buy")}>Acheter</button>
        <button className="tab" data-active={tab === "sell"} onClick={() => setTab("sell")}>Vendre</button>
        <span className="ml-auto pb-2 text-xs text-muted">Marché ▾</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onSide("OUI")}
          className={`btn py-3 text-base ${side === "OUI" ? "bg-up text-white shadow-md" : "bg-up-soft text-up hover:bg-up/20"}`}
        >
          Oui {cents(outcome.prob)}
        </button>
        <button
          onClick={() => onSide("NON")}
          className={`btn py-3 text-base ${side === "NON" ? "bg-down text-white shadow-md" : "bg-down-soft text-down hover:bg-down/20"}`}
        >
          Non {cents(1 - outcome.prob)}
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        <span>Montant</span>
        {w.connected && <span className="mono normal-case tracking-normal">Solde {usd(w.balance)}</span>}
      </div>
      <div className="relative mb-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-muted">$</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className="input mono pl-8 text-2xl font-bold"
        />
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[1, 20, 100].map((v) => (
          <button key={v} onClick={() => setAmount((a) => a + v)} className="btn-ghost py-1.5">+${v}</button>
        ))}
        <button onClick={() => setAmount(Math.floor(w.balance))} className="btn-ghost py-1.5">Max</button>
      </div>

      <div className="mb-4 rounded-xl bg-cream-2 p-3 text-sm">
        <div className="flex justify-between py-0.5">
          <span className="text-muted">Prix moyen</span>
          <span className="mono font-semibold">{cents(price)}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-muted">Parts</span>
          <span className="mono font-semibold">{shares.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-muted">Frais (2 %)</span>
          <span className="mono font-semibold">{usd(fee)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-line pt-2">
          <span className="font-semibold">Gain potentiel</span>
          <span className="mono font-bold text-up">
            {usd(payout)} <span className="text-xs">({profit >= 0 ? "+" : ""}{((profit / Math.max(amount, 1)) * 100).toFixed(0)} %)</span>
          </span>
        </div>
      </div>

      {msg && <p className={`mb-3 text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}

      {tab === "buy" ? (
        <button onClick={submit} className={`w-full py-3 text-base ${side === "OUI" ? "btn bg-up text-white hover:bg-green-700" : "btn bg-down text-white hover:bg-red-700"}`}>
          {w.connected ? `Acheter ${side}` : <><Wallet size={16} /> Connecter le wallet</>}
        </button>
      ) : (
        <button onClick={() => setMsg({ ok: false, text: "Aucune part à vendre sur ce choix. Va dans Mon compte." })} className="btn-dark w-full py-3 text-base">
          Vendre {side}
        </button>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted">
        <Info size={12} className="mt-0.5 shrink-0" />
        En négociant, tu acceptes les <a href="/conditions" className="underline">conditions d&apos;utilisation</a>. Chaque part gagnante vaut 1 $ à la résolution.
      </p>
    </div>
  );
}
