"use client";

import { AppLink } from "./AppLink";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import type { Kol } from "@/data/kols";
import type { CoinMarket } from "@/data/coins";
import type { Market } from "@/data/markets";
import { Avatar } from "../Avatar";
import { OutcomeCoin } from "../Coin";
import { useI18n } from "@/i18n/client";
import { Planet, defaultPlanet, type PlanetState } from "./Planet";

/** La porte : la planète se lève à l'horizon de la planche, et deux marchés à ouvrir. */
export function FinalCta({ kols, kolMarket, coinMarket }: { kols: Kol[]; kolMarket: Market; coinMarket: CoinMarket }) {
  const { t } = useI18n();
  const plank = useRef<HTMLDivElement>(null);
  const planet = useRef<PlanetState>({ ...defaultPlanet(), radius: 3, ring: 0, tilt: 0.08, light: 0.92, speed: 0.05, y: -3.2 });

  useEffect(() => {
    const el = plank.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth, H = el.clientHeight;
      const m = Math.min(W, H);
      const R = (planet.current.radius * m) / 2;
      const top = H * (W < 768 ? 0.8 : 0.7);
      planet.current.y = -((top + R) - H / 2) / (m / 2);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="px-2 pb-2 pt-10 md:px-5 md:pb-5 md:pt-16" aria-label={t.landing.nav.launchLong}>
      <div ref={plank} className="planche on-plank relative min-h-[640px] md:min-h-[680px] md:rounded-[34px]">
        <div className="absolute inset-0 z-[1]">
          <Planet state={planet} className="h-full w-full" label={t.landing.final.planetLabel} />
        </div>
        <div className="relative z-[2] flex flex-col items-center px-5 pt-16 text-center md:pt-24">
          <h2 className="display text-[clamp(48px,8vw,128px)] text-white">
            {t.landing.titles.final[0]} <span className="text-blue-sky">{t.landing.titles.final[1]}</span>
          </h2>
          <AppLink href="/app" className="pill-white mt-8">
            {t.landing.nav.launchLong} <ArrowRight size={18} />
          </AppLink>
          <div className="mt-10 grid w-full max-w-[760px] gap-3 sm:grid-cols-2">
            <AppLink href={`/market/${kolMarket.slug}`} className="card card-hover flex items-center gap-3 p-4 text-left text-ink">
              <div className="flex -space-x-2.5">
                {kols.slice(0, 3).map((k) => (
                  <Avatar key={k.id} kol={k} size={38} className="ring-[3px] ring-white" />
                ))}
              </div>
              <span className="flex-1 font-display text-[19px] font-extrabold tracking-[-0.02em]">{t.landing.titles.tradeKol}</span>
              <ArrowRight size={18} className="text-blue" />
            </AppLink>
            <AppLink href={`/market/${coinMarket.slug}`} className="card card-hover flex items-center gap-3 p-4 text-left text-ink">
              <div className="flex -space-x-2.5">
                {coinMarket.outcomes.slice(1, 4).map((o) => (
                  <span key={o.id} className="rounded-full ring-[3px] ring-white">
                    <OutcomeCoin outcome={o} size={38} />
                  </span>
                ))}
              </div>
              <span className="flex-1 font-display text-[19px] font-extrabold tracking-[-0.02em]">{t.landing.titles.tradeCoin}</span>
              <ArrowRight size={18} className="text-blue" />
            </AppLink>
          </div>
        </div>
      </div>
    </section>
  );
}
