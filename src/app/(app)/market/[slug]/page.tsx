import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CoinMarketView } from "@/components/CoinMarketView";
import { MarketView } from "@/components/MarketView";
import { coinMarketBySlug } from "@/data/coins";
import { marketPhase } from "@/lib/challenge-calendar";
import { getKols, getMarket, getMarkets, requestTime } from "@/lib/data";
import { aliasPeriod, currentChallenge } from "@/lib/market-select";
import type { Market } from "@/data/markets";
import { getI18n } from "@/i18n/server";
import { type ContentT, localizeCoinMarket, localizeMarket, localizeResolutionNote } from "@/i18n/content";

type Props = { params: Promise<{ slug: string }> };

/** Titre, question, règles et note de résolution dans la langue de l'interface. */
const localize = (m: Market, t: ContentT): Market => ({ ...localizeMarket(m, t), resolutionNote: localizeResolutionNote(m.resolutionNote, t) });

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getI18n();
  const coin = coinMarketBySlug(slug);
  if (coin) return { title: localizeCoinMarket(coin, t).title };
  const m = await getMarket(slug);
  return { title: m ? localizeMarket(m, t).title : t.market.metaFallback };
}

export default async function MarketPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getI18n();
  const [markets, kols] = await Promise.all([getMarkets(), getKols()]);
  const now = requestTime();

  // Marchés memecoins : aperçu (données mock), pas encore en base.
  const coin = coinMarketBySlug(slug);
  if (coin) {
    const related = [currentChallenge(markets, "7D", now), currentChallenge(markets, "30D", now)].filter((m) => m !== undefined);
    return <CoinMarketView market={localizeCoinMarket(coin, t)} related={related.map((m) => localize(m, t))} />;
  }

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
  return <MarketView market={localize(market, t)} kols={kols} sibling={sibling && localize(sibling, t)} serverNow={now} />;
}
