import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketView } from "@/components/MarketView";
import { MARKETS, marketBySlug } from "@/data/markets";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MARKETS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = marketBySlug(slug);
  return { title: m ? m.title : "Marché" };
}

export default async function MarketPage({ params }: Props) {
  const { slug } = await params;
  const market = marketBySlug(slug);
  if (!market) notFound();
  const sibling = MARKETS.find((m) => m.slug !== market.slug);
  return <MarketView market={market} sibling={sibling} />;
}
