"use client";

import { AppLink } from "./AppLink";
import { useRef, useState } from "react";
import type { CoinMarket } from "@/data/coins";
import { OutcomeCoin } from "../Coin";
import { pointAt } from "../LineChart";
import { estimatePayout, odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { CoinScreenDesktop, CoinScreenPhone } from "./CoinScreen";
import { easeInOut, easeOut, lerp, scrollToProgress, seg, useScrollScene } from "./scroll";

const STEPS = [
  { id: "coin", at: 0.2, end: 0.45 },
  { id: "race", at: 0.45, end: 0.68 },
  { id: "bet", at: 0.68, end: 0.96 },
];

const AURA: [string, string, string][] = [
  ["#a9c1ff", "#ffd59a", "#f9c2df"],
  ["#ffd59a", "#a7f0d2", "#ffe6a0"],
  ["#ffd59a", "#a7f0d2", "#a9c1ff"],
];

function setOn(el: Element | null | undefined, on: boolean) {
  if (el) el.classList.toggle("ks-on", on);
}

export function CoinScene({ market }: { market: CoinMarket }) {
  const { t } = useI18n();
  const L = t.landing.coins;
  const track = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const spots = useRef<(HTMLDivElement | null)[]>([]);
  const floaters = useRef<(HTMLDivElement | null)[]>([]);
  const stepEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const clicked = useRef({ row: false, press: false });
  const pick = market.outcomes.find((o) => o.id === "ai") ?? market.outcomes[1];
  const floating = market.outcomes.filter((o) => o.ticker);
  const stepText = (i: number) =>
    i === 2
      ? fmt(L.pickText, { ticker: pick.ticker ?? "", share: pct(pick.prob), payout: usd(Math.floor(estimatePayout(market.pool, pick.pool, 100))), target: market.target })
      : L.steps[i].text;

  useScrollScene(track, ({ p, time, w, h, reduced }) => {
    const mobile = w < 768;
    const e = easeOut(seg(p, 0.02, 0.22));

    if (titleRef.current) {
      const t = easeOut(seg(p, 0.0, 0.14));
      titleRef.current.style.opacity = String(t);
      titleRef.current.style.transform = reduced ? "" : `translate3d(0, ${(1 - t) * 50}px, 0)`;
    }

    // Le verre arrive en tournant, puis flotte.
    const g = glass.current;
    if (g) {
      const float = reduced ? 0 : Math.sin(time * ((Math.PI * 2) / 7)) * 3.5;
      g.style.opacity = String(Math.min(1, e * 1.6));
      g.style.transform = reduced
        ? ""
        : `translate3d(0, ${(1 - e) * 140 + float}px, 0) perspective(1800px) rotateY(${((1 - e) * -18).toFixed(2)}deg) rotateX(${((1 - e) * 9).toFixed(2)}deg) scale(${(0.9 + 0.1 * e).toFixed(4)})`;
    }

    // L'écran à la taille de sa boîte.
    const bx = box.current;
    const target = mobile ? phone.current : desk.current;
    if (desk.current) desk.current.style.display = mobile ? "none" : "block";
    if (phone.current) phone.current.style.display = mobile ? "block" : "none";
    if (bx && target) {
      const bw = bx.clientWidth, bh = bx.clientHeight;
      const sw = mobile ? 380 : 1000;
      const sh = (target.firstElementChild as HTMLElement | null)?.offsetHeight || 700;
      const f = Math.min(bw / sw, bh / sh, 1.1);
      target.style.transform = `translate3d(${(bw - sw) / 2}px, ${Math.max(0, (bh - sh * f) / 2)}px, 0) scale(${f.toFixed(4)})`;
    }

    // L'aura bouge avec le récit.
    const idx = p < STEPS[1].at ? 0 : p < STEPS[2].at ? 1 : 2;
    const pos = [
      [[-8, 6], [62, -4], [30, 64]],
      [[58, 2], [-6, 50], [40, 70]],
      [[10, -6], [64, 46], [-4, 66]],
    ][idx];
    spots.current.forEach((el, i) => {
      if (!el) return;
      el.style.backgroundColor = AURA[idx][i];
      el.style.transform = `translate(${pos[i][0]}%, ${pos[i][1]}%)`;
    });

    // Les pièces flottent autour du verre, à des profondeurs différentes.
    floaters.current.forEach((el, i) => {
      if (!el) return;
      const depth = [0.9, 0.55, 1.2, 0.7][i] ?? 1;
      const bob = reduced ? 0 : Math.sin(time * 0.9 + i * 1.7) * 6;
      el.style.transform = `translate3d(0, ${((0.5 - p) * 260 * depth + bob).toFixed(1)}px, 0) rotate(${((p - 0.5) * 30 * (i % 2 ? -1 : 1)).toFixed(1)}deg)`;
      el.style.opacity = String(Math.min(1, e * 1.3));
    });

    const root = target?.querySelector<HTMLElement>("[data-screen]");
    if (!root) return;

    // 1. Les lignes se tracent, chaque coin au bout de la sienne.
    const draw = reduced ? 1 : easeInOut(seg(p, 0.2, 0.45));
    root.style.setProperty("--draw", draw.toFixed(4));
    market.outcomes.forEach((o) => {
      const tip = root.querySelector<HTMLElement>(`[data-tip="${o.id}"]`);
      if (!tip) return;
      const pt = pointAt(o.series, Math.max(0.0001, draw), [0, 1]);
      tip.style.left = `${pt.x}%`;
      tip.style.top = `${pt.y}%`;
      tip.style.opacity = draw > 0.01 ? "1" : "0";
    });

    // 2. La course : les barres courent vers 1 Md$.
    const race = reduced ? 1 : easeOut(seg(p, 0.45, 0.64));
    root.style.setProperty("--race", race.toFixed(4));
    const rc = root.querySelector<HTMLElement>("[data-race-card]");
    if (rc) rc.style.boxShadow = idx === 1 ? "0 0 0 2px #1652f0, 0 0 0 7px rgba(22, 82, 240,.12)" : "none";
    if (rc) rc.style.borderRadius = "20px";

    // 3. La mise : $AI, Oui, 100 $.
    const s3 = seg(p, 0.68, 0.95);
    const row = root.querySelector(`[data-row="${pick.id}"]`);
    const rowYes = row?.querySelector("[data-row-yes]");
    const chip = root.querySelector('[data-chip="100"]');
    const press = root.querySelector("[data-press]");
    const picked = s3 >= 0.22;
    setOn(row, picked);
    setOn(rowYes, picked);
    setOn(root.querySelector("[data-yes]"), picked);
    const amt = Math.round(100 * easeOut(seg(s3, 0.32, 0.6)));
    const amountEl = root.querySelector("[data-amount]");
    if (amountEl) amountEl.textContent = String(amt);
    setOn(chip, s3 >= 0.3 && s3 < 0.6);
    const sharesEl = root.querySelector("[data-shares]");
    if (sharesEl) sharesEl.textContent = fmtOdds(odds(market.pool + amt, pick.pool + amt), t.common.open);
    const payEl = root.querySelector("[data-payout]");
    if (payEl) payEl.textContent = usd(Math.floor(estimatePayout(market.pool, pick.pool, amt) * 100) / 100, { cents: true });
    setOn(root.querySelector("[data-summary]"), amt > 0);
    setOn(press, s3 >= 0.72 && s3 < 0.82);
    setOn(root.querySelector("[data-toast]"), s3 >= 0.8);

    const cur = root.querySelector<HTMLElement>("[data-cursor]");
    if (cur && !reduced) {
      const rr = root.getBoundingClientRect();
      const scale = rr.width / (mobile ? 380 : 1000) || 1;
      const at = (el: Element | null | undefined) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: (r.left - rr.left + r.width * 0.5) / scale, y: (r.top - rr.top + r.height * 0.55) / scale };
      };
      const start = { x: mobile ? 300 : 760, y: mobile ? 240 : 260 };
      const A = at(rowYes), B = at(chip), C = at(press);
      const mv = (from: { x: number; y: number }, to: { x: number; y: number }, t: number) => {
        const k = easeInOut(t);
        return { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * 30 };
      };
      const pos2 = s3 >= 0.6 ? mv(B, C, seg(s3, 0.6, 0.72)) : s3 >= 0.22 ? mv(A, B, seg(s3, 0.22, 0.3)) : mv(start, A, seg(s3, 0, 0.2));
      cur.style.transform = `translate3d(${pos2.x}px, ${pos2.y}px, 0)`;
      cur.style.opacity = String(seg(p, 0.66, 0.69) * (1 - seg(p, 0.96, 0.985)));
      const clicks: [keyof typeof clicked.current, boolean][] = [["row", picked], ["press", s3 >= 0.72]];
      clicks.forEach(([k, v]) => {
        if (v && !clicked.current[k]) {
          cur.classList.remove("ks-click");
          void cur.offsetWidth;
          cur.classList.add("ks-click");
        }
        clicked.current[k] = v;
      });
    }

    STEPS.forEach((st, i) => {
      const bar = stepEls.current[i]?.querySelector<HTMLElement>(".story-bar > i");
      if (bar) bar.style.transform = `scaleX(${seg(p, st.at, st.end).toFixed(3)})`;
    });
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActive(idx);
    }
    void h;
  });

  return (
    <section ref={track} id="coins" className="relative" style={{ height: "520vh" }} aria-label="Trade the potential of your favorite coin">
      <div className="sticky top-0 h-[100svh] overflow-hidden pt-[68px] md:pt-[84px]">
        <div className="on-paper mx-auto flex h-full max-w-[1440px] flex-col gap-4 px-4 pb-4 pt-3 md:px-8 xl:flex-row xl:items-center xl:gap-12 xl:px-12">
          <div ref={titleRef} className="shrink-0 xl:w-[400px]">
            <h2 className="display text-[clamp(30px,4.4vw,70px)]">
              Trade the <span className="text-blue">potential</span> of your favorite coin.
            </h2>
            <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-4 md:flex-wrap md:overflow-visible md:px-0 xl:mt-7 xl:flex-col xl:items-start">
              {STEPS.map((st, i) => (
                <button
                  key={st.id}
                  ref={(el) => { stepEls.current[i] = el; }}
                  className="story shrink-0"
                  data-active={active === i}
                  onClick={() => track.current && scrollToProgress(track.current, st.at + 0.01)}
                >
                  <span className={`num grid h-7 w-7 place-items-center rounded-full text-[13px] font-extrabold ${active === i ? "bg-blue text-white" : "bg-relief text-muted"}`}>{i + 1}</span>
                  {L.steps[i].name}
                  <span className="story-bar"><i /></span>
                </button>
              ))}
            </div>
            <p key={active} className="fade-up mt-4 hidden max-w-[36ch] text-[17px] font-medium leading-relaxed text-ink-2 md:block">
              {stepText(active)}
            </p>
          </div>

          <div className="relative min-h-0 flex-1 self-stretch">
            {/* l'aura derrière le verre */}
            <div className="pointer-events-none absolute inset-[6%]" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} ref={(el) => { spots.current[i] = el; }} className="aura-spot h-[70%] w-[60%]" style={{ backgroundColor: AURA[0][i] }} />
              ))}
            </div>
            {/* les pièces qui flottent dans le décor */}
            {floating.map((o, i) => (
              <div
                key={o.id}
                ref={(el) => { floaters.current[i] = el; }}
                className={`pointer-events-none absolute z-[3] ${["left-[2%] top-[10%]", "right-[1%] top-[6%]", "bottom-[8%] left-[6%]", "bottom-[14%] right-[3%]"][i]} max-md:hidden`}
                style={{ opacity: 0 }}
                aria-hidden
              >
                <OutcomeCoin outcome={o} size={[72, 54, 60, 46][i]} ring />
              </div>
            ))}
            <div ref={glass} className="glass absolute inset-[3%] z-[2] p-2.5 md:inset-[5%] md:p-3" style={{ opacity: 0 }}>
              <div ref={box} className="relative h-full w-full">
                <AppLink href={`/market/${market.slug}`} aria-label={fmt(t.landing.hero.openMarket, { title: market.title })}>
                  <div ref={desk} className="absolute left-0 top-0 origin-top overflow-hidden rounded-[26px] shadow-[0_30px_60px_-36px_rgba(13,32,84,.5)]">
                    <CoinScreenDesktop market={market} pick={pick} />
                  </div>
                  <div ref={phone} className="absolute left-0 top-0 origin-top" style={{ display: "none" }}>
                    <CoinScreenPhone market={market} pick={pick} />
                  </div>
                </AppLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
