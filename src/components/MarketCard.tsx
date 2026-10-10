import Link from "next/link";
import { BarChart3, Bookmark } from "lucide-react";
import type { Market } from "@/data/markets";
import { Avatar } from "./Avatar";
import { odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";
import { type Phase, marketPhase } from "@/lib/challenge-calendar";

const PHASE: Record<Phase, { label: string; dot: string; text: string }> = {
  betting: { label: "MISES OUVERTES", dot: "bg-up live-dot", text: "text-up" },
  live: { label: "EN DIRECT", dot: "bg-down live-dot", text: "text-down" },
  counting: { label: "RÉSULTAT EN COURS", dot: "bg-gold", text: "text-gold-3" },
  proposed: { label: "RÉSULTAT PROPOSÉ", dot: "bg-gold", text: "text-gold-3" },
  resolved: { label: "TERMINÉ", dot: "bg-muted", text: "text-muted" },
  cancelled: { label: "ANNULÉ · REMBOURSÉ", dot: "bg-muted", text: "text-muted" },
};

export function MarketCard({ market, now }: { market: Market; now: number }) {
  const top = market.outcomes.slice(0, 4);
  const leader = market.outcomes[0];
  const phase = PHASE[marketPhase(market, now)];
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
            <span className="pill-gold py-0">Défi #{market.challenge}</span>
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
            <span className="pill-muted mono w-16 justify-center py-0.5">{fmtOdds(odds(market.pool, o.pool))}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${phase.dot}`} />
          <span className={`font-semibold ${phase.text}`}>{phase.label}</span>
          <span>· pot {usd(market.pool, { compact: true })} · 0 frais</span>
        </span>
        <span className="flex items-center gap-2">
          <BarChart3 size={14} />
          <Bookmark size={14} />
        </span>
      </div>
    </Link>
  );
}
