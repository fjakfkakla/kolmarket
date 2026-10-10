import type { CoinOutcome } from "@/data/coins";
import { OutcomeCoin } from "./Coin";
import { usd } from "@/lib/format";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

/**
 * La course : où en est chaque coin sur le chemin du palier. La barre se remplit de sa market cap ;
 * `--race` (0 → 1) sur un parent la fait courir, la ligne d'arrivée est le palier.
 * `deadline` (date déjà écrite, ex. « Dec 31, 2026 ») s'affiche sur la ligne d'arrivée.
 */
export function RaceCard({ outcomes, target = 5e8, label, deadline, compact = false }: { outcomes: CoinOutcome[]; target?: number; label?: string; deadline?: string; compact?: boolean }) {
  const { t } = useI18n();
  const r = t.app.race;
  const goal = label ?? r.defaultLabel;
  const runners = outcomes.filter((o) => o.mcap !== null);
  return (
    <div className={`rounded-[20px] border border-line bg-white ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-3 flex items-center">
        <span className="font-display text-[15px] font-extrabold tracking-[-0.02em]">{fmt(r.title, { label: goal })}</span>
        <span className="chip ml-auto h-6 text-[12px]">{r.marketCap}</span>
      </div>
      <div className={compact ? "space-y-2" : "space-y-2.5"}>
        {runners.map((o) => {
          const share = Math.min(1, (o.mcap ?? 0) / target);
          return (
            <div key={o.id} data-race={o.id} className="flex items-center gap-2.5">
              <OutcomeCoin outcome={o} size={compact ? 24 : 28} />
              <div className="relative h-[26px] flex-1 overflow-hidden rounded-full bg-relief">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${share * 100}%`,
                    transform: "scaleX(var(--race, 1))",
                    transformOrigin: "left",
                    background: `linear-gradient(90deg, ${o.tint[0]}, ${o.tint[1]})`,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.4)",
                  }}
                />
                <span className="absolute inset-y-0 left-3 flex items-center text-[12.5px] font-extrabold text-ink">${o.ticker}</span>
                <span className="num absolute inset-y-0 right-3 flex items-center text-[12.5px] font-bold text-ink-2">{usd(o.mcap ?? 0, { compact: true })}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-1.5 text-[12.5px] font-bold text-muted">
        <span className="h-3 w-[3px] rounded-full bg-ink" /> {deadline ? fmt(r.finishBy, { label: goal, date: deadline }) : fmt(r.finish, { label: goal })}
      </div>
    </div>
  );
}
