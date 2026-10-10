"use client";

import { useMemo, useState } from "react";
import type { Kol } from "@/data/kols";
import type { Period } from "@/data/markets";
import { usd } from "@/lib/format";
import { Avatar } from "./Avatar";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const W = 720;
const H = 260;
const PAD = { l: 56, r: 16, t: 16, b: 28 };

export function PnlChart({ kols, period, highlight }: { kols: Kol[]; period: Period; highlight?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const { t } = useI18n();
  const key = period === "7D" ? "series7d" : "series30d";
  const n = kols[0][key].length;

  const { max, min, paths, xs } = useMemo(() => {
    const all = kols.flatMap((k) => k[key]);
    const max = Math.max(...all, 1000);
    const min = Math.min(...all, 0);
    const xs = Array.from({ length: n }, (_, i) => PAD.l + ((W - PAD.l - PAD.r) * i) / (n - 1));
    const y = (v: number) => PAD.t + ((max - v) / (max - min)) * (H - PAD.t - PAD.b);
    const paths = kols.map((k) => ({
      kol: k,
      d: k[key].map((v, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${y(v).toFixed(1)}`).join(" "),
      lastY: y(k[key][n - 1]),
      y,
    }));
    return { max, min, paths, xs };
  }, [kols, key, n]);

  const ticks = [max, (max + min) / 2, min];
  const labels = Array.from({ length: n }, (_, i) =>
    period === "7D" ? t.chart.weekdays[i] : i % 5 === 0 ? fmt(t.chart.dayShort, { n: i + 1 }) : "",
  );

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => {
          const y = PAD.t + (i * (H - PAD.t - PAD.b)) / 2;
          return (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#ebe4d3" strokeDasharray="3 4" />
              <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6f6b63" className="mono">
                {usd(t, { compact: true })}
              </text>
            </g>
          );
        })}
        {labels.map((l, i) =>
          l ? (
            <text key={i} x={xs[i]} y={H - 8} textAnchor="middle" fontSize="11" fill="#6f6b63">
              {l}
            </text>
          ) : null,
        )}
        {paths.map((p) => {
          const dim = highlight && highlight !== p.kol.id;
          return (
            <path
              key={p.kol.id}
              d={p.d}
              fill="none"
              stroke={p.kol.color}
              strokeWidth={highlight === p.kol.id ? 3.5 : 2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={dim ? 0.18 : 1}
              className="draw-line"
              style={{ transition: "opacity .2s, stroke-width .2s" }}
            />
          );
        })}
        {hover !== null && (
          <g>
            <line x1={xs[hover]} x2={xs[hover]} y1={PAD.t} y2={H - PAD.b} stroke="#1b1b1f" strokeOpacity="0.25" />
            {paths.map((p) => (
              <circle key={p.kol.id} cx={xs[hover]} cy={p.y(p.kol[key][hover])} r="4" fill={p.kol.color} stroke="#fff" strokeWidth="2" />
            ))}
          </g>
        )}
        {hover === null &&
          paths.map((p) => (
            <circle key={p.kol.id} cx={xs[n - 1]} cy={p.lastY} r="4" fill={p.kol.color} stroke="#fff" strokeWidth="2" />
          ))}
      </svg>

      {hover !== null && (
        <div
          className="card pointer-events-none absolute top-2 z-10 w-44 p-2 text-xs pop"
          style={{ left: `${Math.min(78, Math.max(2, (xs[hover] / W) * 100))}%` }}
        >
          <div className="mb-1 font-semibold text-muted">{period === "7D" ? labels[hover] : fmt(t.chart.day, { n: hover + 1 })}</div>
          {[...kols]
            .sort((a, b) => b[key][hover] - a[key][hover])
            .map((k) => (
              <div key={k.id} className="flex items-center gap-1.5 py-0.5">
                <Avatar kol={k} size={14} />
                <span className="flex-1 truncate">{k.name}</span>
                <span className="mono font-semibold" style={{ color: k[key][hover] >= 0 ? "#16a34a" : "#dc2626" }}>
                  {usd(k[key][hover], { compact: true, sign: true })}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
