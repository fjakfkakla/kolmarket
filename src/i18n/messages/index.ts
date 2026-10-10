import type { Locale } from "../config";
import { account } from "./account";
import { admin } from "./admin";
import { app } from "./app";
import { common } from "./common";
import { landing } from "./landing";
import { market } from "./market";
import { meta } from "./meta";
import { pages } from "./pages";

/**
 * Tous les espaces de messages. Pour en ajouter un : créer `messages/<nom>.ts` avec
 * `defineMessages({ en, fr, es })`, puis l'ajouter ici (et dans SERVER_ONLY s'il n'est
 * rendu que côté serveur, pour ne pas l'envoyer au navigateur).
 */
const ALL = { common, meta, landing, app, market, account, pages, admin };

const SERVER_ONLY = ["meta", "pages"] as const satisfies readonly (keyof typeof ALL)[];

export type Dictionary = { [K in keyof typeof ALL]: (typeof ALL)[K][Locale] };
export type ClientDictionary = Omit<Dictionary, (typeof SERVER_ONLY)[number]>;

export function getDictionary(locale: Locale): Dictionary {
  return Object.fromEntries(Object.entries(ALL).map(([k, v]) => [k, v[locale]])) as Dictionary;
}

export function toClientDictionary(d: Dictionary): ClientDictionary {
  const out: Record<string, unknown> = { ...d };
  for (const k of SERVER_ONLY) delete out[k];
  return out as ClientDictionary;
}
