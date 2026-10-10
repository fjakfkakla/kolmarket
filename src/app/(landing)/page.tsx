import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { CoinScene } from "@/components/landing/CoinScene";
import { FeesSection } from "@/components/landing/FeesSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { HeroScene } from "@/components/landing/HeroScene";
import { LandingNav } from "@/components/landing/LandingNav";
import { COIN_MARKETS } from "@/data/coins";
import { getKols, getMarkets } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Marketcoins · The future of memecoins. Trade the future." },
};

export default async function Landing() {
  const [markets, kols] = await Promise.all([getMarkets(), getKols()]);
  const kolMarket = markets.find((m) => m.period === "7D") ?? markets[0];
  const coinMarket = COIN_MARKETS[0];
  return (
    <>
      <LandingNav />
      <main className="flex-1">
        <HeroScene market={kolMarket} kols={kols} coins={coinMarket.outcomes} />
        <CoinScene market={coinMarket} />
        <FeesSection />
        <FinalCta kols={kols} kolMarket={kolMarket} coinMarket={coinMarket} />
      </main>
      <Footer />
    </>
  );
}
