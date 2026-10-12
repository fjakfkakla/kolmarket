"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";

const DURATION = 7 * 24 * 3600_000;


const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function parts(ms: number, units: string[]) {
  const t = Math.max(0, Math.floor(ms));
  return [
    { v: pad(Math.floor(t / 86400_000)), u: units[0] },
    { v: pad(Math.floor((t % 86400_000) / 3600_000)), u: units[1] },
    { v: pad(Math.floor((t % 3600_000) / 60_000)), u: units[2] },
    { v: pad(Math.floor((t % 60_000) / 1000)), u: units[3] },
    { v: pad(t % 1000, 3), u: units[4] },
  ];
}

/**
 * « Access opens in: » (traduit) et le chrono jusqu'à l'ouverture, à la milliseconde.
 * Tant que le chrono n'est pas lancé (ou que son départ est à venir), il reste figé sur 7 jours.
 * À zéro, la page se recharge : le serveur ouvre l'accès.
 */
export function LaunchCountdown({ at, serverNow }: { at: number | null; serverNow: number }) {
  const router = useRouter();
  const C = useI18n().t.landing.countdown;
  // Heure du serveur au premier rendu (pas d'écart à l'hydratation), puis une mise à jour par image
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (at === null) return;
    let id = requestAnimationFrame(function tick() {
      setNow(Date.now());
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [at]);
  const left = at === null ? DURATION : Math.min(DURATION, at - now);
  const done = at !== null && left <= 0;
  const refreshed = useRef(false);

  useEffect(() => {
    if (done && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [done, router]);

  return (
    <div className="text-center text-ink" role="timer" aria-label={C.label}>
      <p className="font-display text-[clamp(20px,2.4vw,32px)] font-extrabold tracking-[-0.02em] text-muted">{C.opens}</p>
      <div className="num mt-3 flex items-start justify-center font-display font-extrabold leading-none tracking-[-0.04em] text-black">
        {parts(left, C.units).map((p, i) => (
          <div key={p.u} className="flex items-start">
            {i > 0 && <span className="px-[0.12em] text-[clamp(30px,8.5vw,128px)] text-black/25">{i === 4 ? "." : ":"}</span>}
            <div className="flex flex-col items-center">
              <span className={i === 4 ? "text-[clamp(20px,5.2vw,80px)] pt-[0.18em]" : "text-[clamp(30px,8.5vw,128px)]"}>{p.v}</span>
              <span className="mt-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-muted md:text-[13px]">{p.u}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
