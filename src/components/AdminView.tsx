"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, PenLine, Rocket, ShieldCheck, Wallet } from "lucide-react";
import type { AdminData, AdminKol, AdminMarket } from "@/lib/admin-data";
import { type AdminAction, type AdminActionName, adminMessage, parseAdminAction } from "@/lib/admin-message";
import {
  CORRECTION_HOURS,
  MAX_CUSTOM_DAYS,
  type Phase,
  addDays,
  customChallengeSpec,
  daysBetween,
  isoDay,
  marketPhase,
} from "@/lib/challenge-calendar";
import { signMessageWith } from "@/lib/solana-wallets";
import { useWallet } from "@/lib/wallet";
import { fmtDate, pnlClass, shortWallet, usd } from "@/lib/format";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { Avatar } from "./Avatar";
import { CopyButton } from "./CopyButton";
import { LaunchCountdown } from "./LaunchCountdown";

const HOUR = 3600_000;
const PHASE_CLS: Record<Phase, string> = {
  betting: "chip-up",
  live: "chip-blue",
  counting: "chip-down",
  proposed: "chip-blue",
  resolved: "chip",
  cancelled: "chip",
};
const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#06b6d4", "#ef4444", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];
const utc = (iso: string, intl: string) => `${fmtDate(iso, intl, { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })} UTC`;
/** Jour UTC (« 2026-10-12 ») écrit dans la langue de l'interface, avec ou sans le jour de la semaine. */
const dayLabel = (day: string, intl: string, weekday = true) =>
  fmtDate(`${day}T00:00:00Z`, intl, { timeZone: "UTC", month: "long", ...(weekday ? { weekday: "long" } : {}) });
const plural = (n: number, m: { one: string; other: string }) => fmt(n === 1 ? m.one : m.other, { n });
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

type Result = { ok: boolean; text: string; key: string } | null;

/** Signe une action avec le wallet de la session, l'envoie, puis recharge la page. */
function useSignedAction() {
  const w = useWallet();
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const run = async (key: string, raw: AdminAction) => {
    setBusy(key);
    setResult(null);
    try {
      const action = parseAdminAction(raw);
      if (!action || !w.address) throw new Error(t.admin.invalidAction);
      const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
      const issuedAt = new Date().toISOString();
      const signature = await signMessageWith(w.provider, w.address, await adminMessage(action, nonce, issuedAt));
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nonce, issuedAt, signature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t.admin.actionFailed);
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
  return <p className={`mt-2 text-sm ${act.result.ok ?"text-up" : "text-down"}`}>{act.result.text}</p>;
}

function SignButton({ act, k, onClick, children, tone = "gold", disabled = false }: {
  act: Act; k: string; onClick: () => void; children: React.ReactNode; tone?: "gold" | "dark" | "down" | "ghost"; disabled?: boolean;
}) {
  const cls = tone === "gold" ? "plaque" : tone === "dark" ? "plaque plaque-ink" : tone === "down" ? "plaque plaque-down" : "ghost";
  return (
    <button onClick={onClick} disabled={disabled || act.busy !== null} className={`${cls} py-2 disabled:opacity-50`}>
      {act.busy === k ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />} {children}
    </button>
  );
}

function MarketAdmin({ m, kols, act, now, trackerKey }: { m: AdminMarket; kols: AdminKol[]; act: Act; now: number; trackerKey: boolean }) {
  const { t, intl } = useI18n();
  const a = t.admin;
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
        <Link href={`/market/${m.slug}`} target="_blank" className="font-semibold hover:text-blue">{m.title}</Link>
        <span className={`${PHASE_CLS[phase]} py-0`}>{a.phase[phase]}</span>
        <span className="num text-xs text-muted">{m.slug}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {m.dataStart && m.dataEnd && <span>{fmt(a.daysCounted, { start: dayLabel(m.dataStart, intl, false), end: dayLabel(m.dataEnd, intl, false) })}</span>}
        <span>{fmt(a.betsClosed, { date: utc(m.closesAt, intl) })}</span>
        <span>{a.pot} <b className="num text-ink">{usd(m.pot)}</b> · {plural(m.players, a.players)}</span>
        {m.winnerId && <span>{a.winner} <b className="text-ink">{name(m.winnerId)}</b>{m.resultSource === "manual" ? a.manualDecision : m.resultSource === "auto" ? " (Solana Tracker)" : ""}</span>}
        {phase === "proposed" && payAt && (
          <span>
            {payAt > now ? fmt(a.payoutAt, { date: utc(new Date(payAt).toISOString(), intl) }) : a.payoutRechecking}
            {m.resultSource === "manual" && a.noRecheck}
          </span>
        )}
      </div>
      {m.resolutionNote && <p className="mt-1 text-sm">{m.resolutionNote}</p>}
      {m.recheck?.blocked && (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-down"><AlertTriangle size={14} /> {m.recheck.reason} {a.blockedHint}</p>
      )}
      {!m.recheck?.blocked && (m.recheck?.count ?? 0) > 0 && <p className="mt-1 text-xs text-muted">{fmt(a.republished, { n: m.recheck!.count })}</p>}

      {m.results.length > 0 && (
        <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
          {m.results.map((r, i) => (
            <li key={r.kolId} className="flex justify-between">
              <span>{i + 1}. {name(r.kolId)}</span>
              <span className={`num ${r.pnl === null ?"text-muted" : pnlClass(r.pnl)}`}>{r.pnl === null ? a.unavailable : usd(r.pnl, { sign: true, cents: true })}</span>
            </li>
          ))}
        </ul>
      )}

      {phase !== "resolved" && phase !== "cancelled" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {phase === "counting" && (
            <SignButton act={act} k={k("resolve")} disabled={!trackerKey} onClick={() => act.run(k("resolve"), { action: "resolve_now", ...base })}>
              {a.readNow}
            </SignButton>
          )}
          {phase === "proposed" && (
            <SignButton act={act} k={k("settle")} onClick={() => act.run(k("settle"), { action: "settle_now", ...base })}>
              {a.payNow}
            </SignButton>
          )}
          {ended && (
            <button onClick={() => setForm(form === "winner" ? null : "winner")} className="ghost py-2">
              {phase === "proposed" ? a.fixWinner : a.pickWinner}
            </button>
          )}
          <button onClick={() => setForm(form === "cancel" ? null : "cancel")} className="ghost py-2 text-down">{a.cancelRefund}</button>
        </div>
      )}

      {form === "winner" && (
        <div className="mt-3 grid gap-2 rounded-xl bg-paper-2 p-3 sm:grid-cols-[180px_1fr_auto]">
          <select value={winner} onChange={(e) => setWinner(e.target.value)} className="input py-2">
            {m.outcomes.map((o) => <option key={o.kolId} value={o.kolId}>{name(o.kolId)}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input py-2" placeholder={a.notePlaceholder} />
          <SignButton act={act} k={k("winner")} disabled={note.trim().length < 5}
            onClick={async () => (await act.run(k("winner"), { action: "propose_winner", ...base, kolId: winner, note: note.trim() })) && setForm(null)}>
            {a.sign}
          </SignButton>
          <p className="text-xs text-muted sm:col-span-3">{fmt(a.winnerHint, { h: CORRECTION_HOURS })}</p>
        </div>
      )}
      {form === "cancel" && (
        <div className="mt-3 grid gap-2 rounded-xl bg-down-soft/50 p-3 sm:grid-cols-[1fr_auto]">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="input py-2" placeholder={a.reasonPlaceholder} />
          <SignButton act={act} k={k("cancel")} tone="down" disabled={reason.trim().length < 5}
            onClick={async () => (await act.run(k("cancel"), { action: "cancel_market", ...base, reason: reason.trim() })) && setForm(null)}>
            {a.signCancel}
          </SignButton>
          <p className="text-xs text-muted sm:col-span-2">{a.cancelHint}</p>
        </div>
      )}
      <Feedback act={act} k={k("resolve")} />
      <Feedback act={act} k={k("settle")} />
      <Feedback act={act} k={k("winner")} />
      <Feedback act={act} k={k("cancel")} />
    </li>
  );
}

/** Lancement public : le chrono de 7 jours affiché sur la landing, et l'ouverture de l'app à zéro. */
function LaunchAdmin({ at, act, now }: { at: number | null; act: Act; now: number }) {
  const { t, intl } = useI18n();
  const l = t.admin.launch;
  const open = at !== null && at <= now;
  const date = at === null ? "" : utc(new Date(at).toISOString(), intl);
  return (
    <section className="card p-5 fade-up">
      <h2 className="flex items-center gap-2 font-bold"><Rocket size={16} /> {l.title}</h2>
      <p className="mt-1 text-sm text-muted">{l.intro}</p>
      {!open && (
        <div className="mt-5">
          <LaunchCountdown at={at} serverNow={now} />
        </div>
      )}
      <p className="mt-5 text-sm font-semibold">{at === null ? l.notStarted : fmt(open ? l.open : l.running, { date })}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <SignButton act={act} k="launch" onClick={() => confirm(l.confirmStart) && act.run("launch", { action: "start_launch" })}>
          {at === null ? l.start : l.restart}
        </SignButton>
        {at !== null && (
          <SignButton act={act} k="unlaunch" tone="ghost" onClick={() => confirm(l.confirmReset) && act.run("unlaunch", { action: "reset_launch" })}>
            {l.reset}
          </SignButton>
        )}
      </div>
      <Feedback act={act} k="launch" />
      <Feedback act={act} k="unlaunch" />
    </section>
  );
}

function NewChallenge({ kols, act, now }: { kols: AdminKol[]; act: Act; now: number }) {
  const { t, intl } = useI18n();
  const c = t.admin.newChallenge;
  const tomorrow = addDays(isoDay(new Date(now)), 1);
  const active = kols.filter((k) => k.active);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(tomorrow);
  const [end, setEnd] = useState(addDays(tomorrow, 1));
  const [picked, setPicked] = useState<string[]>(active.map((k) => k.id));
  const days = start && end && end >= start ? daysBetween(start, end).length : 0;
  const problem =
    title.trim().length < 10 ? c.titleTooShort
      : start < tomorrow ? c.startTooEarly
        : days === 0 ? c.endBeforeStart
          : days > MAX_CUSTOM_DAYS ? fmt(c.tooLong, { n: MAX_CUSTOM_DAYS })
            : picked.length < 2 ? c.minKols : null;
  const spec = days > 0 ? customChallengeSpec(title.trim() || "…", start, end) : null;

  return (
    <section className="card p-5 fade-up">
      <h2 className="font-bold">{c.title}</h2>
      <p className="mt-1 text-sm text-muted">{c.intro}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_160px]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder={c.titlePlaceholder} maxLength={120} />
        <label className="text-xs text-muted">{c.firstDay}<input type="date" value={start} min={tomorrow} onChange={(e) => setStart(e.target.value)} className="input mt-1" /></label>
        <label className="text-xs text-muted">{c.lastDay}<input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="input mt-1" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {active.map((k) => {
          const on = picked.includes(k.id);
          return (
            <button key={k.id} onClick={() => setPicked(on ? picked.filter((x) => x !== k.id) : [...picked, k.id])}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition ${on ?"border-blue bg-blue-soft font-semibold" : "border-line bg-white text-muted"}`}>
              <Avatar kol={k} size={18} /> {k.name}
            </button>
          );
        })}
      </div>
      {spec && (
        <div className="mt-3 rounded-xl bg-paper-2 p-3 text-sm">
          <div>{c.address} <span className="num">/market/{spec.slug}</span> · {plural(days, c.days)} · {fmt(c.period, { period: spec.period })}</div>
          <div className="text-muted">
            {fmt(c.schedule, { start: dayLabel(start, intl), result: dayLabel(addDays(end, 1), intl) })}
          </div>
          <details className="mt-1 text-muted">
            <summary className="cursor-pointer">{c.rules}</summary>
            <ol className="mt-1 list-decimal space-y-1 pl-5">{spec.rules.map((r) => <li key={r}>{r}</li>)}</ol>
          </details>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <SignButton act={act} k="create" disabled={problem !== null}
          onClick={async () => (await act.run("create", { action: "create_challenge", title: title.trim(), start, end, kolIds: picked })) && setTitle("")}>
          {c.signLaunch}
        </SignButton>
        {problem && <span className="text-xs text-muted">{problem}</span>}
      </div>
      <Feedback act={act} k="create" />
    </section>
  );
}

function Kols({ kols, act, trackerKey }: { kols: AdminKol[]; act: Act; trackerKey: boolean }) {
  const { t } = useI18n();
  const kt = t.admin.kols;
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
      if (!res.ok) throw new Error(d.error ?? kt.checkFailed);
      setCheck({ wallet, ok: true, text: fmt(kt.trackerOk, { pnl: usd(d.pnl7d, { sign: true }), trades: d.trades7d, days: plural(d.activeDays, kt.activeDays) }) });
    } catch (e) {
      setCheck({ wallet, ok: false, text: (e as Error).message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="card fade-up">
      <div className="px-5 py-4">
        <h2 className="font-bold">{kt.title}</h2>
        <p className="mt-1 text-sm text-muted">{kt.intro}</p>
      </div>
      <ul className="border-t border-line">
        {kols.map((k) => (
          <li key={k.id} className={`flex flex-wrap items-center gap-3 border-b border-line px-5 py-2.5 text-sm ${k.active ?"" : "opacity-60"}`}>
            <Avatar kol={k} size={30} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{k.name} <a href={`https://x.com/${k.handle}`} target="_blank" rel="noreferrer" className="font-normal text-muted hover:text-ink">@{k.handle}</a></div>
              <div className="num flex items-center gap-1 text-xs text-muted">
                {shortWallet(k.wallet)} <CopyButton value={k.wallet} />
                <a href={`https://solscan.io/account/${k.wallet}`} target="_blank" rel="noreferrer" className="hover:text-ink" title="Solscan"><ExternalLink size={12} /></a>
              </div>
            </div>
            <span className={`num w-24 text-right ${k.pnl7d === null ?"text-muted" : pnlClass(k.pnl7d)}`}>{k.pnl7d === null ? "—" : usd(k.pnl7d, { compact: true, sign: true })}</span>
            <SignButton act={act} k={`kol:${k.id}`} tone="ghost" onClick={() => act.run(`kol:${k.id}`, { action: "set_kol_active", kolId: k.id, active: !k.active })}>
              {k.active ? kt.remove : kt.reactivate}
            </SignButton>
            {act.result?.key === `kol:${k.id}` && <Feedback act={act} k={`kol:${k.id}`} />}
          </li>
        ))}
      </ul>
      <div className="p-5">
        <h3 className="font-semibold">{kt.addTitle}</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_2fr_56px]">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={kt.namePlaceholder} maxLength={30} />
          <input value={handle} onChange={(e) => setHandle(e.target.value)} className="input" placeholder={kt.handlePlaceholder} maxLength={16} />
          <input value={wallet} onChange={(e) => setWallet(e.target.value.trim())} className="input num" placeholder={kt.walletPlaceholder} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-white p-1" title={kt.colorTitle} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={verify} disabled={!trackerKey || wallet.length < 32 || checking} className="ghost py-2 disabled:opacity-50">
            {checking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {kt.verify}
          </button>
          <SignButton act={act} k="addkol" disabled={name.trim().length < 2 || !handle.trim() || wallet.length < 32}
            onClick={async () => {
              if (await act.run("addkol", { action: "add_kol", name: name.trim(), handle: handle.trim(), wallet, color })) {
                setName(""); setHandle(""); setWallet("");
              }
            }}>
            {kt.signAdd}
          </SignButton>
        </div>
        {check?.wallet === wallet && <p className={`mt-2 text-sm ${check.ok ?"text-up" : "text-down"}`}>{check.text}</p>}
        <Feedback act={act} k="addkol" />
        <p className="mt-2 text-xs text-muted">{kt.verifyHint}</p>
      </div>
    </section>
  );
}

export function AdminView({ data, now, launchAt }: { data: AdminData; now: number; launchAt: number | null }) {
  const w = useWallet();
  const { t, intl } = useI18n();
  const a = t.admin;
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
        <h1 className="text-2xl font-bold">{a.title}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Wallet size={14} /> {w.address && shortWallet(w.address)} · {a.signedNote}
        </p>
        {!data.trackerKey && <p className="mt-2 text-sm font-semibold text-down">{a.missingKey}</p>}
      </div>

      <LaunchAdmin at={launchAt} act={act} now={now} />

      <section className="card fade-up">
        <h2 className="px-5 py-4 font-bold">{a.current}</h2>
        <ul className="border-t border-line">
          {current.length === 0 && <li className="px-5 py-6 text-sm text-muted">{a.noCurrent}</li>}
          {current.map((m) => <MarketAdmin key={m.id} m={m} kols={data.kols} act={act} now={now} trackerKey={data.trackerKey} />)}
        </ul>
        {done.length > 0 && (
          <>
            <button onClick={() => setShowDone((v) => !v)} className="w-full border-t border-line px-5 py-3 text-left text-sm font-semibold text-muted hover:text-ink">
              {fmt(showDone ? a.hideDone : a.showDone, { n: done.length })}
            </button>
            {showDone && <ul className="border-t border-line">{done.map((m) => <MarketAdmin key={m.id} m={m} kols={data.kols} act={act} now={now} trackerKey={data.trackerKey} />)}</ul>}
          </>
        )}
      </section>

      <NewChallenge kols={data.kols} act={act} now={now} />
      <Kols kols={data.kols} act={act} trackerKey={data.trackerKey} />

      <section className="card fade-up">
        <h2 className="px-5 py-4 font-bold">{a.log}</h2>
        {data.log.length === 0 ? (
          <p className="border-t border-line px-5 py-6 text-sm text-muted">{a.noLog}</p>
        ) : (
          <ul className="border-t border-line text-sm">
            {data.log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line px-5 py-2 last:border-0">
                <span className="num text-xs text-muted">{utc(l.at, intl)}</span>
                <span className="font-semibold">{a.actions[l.action as AdminActionName] ?? l.action}</span>
                {l.target && <span className="num text-xs text-muted">{l.target}</span>}
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
  const { t } = useI18n();
  const g = t.admin.gate;
  // Après la connexion, on recharge la page : le serveur vérifie si ce wallet est admin.
  useEffect(() => {
    if (w.connected !== connected) router.refresh();
  }, [w.connected, connected, router]);
  return (
    <div className="card mx-auto max-w-md p-8 text-center fade-up">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-soft text-blue"><ShieldCheck size={26} /></div>
      <h1 className="text-xl font-bold">{t.admin.title}</h1>
      {!configured ? (
        <p className="mt-2 text-sm text-muted">{g.notConfiguredBefore} <span className="num">ADMIN_WALLETS</span> {g.notConfiguredAfter}</p>
      ) : connected ? (
        <p className="mt-2 text-sm text-muted">{g.noAccess}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">{g.connectPrompt}</p>
      )}
      {configured && (
        <button onClick={() => (connected ? w.disconnect() : w.openModal("connect"))} className="plaque mt-5 w-full py-3">
          {connected ? g.switchWallet : g.connect}
        </button>
      )}
    </div>
  );
}
