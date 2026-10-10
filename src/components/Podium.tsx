import type { Kol } from "@/data/kols";
import type { Period } from "@/data/markets";
import { Avatar } from "./Avatar";
import { Coin } from "./Coin";
import { pnlClass, usd } from "@/lib/format";

type PnlKey = "pnl7d" | "pnl30d";

function Card({ k, rank, first, pnlKey: key }: { k: Kol; rank: 1 | 2 | 3; first: Kol; pnlKey: PnlKey }) {
  const gap = k[key] - first[key];
  const lead = rank === 1;
  return (
    <div
      className={`card relative flex-1 p-4 ${lead ? "md:-translate-y-2" : ""}`}
      style={lead ? { boxShadow: "0 0 0 2px #1652f0, 0 0 0 7px rgba(22, 82, 240,.12), 0 26px 46px -28px rgba(13,32,84,.55)" } : undefined}
    >
      <div className="absolute right-3 top-3">
        {lead ? (
          <Coin tint={["#ffd45c", "#f0b429", "#dc9a06"]} size={30}>
            <span>1</span>
          </Coin>
        ) : (
          <span className="num grid h-[30px] w-[30px] place-items-center rounded-full bg-relief text-[14px] font-extrabold text-ink-2">{rank}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Avatar kol={k} size={52} ring />
        <div className="min-w-0">
          <div className="truncate font-display text-[18px] font-extrabold tracking-[-0.02em]">{k.name}</div>
          <a href={`https://x.com/${k.handle}`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-muted hover:text-blue">
            @{k.handle}
          </a>
        </div>
      </div>
      <div className={`num mt-3 font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] ${pnlClass(k[key])}`}>{usd(k[key], { compact: true, sign: true })}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="chip">Vol. {usd(k.volume7d, { compact: true })}</span>
        <span className="chip" title="Part des jours de trading finis en positif">{Math.round(k.winRate)} % de jours +</span>
        {!lead && <span className="chip-down">{usd(gap, { compact: true })}</span>}
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
      <div className="order-2 flex-1 md:order-1"><Card k={second} rank={2} first={first} pnlKey={key} /></div>
      <div className="order-1 flex-1 md:order-2"><Card k={first} rank={1} first={first} pnlKey={key} /></div>
      <div className="order-3 flex-1"><Card k={third} rank={3} first={first} pnlKey={key} /></div>
    </div>
  );
}
