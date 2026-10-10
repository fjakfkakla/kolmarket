"use client";

import { useRef } from "react";
import { easeInOut, easeOut, seg, useScrollScene } from "./scroll";

const TILES = [
  { name: "À l'achat", at: 0.18 },
  { name: "À la revente", at: 0.4 },
  { name: "Au retrait", at: 0.62 },
];

const LAYERS = 18;

/** La pièce « 0 % » : un disque imprimé, avec son épaisseur, qui se retourne au défilement. */
function Coin3D({ refEl }: { refEl: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="relative mx-auto aspect-square w-[min(68vw,340px)]" style={{ perspective: "1200px" }}>
      <div ref={refEl} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        {Array.from({ length: LAYERS }, (_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{
              transform: `translateZ(${(i - (LAYERS - 1) / 2) * 1.15}px)`,
              background: i % 3 === 0 ? "#1a37b8" : "#1f41d6",
            }}
          />
        ))}
        {[1, -1].map((side) => (
          <div
            key={side}
            className="absolute inset-0 grid place-items-center overflow-hidden rounded-full"
            style={{
              transform: `translateZ(${side * (LAYERS / 2) * 1.15}px) ${side < 0 ? "rotateY(180deg)" : ""}`,
              backfaceVisibility: "hidden",
              background: "linear-gradient(150deg,#6d8dff 0%,#2e5cff 48%,#1c3fe6 100%)",
              boxShadow: "inset 0 3px 0 rgba(255,255,255,.45), inset 0 -6px 0 rgba(0,0,0,.18)",
            }}
          >
            <div className="absolute inset-[7%] rounded-full" style={{ boxShadow: "inset 0 0 0 3px rgba(255,255,255,.35), inset 0 -2px 0 3px rgba(0,0,0,.08)" }} />
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(120% 85% at 28% 12%, rgba(255,255,255,.36), rgba(255,255,255,0) 58%)" }} />
            <span className="display relative text-[clamp(64px,17vw,124px)] text-white" style={{ textShadow: "0 3px 0 rgba(8,24,90,.35)" }}>
              0<span className="text-[0.6em]">%</span>
            </span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-[14%] -bottom-[9%] h-[12%] rounded-[50%] bg-[rgba(13,32,84,.28)] blur-xl" aria-hidden />
    </div>
  );
}

export function FeesSection() {
  const track = useRef<HTMLElement>(null);
  const coin = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);

  useScrollScene(track, ({ p, time, reduced }) => {
    const c = coin.current;
    if (c) {
      // Trois demi-tours, un par tuile : la pièce se pose de face entre deux.
      const turns = [0.18, 0.4, 0.62].reduce((acc, at) => acc + easeInOut(seg(p, at - 0.12, at)) * 180, 0);
      const wob = reduced ? 0 : Math.sin(time * 0.9) * 4;
      c.style.transform = reduced ? "rotateX(8deg)" : `translateY(${Math.sin(time * 0.8) * 6}px) rotateX(${10 + wob * 0.4}deg) rotateY(${-24 + turns + wob}deg)`;
    }
    if (title.current) {
      const t = easeOut(seg(p, 0, 0.12));
      title.current.style.opacity = String(t);
      title.current.style.transform = reduced ? "" : `translateY(${(1 - t) * 40}px)`;
    }
    tiles.current.forEach((el, i) => {
      if (!el) return;
      const t = easeOut(seg(p, TILES[i].at - 0.04, TILES[i].at + 0.06));
      el.style.opacity = String(t);
      el.style.transform = reduced ? "" : `translate3d(${(1 - t) * 60}px, 0, 0) scale(${0.96 + 0.04 * t})`;
    });
  });

  return (
    <section ref={track} id="frais" className="relative" style={{ height: "260vh" }} aria-label="0 % de frais">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden pt-[68px] md:pt-[84px]">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-8 px-4 md:grid-cols-[1fr_1fr] md:gap-14 md:px-8">
          <Coin3D refEl={coin} />
          <div>
            <h2 ref={title} className="display text-[clamp(44px,6vw,96px)]">
              <span className="text-blue">0 %</span> de frais.
            </h2>
            <div className="mt-6 grid gap-3 md:mt-9">
              {TILES.map((t, i) => (
                <div
                  key={t.name}
                  ref={(el) => { tiles.current[i] = el; }}
                  className="card flex items-center justify-between px-5 py-4 md:px-6 md:py-5"
                  style={{ opacity: 0 }}
                >
                  <span className="font-display text-[clamp(20px,2vw,26px)] font-extrabold tracking-[-0.02em]">{t.name}</span>
                  <span className="num font-display text-[clamp(30px,3.4vw,46px)] font-extrabold tracking-[-0.035em] text-blue">0 %</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
