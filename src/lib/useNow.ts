"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000;
const getServerNow = () => null;

/** Heure courante à la seconde près, `null` pendant le rendu serveur. */
export const useNow = () => useSyncExternalStore(subscribe, getNow, getServerNow);
