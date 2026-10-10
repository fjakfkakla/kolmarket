import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gavel, MousePointerClick, ShieldCheck, Wallet } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Coin } from "@/components/Coin";
import { KOLS } from "@/data/kols";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.how.metaTitle };
}

const BLUE: [string, string, string] = ["#4a76ff", "#1652f0", "#0e3fd0"];

const STEP_ICONS = [Wallet, Coins, MousePointerClick, Gavel];
const FEATURE_ICONS = [ShieldCheck, Gavel, Coins];

/** `**texte**` en gras, `++texte++` en gras vert. */
function rich(s: string) {
  return s.split(/(\*\*.+?\*\*|\+\+.+?\+\+)/g).map((part, i) =>
    part.startsWith("**") ? (
      <b key={i} className="text-ink">{part.slice(2, -2)}</b>
    ) : part.startsWith("++") ? (
      <b key={i} className="text-up">{part.slice(2, -2)}</b>
    ) : (
      part
    ),
  );
}

export default async function HowPage() {
  const { t } = await getI18n();
  const h = t.pages.how;
  const name = KOLS[0].name;
  const steps = h.steps.map((s, i) => ({ ...s, icon: STEP_ICONS[i] }));
  return (
    <div className="space-y-10">
      <h1 className="display fade-up text-center text-[36px] md:text-[48px]">
        {h.titleA} <span className="text-blue">{h.titleB}</span>
      </h1>

      <section className="stagger grid gap-4 md:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="card relative p-5">
            <span className="num absolute right-5 top-4 font-display text-[40px] font-extrabold leading-none text-relief">{i + 1}</span>
            <Coin tint={BLUE} size={46}>
              <s.icon size={21} strokeWidth={2.4} />
            </Coin>
            <h3 className="mt-4 font-display text-[19px] font-extrabold tracking-[-0.02em]">{s.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="card fade-up p-6 md:p-8">
        <h2 className="display text-[26px]">{h.exampleTitle}</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2 md:items-center">
          <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">
            {h.example.map((p, i) => (
              <p key={i}>{rich(fmt(p, { name }))}</p>
            ))}
          </div>
          <div className="rounded-[22px] bg-paper-2 p-5 shadow-[inset_0_0_0_1px_#e6e9f2]">
            <div className="mb-4 flex items-center gap-3">
              <Avatar kol={KOLS[0]} size={46} ring />
              <div>
                <div className="font-display text-[19px] font-extrabold tracking-[-0.02em]">{KOLS[0].name}</div>
                <span className="chip-blue">{h.chip}</span>
              </div>
            </div>
            <dl className="space-y-1.5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-muted">{h.stake}</dt>
                <dd className="num font-bold">$100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{h.oddsAfter}</dt>
                <dd className="num font-bold">{h.oddsValue}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{h.fees}</dt>
                <dd className="font-bold text-blue">{h.feesValue}</dd>
              </div>
              <div className="flex items-end justify-between border-t border-line pt-2.5">
                <dt className="font-bold">{fmt(h.ifWins, { name })}</dt>
                <dd className="num font-display text-[26px] font-extrabold leading-none text-up">≈ $481</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="stagger grid gap-4 md:grid-cols-3">
        {h.features.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] })).map((f) => (
          <div key={f.title} className="card p-5">
            <Coin tint={BLUE} size={40}>
              <f.icon size={18} strokeWidth={2.4} />
            </Coin>
            <h3 className="mt-3.5 font-display text-[19px] font-extrabold tracking-[-0.02em]">{f.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.text}</p>
          </div>
        ))}
      </section>

      <div className="text-center">
        <Link href="/market/kol-top-profit-7d" className="plaque h-[52px] px-6 text-[16px]">
          {h.cta} <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
