"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DURATION = 7 * 24 * 3600_000;


const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function parts(ms: number) {
  const t = Math.max(0, Math.floor(ms));
  return [
    { v: pad(Math.floor(t / 86400_000)), u: "days" },
    { v: pad(Math.floor((t % 86400_000) / 3600_000)), u: "hours" },
    { v: pad(Math.floor((t % 3600_000) / 60_000)), u: "min" },
    { v: pad(Math.floor((t % 60_000) / 1000)), u: "sec" },
    { v: pad(t % 1000, 3), u: "ms" },
  ];
}

/**
 * « Launch in: » et le chrono jusqu'à l'ouverture, à la milliseconde.
 * Sans heure d'ouverture (chrono pas encore lancé), il reste figé sur 7 jours.
 * À zéro, la page se recharge : le serveur ouvre l'app.
 */
export function LaunchCountdown({ at, serverNow }: { at: number | null; serverNow: number }) {
  const router = useRouter();
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
  const left = at === null ? DURATION : at - now;
  const done = at !== null && left <= 0;
  const refreshed = useRef(false);

  useEffect(() => {
    if (done && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [done, router]);

  return (
    <div className="text-center text-ink" role="timer" aria-label="Launch countdown">
      <p className="font-display text-[clamp(20px,2.4vw,32px)] font-extrabold tracking-[-0.02em] text-muted">Launch in:</p>
      <div className="num mt-3 flex items-start justify-center font-display font-extrabold leading-none tracking-[-0.04em] text-black">
        {parts(left).map((p, i) => (
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
