"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, PenLine, ShieldCheck, Wallet } from "lucide-react";
import type { AdminData, AdminKol, AdminMarket } from "@/lib/admin-data";
import { type AdminAction, type AdminActionName, adminMessage, parseAdminAction } from "@/lib/admin-message";
import {
  CORRECTION_HOURS,
  MAX_CUSTOM_DAYS,
  type Phase,
  addDays,
  customChallengeSpec,
  dayFr,
  daysBetween,
  isoDay,
  marketPhase,
} from "@/lib/challenge-calendar";
import { signMessageWith } from "@/lib/solana-wallets";
import { useWallet } from "@/lib/wallet";
import { dateFr, pnlClass, shortWallet, usd } from "@/lib/format";
import { Avatar } from "./Avatar";
import { CopyButton } from "./CopyButton";

const HOUR = 3600_000;
const PHASE: Record<Phase, { label: string; cls: string }> = {
  betting: { label: "Mises ouvertes", cls: "pill-up" },
  live: { label: "En cours", cls: "pill-gold" },
  counting: { label: "Terminé, sans résultat", cls: "pill-down" },
  proposed: { label: "Résultat proposé", cls: "pill-gold" },
  resolved: { label: "Payé", cls: "pill-muted" },
  cancelled: { label: "Annulé", cls: "pill-muted" },
};
const ACTION_FR: Record<AdminActionName, string> = {
  create_challenge: "Défi créé",
  add_kol: "KOL ajouté",
  set_kol_active: "KOL activé / retiré",
  resolve_now: "Résultat lu",
  propose_winner: "Gagnant choisi",
  settle_now: "Pot payé",
  cancel_market: "Défi annulé",
};
const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#06b6d4", "#ef4444", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];
const utc = (iso: string) => `${dateFr(iso, { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })} UTC`;
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

type Result = { ok: boolean; text: string; key: string } | null;

/** Signe une action avec le wallet de la session, l'envoie, puis recharge la page. */
function useSignedAction() {
  const w = useWallet();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const run = async (key: string, raw: AdminAction) => {
    setBusy(key);
    setResult(null);
    try {
      const action = parseAdminAction(raw);
      if (!action || !w.address) throw new Error("Action invalide.");
      const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
      const issuedAt = new Date().toISOString();
      const signature = await signMessageWith(w.provider, w.address, await adminMessage(action, nonce, issuedAt));
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nonce, issuedAt, signature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Action impossible.");
      setResult({ ok: true, text: data.message, key });
      router.refresh();
      return true;
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message, key });
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { run, busy, result };
}

type Act = ReturnType<typeof useSignedAction>;

function Feedback({ act, k }: { act: Act; k: string }) {
  if (!act.result || act.result.key !== k) return null;
  return <p className={`mt-2 text-sm ${act.result.ok ? "text-up" : "text-down"}`}>{act.result.text}</p>;
}

function SignButton({ act, k, onClick, children, tone = "gold", disabled = false }: {
  act: Act; k: string; onClick: () => void; children: React.ReactNode; tone?: "gold" | "dark" | "down" | "ghost"; disabled?: boolean;
}) {
  const cls = tone === "gold" ? "btn-gold" : tone === "dark" ? "btn-dark" : tone === "down" ? "btn-down" : "btn-ghost";
  return (
    <button onClick={onClick} disabled={disabled || act.busy !== null} className={`${cls} py-2 disabled:opacity-50`}>
      {act.busy === k ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />} {children}
    </button>
  );
}

function MarketAdmin({ m, kols, act, now, trackerKey }: { m: AdminMarket; kols: AdminKol[]; act: Act; now: number; trackerKey: boolean }) {
  const phase = marketPhase(m, now);
  const [form, setForm] = useState<"winner" | "cancel" | null>(null);
  const [winner, setWinner] = useState(m.winnerId ?? m.results[0]?.kolId ?? m.outcomes[0]?.kolId ?? "");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const name = (id: string | null) => kols.find((k) => k.id === id)?.name ?? id ?? "?";
  const k = (s: string) => `${s}:${m.id}`;
  const base = { marketId: m.id, slug: m.slug };
  const payAt = m.proposedAt ? Date.parse(m.proposedAt) + CORRECTION_HOURS * HOUR : null;
  const ended = phase === "counting" || phase === "proposed";

  return (
    <li className="border-b border-line px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/market/${m.slug}`} target="_blank" className="font-semibold hover:text-gold-3">{m.title}</Link>
        <span className={`${PHASE[phase].cls} py-0`}>{PHASE[phase].label}</span>
        <span className="mono text-xs text-muted">{m.slug}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {m.dataStart && m.dataEnd && <span>Jours comptés : {dayFr(m.dataStart, false)} → {dayFr(m.dataEnd, false)} (UTC)</span>}
        <span>Mises fermées : {utc(m.closesAt)}</span>
        <span>Pot : <b className="mono text-ink">{usd(m.pot)}</b> · {m.players} joueur(s)</span>
        {m.winnerId && <span>Gagnant : <b className="text-ink">{name(m.winnerId)}</b>{m.resultSource === "manual" ? " (décision manuelle)" : m.resultSource === "auto" ? " (Solana Tracker)" : ""}</span>}
        {phase === "proposed" && payAt && (
          <span>
            {payAt > now ? `Paiement prévu : ${utc(new Date(payAt).toISOString())}` : "Paiement : relecture des chiffres en cours"}
            {m.resultSource === "manual" && " · sans relecture"}
          </span>
        )}
      </div>
      {m.resolutionNote && <p className="mt-1 text-sm">{m.resolutionNote}</p>}
      {m.recheck?.blocked && (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-down"><AlertTriangle size={14} /> {m.recheck.reason} Paye, corrige ou annule ci-dessous.</p>
      )}
      {!m.recheck?.blocked && (m.recheck?.count ?? 0) > 0 && <p className="mt-1 text-xs text-muted">Republié {m.recheck!.count} fois après relecture.</p>}

      {m.results.length > 0 && (
        <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
          {m.results.map((r, i) => (
            <li key={r.kolId} className="flex justify-between">
              <span>{i + 1}. {name(r.kolId)}</span>
              <span className={`mono ${r.pnl === null ? "text-muted" : pnlClass(r.pnl)}`}>{r.pnl === null ? "indisponible" : usd(r.pnl, { sign: true, cents: true })}</span>
            </li>
          ))}
        </ul>
      )}

      {phase !== "resolved" && phase !== "cancelled" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {phase === "counting" && (
            <SignButton act={act} k={k("resolve")} disabled={!trackerKey} onClick={() => act.run(k("resolve"), { action: "resolve_now", ...base })}>
              Lire le résultat maintenant
            </SignButton>
          )}
          {phase === "proposed" && (
            <SignButton act={act} k={k("settle")} onClick={() => act.run(k("settle"), { action: "settle_now", ...base })}>
              Payer le pot maintenant
            </SignButton>
          )}
          {ended && (
            <button onClick={() => setForm(form === "winner" ? null : "winner")} className="btn-ghost py-2">
              {phase === "proposed" ? "Corriger le gagnant" : "Choisir le gagnant"}
            </button>
          )}
          <button onClick={() => setForm(form === "cancel" ? null : "cancel")} className="btn-ghost py-2 text-down">Annuler et rembourser</button>
        </div>
      )}

      {form === "winner" && (
        <div className="mt-3 grid gap-2 rounded-xl bg-cream-2 p-3 sm:grid-cols-[180px_1fr_auto]">
          <select value={winner} onChange={(e) => setWinner(e.target.value)} className="input py-2">
            {m.outcomes.map((o) => <option key={o.kolId} value={o.kolId}>{name(o.kolId)}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input py-2" placeholder="Explication affichée aux joueurs" />
          <SignButton act={act} k={k("winner")} disabled={note.trim().length < 5}
            onClick={async () => (await act.run(k("winner"), { action: "propose_winner", ...base, kolId: winner, note: note.trim() })) && setForm(null)}>
            Signer
          </SignButton>
          <p className="text-xs text-muted sm:col-span-3">Payé {CORRECTION_HOURS} h plus tard, sans relecture des chiffres (ta décision fait foi).</p>
        </div>
      )}
      {form === "cancel" && (
        <div className="mt-3 grid gap-2 rounded-xl bg-down-soft/50 p-3 sm:grid-cols-[1fr_auto]">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="input py-2" placeholder="Raison affichée aux joueurs" />
          <SignButton act={act} k={k("cancel")} tone="down" disabled={reason.trim().length < 5}
            onClick={async () => (await act.run(k("cancel"), { action: "cancel_market", ...base, reason: reason.trim() })) && setForm(null)}>
            Signer l&apos;annulation
          </SignButton>
          <p className="text-xs text-muted sm:col-span-2">Toutes les mises de ce défi reviennent sur le solde des joueurs. Irréversible.</p>
        </div>
      )}
      <Feedback act={act} k={k("resolve")} />
      <Feedback act={act} k={k("settle")} />
      <Feedback act={act} k={k("winner")} />
      <Feedback act={act} k={k("cancel")} />
    </li>
  );
}

function NewChallenge({ kols, act, now }: { kols: AdminKol[]; act: Act; now: number }) {
  const tomorrow = addDays(isoDay(new Date(now)), 1);
  const active = kols.filter((k) => k.active);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(tomorrow);
  const [end, setEnd] = useState(addDays(tomorrow, 1));
  const [picked, setPicked] = useState<string[]>(active.map((k) => k.id));
  const days = start && end && end >= start ? daysBetween(start, end).length : 0;
  const problem =
    title.trim().length < 10 ? "Titre : 10 caractères au moins."
      : start < tomorrow ? "Le défi doit commencer au plus tôt demain (UTC)."
        : days === 0 ? "La fin doit être après le début."
          : days > MAX_CUSTOM_DAYS ? `${MAX_CUSTOM_DAYS} jours au maximum.`
            : picked.length < 2 ? "Choisis au moins 2 KOLs." : null;
  const spec = days > 0 ? customChallengeSpec(title.trim() || "…", start, end) : null;

  return (
    <section className="card p-5 fade-up">
      <h2 className="font-bold">Lancer un défi</h2>
      <p className="mt-1 text-sm text-muted">Dates en jours UTC. Les mises ferment au départ, le résultat et le paiement suivent tout seuls.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_160px]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Qui fera le plus de profit ce week-end ?" maxLength={120} />
        <label className="text-xs text-muted">Premier jour<input type="date" value={start} min={tomorrow} onChange={(e) => setStart(e.target.value)} className="input mt-1" /></label>
        <label className="text-xs text-muted">Dernier jour<input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="input mt-1" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {active.map((k) => {
          const on = picked.includes(k.id);
          return (
            <button key={k.id} onClick={() => setPicked(on ? picked.filter((x) => x !== k.id) : [...picked, k.id])}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition ${on ? "border-gold bg-gold-soft font-semibold" : "border-line bg-white text-muted"}`}>
              <Avatar kol={k} size={18} /> {k.name}
            </button>
          );
        })}
      </div>
      {spec && (
        <div className="mt-3 rounded-xl bg-cream-2 p-3 text-sm">
          <div>Adresse : <span className="mono">/market/{spec.slug}</span> · {days} jour(s) · étiquette {spec.period}</div>
          <div className="text-muted">
            Mises ouvertes jusqu&apos;au {dayFr(start)} 00:00 UTC · résultat le {dayFr(addDays(end, 1))} vers 12:00 UTC · paiement 24 h plus tard
          </div>
          <details className="mt-1 text-muted">
            <summary className="cursor-pointer">Règles affichées</summary>
            <ol className="mt-1 list-decimal space-y-1 pl-5">{spec.rules.map((r) => <li key={r}>{r}</li>)}</ol>
          </details>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <SignButton act={act} k="create" disabled={problem !== null}
          onClick={async () => (await act.run("create", { action: "create_challenge", title: title.trim(), start, end, kolIds: picked })) && setTitle("")}>
          Signer et lancer le défi
        </SignButton>
        {problem && <span className="text-xs text-muted">{problem}</span>}
      </div>
      <Feedback act={act} k="create" />
    </section>
  );
}

function Kols({ kols, act, trackerKey }: { kols: AdminKol[]; act: Act; trackerKey: boolean }) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [wallet, setWallet] = useState("");
  const [color, setColor] = useState(COLORS[kols.length % COLORS.length]);
  // Résultat de la vérification, valable pour l'adresse vérifiée seulement
  const [check, setCheck] = useState<{ wallet: string; ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const verify = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/check-wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Vérification impossible.");
      setCheck({ wallet, ok: true, text: `Connu de Solana Tracker · PnL 7 j : ${usd(d.pnl7d, { sign: true })} · ${d.trades7d} trades · ${d.activeDays} jour(s) actif(s)` });
    } catch (e) {
      setCheck({ wallet, ok: false, text: (e as Error).message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="card fade-up">
      <div className="px-5 py-4">
        <h2 className="font-bold">KOLs suivis</h2>
        <p className="mt-1 text-sm text-muted">Un KOL actif entre dans chaque défi automatique aux mises ouvertes. Le retirer ne touche pas aux défis déjà fermés.</p>
      </div>
      <ul className="border-t border-line">
        {kols.map((k) => (
          <li key={k.id} className={`flex flex-wrap items-center gap-3 border-b border-line px-5 py-2.5 text-sm ${k.active ? "" : "opacity-60"}`}>
            <Avatar kol={k} size={30} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{k.name} <a href={`https://x.com/${k.handle}`} target="_blank" rel="noreferrer" className="font-normal text-muted hover:text-ink">@{k.handle}</a></div>
              <div className="mono flex items-center gap-1 text-xs text-muted">
                {shortWallet(k.wallet)} <CopyButton value={k.wallet} />
                <a href={`https://solscan.io/account/${k.wallet}`} target="_blank" rel="noreferrer" className="hover:text-ink" title="Solscan"><ExternalLink size={12} /></a>
              </div>
            </div>
            <span className={`mono w-24 text-right ${k.pnl7d === null ? "text-muted" : pnlClass(k.pnl7d)}`}>{k.pnl7d === null ? "—" : usd(k.pnl7d, { compact: true, sign: true })}</span>
            <SignButton act={act} k={`kol:${k.id}`} tone="ghost" onClick={() => act.run(`kol:${k.id}`, { action: "set_kol_active", kolId: k.id, active: !k.active })}>
              {k.active ? "Retirer des prochains défis" : "Réactiver"}
            </SignButton>
            {act.result?.key === `kol:${k.id}` && <Feedback act={act} k={`kol:${k.id}`} />}
          </li>
        ))}
      </ul>
      <div className="p-5">
        <h3 className="font-semibold">Ajouter un KOL</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_2fr_56px]">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Nom affiché" maxLength={30} />
          <input value={handle} onChange={(e) => setHandle(e.target.value)} className="input" placeholder="Handle X (sans @)" maxLength={16} />
          <input value={wallet} onChange={(e) => setWallet(e.target.value.trim())} className="input mono" placeholder="Adresse du wallet principal" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-white p-1" title="Couleur des courbes" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={verify} disabled={!trackerKey || wallet.length < 32 || checking} className="btn-ghost py-2 disabled:opacity-50">
            {checking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Vérifier sur Solana Tracker
          </button>
          <SignButton act={act} k="addkol" disabled={name.trim().length < 2 || !handle.trim() || wallet.length < 32}
            onClick={async () => {
              if (await act.run("addkol", { action: "add_kol", name: name.trim(), handle: handle.trim(), wallet, color })) {
                setName(""); setHandle(""); setWallet("");
              }
            }}>
            Signer et ajouter
          </SignButton>
        </div>
        {check?.wallet === wallet && <p className={`mt-2 text-sm ${check.ok ? "text-up" : "text-down"}`}>{check.text}</p>}
        <Feedback act={act} k="addkol" />
        <p className="mt-2 text-xs text-muted">Vérifie le wallet avant : si Solana Tracker ne le connaît pas, les défis où il figure ne pourront pas être résolus et seront remboursés.</p>
      </div>
    </section>
  );
}

export function AdminView({ data, now }: { data: AdminData; now: number }) {
  const w = useWallet();
  const act = useSignedAction();
  const [showDone, setShowDone] = useState(false);
  const ORDER: Record<Phase, number> = { counting: 0, proposed: 1, betting: 2, live: 3, resolved: 4, cancelled: 4 };
  const markets = useMemo(
    () => [...data.markets].sort((a, b) => ORDER[marketPhase(a, now)] - ORDER[marketPhase(b, now)] || Date.parse(a.startsAt) - Date.parse(b.startsAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.markets, now],
  );
  const done = markets.filter((m) => ["resolved", "cancelled"].includes(marketPhase(m, now)));
  const current = markets.filter((m) => !done.includes(m));

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Wallet size={14} /> {w.address && shortWallet(w.address)} · chaque action est signée par ton wallet : rien ne part sans ta signature, et tout est inscrit au journal.
        </p>
        {!data.trackerKey && <p className="mt-2 text-sm font-semibold text-down">SOLANATRACKER_API_KEY manquante : PnL, résultats et relecture en pause.</p>}
      </div>

      <section className="card fade-up">
        <h2 className="px-5 py-4 font-bold">Défis en cours</h2>
        <ul className="border-t border-line">
          {current.length === 0 && <li className="px-5 py-6 text-sm text-muted">Aucun défi en cours.</li>}
          {current.map((m) => <MarketAdmin key={m.id} m={m} kols={data.kols} act={act} now={now} trackerKey={data.trackerKey} />)}
        </ul>
        {done.length > 0 && (
          <>
            <button onClick={() => setShowDone((v) => !v)} className="w-full border-t border-line px-5 py-3 text-left text-sm font-semibold text-muted hover:text-ink">
              {showDone ? "Masquer" : "Voir"} les défis terminés ({done.length})
            </button>
            {showDone && <ul className="border-t border-line">{done.map((m) => <MarketAdmin key={m.id} m={m} kols={data.kols} act={act} now={now} trackerKey={data.trackerKey} />)}</ul>}
          </>
        )}
      </section>

      <NewChallenge kols={data.kols} act={act} now={now} />
      <Kols kols={data.kols} act={act} trackerKey={data.trackerKey} />

      <section className="card fade-up">
        <h2 className="px-5 py-4 font-bold">Journal</h2>
        {data.log.length === 0 ? (
          <p className="border-t border-line px-5 py-6 text-sm text-muted">Aucune action pour l&apos;instant.</p>
        ) : (
          <ul className="border-t border-line text-sm">
            {data.log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line px-5 py-2 last:border-0">
                <span className="mono text-xs text-muted">{utc(l.at)}</span>
                <span className="font-semibold">{ACTION_FR[l.action as AdminActionName] ?? l.action}</span>
                {l.target && <span className="mono text-xs text-muted">{l.target}</span>}
                <span className={`ml-auto text-xs ${l.outcome?.startsWith("refusé") ? "text-down" : "text-muted"}`}>{l.outcome ?? "…"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Avant l'accès : connexion avec le wallet admin. */
export function AdminGate({ connected, configured }: { connected: boolean; configured: boolean }) {
  const w = useWallet();
  const router = useRouter();
  // Après la connexion, on recharge la page : le serveur vérifie si ce wallet est admin.
  useEffect(() => {
    if (w.connected !== connected) router.refresh();
  }, [w.connected, connected, router]);
  return (
    <div className="card mx-auto max-w-md p-8 text-center fade-up">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gold-soft text-gold-3"><ShieldCheck size={26} /></div>
      <h1 className="text-xl font-bold">Administration</h1>
      {!configured ? (
        <p className="mt-2 text-sm text-muted">Aucun wallet admin : ajoute ton adresse dans la variable <span className="mono">ADMIN_WALLETS</span> sur Railway.</p>
      ) : connected ? (
        <p className="mt-2 text-sm text-muted">Ce wallet n&apos;a pas accès à l&apos;administration. Connecte-toi avec le wallet admin.</p>
      ) : (
        <p className="mt-2 text-sm text-muted">Connecte le wallet admin pour continuer.</p>
      )}
      {configured && (
        <button onClick={() => (connected ? w.disconnect() : w.openModal("connect"))} className="btn-gold mt-5 w-full py-3">
          {connected ? "Changer de wallet" : "Se connecter"}
        </button>
      )}
    </div>
  );
}
