import type { Locale } from "../config";
import en, { type Dictionary } from "./en";
import fr from "./fr";
import es from "./es";

export type { Dictionary };

/** Partie du dictionnaire envoyée au navigateur (les textes longs rendus côté serveur en sont exclus). */
export type ClientDictionary = Omit<Dictionary, "meta" | "how" | "terms">;

export function toClientDictionary(d: Dictionary): ClientDictionary {
  const { meta, how, terms, ...rest } = d;
  void meta; void how; void terms;
  return rest;
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, fr, es };

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale];
