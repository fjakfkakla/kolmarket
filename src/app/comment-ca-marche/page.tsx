import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gavel, ShieldCheck, Wallet, Vote } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { KOLS } from "@/data/kols";

export const metadata: Metadata = { title: "Comment ça marche" };

const STEPS = [
  { icon: Wallet, title: "Connecte ton wallet", text: "Phantom, Solflare ou Backpack. Marketcoins ne détient jamais tes clés : tu signes chaque opération." },
  { icon: Coins, title: "Dépose des USDC", text: "Sur Solana, en quelques secondes et pour une fraction de centime de frais." },
  { icon: Vote, title: "Choisis ton KOL", text: "Achète des parts Oui sur celui qui fera le plus de profit, ou Non sur ceux qui vont décevoir. Le prix = la probabilité du marché." },
  { icon: Gavel, title: "Résolution on-chain", text: "À la fin de la période, le PnL réalisé de chaque wallet est comparé. Chaque part gagnante vaut 1 $." },
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
            <p>Le marché donne <b className="text-ink">Cooker</b> à <b className="text-ink">34 %</b>. Une part Oui coûte donc 0,34 $.</p>
            <p>Tu achètes pour <b className="text-ink">100 $</b> : tu obtiens environ <b className="text-ink">294 parts</b>.</p>
            <p>Si Cooker termine n°1 au PnL, chaque part vaut 1 $ : tu touches <b className="text-up">294 $</b>, soit +194 $ de profit.</p>
            <p>S&apos;il ne termine pas n°1, les parts valent 0 $. Tu peux aussi revendre avant la fin si sa cote monte.</p>
          </div>
          <div className="rounded-2xl bg-cream-2 p-5">
            <div className="mb-3 flex items-center gap-3">
              <Avatar kol={KOLS[0]} size={44} ring />
              <div><div className="font-bold">{KOLS[0].name}</div><div className="text-xs text-muted">Oui à 34¢</div></div>
            </div>
            <div className="mono space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">Mise</span><span>$100</span></div>
              <div className="flex justify-between"><span className="text-muted">Parts</span><span>294,1</span></div>
              <div className="flex justify-between border-t border-line pt-1 font-bold"><span>Si gagné</span><span className="text-up">$294,10</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 stagger">
        <div className="card p-5">
          <ShieldCheck className="mb-2 text-up" />
          <h3 className="font-bold">Non-custodial</h3>
          <p className="mt-1 text-sm text-muted">Les fonds vivent dans un smart contract Solana. Pas de clé privée côté serveur, rien à hacker.</p>
        </div>
        <div className="card p-5">
          <Gavel className="mb-2 text-gold-3" />
          <h3 className="font-bold">Résolution transparente</h3>
          <p className="mt-1 text-sm text-muted">Règle publiée à l&apos;avance, données publiques, comité multisig et 24 h de contestation.</p>
        </div>
        <div className="card p-5">
          <Coins className="mb-2 text-blue" />
          <h3 className="font-bold">Frais clairs</h3>
          <p className="mt-1 text-sm text-muted">2 % à l&apos;achat, c&apos;est tout. Retraits libres à tout moment.</p>
        </div>
      </section>

      <div className="text-center">
        <Link href="/market/kol-top-profit-7d" className="btn-gold px-6 py-3 text-base">Voir le défi en cours <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
