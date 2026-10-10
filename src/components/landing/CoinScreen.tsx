import type { CoinMarket, CoinOutcome } from "@/data/coins";
import { OutcomeCoin } from "../Coin";
import { LineChart } from "../LineChart";
import { RaceCard } from "../RaceCard";
import { odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";
import { BrowserBar, MiniAppNav, Ticket } from "./KolScreen";

const TICKS = [1, 0.75, 0.5, 0.25, 0];

/** Les pièces posées au bout de leur ligne : la scène les fait avancer avec le tracé. */
function Tips({ outcomes, size }: { outcomes: CoinOutcome[]; size: number }) {
  return (
    <>
      {outcomes.map((o) => (
        <span key={o.id} data-tip={o.id} className="pointer-events-none absolute left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: "100%", top: `${(1 - o.prob) * 100}%` }}>
          <OutcomeCoin outcome={o} size={size} ring />
        </span>
      ))}
    </>
  );
}

function CoinRow({ o, pot, compact = false }: { o: CoinOutcome; pot: number; compact?: boolean }) {
  return (
    <div data-row={o.id} className={`ks-row flex items-center gap-2.5 ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}>
      <OutcomeCoin outcome={o} size={compact ? 30 : 34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">
          {o.ticker ? <>${o.ticker}</> : "Aucun"}
          {!compact && <span className="ml-1.5 text-[12.5px] font-semibold text-muted">{o.name}</span>}
        </div>
        {!compact && <div className="num text-[12.5px] font-semibold text-muted">{usd(o.pool, { compact: true })} misés</div>}
      </div>
      <span className="num w-14 text-right font-display text-[20px] font-extrabold tracking-[-0.03em]">{pct(o.prob)}</span>
      <span data-row-yes className={`soft-up rounded-[11px] text-[12.5px] ${compact ? "h-8 px-2.5" : "h-9 w-[132px]"}`}>
        Miser <span className="num">{fmtOdds(odds(pot, o.pool))}</span>
      </span>
    </div>
  );
}

function series(m: CoinMarket) {
  return m.outcomes.map((o) => ({ id: o.id, label: o.ticker ? `$${o.ticker}` : "Aucun", color: o.tint[1], values: o.series }));
}

/** L'écran du marché memecoin, comme dans l'app (1000 px). */
export function CoinScreenDesktop({ market, pick }: { market: CoinMarket; pick: CoinOutcome }) {
  return (
    <div data-screen className="ks relative w-[1000px] overflow-hidden rounded-[26px] bg-white text-ink">
      <BrowserBar url={`marketcoins.app/market/${market.slug}`} />
      <MiniAppNav />
      <div className="grid grid-cols-[1fr_280px] gap-5 p-5">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {market.outcomes.slice(1, 4).map((o) => (
                <span key={o.id} className="rounded-full ring-[3px] ring-white">
                  <OutcomeCoin outcome={o} size={38} />
                </span>
              ))}
            </div>
            <div className="display text-[21px]">{market.title}</div>
          </div>
          <div className="rounded-[20px] border border-line p-3.5 pb-2.5">
            <LineChart series={series(market)} domain={[0, 1]} ticks={TICKS} format={(v) => `${Math.round(v * 100)}%`} interactive={false} endDots={false} height={150} overlay={<Tips outcomes={market.outcomes} size={26} />} />
          </div>
          <div data-race-card className="ks-race">
            <RaceCard outcomes={market.outcomes} label={market.target} compact />
          </div>
          <div className="overflow-hidden rounded-[20px] border border-line">
            <div className="divide-y divide-line">
              {market.outcomes.slice(1, 3).map((o) => (
                <CoinRow key={o.id} o={o} pot={market.pool} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <Ticket
            visual={<OutcomeCoin outcome={pick} size={38} />}
            question={market.question}
            name={`$${pick.ticker}`}
            cote={fmtOdds(odds(market.pool, pick.pool))}
            share={`${pct(pick.prob)} · ${usd(pick.pool, { compact: true })} misés`}
            toast={<>Mise de $100 sur ${pick.ticker} enregistrée</>}
          />
        </div>
      </div>
      <span data-cursor className="ks-cursor" aria-hidden>
        <svg width="26" height="26" viewBox="0 0 24 24">
          <path d="M5 3.2 19.2 11l-6.4 1.6L9.6 19z" fill="#0a0f1e" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

export function CoinScreenPhone({ market, pick }: { market: CoinMarket; pick: CoinOutcome }) {
  return (
    <div data-screen className="ks relative w-[380px] overflow-hidden rounded-[34px] border-[6px] border-white bg-white text-ink">
      <MiniAppNav compact />
      <div className="space-y-3 p-3.5">
        <div className="display text-[19px]">{market.title}</div>
        <div className="rounded-[18px] border border-line p-2.5 pb-1.5">
          <LineChart series={series(market)} domain={[0, 1]} ticks={[1, 0.5, 0]} format={(v) => `${Math.round(v * 100)}%`} interactive={false} endDots={false} height={92} overlay={<Tips outcomes={market.outcomes} size={22} />} />
        </div>
        <div data-race-card className="ks-race">
          <RaceCard outcomes={market.outcomes} label={market.target} compact />
        </div>
        <div className="overflow-hidden rounded-[18px] border border-line">
          <CoinRow o={pick} pot={market.pool} compact />
        </div>
        <Ticket
          compact
          visual={<OutcomeCoin outcome={pick} size={30} />}
          question=""
          name={`$${pick.ticker}`}
          cote={fmtOdds(odds(market.pool, pick.pool))}
          share={`${pct(pick.prob)} · ${usd(pick.pool, { compact: true })} misés`}
          toast={<>Mise de $100 enregistrée</>}
        />
      </div>
      <span data-cursor className="ks-cursor ks-tap" aria-hidden />
    </div>
  );
}
