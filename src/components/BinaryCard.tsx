import Link from "next/link";
import type { BinaryMarket } from "@/data/markets";
import { kolById } from "@/data/kols";
import { Avatar } from "./Avatar";
import { usd } from "@/lib/format";

/** La demi-jauge Polymarket : la chance du Oui, à sa couleur. */
function Gauge({ p }: { p: number }) {
  const len = Math.PI * 26;
  const color = p >= 0.5 ? "#00a03c" : p >= 0.2 ? "#2e5cff" : "#e5484d";
  return (
    <div className="relative h-[40px] w-[64px] shrink-0">
      <svg viewBox="0 0 64 36" className="h-[36px] w-[64px]" aria-hidden>
        <path d="M6 33a26 26 0 0 1 52 0" fill="none" stroke="#eef1f9" strokeWidth="5" strokeLinecap="round" />
        <path d="M6 33a26 26 0 0 1 52 0" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${p * len} ${len}`} />
      </svg>
      <div className="num absolute inset-x-0 top-[17px] text-center font-display text-[15px] font-extrabold leading-none">{Math.round(p * 100)}%</div>
    </div>
  );
}

export function BinaryCard({ market }: { market: BinaryMarket }) {
  const kol = kolById(market.kolId)!;
  return (
    <Link href={`/market/kol-top-profit-${market.period.toLowerCase()}`} className="card card-hover group flex flex-col p-4">
      <div className="mb-4 flex items-start gap-3">
        <Avatar kol={kol} size={40} />
        <h3 className="line-clamp-3 flex-1 text-[15px] font-bold leading-snug group-hover:text-blue">{market.title}</h3>
        <Gauge p={market.yes} />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <span className="soft-up h-10">Oui</span>
        <span className="soft-down h-10">Non</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-muted">
        <span className="num">{usd(market.volume, { compact: true })} Vol.</span>
        <span className="chip ml-auto">{market.period === "7D" ? "7 jours" : "30 jours"}</span>
      </div>
    </Link>
  );
}
