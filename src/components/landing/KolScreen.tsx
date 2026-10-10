import type { ReactNode } from "react";
import { Check, Search } from "lucide-react";
import type { Kol } from "@/data/kols";
import type { Market } from "@/data/markets";
import { Avatar } from "../Avatar";
import { LineChart } from "../LineChart";
import { LogoMark } from "../Logo";
import { odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** La barre du navigateur : l'écran est un vrai écran, pas une illustration. */
export function BrowserBar({ url }: { url: string }) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-line bg-paper-2/80 px-4">
      <span className="flex gap-1.5">
        <i className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <i className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <i className="h-3 w-3 rounded-full bg-[#28c840]" />
      </span>
      <span className="mx-auto flex h-7 min-w-0 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-muted shadow-[inset_0_0_0_1px_#e6e9f2]">
        <LogoMark size={14} />
        <span className="truncate">{url}</span>
      </span>
      <span className="w-[52px]" />
    </div>
  );
}

export function MiniAppNav({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-2.5">
      <span className="flex items-center gap-1.5">
        <LogoMark size={22} />
        <span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.04em]">
          <span>market</span>
          <span className="text-blue">coins</span>
        </span>
      </span>
      {!compact && (
        <span className="flex h-8 w-64 items-center gap-2 rounded-full bg-paper-2 px-3 text-[12.5px] font-medium text-faint shadow-[inset_0_0_0_1.5px_rgba(10,15,30,.08)]">
          <Search size={13} /> Rechercher un KOL, un coin
        </span>
      )}
      <span className="ml-auto flex items-center gap-3">
        {!compact && (
          <span className="text-right leading-tight">
            <span className="block text-[12px] font-bold text-faint">Cash</span>
            <span className="num block font-display text-[14px] font-extrabold text-up">$500,00</span>
          </span>
        )}
        <span className="plaque h-8 rounded-[11px] px-3 text-[12.5px]">Déposer</span>
      </span>
    </div>
  );
}

/** Le ticket de l'app, figé pour la démonstration : chaque objet porte un data-* que la scène allume. */
export function Ticket({
  visual,
  question,
  name,
  cote,
  share,
  toast,
  compact = false,
}: {
  visual: ReactNode;
  question: string;
  name: string;
  /** La cote actuelle, déjà écrite (« ×3,3 »). */
  cote: string;
  /** « 30 % · $9,6K misés » */
  share: string;
  toast: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="relative rounded-[20px] border border-line bg-white p-4 shadow-[0_18px_40px_-30px_rgba(13,32,84,.38)]">
      <div className="mb-3 flex items-center gap-2.5">
        {visual}
        <div className="min-w-0 flex-1">
          {!compact && <div className="truncate text-[12.5px] font-semibold text-muted">{question}</div>}
          <div className="truncate font-display text-[17px] font-extrabold tracking-[-0.02em]">{name}</div>
        </div>
        <div className="text-right">
          <div className="num font-display text-[22px] font-extrabold leading-none tracking-[-0.03em] text-blue">{cote}</div>
          <div className="mt-0.5 text-[12px] font-bold text-faint">cote</div>
        </div>
      </div>
      <div data-yes className="ks-share flex items-center justify-between rounded-2xl bg-paper-2 px-3 py-2 text-[13px]">
        <span className="font-semibold text-muted">Part du pot</span>
        <span className="num font-bold">{share}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[14px] font-bold">Ta mise</span>
        <span className="num font-display text-[34px] font-extrabold leading-none tracking-[-0.03em]">
          $<span data-amount>0</span>
        </span>
      </div>
      <div className="mt-2 flex justify-end gap-1.5">
        {[10, 50, 100].map((v) => (
          <span key={v} data-chip={v} className="ghost h-7 rounded-full px-2.5 text-[12.5px]">
            +${v}
          </span>
        ))}
        <span className="ghost h-7 rounded-full px-2.5 text-[12.5px]">Max</span>
      </div>
      <div data-summary className="ks-summary mt-3 space-y-1 rounded-2xl bg-paper-2 p-3 text-[13px]">
        <div className="flex justify-between">
          <span className="text-muted">Cote après ta mise</span>
          <span data-shares className="num font-bold">{cote}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Frais</span>
          <span className="font-bold text-blue">0 %</span>
        </div>
        <div className="flex items-end justify-between border-t border-line pt-1.5">
          <span className="font-bold">Gain estimé s&apos;il gagne</span>
          <span data-payout className="num font-display text-[19px] font-extrabold leading-none text-up">$0</span>
        </div>
      </div>
      <span data-press className="ks-press plaque mt-3 h-11 w-full text-[15px]">
        Miser <span data-press-label>sur {name}</span>
      </span>
      <div data-toast className={`ks-toast absolute inset-x-3 flex ${compact ? "bottom-2" : "top-[calc(100%+12px)]"} items-center gap-2 rounded-2xl bg-ink px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-[0_18px_30px_-16px_rgba(5,18,60,.7)]`}>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-up">
          <Check size={14} strokeWidth={3.2} />
        </span>
        <span className="truncate">{toast}</span>
      </div>
    </div>
  );
}

function Row({ kol, prob, pool, cote, rank }: { kol: Kol; prob: number; pool: number; cote: string; rank: number }) {
  return (
    <div data-row={kol.id} className="ks-row grid grid-cols-[1fr_110px_150px] items-center gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="num w-3 text-center text-[12.5px] font-bold text-faint">{rank}</span>
        <Avatar kol={kol} size={36} />
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold">{kol.name}</div>
          <div className={`num text-[12.5px] font-semibold ${kol.pnl7d >= 0 ? "text-up" : "text-down"}`}>{usd(kol.pnl7d, { compact: true, sign: true })} PnL</div>
        </div>
      </div>
      <div className="text-center">
        <div className="num font-display text-[22px] font-extrabold leading-none tracking-[-0.03em]">{pct(prob)}</div>
        <div className="num text-[12px] font-semibold text-muted">{usd(pool, { compact: true })} misés</div>
      </div>
      <span data-row-yes className="soft-up h-9 rounded-[11px] text-[13px]">
        Miser <span className="num">{cote}</span>
      </span>
    </div>
  );
}

/** L'écran du marché KOL, tel qu'il est dans l'app, à la taille d'un ordinateur (1060 × 660). */
export function KolScreenDesktop({ market, kols }: { market: Market; kols: Kol[] }) {
  const lead = market.outcomes[0];
  return (
    <div data-screen className="ks relative w-[1060px] overflow-hidden rounded-[26px] bg-white text-ink shadow-[0_60px_110px_-42px_rgba(5,18,60,.75)]">
      <BrowserBar url={`marketcoins.app/market/${market.slug}`} />
      <MiniAppNav />
      <div className="grid grid-cols-[1fr_300px] gap-5 p-5">
        <div className="min-w-0 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="flex -space-x-2.5">
              {market.outcomes.slice(0, 3).map((o) => (
                <Avatar key={o.kol.id} kol={o.kol} size={40} className="ring-[3px] ring-white" />
              ))}
            </div>
            <div>
              <div className="mb-1 flex gap-1.5">
                <span className="chip-blue h-6 text-[12px]">KOL · 7 jours</span>
                <span className="chip h-6 text-[12px]">Défi #{market.challenge}</span>
              </div>
              <div className="display text-[24px]">{market.title}</div>
            </div>
          </div>
          <div className="rounded-[20px] border border-line p-3.5 pb-2">
            <div className="mb-2 flex items-center">
              <span className="font-display text-[15px] font-extrabold tracking-[-0.02em]">Course au PnL</span>
              <span className="seg ml-auto p-0.5">
                <span className="seg-item px-2.5 py-1 text-[12px]" data-active="true">7 jours</span>
                <span className="seg-item px-2.5 py-1 text-[12px]">30 jours</span>
              </span>
            </div>
            <LineChart
              series={kols.map((k) => ({ id: k.id, label: k.name, color: k.color, values: k.series7d }))}
              format={(v) => usd(v, { compact: true, sign: true })}
              xLabels={DAYS}
              highlight={lead.kol.id}
              interactive={false}
              height={150}
            />
          </div>
          <div className="overflow-hidden rounded-[20px] border border-line">
            <div className="divide-y divide-line">
              {market.outcomes.slice(0, 4).map((o, i) => (
                <Row key={o.kol.id} kol={o.kol} prob={o.prob} pool={o.pool} cote={fmtOdds(odds(market.pool, o.pool))} rank={i + 1} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <Ticket
            visual={<Avatar kol={lead.kol} size={38} ring />}
            question={market.question}
            name={lead.kol.name}
            cote={fmtOdds(odds(market.pool, lead.pool))}
            share={`${pct(lead.prob)} · ${usd(lead.pool, { compact: true })} misés`}
            toast={<>Mise de $100 sur {lead.kol.name} enregistrée</>}
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

/** Le même écran au format téléphone (380 px). */
export function KolScreenPhone({ market, kols }: { market: Market; kols: Kol[] }) {
  const lead = market.outcomes[0];
  return (
    <div data-screen className="ks relative w-[380px] overflow-hidden rounded-[34px] border-[6px] border-white bg-white text-ink shadow-[0_50px_90px_-40px_rgba(5,18,60,.8)]">
      <MiniAppNav compact />
      <div className="space-y-3 p-3.5">
        <div className="display text-[20px]">{market.title}</div>
        <div className="rounded-[18px] border border-line p-2.5 pb-1.5">
          <LineChart
            series={kols.map((k) => ({ id: k.id, label: k.name, color: k.color, values: k.series7d }))}
            format={(v) => usd(v, { compact: true })}
            highlight={lead.kol.id}
            interactive={false}
            height={92}
          />
        </div>
        <div className="overflow-hidden rounded-[18px] border border-line">
          {market.outcomes.slice(0, 2).map((o) => (
            <div key={o.kol.id} data-row={o.kol.id} className="ks-row flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
              <Avatar kol={o.kol} size={32} />
              <span className="flex-1 text-[14px] font-bold">{o.kol.name}</span>
              <span className="num font-display text-[19px] font-extrabold">{pct(o.prob)}</span>
              <span data-row-yes className="soft-up h-8 rounded-[10px] px-2.5 text-[12.5px]">Miser {fmtOdds(odds(market.pool, o.pool))}</span>
            </div>
          ))}
        </div>
        <Ticket
          compact
          visual={<Avatar kol={lead.kol} size={30} />}
          question=""
          name={lead.kol.name}
          cote={fmtOdds(odds(market.pool, lead.pool))}
          share={`${pct(lead.prob)} · ${usd(lead.pool, { compact: true })} misés`}
          toast={<>Mise de $100 enregistrée</>}
        />
      </div>
      <span data-cursor className="ks-cursor ks-tap" aria-hidden />
    </div>
  );
}
