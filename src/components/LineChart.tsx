"use client";

import { useId, useMemo, useState, type ReactNode } from "react";

export type Series = { id: string; label: string; color: string; values: number[] };

/** Position (en % de la zone de tracé) d'une série à l'instant t ∈ [0, 1]. */
export function pointAt(values: number[], t: number, [min, max]: [number, number]) {
  const n = values.length;
  const f = Math.min(n - 1, Math.max(0, t * (n - 1)));
  const i = Math.floor(f);
  const j = Math.min(n - 1, i + 1);
  const v = values[i] + (values[j] - values[i]) * (f - i);
  return { x: (f / (n - 1)) * 100, y: ((max - v) / (max - min || 1)) * 100, v };
}

export function autoDomain(series: Series[], pad = 0.08): [number, number] {
  const all = series.flatMap((s) => s.values);
  const lo = Math.min(...all, 0);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  return [lo - span * pad * 0.4, hi + span * pad];
}

/**
 * Le graphique d'un marché : des lignes nettes à toute largeur (le SVG s'étire, le trait non),
 * les chiffres en HTML pour rester lisibles. `--draw` (0 → 1) sur un parent trace les lignes.
 */
export function LineChart({
  series,
  height = 260,
  domain,
  format,
  ticks,
  xLabels,
  highlight = null,
  interactive = true,
  endDots = true,
  overlay,
  className = "",
}: {
  series: Series[];
  height?: number;
  domain?: [number, number];
  format: (v: number) => string;
  ticks?: number[];
  xLabels?: string[];
  highlight?: string | null;
  interactive?: boolean;
  endDots?: boolean;
  /** Ce qu'on pose sur la zone de tracé (les pièces qui suivent les lignes, sur la landing). */
  overlay?: ReactNode;
  className?: string;
}) {
  const clip = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.values.length ?? 0;
  const dom = useMemo(() => domain ?? autoDomain(series), [domain, series]);
  const [min, max] = dom;
  const y = (v: number) => ((max - v) / (max - min || 1)) * 1000;
  const tickVals = ticks ?? [max - (max - min) * 0.08, (max + min) / 2, min + (max - min) * 0.08];

  const paths = useMemo(
    () =>
      series.map((s) => ({
        s,
        d: s.values.map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * 1000).toFixed(2)},${y(v).toFixed(2)}`).join(""),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, n, min, max],
  );

  return (
    <div className={`select-none ${className}`}>
      <div className="relative flex">
        <div
          className="relative flex-1"
          style={{ height }}
          onPointerMove={
            interactive
              ? (e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const t = (e.clientX - r.left) / r.width;
                  setHover(Math.round(Math.min(1, Math.max(0, t)) * (n - 1)));
                }
              : undefined
          }
          onPointerLeave={interactive ? () => setHover(null) : undefined}
        >
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <clipPath id={clip}>
                <rect x="-20" y="-40" width="1040" height="1080" style={{ transform: "scaleX(var(--draw, 1))", transformOrigin: "-20px 0" }} />
              </clipPath>
            </defs>
            {tickVals.map((t, i) => (
              <line key={i} x1="0" x2="1000" y1={y(t)} y2={y(t)} stroke="#d6dcee" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
            ))}
            <g clipPath={`url(#${clip})`}>
              {paths.map(({ s, d }) => {
                const dim = highlight && highlight !== s.id;
                return (
                  <path
                    key={s.id}
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={highlight === s.id ? 3.2 : 2.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={dim ? 0.2 : 1}
                    style={{ transition: "opacity .25s, stroke-width .25s" }}
                  />
                );
              })}
            </g>
            {hover !== null && (
              <line x1={(hover / (n - 1)) * 1000} x2={(hover / (n - 1)) * 1000} y1="0" y2="1000" stroke="#0a0f1e" strokeOpacity=".22" vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {endDots &&
            hover === null &&
            series.map((s) => {
              const p = pointAt(s.values, 1, dom);
              const dim = highlight && highlight !== s.id;
              return (
                <span
                  key={s.id}
                  className="lc-end pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, background: s.color, boxShadow: "0 0 0 2px #fff", opacity: dim ? 0.25 : 1 }}
                />
              );
            })}

          {hover !== null &&
            series.map((s) => {
              const p = pointAt(s.values, hover / (n - 1), dom);
              return (
                <span
                  key={s.id}
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, background: s.color, boxShadow: "0 0 0 2px #fff" }}
                />
              );
            })}

          {overlay}

          {hover !== null && (
            <div
              className="pop pointer-events-none absolute top-1 z-10 w-48 rounded-2xl border border-line bg-white p-2.5 text-[13px] shadow-[0_18px_36px_-20px_rgba(13,32,84,.5)]"
              style={{ left: `${Math.min(70, Math.max(0, (hover / (n - 1)) * 100 - 10))}%` }}
            >
              {xLabels?.[hover] && <div className="mb-1 font-bold text-muted">{xLabels[hover]}</div>}
              {[...series]
                .sort((a, b) => b.values[hover] - a.values[hover])
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 py-0.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 truncate text-ink-2">{s.label}</span>
                    <span className="num font-bold">{format(s.values[hover])}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="relative w-12 shrink-0" style={{ height }} aria-hidden>
          {tickVals.map((t, i) => (
            <span key={i} className="num absolute right-0 -translate-y-1/2 text-[12px] font-semibold text-faint" style={{ top: `${(y(t) / 1000) * 100}%` }}>
              {format(t)}
            </span>
          ))}
        </div>
      </div>

      {xLabels && (
        <div className="relative mr-12 mt-2 h-4" aria-hidden>
          {xLabels.map((l, i) =>
            l ? (
              <span
                key={i}
                className="absolute -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold text-faint"
                style={{ left: `${(i / (n - 1)) * 100}%` }}
              >
                {l}
              </span>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
