"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Lock, Wallet } from "lucide-react";
import type { Market, Outcome } from "@/data/markets";
import { useWallet } from "@/lib/wallet";
import { MAX_STAKE_PER_MARKET } from "@/lib/limits";
import { estimatePayout, odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";
import { Avatar } from "./Avatar";

export function BetPanel({ market, outcome, open }: { market: Market; outcome: Outcome; open: boolean }) {
  const w = useWallet();
  const router = useRouter();
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const staked = w.stakedOn(market.slug);
  const left = Math.max(0, MAX_STAKE_PER_MARKET - staked);
  const current = odds(market.pool, outcome.pool);
  const after = odds(market.pool + amount, outcome.pool + amount);
  const payout = estimatePayout(market.pool, outcome.pool, amount);

  const submit = async () => {
    setMsg(null);
    if (!w.connected) return w.openModal("connect");
    setBusy(true);
    const err = await w.placeBet(
      { marketSlug: market.slug, marketTitle: market.title, kolId: outcome.kol.id, kolName: outcome.kol.name, amount },
      open,
    );
    setBusy(false);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: `Mise de ${usd(amount)} sur ${outcome.kol.name} enregistrée.` });
    // En mode réel, le pot vient du serveur : on le recharge pour voir la nouvelle cote.
    if (!err && w.live) router.refresh();
  };

  return (
    <div id="miser" className="card sticky top-28 scroll-mt-28 p-5">
      <div className="mb-4 flex items-center gap-3">
        <Avatar kol={outcome.kol} size={40} ring />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted">{market.question}</div>
          <div className="font-bold">{outcome.kol.name}</div>
        </div>
        <div className="text-right">
          <div className="mono text-xl font-bold">{fmtOdds(current)}</div>
          <div className="text-[11px] text-muted">cote actuelle</div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl bg-cream-2 px-3 py-2 text-sm">
        <span className="text-muted">Part du pot</span>
        <span className="mono font-semibold">{pct(outcome.prob)} · {usd(outcome.pool, { compact: true })} misés</span>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        <span>Ta mise</span>
        {w.connected && <span className="mono normal-case tracking-normal">Solde {usd(w.balance)}</span>}
      </div>
      <div className="relative mb-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-muted">$</span>
        <input
          type="number"
          min={1}
          max={MAX_STAKE_PER_MARKET}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Math.min(MAX_STAKE_PER_MARKET, Number(e.target.value) || 0)))}
          className="input mono pl-8 text-2xl font-bold"
        />
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[10, 50, 100].map((v) => (
          <button key={v} onClick={() => setAmount((a) => Math.min(MAX_STAKE_PER_MARKET, a + v))} className="btn-ghost py-1.5">+${v}</button>
        ))}
        <button onClick={() => setAmount(Math.floor(Math.min(w.balance, left)))} className="btn-ghost py-1.5">Max</button>
      </div>

      <div className="mb-4 rounded-xl bg-cream-2 p-3 text-sm">
        <div className="flex justify-between py-0.5">
          <span className="text-muted">Cote après ta mise</span>
          <span className="mono font-semibold">{fmtOdds(after)}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-muted">Frais</span>
          <span className="mono font-semibold text-up">0 $</span>
        </div>
        {w.connected && (
          <div className="flex justify-between py-0.5">
            <span className="text-muted">Déjà misé sur ce marché</span>
            <span className="mono font-semibold">{usd(staked)} / {usd(MAX_STAKE_PER_MARKET)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-line pt-2">
          <span className="font-semibold">Si {outcome.kol.name} gagne</span>
          <span className="mono font-bold text-up">
            ≈ {usd(Math.floor(payout * 100) / 100)}{" "}
            <span className="text-xs">({payout >= amount ? "+" : ""}{usd(Math.floor((payout - amount) * 100) / 100)})</span>
          </span>
        </div>
      </div>

      {msg && <p className={`mb-3 text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}

      {!open ? (
        <button disabled className="btn-dark w-full py-3 text-base opacity-60"><Lock size={16} /> Mises fermées</button>
      ) : (
        <button onClick={submit} disabled={busy} className="btn-gold w-full py-3 text-base disabled:opacity-60">
          {w.connected ? `Miser ${usd(amount)} sur ${outcome.kol.name}` : <><Wallet size={16} /> Se connecter pour miser</>}
        </button>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          Gain estimé : il bouge jusqu&apos;à la fermeture des mises selon ce que misent les autres. Si personne n&apos;a misé sur le
          gagnant, tout le monde est remboursé. <a href="/conditions" className="underline">Conditions</a>.
        </span>
      </p>
    </div>
  );
}
