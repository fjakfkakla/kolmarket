import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gavel, MousePointerClick, ShieldCheck, Wallet } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Coin } from "@/components/Coin";
import { KOLS } from "@/data/kols";

export const metadata: Metadata = { title: "Comment ça marche" };

const BLUE: [string, string, string] = ["#4a76ff", "#1652f0", "#0e3fd0"];

const STEPS = [
  { icon: Wallet, title: "Connecte ton wallet", text: "Phantom, Solflare, Backpack ou n'importe quel wallet Solana. Une signature gratuite crée ton compte, ta clé ne quitte jamais ton wallet." },
  { icon: Coins, title: "Dépose des USDC", text: "Jusqu'à 1000 $ sur ton compte, 0 frais : on paie le réseau pour toi. Tu retires quand tu veux, vers ton wallet." },
  { icon: MousePointerClick, title: "Mise sur ton KOL", text: "Choisis celui qui fera le plus de profit. Le % affiché, c'est la part du pot misée sur lui. Les mises ferment au départ du défi, 1000 $ maximum par marché." },
  { icon: Gavel, title: "Le gagnant prend le pot", text: "Un défi chaque semaine (lundi au dimanche, UTC) et un chaque mois. Résultat publié le lendemain vers 12:00 UTC ; 24 h plus tard, ceux qui ont misé sur le meilleur PnL se partagent tout le pot." },
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
              Le pot fait <b className="text-ink">10 000 $</b>, dont <b className="text-ink">2 000 $</b> misés sur <b className="text-ink">{KOLS[0].name}</b> : il est à 20 %, cote ×5.
            </p>
            <p>
              Tu mises <b className="text-ink">100 $</b> sur lui. Le pot passe à 10 100 $, dont 2 100 $ sur {KOLS[0].name}.
            </p>
            <p>
              Il termine n°1 au PnL : tu touches 100 / 2 100 × 10 100 ≈ <b className="text-up">481 $</b>, soit 381 $ de gain.
            </p>
            <p>Il perd : ta mise va aux gagnants. Le gain reste une estimation jusqu&apos;à la fermeture des mises : si d&apos;autres misent aussi sur lui, il baisse.</p>
          </div>
          <div className="rounded-[22px] bg-paper-2 p-5 shadow-[inset_0_0_0_1px_#e6e9f2]">
            <div className="mb-4 flex items-center gap-3">
              <Avatar kol={KOLS[0]} size={46} ring />
              <div>
                <div className="font-display text-[19px] font-extrabold tracking-[-0.02em]">{KOLS[0].name}</div>
                <span className="chip-blue">20 % du pot · ×5,0</span>
              </div>
            </div>
            <dl className="space-y-1.5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-muted">Mise</dt>
                <dd className="num font-bold">$100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Cote après ta mise</dt>
                <dd className="num font-bold">×4,8</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Frais</dt>
                <dd className="font-bold text-blue">0 %</dd>
              </div>
              <div className="flex items-end justify-between border-t border-line pt-2.5">
                <dt className="font-bold">Si Cooker gagne</dt>
                <dd className="num font-display text-[26px] font-extrabold leading-none text-up">≈ $481</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="stagger grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Fonds protégés", text: "Les dépôts sont gardés dans le coffre de Marketcoins et ne repartent que vers ton propre wallet. On ne touche jamais à ton wallet." },
          { icon: Gavel, title: "Résolution transparente", text: "Règle publiée à l'avance, PnL de chaque KOL lu sur Solana Tracker et publié chiffre par chiffre. Le pot est payé 24 h plus tard, le temps de corriger une erreur." },
          { icon: Coins, title: "0 frais", text: "Ni sur les mises, ni sur les dépôts, ni sur les retraits. 100 % du pot va aux gagnants." },
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
