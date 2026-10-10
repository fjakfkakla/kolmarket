"use client";

import { useNow } from "@/lib/useNow";

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

export function Countdown({ to, label = "Fermeture des mises", compact = false, onPlank = false }: { to: string; label?: string; compact?: boolean; onPlank?: boolean }) {
  const target = new Date(to).getTime();
  const now = useNow();
  const p = parts(now === 0 ? 0 : target - now);
  const closed = now !== 0 && now >= target;

  if (compact) {
    return (
      <span className="num text-[14px] font-semibold text-muted">
        {now === 0 ? " " : closed ? "Mises fermées" : <>Clôture dans <span className="font-bold text-ink">{p.d} j {pad(p.h)} h {pad(p.m)} min</span></>}
      </span>
    );
  }

  const cells: [number, string][] = [[p.d, "jours"], [p.h, "h"], [p.m, "min"], [p.s, "s"]];
  return (
    <div>
      <div className={`mb-2 text-[14px] font-bold ${onPlank ? "text-white/80" : "text-muted"}`}>{closed ? "Mises fermées" : label}</div>
      <div className="flex items-start gap-1.5">
        {cells.map(([v, u]) => (
          <div key={u} className={`min-w-[54px] rounded-2xl px-2 py-2 text-center ${onPlank ? "bg-white text-ink shadow-[0_10px_20px_-14px_rgba(5,18,60,.7)]" : "bg-relief"}`}>
            <div className="num font-display text-[24px] font-extrabold leading-none tracking-[-0.03em]">{now === 0 ? "--" : pad(v)}</div>
            <div className="mt-1 text-[12px] font-bold text-muted">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
