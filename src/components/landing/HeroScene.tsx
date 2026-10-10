"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Kol } from "@/data/kols";
import type { Market } from "@/data/markets";
import type { CoinOutcome } from "@/data/coins";
import { Avatar } from "../Avatar";
import { OutcomeCoin } from "../Coin";
import { estimatePayout, odds } from "@/lib/pot";
import { fmtOdds, pct, usd } from "@/lib/format";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { KolScreenDesktop, KolScreenPhone } from "./KolScreen";
import { Planet, defaultPlanet, type PlanetState } from "./Planet";
import { easeInOut, easeOut, lerp, scrollToProgress, seg, useScrollScene } from "./scroll";

const STEPS = [
  { id: "trader", at: 0.57, end: 0.68 },
  { id: "oui", at: 0.68, end: 0.86 },
  { id: "cash", at: 0.86, end: 0.985 },
];

/** Les pièces qui tournent autour de la planète : les traders et les coins. */
type Orbiter = { id: string; kind: "kol"; kol: Kol } | { id: string; kind: "coin"; coin: CoinOutcome };

function setOn(el: Element | null | undefined, on: boolean) {
  if (el) el.classList.toggle("ks-on", on);
}

export function HeroScene({ market, kols, coins }: { market: Market; kols: Kol[]; coins: CoinOutcome[] }) {
  const { t } = useI18n();
  const L = t.landing.hero;
  const track = useRef<HTMLElement>(null);
  const plank = useRef<HTMLDivElement>(null);
  const planet = useRef<PlanetState>(defaultPlanet());
  const heroText = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const flankL = useRef<HTMLDivElement>(null);
  const flankR = useRef<HTMLDivElement>(null);
  const kolText = useRef<HTMLDivElement>(null);
  const screenBox = useRef<HTMLDivElement>(null);
  const screenDesk = useRef<HTMLDivElement>(null);
  const screenPhone = useRef<HTMLDivElement>(null);
  const coinEls = useRef<(HTMLDivElement | null)[]>([]);
  const stepEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const clicked = useRef({ row: false, chip: false, press: false });

  const lead = market.outcomes[0];
  const stepText = (i: number) =>
    i === 1
      ? fmt(L.leadText, { name: lead.kol.name, share: pct(lead.prob), odds: fmtOdds(odds(market.pool, lead.pool), t.common.open) })
      : L.steps[i].text;
  const orbiters: Orbiter[] = [];
  const coinList = coins.filter((c) => c.ticker);
  kols.forEach((k, i) => {
    orbiters.push({ id: k.id, kind: "kol", kol: k });
    if (coinList[i]) orbiters.push({ id: coinList[i].id, kind: "coin", coin: coinList[i] });
  });

  useScrollScene(track, ({ p, time, w, reduced }) => {
    const pl = plank.current;
    if (!pl) return;
    const W = pl.clientWidth, H = pl.clientHeight;
    const m = Math.min(W, H);
    const mobile = w < 768;
    const S = planet.current;

    // 1. Le héros → 2. les mots qui encadrent la planète → 3. l'horizon d'où sort l'écran.
    const a = easeInOut(seg(p, 0.07, 0.34));
    const b = easeInOut(seg(p, 0.34, 0.56));
    const r0 = mobile ? 0.5 : 0.4, r1 = mobile ? 0.6 : 0.52, r2 = mobile ? 2.6 : 2.15;
    const y0 = mobile ? -0.42 : -0.06, y1 = mobile ? -0.05 : 0;
    // Sur grand écran, la planète se lève à droite du titre, puis revient au centre.
    const x0 = mobile ? 0 : (W * 0.21) / (m / 2);
    const radius = lerp(lerp(r0, r1, a), r2, b);
    const yTop = mobile ? 0.62 : 0.78; // le haut de la planète, en part de la hauteur, une fois horizon
    const yHorizon = -((yTop * H + radius * (m / 2)) - H / 2) / (m / 2);
    S.radius = radius;
    S.x = lerp(x0, 0, a);
    S.y = lerp(lerp(y0, y1, a), yHorizon, b);
    S.spin = p * 7.5;
    S.speed = 0.12;
    S.tilt = lerp(0.32, 0.12, b);
    S.ringTilt = lerp(0.26, 0.5, a);
    S.ring = 1 - easeOut(seg(p, 0.36, 0.5));
    S.light = lerp(lerp(0.35, 0.72, a), 0.95, b);

    // Les pièces en orbite : devant ou derrière la planète selon leur place.
    const cx = W / 2 + (S.x * m) / 2;
    const cy = H / 2 - (S.y * m) / 2;
    const rp = (radius * m) / 2;
    const fly = easeOut(seg(p, 0.36, 0.52));
    const rx = rp * (mobile ? 1.55 : 1.74) * (1 + fly * 1.6);
    const ry = rp * 0.4 * (1 + fly * 0.6);
    const roll = (-8 * Math.PI) / 180;
    const n = orbiters.length;
    const base = time * 0.32 + p * 5.2;
    const size = mobile ? 42 : 60;
    coinEls.current.forEach((el, i) => {
      if (!el) return;
      const th = base + (i * Math.PI * 2) / n;
      const ex = Math.cos(th) * rx, ey = Math.sin(th) * ry;
      const x = cx + ex * Math.cos(roll) - ey * Math.sin(roll);
      const y = cy + ex * Math.sin(roll) + ey * Math.cos(roll);
      const front = Math.sin(th);
      const sc = (0.68 + 0.32 * (front + 1) / 2) * (1 + fly * 0.5);
      const op = (1 - fly) * (front > 0 ? 1 : 0.82);
      el.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) scale(${sc.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = front > 0 ? "4" : "1";
    });

    // Le titre part vers le haut, l'invite à défiler s'efface.
    const out = seg(p, 0.06, 0.16);
    if (heroText.current) {
      heroText.current.style.opacity = String(1 - out);
      heroText.current.style.transform = reduced ? "" : `translate3d(0, ${-out * 70}px, 0)`;
      heroText.current.style.visibility = out >= 1 ? "hidden" : "visible";
    }
    if (cue.current) cue.current.style.opacity = String(1 - seg(p, 0.005, 0.03));

    // Les mots qui encadrent la planète, comme dans la vidéo.
    const fin = easeOut(seg(p, 0.13, 0.24));
    const fout = seg(p, 0.29, 0.36);
    [flankL.current, flankR.current].forEach((el, i) => {
      if (!el) return;
      const dir = i === 0 ? -1 : 1;
      el.style.opacity = String(fin * (1 - fout));
      el.style.transform = reduced ? "" : `translate3d(${dir * (1 - fin) * 90 + dir * fout * 40}px, ${mobile ? 0 : -50}%, 0)`;
      el.style.visibility = fin * (1 - fout) <= 0 ? "hidden" : "visible";
    });

    // L'écran sort de l'horizon.
    const rise = easeOut(seg(p, 0.38, 0.57));
    const box = screenBox.current;
    const deskEl = screenDesk.current, phoneEl = screenPhone.current;
    const showPhone = mobile;
    const target = showPhone ? phoneEl : deskEl;
    if (deskEl) deskEl.style.display = showPhone ? "none" : "block";
    if (phoneEl) phoneEl.style.display = showPhone ? "block" : "none";
    if (box && target) {
      // L'écran se met à la taille de sa boîte : jamais rogné.
      const bw = box.clientWidth, bh = box.clientHeight;
      const sw = showPhone ? 380 : 1060;
      const sh = (target.firstElementChild as HTMLElement | null)?.offsetHeight || (showPhone ? 760 : 662);
      const f = Math.min(bw / sw, bh / sh, showPhone ? 1 : 1.15);
      const left = (bw - sw) / 2;
      const top = Math.max(0, (bh - sh * f) / 2);
      const ty = reduced ? 0 : (1 - rise) * H * 0.62;
      const rot = reduced ? 0 : (1 - rise) * 28;
      const sc = f * (reduced ? 1 : 0.86 + 0.14 * rise);
      target.style.transform = `translate3d(${left}px, ${top + ty}px, 0) perspective(1700px) rotateX(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      target.style.opacity = String(Math.min(1, rise * 2.2));
      target.style.visibility = rise <= 0 ? "hidden" : "visible";
    }
    if (kolText.current) {
      const k = easeOut(seg(p, 0.44, 0.56));
      kolText.current.style.opacity = String(k);
      kolText.current.style.transform = reduced ? "" : `translate3d(0, ${(1 - k) * 40}px, 0)`;
      kolText.current.style.visibility = k <= 0 ? "hidden" : "visible";
    }

    // La cinématique dans l'écran : tracer, choisir, miser, négocier.
    const root = target?.querySelector<HTMLElement>("[data-screen]");
    if (!root) return;
    const s1 = seg(p, 0.55, 0.67);
    root.style.setProperty("--draw", (reduced ? 1 : easeInOut(s1)).toFixed(4));

    const s2 = seg(p, 0.68, 0.78), s3 = seg(p, 0.78, 0.88), s4 = seg(p, 0.88, 0.965);
    const row = root.querySelector(`[data-row="${lead.kol.id}"]`);
    const rowYes = row?.querySelector("[data-row-yes]");
    const chip = root.querySelector('[data-chip="100"]');
    const press = root.querySelector("[data-press]");
    const picked = s2 >= 0.82;
    setOn(row, picked);
    setOn(rowYes, picked);
    setOn(root.querySelector("[data-yes]"), picked);
    setOn(chip, s3 >= 0.45 && s3 < 0.62);
    const amt = Math.round(100 * easeOut(seg(s3, 0.5, 1)));
    const amountEl = root.querySelector("[data-amount]");
    if (amountEl) amountEl.textContent = String(amt);
    const sharesEl = root.querySelector("[data-shares]");
    if (sharesEl) sharesEl.textContent = fmtOdds(odds(market.pool + amt, lead.pool + amt), t.common.open);
    const payEl = root.querySelector("[data-payout]");
    if (payEl) payEl.textContent = usd(Math.floor(estimatePayout(market.pool, lead.pool, amt) * 100) / 100, { cents: true });
    setOn(root.querySelector("[data-summary]"), amt > 0);
    setOn(press, s4 >= 0.62 && s4 < 0.78);
    setOn(root.querySelector("[data-toast]"), s4 >= 0.72);

    // Le curseur va d'un objet à l'autre, comme une main qui montre.
    const cur = root.querySelector<HTMLElement>("[data-cursor]");
    if (cur && !reduced) {
      const rr = root.getBoundingClientRect();
      const scale = rr.width / (showPhone ? 380 : 1060) || 1;
      const at = (el: Element | null | undefined, fx = 0.5, fy = 0.55) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: (r.left - rr.left + r.width * fx) / scale, y: (r.top - rr.top + r.height * fy) / scale };
      };
      const start = { x: showPhone ? 300 : 820, y: showPhone ? 200 : 300 };
      const A = at(rowYes), B = at(chip), C = at(press);
      let pos = start;
      const mv = (from: { x: number; y: number }, to: { x: number; y: number }, t: number) => {
        const e = easeInOut(t);
        return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - Math.sin(e * Math.PI) * 30 };
      };
      if (s4 > 0) pos = mv(B, C, seg(s4, 0, 0.6));
      else if (s3 > 0) pos = mv(A, B, seg(s3, 0, 0.45));
      else pos = mv(start, A, seg(s2, 0, 0.8));
      cur.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      cur.style.opacity = String(seg(p, 0.665, 0.69) * (1 - seg(p, 0.975, 0.99)));
      const clicks: [keyof typeof clicked.current, boolean][] = [["row", picked], ["chip", s3 >= 0.45], ["press", s4 >= 0.62]];
      clicks.forEach(([k, v]) => {
        if (v && !clicked.current[k]) {
          cur.classList.remove("ks-click");
          void cur.offsetWidth;
          cur.classList.add("ks-click");
        }
        clicked.current[k] = v;
      });
    }

    // Les pastilles story suivent le récit.
    const idx = p < STEPS[1].at ? 0 : p < STEPS[2].at ? 1 : 2;
    STEPS.forEach((st, i) => {
      const bar = stepEls.current[i]?.querySelector<HTMLElement>(".story-bar > i");
      if (bar) bar.style.transform = `scaleX(${seg(p, st.at, st.end).toFixed(3)})`;
    });
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActive(idx);
    }
  });

  return (
    <section ref={track} id="top" className="relative" style={{ height: "780vh" }} aria-label="The future of memecoins">
      <span id="kol-anchor" className="absolute left-0" style={{ top: "392vh" }} aria-hidden />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={plank} className="planche on-plank absolute inset-x-2 bottom-2 top-[68px] rounded-[26px] md:inset-x-5 md:bottom-4 md:top-[84px] md:rounded-[34px]">

          <div className="absolute inset-0 z-[2]">
            <Planet state={planet} className="h-full w-full" label={L.planetLabel} />
          </div>

          {orbiters.map((o, i) => (
            <div key={o.id} ref={(el) => { coinEls.current[i] = el; }} className="orbit-coin" style={{ opacity: 0 }} aria-hidden>
              {o.kind === "kol" ? (
                <span className="block rounded-full bg-white p-[3px] shadow-[0_18px_30px_-14px_rgba(5,18,60,.62)]">
                  <Avatar kol={o.kol} size={54} className="max-md:!h-9 max-md:!w-9" />
                </span>
              ) : (
                <span className="block max-md:scale-[.7]">
                  <OutcomeCoin outcome={o.coin} size={60} ring />
                </span>
              )}
            </div>
          ))}

          {/* 1. Le héros */}
          <div ref={heroText} className="absolute inset-x-0 top-[6%] z-[5] px-5 text-center md:inset-x-auto md:left-[6%] md:top-1/2 md:max-w-[min(44%,620px)] md:-translate-y-1/2 md:px-0 md:text-left">
            <h1 className="display mx-auto max-w-[14ch] text-[clamp(38px,4.6vw,80px)] text-white md:mx-0">
              The future of memecoins.
              <span className="block text-blue-sky">Trade the future.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[38ch] text-[15px] font-medium leading-relaxed text-white/70 md:mx-0 md:mt-6 md:text-[18px]">
              {L.subtitle}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:mt-8 md:justify-start">
              <Link href="/app" className="pill-white">
                {t.landing.nav.launchLong} <ArrowRight size={18} />
              </Link>
              <Link href="/how-it-works" className="hidden h-[54px] items-center rounded-[14px] px-5 text-[15px] font-bold text-white/80 ring-1 ring-white/20 transition hover:bg-white/10 hover:text-white sm:inline-flex">
                {t.common.howItWorks}
              </Link>
            </div>
          </div>
          <div ref={cue} className="absolute bottom-5 left-1/2 z-[5] -translate-x-1/2" aria-hidden>
            <span className="relative block h-10 w-6 rounded-full border-2 border-white/70">
              <span className="scroll-cue-dot absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 rounded-full bg-white" />
            </span>
          </div>

          {/* 2. Les mots qui encadrent la planète */}
          <div ref={flankL} className="absolute left-5 top-[13%] z-[5] md:left-[5%] md:top-[30%]" style={{ opacity: 0, visibility: "hidden" }}>
            <p className="display text-[clamp(36px,5vw,84px)] text-white">
              {L.flankL[0]}
              <span className="block text-blue-sky">{L.flankL[1]}</span>
            </p>
          </div>
          <div ref={flankR} className="absolute bottom-[12%] right-5 z-[5] text-right md:bottom-auto md:right-[5%] md:top-[70%]" style={{ opacity: 0, visibility: "hidden" }}>
            <p className="display text-[clamp(36px,5vw,84px)] text-white">
              {L.flankR[0]}
              <span className="block text-blue-sky">{L.flankR[1]}</span>
            </p>
          </div>

          {/* 3. Trade the KOL : l'écran sort de l'horizon */}
          <div className="pointer-events-none absolute inset-0 z-[6] flex flex-col gap-4 p-4 pt-5 md:p-8 xl:flex-row xl:items-center xl:gap-10 xl:p-12">
            <div ref={kolText} className="pointer-events-auto shrink-0 xl:w-[340px]" style={{ opacity: 0, visibility: "hidden" }}>
              <h2 className="display text-[clamp(38px,5vw,78px)] text-white">
                Trade <span className="text-blue-sky">the KOL.</span>
              </h2>
              <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-4 md:flex-wrap md:overflow-visible md:px-0 xl:mt-7 xl:flex-col xl:items-start">
                {STEPS.map((st, i) => (
                  <button
                    key={st.id}
                    ref={(el) => { stepEls.current[i] = el; }}
                    className="story shrink-0"
                    data-active={active === i}
                    onClick={() => track.current && scrollToProgress(track.current, st.at + 0.005)}
                  >
                    <span className={`num grid h-7 w-7 place-items-center rounded-full text-[13px] font-extrabold ${active === i ? "bg-blue text-white" : "bg-white/20 text-white"}`}>{i + 1}</span>
                    {L.steps[i].name}
                    <span className="story-bar"><i /></span>
                  </button>
                ))}
              </div>
              <p key={active} className="fade-up mt-4 hidden max-w-[34ch] text-[17px] font-medium leading-relaxed text-white/90 md:block">
                {stepText(active)}
              </p>
            </div>
            <div ref={screenBox} className="relative min-h-0 flex-1 self-stretch">
              <Link href={`/market/${market.slug}`} aria-label={fmt(L.openMarket, { title: market.title })}>
                <div ref={screenDesk} className="pointer-events-auto absolute left-0 top-0 origin-top" style={{ visibility: "hidden" }}>
                  <KolScreenDesktop market={market} kols={kols} />
                </div>
                <div ref={screenPhone} className="pointer-events-auto absolute left-0 top-0 origin-top" style={{ visibility: "hidden", display: "none" }}>
                  <KolScreenPhone market={market} kols={kols} />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
