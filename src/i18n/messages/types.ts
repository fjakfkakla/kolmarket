import type { Locale } from "../config";

/** Élargit les littéraux d'un objet de messages : la version anglaise sert de forme de référence. */
export type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

/** Un espace de messages : l'anglais fait foi, fr et es doivent avoir exactement la même forme. */
export const defineMessages = <T extends object>(m: { en: T } & Record<Exclude<Locale, "en">, Widen<T>>) =>
  m as Record<Locale, Widen<T>>;
