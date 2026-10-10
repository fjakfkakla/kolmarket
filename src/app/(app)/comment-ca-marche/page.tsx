import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gavel, MousePointerClick, ShieldCheck, Wallet } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Coin } from "@/components/Coin";
import { KOLS } from "@/data/kols";

export const metadata: Metadata = { title: "Comment ça marche" };

const BLUE: [string, string, string] = ["#5b80ff", "#2e5cff", "#1f45e0"];

const STEPS = [
  { icon: Wallet, title: "Connecte ton wallet", text: "Phantom, Solflare ou Backpack : tu signes chaque opération, on ne touche jamais à tes clés." },
  { icon: Coins, title: "Dépose des USDC", text: "Sur Solana, crédités en deux secondes." },
  { icon: MousePointerClick, title: "Prends Oui ou Non", text: "Sur un KOL ou sur un memecoin. Le prix d'une part, c'est la probabilité que donne le marché." },
  { icon: Gavel, title: "Encaisse à la résolution", text: "Chaque part gagnante paie 1 $. Tu peux aussi revendre avant, au prix du moment." },
];

export default function HowPage() {
  return (
    <div className="space-y-10">
      <h1 className="display fade-up text-center text-[36px] md:text-[48px]">
        Comment ça <span className="text-blue">marche</span>
      </h1>

      <section className="stagger grid gap-4 md:grid-cols-4">
        {STEPS.map((s, i) => (
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
        <h2 className="display text-[26px]">Un exemple</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2 md:items-center">
          <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">
            <p>
              Le marché donne <b className="text-ink">Cooker</b> à <b className="text-ink">34 %</b> : une part Oui coûte 0,34 $.
            </p>
            <p>
              Tu mets <b className="text-ink">100 $</b> : tu reçois environ <b className="text-ink">294 parts</b>.
            </p>
            <p>
              Cooker finit n°1 au profit : chaque part paie 1 $, tu touches <b className="text-up">294 $</b>, soit 194 $ de gain.
            </p>
            <p>Il ne finit pas n°1 : les parts valent 0 $. Si sa cote monte avant la fin, tu peux revendre et prendre ton gain.</p>
          </div>
          <div className="rounded-[22px] bg-paper-2 p-5 shadow-[inset_0_0_0_1px_#e6e9f2]">
            <div className="mb-4 flex items-center gap-3">
              <Avatar kol={KOLS[0]} size={46} ring />
              <div>
                <div className="font-display text-[19px] font-extrabold tracking-[-0.02em]">{KOLS[0].name}</div>
                <span className="chip-up">Oui à 34¢</span>
              </div>
            </div>
            <dl className="space-y-1.5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-muted">Mise</dt>
                <dd className="num font-bold">$100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Parts</dt>
                <dd className="num font-bold">294,1</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Frais</dt>
                <dd className="font-bold text-blue">0 %</dd>
              </div>
              <div className="flex items-end justify-between border-t border-line pt-2.5">
                <dt className="font-bold">Si Cooker gagne</dt>
                <dd className="num font-display text-[26px] font-extrabold leading-none text-up">$294,10</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="stagger grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Non-custodial", text: "Les fonds restent dans un smart contract Solana : aucune clé privée côté serveur." },
          { icon: Gavel, title: "Résolution publique", text: "La règle est publiée avant l'ouverture, les données sont on-chain, et il y a 24 h pour contester." },
          { icon: Coins, title: "0 % de frais", text: "Rien à l'achat, rien à la revente. Seul le réseau Solana prend sa fraction de centime." },
        ].map((f) => (
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
          Voir le défi en cours <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
