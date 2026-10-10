import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gavel, ShieldCheck, Wallet, Vote } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { KOLS } from "@/data/kols";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.howTitle };
}

const STEP_ICONS = [Wallet, Coins, Vote, Gavel];
const FEATURES = [
  { icon: ShieldCheck, className: "text-up" },
  { icon: Gavel, className: "text-gold-3" },
  { icon: Coins, className: "text-blue" },
];

/** Rend `**gras**` et `++gain++` d'un texte traduit. */
function Rich({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|\+\+[^+]+\+\+)/).map((part, i) =>
    part.startsWith("**") ? <b key={i} className="text-ink">{part.slice(2, -2)}</b>
    : part.startsWith("++") ? <b key={i} className="text-up">{part.slice(2, -2)}</b>
    : part,
  );
}

export default async function HowPage() {
  const { t } = await getI18n();
  const h = t.how;
  return (
    <div className="space-y-10">
      <section className="text-center fade-up">
        <h1 className="text-3xl font-bold md:text-4xl">{h.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">{h.intro}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4 stagger">
        {h.steps.map((s, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <div key={i} className="card relative p-5">
              <span className="absolute right-4 top-4 text-4xl font-black text-cream-2">{i + 1}</span>
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gold-soft text-gold-3"><Icon size={22} /></div>
              <h3 className="font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
          );
        })}
      </section>

      <section className="card p-6 md:p-8 fade-up">
        <h2 className="text-xl font-bold">{h.exampleTitle}</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm text-muted">
            {h.example.map((p, i) => <p key={i}><Rich text={p} /></p>)}
          </div>
          <div className="rounded-2xl bg-cream-2 p-5">
            <div className="mb-3 flex items-center gap-3">
              <Avatar kol={KOLS[0]} size={44} ring />
              <div><div className="font-bold">{KOLS[0].name}</div><div className="text-xs text-muted">{h.yesAt}</div></div>
            </div>
            <div className="mono space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">{h.stake}</span><span>$100</span></div>
              <div className="flex justify-between"><span className="text-muted">{h.shares}</span><span>{h.sharesValue}</span></div>
              <div className="flex justify-between border-t border-line pt-1 font-bold"><span>{h.ifWon}</span><span className="text-up">{h.ifWonValue}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 stagger">
        {h.features.map((f, i) => {
          const { icon: Icon, className } = FEATURES[i];
          return (
            <div key={i} className="card p-5">
              <Icon className={`mb-2 ${className}`} />
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </div>
          );
        })}
      </section>

      <div className="text-center">
        <Link href="/market/kol-top-profit-7d" className="btn-gold px-6 py-3 text-base">{h.cta} <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
