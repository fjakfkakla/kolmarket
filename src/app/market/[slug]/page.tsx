import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketView } from "@/components/MarketView";
import { getKols, getMarket, getMarkets } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = await getMarket(slug);
  return { title: m ? m.title : "Marché" };
}

export default async function MarketPage({ params }: Props) {
  const { slug } = await params;
  const [markets, kols] = await Promise.all([getMarkets(), getKols()]);
  const market = markets.find((m) => m.slug === slug);
  if (!market) notFound();
  const sibling = markets.find((m) => m.slug !== market.slug);
  return <MarketView market={market} kols={kols} sibling={sibling} />;
}
