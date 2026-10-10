"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000;
const getServerNow = () => null;

const Cell = ({ v, u }: { v: number; u: string }) => (
  <div className="text-center">
    <div className="mono text-2xl font-bold leading-none text-down">{String(v).padStart(2, "0")}</div>
    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{u}</div>
  </div>
);

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function Countdown({ to, label, compact = false }: { to: string; label?: string; compact?: boolean }) {
  const { t } = useI18n();
  const c = t.countdown;
  const target = new Date(to).getTime();
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const p = parts(now === null ? 0 : target - now);
  const closed = now !== null && now >= target;

  if (compact) {
    return (
      <span className="mono text-xs text-muted">
        {closed ? c.closedShort : `${p.d}${c.d} ${String(p.h).padStart(2, "0")}${c.h} ${String(p.m).padStart(2, "0")}m`}
      </span>
    );
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{closed ? c.closed : (label ?? c.closes)}</div>
      <div className="flex items-start gap-3">
        <Cell v={p.d} u={c.days} />
        <span className="mt-1 text-xl font-bold text-muted">:</span>
        <Cell v={p.h} u={c.h} />
        <span className="mt-1 text-xl font-bold text-muted">:</span>
        <Cell v={p.m} u={c.min} />
        <span className="mt-1 text-xl font-bold text-muted">:</span>
        <Cell v={p.s} u={c.sec} />
      </div>
    </div>
  );
}
