"use client";

import { useEffect, useRef, type RefObject } from "react";

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** La part d'un intervalle [a, b] parcourue à p. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;

export type Frame = {
  /** Progression lissée de la piste, 0..1 */
  p: number;
  /** Progression brute */
  raw: number;
  /** Temps écoulé (s) */
  time: number;
  dt: number;
  w: number;
  h: number;
  reduced: boolean;
};

/**
 * Le moteur d'une scène collée : la progression se lit sur le rectangle de la piste
 * (pas de ScrollTrigger), elle est lissée pour un défilement liquide, et `onFrame`
 * écrit directement dans le DOM. Rien ne tourne hors écran ni onglet caché.
 */
export function useScrollScene(track: RefObject<HTMLElement | null>, onFrame: (f: Frame) => void, deps: unknown[] = []) {
  const cb = useRef(onFrame);
  useEffect(() => {
    cb.current = onFrame;
  });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let near = true;
    let smooth = -1;
    let time = 0;
    let last = performance.now();

    const read = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      return total > 0 ? clamp01(-r.top / total) : clamp01(-r.top / Math.max(1, r.height));
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!near || document.visibilityState !== "visible") {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += reduced ? 0 : dt;
      const raw = read();
      if (smooth < 0 || reduced) smooth = raw;
      else smooth += (raw - smooth) * (1 - Math.exp(-dt * 9));
      if (Math.abs(raw - smooth) < 0.00005) smooth = raw;
      cb.current({ p: smooth, raw, time, dt, w: window.innerWidth, h: window.innerHeight, reduced });
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(([e]) => (near = e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, ...deps]);
}

/** Fait défiler la page jusqu'à la progression p d'une piste (pour les pastilles story). */
export function scrollToProgress(el: HTMLElement, p: number) {
  const r = el.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  window.scrollTo({ top: window.scrollY + r.top + total * p + 2, behavior: "smooth" });
}
