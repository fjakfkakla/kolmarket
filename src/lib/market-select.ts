import type { Market, Period } from "@/data/markets";
import { isAutoChallenge, marketPhase } from "./challenge-calendar";

/** Un défi terminé reste affiché sur l'accueil une semaine après son résultat. */
const KEEP_FINISHED_MS = 7 * 86_400_000;
const ORDER = { betting: 0, live: 1, counting: 2, proposed: 2, resolved: 3, cancelled: 3 } as const;

/** Les défis à montrer sur l'accueil : mises ouvertes d'abord, puis en cours, puis terminés récemment. */
export function currentMarkets(markets: Market[], now: number): Market[] {
  const list = markets.filter((m) => {
    const p = marketPhase(m, now);
    if (p !== "resolved" && p !== "cancelled") return true;
    return now - Date.parse(m.resolvedAt ?? m.endsAt) < KEEP_FINISHED_MS;
  });
  return list.sort(
    (a, b) =>
      ORDER[marketPhase(a, now)] - ORDER[marketPhase(b, now)] ||
      (a.period === b.period ? 0 : a.period === "7D" ? -1 : 1) ||
      Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
}

/** Le défi automatique d'une période où l'on peut miser ; à défaut, le plus récent. */
export function currentChallenge(markets: Market[], period: Period, now: number): Market | undefined {
  const auto = markets.filter((m) => m.period === period && isAutoChallenge(m.slug));
  const same = auto.length ? auto : markets.filter((m) => m.period === period);
  const betting = same.filter((m) => marketPhase(m, now) === "betting").sort((a, b) => Date.parse(a.closesAt) - Date.parse(b.closesAt));
  return betting[0] ?? same.sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
}

/** Anciennes adresses fixes (/market/kol-top-profit-7d) : elles mènent au défi en cours de la période. */
export function aliasPeriod(slug: string): Period | null {
  const m = /^kol-top-profit-(7d|30d)$/.exec(slug);
  return m ? (m[1] === "7d" ? "7D" : "30D") : null;
}
