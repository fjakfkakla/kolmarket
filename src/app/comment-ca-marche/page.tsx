import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gavel, ShieldCheck, Wallet, Vote } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { KOLS } from "@/data/kols";

export const metadata: Metadata = { title: "Comment ça marche" };

const STEPS = [
  { icon: Wallet, title: "Connecte ton wallet", text: "Phantom, Solflare, Backpack ou n'importe quel wallet Solana. Une signature gratuite crée ton compte, ta clé ne quitte jamais ton wallet." },
  { icon: Coins, title: "Dépose des USDC", text: "Jusqu'à 1000 $ sur ton compte, 0 frais : on paie le réseau pour toi. Tu retires quand tu veux, vers ton wallet." },
  { icon: Vote, title: "Mise sur ton KOL", text: "Choisis celui qui fera le plus de profit. Le % affiché = la part du pot misée sur lui. Maximum 1000 $ par marché." },
  { icon: Gavel, title: "Le gagnant prend le pot", text: "À la fin, ceux qui ont misé sur le KOL au meilleur PnL se partagent tout le pot, au prorata de leur mise." },
];

export default function HowPage() {
  return (
    <div className="space-y-10">
      <section className="text-center fade-up">
        <h1 className="text-3xl font-bold md:text-4xl">Comment ça marche</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">Un marché de prédiction simple : tu paries sur les KOLs qui performent vraiment, chiffres on-chain à l&apos;appui.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4 stagger">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card relative p-5">
            <span className="absolute right-4 top-4 text-4xl font-black text-cream-2">{i + 1}</span>
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gold-soft text-gold-3"><s.icon size={22} /></div>
            <h3 className="font-bold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="card p-6 md:p-8 fade-up">
        <h2 className="text-xl font-bold">Exemple concret</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm text-muted">
            <p>Le pot fait <b className="text-ink">10 000 $</b>, dont <b className="text-ink">2 000 $</b> misés sur <b className="text-ink">{KOLS[0].name}</b> : il est à 20 %, cote ×5.</p>
            <p>Tu mises <b className="text-ink">100 $</b> sur lui. Le pot passe à 10 100 $, dont 2 100 $ sur {KOLS[0].name}.</p>
            <p>S&apos;il termine n°1 au PnL, tu touches 100 / 2 100 × 10 100 ≈ <b className="text-up">481 $</b>, soit +381 $.</p>
            <p>S&apos;il perd, ta mise va aux gagnants. Le gain reste une estimation jusqu&apos;à la fermeture des mises : si d&apos;autres misent aussi sur lui, il baisse.</p>
          </div>
          <div className="rounded-2xl bg-cream-2 p-5">
            <div className="mb-3 flex items-center gap-3">
              <Avatar kol={KOLS[0]} size={44} ring />
              <div><div className="font-bold">{KOLS[0].name}</div><div className="text-xs text-muted">20 % du pot · ×5,0</div></div>
            </div>
            <div className="mono space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">Mise</span><span>$100</span></div>
              <div className="flex justify-between"><span className="text-muted">Cote après ta mise</span><span>×4,8</span></div>
              <div className="flex justify-between"><span className="text-muted">Frais</span><span>$0</span></div>
              <div className="flex justify-between border-t border-line pt-1 font-bold"><span>Si gagné</span><span className="text-up">≈ $481</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 stagger">
        <div className="card p-5">
          <ShieldCheck className="mb-2 text-up" />
          <h3 className="font-bold">Fonds protégés</h3>
          <p className="mt-1 text-sm text-muted">Les dépôts sont gardés dans un coffre multisig et ne repartent que vers ton propre wallet. On ne touche jamais à ton wallet.</p>
        </div>
        <div className="card p-5">
          <Gavel className="mb-2 text-gold-3" />
          <h3 className="font-bold">Résolution transparente</h3>
          <p className="mt-1 text-sm text-muted">Règle publiée à l&apos;avance, données publiques, comité multisig et 24 h de contestation.</p>
        </div>
        <div className="card p-5">
          <Coins className="mb-2 text-blue" />
          <h3 className="font-bold">0 frais</h3>
          <p className="mt-1 text-sm text-muted">Ni sur les mises, ni sur les dépôts, ni sur les retraits. 100 % du pot va aux gagnants.</p>
        </div>
      </section>

      <div className="text-center">
        <Link href="/market/kol-top-profit-7d" className="btn-gold px-6 py-3 text-base">Voir le défi en cours <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
