import { Crown } from "lucide-react";
import type { Kol } from "@/data/kols";
import type { Period } from "@/data/markets";
import { Avatar } from "./Avatar";
import { usd } from "@/lib/format";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

type PnlKey = "pnl7d" | "pnl30d";

function Card({ k, rank, first, pnlKey: key }: { k: Kol; rank: 1 | 2 | 3; first: Kol; pnlKey: PnlKey }) {
    const { t } = useI18n();
    const gap = k[key] - first[key];
    const rankStyle =
      rank === 1
        ? "border-gold bg-white md:-translate-y-2"
        : rank === 2
          ? "border-line bg-white"
          : "border-line bg-white";
    return (
      <div className={`card relative flex-1 p-4 ${rankStyle}`} style={rank === 1 ? { boxShadow: "0 0 0 1px #f7b801, 0 16px 32px -16px rgba(247,184,1,.6)" } : undefined}>
        <span
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-xs font-bold"
          style={{
            background: rank === 1 ? "linear-gradient(135deg,#ffd34d,#f7b801)" : rank === 2 ? "#e5e7eb" : "#f3c6a0",
            color: "#1b1b1f",
          }}
        >
          {rank}
        </span>
        {rank === 1 && <Crown size={18} className="absolute left-5 top-1 text-gold-3 float" fill="#ffd34d" />}
        <div className="flex items-center gap-3">
          <Avatar kol={k} size={52} ring />
          <div className="min-w-0">
            <div className="truncate font-bold">{k.name}</div>
            <a href={`https://x.com/${k.handle}`} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink">
              @{k.handle}
            </a>
          </div>
        </div>
        <div className="mono mt-3 text-2xl font-bold text-up">{usd(k[key], { compact: true, sign: true })}</div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted">
          <span className="pill-muted py-0.5">Vol {usd(k.volume7d, { compact: true })}</span>
          <span className="pill-muted py-0.5">WR {k.winRate}%</span>
          {rank !== 1 && <span className="pill-down py-0.5">{fmt(t.market.vsFirst, { gap: usd(gap, { compact: true }) })}</span>}
        </div>
      </div>
    );
}

export function Podium({ kols, period }: { kols: Kol[]; period: Period }) {
  const key: PnlKey = period === "7D" ? "pnl7d" : "pnl30d";
  const sorted = [...kols].sort((a, b) => b[key] - a[key]);
  const [first, second, third] = sorted;
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <Card k={second} rank={2} first={first} pnlKey={key} />
      <Card k={first} rank={1} first={first} pnlKey={key} />
      <Card k={third} rank={3} first={first} pnlKey={key} />
    </div>
  );
}
