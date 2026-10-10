"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000;
const getServerNow = () => 0;

/** L'heure, à la seconde ; 0 au rendu serveur. */
export function useNow() {
  return useSyncExternalStore(subscribe, getNow, getServerNow);
}
