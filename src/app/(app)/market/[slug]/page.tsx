import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoinMarketView } from "@/components/CoinMarketView";
import { MarketView } from "@/components/MarketView";
import { coinMarketBySlug } from "@/data/coins";
import { getKols, getMarket, getMarkets } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const coin = coinMarketBySlug(slug);
  if (coin) return { title: coin.title };
  const m = await getMarket(slug);
  return { title: m ? m.title : "Marché" };
}

export default async function MarketPage({ params }: Props) {
  const { slug } = await params;
  const coin = coinMarketBySlug(slug);
  if (coin) {
    const markets = await getMarkets();
    return <CoinMarketView market={coin} related={markets.slice(0, 2)} />;
  }
  const [markets, kols] = await Promise.all([getMarkets(), getKols()]);
  const market = markets.find((m) => m.slug === slug);
  if (!market) notFound();
  const sibling = markets.find((m) => m.slug !== market.slug);
  return <MarketView market={market} kols={kols} sibling={sibling} />;
}
