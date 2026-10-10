import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MarketView } from "@/components/MarketView";
import { marketPhase } from "@/lib/challenge-calendar";
import { getKols, getMarket, getMarkets, requestTime } from "@/lib/data";
import { aliasPeriod, currentChallenge } from "@/lib/market-select";

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
  const now = requestTime();
  const market = markets.find((m) => m.slug === slug);
  if (!market) {
    // /market/kol-top-profit-7d → le défi 7 jours où l'on peut miser en ce moment
    const period = aliasPeriod(slug);
    const current = period ? currentChallenge(markets, period, now) : undefined;
    if (current) redirect(`/market/${current.slug}`);
    notFound();
  }
  // À côté : le prochain défi de la même période si celui-ci est fermé, sinon celui de l'autre période.
  const next = currentChallenge(markets, market.period, now);
  const sibling =
    marketPhase(market, now) !== "betting" && next && next.slug !== market.slug
      ? next
      : currentChallenge(markets, market.period === "7D" ? "30D" : "7D", now);
  return <MarketView market={market} kols={kols} sibling={sibling} serverNow={now} />;
}
