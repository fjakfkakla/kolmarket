"use client";

import Link from "next/link";
import type { Market } from "@/data/markets";
import type { CoinMarket } from "@/data/coins";
import { Avatar } from "./Avatar";
import { OutcomeCoin } from "./Coin";
import { odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";
import { type Phase, marketPhase } from "@/lib/challenge-calendar";
import { useI18n } from "@/i18n/client";

/**
 * Où en est le défi : une chip d'état, sans pastille qui clignote.
 * `chip` = classe de la chip ; le libellé traduit est `t.app.phase[phase]`
 */
export const PHASE: Record<Phase, { chip: string }> = {
  betting: { chip: "chip-up" },
  live: { chip: "chip-blue" },
  counting: { chip: "chip" },
  proposed: { chip: "chip" },
  resolved: { chip: "chip" },
  cancelled: { chip: "chip" },
};

function Row({ visual, name, prob, cote, open }: { visual: React.ReactNode; name: string; prob: number; cote: number | null; open: string }) {
  return (
    <li className="flex items-center gap-2.5 text-[14px]">
      {visual}
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      <span className="num w-11 text-right font-display text-[16px] font-extrabold">{pct(prob)}</span>
      <span className="soft-up num h-8 w-[68px] rounded-[10px] px-2 text-[13px]">{fmtOdds(cote, open)}</span>
    </li>
  );
}

/** Carte d'un défi KOL ; passer un marché déjà traduit (localizeMarket de @/i18n/content). */
export function MarketCard({ market, now }: { market: Market; now: number }) {
  const { t } = useI18n();
  const p = marketPhase(market, now);
  const phase = { chip: PHASE[p].chip, label: t.app.phase[p] };
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
          <Row key={o.kol.id} visual={<Avatar kol={o.kol} size={24} />} name={o.kol.name} prob={o.prob} cote={odds(market.pool, o.pool)} open={t.common.open} />
        ))}
      </ul>
      <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-semibold text-muted">
        <span className="num">{t.common.pool} {usd(market.pool, { compact: true })}</span>
        <span className={`${phase.chip} ml-auto`}>{phase.label}</span>
      </div>
    </Link>
  );
}

/** Carte d'un marché memecoin ; passer un marché déjà traduit (localizeCoinMarket de @/i18n/content). */
export function CoinMarketCard({ market }: { market: CoinMarket }) {
  const { t } = useI18n();
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
          <Row key={o.id} visual={<OutcomeCoin outcome={o} size={24} />} name={o.ticker ? `$${o.ticker}` : t.app.card.none} prob={o.prob} cote={odds(market.pool, o.pool)} open={t.common.open} />
        ))}
      </ul>
      <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-semibold text-muted">
        <span className="num">{t.common.pool} {usd(market.pool, { compact: true })}</span>
        <span className="chip-blue ml-auto">{t.app.nav.memecoins}</span>
      </div>
    </Link>
  );
}
