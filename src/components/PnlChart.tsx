"use client";

import type { Kol } from "@/data/kols";
import type { Period } from "@/data/markets";
import { usd } from "@/lib/format";
import { LineChart } from "./LineChart";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function PnlChart({ kols, period, highlight, height = 280 }: { kols: Kol[]; period: Period; highlight?: string; height?: number }) {
  const key = period === "7D" ? "series7d" : "series30d";
  const n = kols[0]?.[key].length ?? 0;
  const xLabels = Array.from({ length: n }, (_, i) => (period === "7D" ? DAYS[i] ?? "" : i % 5 === 0 ? `J${i + 1}` : ""));
  return (
    <LineChart
      series={kols.map((k) => ({ id: k.id, label: k.name, color: k.color, values: k[key] }))}
      format={(v) => usd(v, { compact: true, sign: true })}
      xLabels={xLabels}
      highlight={highlight}
      height={height}
    />
  );
}
