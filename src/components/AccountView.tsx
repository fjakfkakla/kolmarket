"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, LogOut, ShieldCheck, Wallet } from "lucide-react";
import type { Market } from "@/data/markets";
import { useWallet } from "@/lib/wallet";
import { DEPOSIT_CAP, depositRoom } from "@/lib/limits";
import { payoutOf } from "@/lib/pot";
import { useNow } from "@/lib/useNow";
import { fmtOdds, shortWallet, usd } from "@/lib/format";
import { CopyButton } from "./CopyButton";

export function AccountView({ markets }: { markets: Market[] }) {
  const w = useWallet();
  const now = useNow();

  if (!w.ready) return null;

  if (!w.connected) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center fade-up">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold-soft text-gold-3"><Wallet size={26} /></div>
        <h1 className="text-xl font-bold">Connecte ton wallet</h1>
        <p className="mt-2 text-sm text-muted">Pour déposer des USDC, miser et suivre tes mises.</p>
        <button onClick={() => w.openModal("connect")} className="btn-gold mt-5 w-full py-3">Se connecter</button>
      </div>
    );
  }

  // Gain estimé de chaque mise avec le pot actuel. Les mises de démo ne sont pas dans les pots
  // venus du serveur : on les y ajoute pour que le calcul reste juste.
  const rows = w.bets.map((b) => {
    const m = markets.find((x) => x.slug === b.marketSlug);
    const o = m?.outcomes.find((x) => x.kol.id === b.kolId);
    const mine = w.bets.filter((x) => x.marketSlug === b.marketSlug);
    const pot = (m?.pool ?? 0) + mine.reduce((s, x) => s + x.amount, 0);
    const pool = (o?.pool ?? 0) + mine.filter((x) => x.kolId === b.kolId).reduce((s, x) => s + x.amount, 0);
    const closed = m ? (now ?? 0) >= Date.parse(m.closesAt) : true;
    return { bet: b, cote: pool > 0 ? pot / pool : null, payout: payoutOf(pot, pool, b.amount), closed };
  });
  // Meilleur cas : sur chaque marché, le KOL qui rapporterait le plus parmi ceux misés.
  const best = Object.values(
    rows.reduce<Record<string, Record<string, number>>>((acc, r) => {
      const byKol = (acc[r.bet.marketSlug] ??= {});
      byKol[r.bet.kolId] = (byKol[r.bet.kolId] ?? 0) + r.payout;
      return acc;
    }, {}),
  ).reduce((s, byKol) => s + Math.max(...Object.values(byKol)), 0);
  const room = depositRoom(w.balance, w.inPlay);
  const used = Math.min(1, (w.balance + w.inPlay) / DEPOSIT_CAP);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 fade-up">
        <div className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-ink" style={{ background: "linear-gradient(135deg,#ffd34d,#f7b801)" }}>
          {w.address!.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mon compte</h1>
          <div className="mono flex items-center gap-1 text-sm text-muted">
            {shortWallet(w.address!)} <CopyButton value={w.address!} />
            {w.provider && <span className="pill-muted ml-1 py-0">{w.provider}</span>}
          </div>
        </div>
        <button onClick={w.disconnect} className="btn-ghost ml-auto"><LogOut size={14} /> Déconnexion</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        <div className="card p-5" style={{ background: "linear-gradient(135deg,#fff,#fff6d6)" }}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
            Solde disponible <span className="pill-muted py-0 normal-case tracking-normal">démo</span>
          </div>
          <div className="mono mt-1 text-3xl font-bold">{usd(w.balance)}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => w.openModal("deposit")} className="btn-gold flex-1 py-2"><ArrowDownToLine size={14} /> Déposer</button>
            <button onClick={() => w.openModal("withdraw")} className="btn-ghost flex-1 py-2"><ArrowUpFromLine size={14} /> Retirer</button>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">En jeu</div>
          <div className="mono mt-1 text-3xl font-bold">{usd(w.inPlay)}</div>
          <div className="mt-1 text-xs text-muted">{w.bets.length} mise(s) en cours</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Gain max estimé</div>
          <div className="mono mt-1 text-3xl font-bold text-up">{usd(Math.floor(best * 100) / 100)}</div>
          <div className="mt-1 text-xs text-muted">si tes meilleurs KOLs gagnent</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Dépôt possible</div>
          <div className="mono mt-1 text-3xl font-bold">{usd(room)}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-2">
            <div className="h-full rounded-full bg-gold" style={{ width: `${used * 100}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted">plafond {usd(DEPOSIT_CAP)}, mises en cours comprises · les gains au-delà se gardent</div>
        </div>
      </div>

      <section id="mises" className="card fade-up">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold">Mes mises</h2>
          <Link href="/" className="text-sm font-semibold text-gold-3 hover:underline">Voir les marchés</Link>
        </div>
        {rows.length === 0 ? (
          <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">Aucune mise. Choisis un défi et mise sur un KOL.</p>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2">Marché</th>
                  <th className="px-3 py-2">KOL</th>
                  <th className="px-3 py-2 text-right">Mise</th>
                  <th className="px-3 py-2 text-right">Cote actuelle</th>
                  <th className="px-3 py-2 text-right">Si gagné ≈</th>
                  <th className="px-5 py-2 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ bet, cote, payout, closed }) => (
                  <tr key={bet.id} className="border-t border-line">
                    <td className="max-w-[260px] truncate px-5 py-3"><Link href={`/market/${bet.marketSlug}`} className="font-medium hover:text-gold-3">{bet.marketTitle}</Link></td>
                    <td className="px-3 py-3"><span className="pill-gold">{bet.kolName}</span></td>
                    <td className="mono px-3 py-3 text-right">{usd(bet.amount)}</td>
                    <td className="mono px-3 py-3 text-right">{fmtOdds(cote)}</td>
                    <td className="mono px-3 py-3 text-right font-semibold text-up">{usd(Math.floor(payout * 100) / 100)}</td>
                    <td className="px-5 py-3 text-right text-xs text-muted">{closed ? "En attente du résultat" : "Mises ouvertes"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card fade-up">
        <h2 className="px-5 py-4 font-bold">Historique</h2>
        {w.activity.length === 0 ? (
          <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">Aucune opération pour l&apos;instant.</p>
        ) : (
          <ul className="border-t border-line">
            {w.activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-b border-line px-5 py-3 text-sm last:border-b-0">
                <span className={`pill py-0.5 ${a.type === "DEPOT" ? "bg-up-soft text-up" : "bg-cream-2 text-muted"}`}>{a.type}</span>
                <span className="flex-1 truncate">{a.label}</span>
                <span className={`mono font-semibold ${a.amount >= 0 ? "text-up" : "text-ink"}`}>{usd(a.amount, { sign: true })}</span>
                <span className="hidden text-xs text-muted sm:inline">{new Date(a.at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white/60 p-4 text-xs text-muted fade-up">
        <ShieldCheck size={18} className="shrink-0 text-up" />
        <p>
          Tes USDC déposés sont gardés dans le coffre de Marketcoins et ne peuvent repartir que vers le wallet connecté
          ({shortWallet(w.address!)}). Marketcoins n&apos;a jamais accès à ton wallet ni à ses clés. Pour l&apos;instant, le solde et les
          mises sont une démo : aucun USDC ne bouge. <Link href="/conditions" className="underline">Conditions d&apos;utilisation</Link>.
        </p>
      </div>
    </div>
  );
}
