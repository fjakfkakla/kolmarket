import Link from "next/link";
import type { Market } from "@/data/markets";
import type { CoinMarket } from "@/data/coins";
import { Avatar } from "./Avatar";
import { OutcomeCoin } from "./Coin";
import { pct, usd } from "@/lib/format";

function Row({ visual, name, prob }: { visual: React.ReactNode; name: string; prob: number }) {
  return (
    <li className="flex items-center gap-2.5 text-[14px]">
      {visual}
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      <span className="num w-11 text-right font-display text-[16px] font-extrabold">{pct(prob)}</span>
      <span className="soft-up h-8 rounded-[10px] px-2.5 text-[13px]">Oui</span>
      <span className="soft-down h-8 rounded-[10px] px-2.5 text-[13px]">Non</span>
    </li>
  );
}

export function MarketCard({ market }: { market: Market }) {
  return (
    <Link href={`/market/${market.slug}`} className="card card-hover group flex flex-col p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex shrink-0 -space-x-2.5">
          {market.outcomes.slice(0, 3).map((o) => (
            <Avatar key={o.kol.id} kol={o.kol} size={34} className="ring-2 ring-white" />
          ))}
        </div>
        <h3 className="line-clamp-2 flex-1 text-[16px] font-bold leading-snug group-hover:text-blue">{market.title}</h3>
      </div>
      <ul className="space-y-2">
        {market.outcomes.slice(0, 3).map((o) => (
          <Row key={o.kol.id} visual={<Avatar kol={o.kol} size={24} />} name={o.kol.name} prob={o.prob} />
        ))}
      </ul>
      <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-semibold text-muted">
        <span className="num">{usd(market.volume, { compact: true })} Vol.</span>
        <span className="chip ml-auto">{market.period === "7D" ? "7 jours" : "30 jours"}</span>
      </div>
    </Link>
  );
}

export function CoinMarketCard({ market }: { market: CoinMarket }) {
  return (
    <Link href={`/market/${market.slug}`} className="card card-hover group flex flex-col p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex shrink-0 -space-x-2.5">
          {market.outcomes.slice(1, 4).map((o) => (
            <span key={o.id} className="rounded-full ring-2 ring-white">
              <OutcomeCoin outcome={o} size={34} />
            </span>
          ))}
        </div>
        <h3 className="line-clamp-2 flex-1 text-[16px] font-bold leading-snug group-hover:text-blue">{market.title}</h3>
      </div>
      <ul className="space-y-2">
        {market.outcomes.slice(0, 3).map((o) => (
          <Row key={o.id} visual={<OutcomeCoin outcome={o} size={24} />} name={o.ticker ? `$${o.ticker}` : "Aucun"} prob={o.prob} />
        ))}
      </ul>
      <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-semibold text-muted">
        <span className="num">{usd(market.volume, { compact: true })} Vol.</span>
        <span className="chip-blue ml-auto">Memecoins</span>
      </div>
    </Link>
  );
}
