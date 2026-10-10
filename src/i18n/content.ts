import type { BinaryMarket, Market } from "@/data/markets";
import type { Dictionary } from "./dictionaries";

/** Traduit le contenu d'un marché connu (par slug), sinon garde le texte d'origine. */
export function localizeMarket(m: Market, t: Dictionary): Market {
  const tr = t.markets[m.slug];
  return tr ? { ...m, title: tr.title, question: tr.question, rules: tr.rules } : m;
}

export function localizeBinary(b: BinaryMarket, t: Dictionary): BinaryMarket {
  const title = t.binary[b.slug];
  return title ? { ...b, title } : b;
}
