import Link from "next/link";
import { BarChart3, Bookmark } from "lucide-react";
import type { Market } from "@/data/markets";
import { Avatar } from "./Avatar";
import { pct, usd } from "@/lib/format";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

export function MarketCard({ market, t }: { market: Market; t: Dictionary }) {
  const top = market.outcomes.slice(0, 4);
  const leader = market.outcomes[0];
  return (
    <Link href={`/market/${market.slug}`} className="card card-hover group block p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex -space-x-2">
            {market.outcomes.slice(0, 3).map((o) => (
              <Avatar key={o.kol.id} kol={o.kol} size={28} className="ring-2 ring-white" />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-gold-3">{market.title}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className="pill-gold py-0">{fmt(t.common.challenge, { n: market.challenge })}</span>
            <span className="pill-muted py-0">{market.period}</span>
          </div>
        </div>
        <div className="relative grid h-12 w-12 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#ebe4d3" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15" fill="none" stroke={leader.kol.color} strokeWidth="3.5"
              strokeDasharray={`${leader.prob * 94.2} 94.2`} strokeLinecap="round" />
          </svg>
          <div className="absolute text-center leading-none">
            <div className="text-[11px] font-bold">{pct(leader.prob)}</div>
            <div className="text-[9px] text-muted">{leader.kol.name}</div>
          </div>
        </div>
      </div>

      <ul className="space-y-1.5">
        {top.map((o) => (
          <li key={o.kol.id} className="flex items-center gap-2 text-sm">
            <Avatar kol={o.kol} size={20} />
            <span className="flex-1 truncate font-medium">{o.kol.name}</span>
            <span className="mono w-10 text-right font-semibold">{pct(o.prob)}</span>
            <span className="btn-up h-7 px-2.5 py-0 text-xs">{t.common.yes}</span>
            <span className="btn-down h-7 px-2.5 py-0 text-xs">{t.common.no}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-down live-dot" />
          <span className="font-semibold text-down">{t.common.live}</span>
          <span>· {usd(market.volume, { compact: true })} {t.common.vol}</span>
        </span>
        <span className="flex items-center gap-2">
          <BarChart3 size={14} />
          <Bookmark size={14} />
        </span>
      </div>
    </Link>
  );
}
