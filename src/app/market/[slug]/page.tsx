import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketView } from "@/components/MarketView";
import { getKols, getMarket, getMarkets } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { localizeMarket } from "@/i18n/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [m, { t }] = await Promise.all([getMarket(slug), getI18n()]);
  return { title: m ? localizeMarket(m, t).title : t.meta.marketTitle };
}

export default async function MarketPage({ params }: Props) {
  const { slug } = await params;
  const [raw, kols, { t }] = await Promise.all([getMarkets(), getKols(), getI18n()]);
  const markets = raw.map((m) => localizeMarket(m, t));
  const market = markets.find((m) => m.slug === slug);
  if (!market) notFound();
  const sibling = markets.find((m) => m.slug !== market.slug);
  return <MarketView market={market} kols={kols} sibling={sibling} />;
}
