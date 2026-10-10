"use client";

import { useNow } from "@/lib/useNow";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Compte à rebours ; `label` (déjà traduit) remplace « Betting closes ». */
export function Countdown({ to, label, compact = false, onPlank = false }: { to: string; label?: string; compact?: boolean; onPlank?: boolean }) {
  const { t } = useI18n();
  const c = t.app.countdown;
  const target = new Date(to).getTime();
  const now = useNow();
  const p = parts(now === null ? 0 : target - now);
  const closed = now !== null && now >= target;

  if (compact) {
    return (
      <span className="num text-[14px] font-semibold text-muted">
        {now === null ? " " : closed ? c.betsClosed : <>{c.closesIn} <span className="font-bold text-ink">{fmt(c.compact, { d: p.d, h: pad(p.h), m: pad(p.m) })}</span></>}
      </span>
    );
  }

  const cells: [number, string][] = [[p.d, c.days], [p.h, c.hours], [p.m, c.minutes], [p.s, c.seconds]];
  return (
    <div>
      <div className={`mb-2 text-[14px] font-bold ${onPlank ? "text-white/80" : "text-muted"}`}>{closed ? c.betsClosed : (label ?? c.betsClose)}</div>
      <div className="flex items-start gap-1.5">
        {cells.map(([v, u], i) => (
          <div key={i} className={`min-w-[54px] rounded-2xl px-2 py-2 text-center ${onPlank ? "bg-white text-ink shadow-[0_10px_20px_-14px_rgba(5,18,60,.7)]" : "bg-relief"}`}>
            <div className="num font-display text-[24px] font-extrabold leading-none tracking-[-0.03em]">{now === null ? "--" : pad(v)}</div>
            <div className="mt-1 text-[12px] font-bold text-muted">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
