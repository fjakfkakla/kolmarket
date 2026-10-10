import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "objet",
    title: "1. Objet",
    body: [
      "Marketcoins (« la Plateforme ») est une interface permettant d'acheter et de vendre des parts sur des marchés de prédiction portant sur la performance de traders publics (« KOLs ») et de memecoins, mesurée à partir de données blockchain et de marché publiques.",
      "Les présentes conditions régissent l'accès et l'utilisation de la Plateforme. En connectant un wallet ou en négociant, vous les acceptez sans réserve.",
    ],
  },
  {
    id: "eligibilite",
    title: "2. Éligibilité",
    body: [
      "Vous devez avoir au moins 18 ans et la capacité juridique de contracter.",
      "L'accès est interdit aux résidents des juridictions où les marchés de prédiction ou les paris en ligne sont prohibés ou soumis à licence que la Plateforme ne détient pas. Il vous appartient de vérifier la législation applicable dans votre pays de résidence.",
      "La Plateforme peut appliquer un blocage géographique et refuser l'accès à tout moment.",
    ],
  },
  {
    id: "non-custodial",
    title: "3. Nature non-custodiale",
    body: [
      "La Plateforme ne détient jamais vos fonds ni vos clés privées. Les dépôts, mises et retraits sont exécutés par des smart contracts sur la blockchain Solana que vous signez avec votre propre wallet.",
      "Vous êtes seul responsable de la sécurité de votre wallet, de votre phrase de récupération et de vos appareils. Aucune transaction signée ne peut être annulée.",
    ],
  },
  {
    id: "marches",
    title: "4. Fonctionnement des marchés",
    body: [
      "Chaque marché définit une question, une période, une liste de résultats possibles et une règle de résolution publiée avant l'ouverture. Cette règle fait foi.",
      "Une part « Oui » sur un résultat vaut 1 USDC si ce résultat est déclaré gagnant, 0 sinon. Une part « Non » vaut l'inverse. Les prix affichés reflètent la probabilité implicite du marché et évoluent en continu.",
      "Les mises ferment à la date indiquée. Les positions peuvent être revendues au prix du marché jusqu'à la résolution, sous réserve de liquidité.",
      "Aucun frais de trading n'est prélevé : 0 % à l'achat, 0 % à la revente. Les frais de réseau Solana restent à votre charge.",
    ],
  },
  {
    id: "resolution",
    title: "5. Résolution et contestation",
    body: [
      "Le résultat est proposé par le comité de résolution (multisignature) à partir des données on-chain publiques des wallets listés, puis soumis à une période de contestation de 24 heures.",
      "En cas d'égalité, de changement de wallet d'un KOL, d'indisponibilité des données ou de manipulation avérée, le marché est annulé et toutes les mises sont remboursées sans frais.",
      "Les décisions du comité de résolution, prises conformément à la règle publiée, sont définitives.",
    ],
  },
  {
    id: "risques",
    title: "6. Avertissement sur les risques",
    body: [
      "Négocier sur des marchés de prédiction comporte un risque de perte totale du capital engagé. Ne misez jamais plus que ce que vous pouvez vous permettre de perdre.",
      "Les KOLs et les tokens listés ne sont ni affiliés ni partenaires de la Plateforme. Leur performance passée ne préjuge pas de leur performance future.",
      "Les smart contracts peuvent contenir des vulnérabilités. La Plateforme applique des plafonds de mise et fait auditer son code, sans garantie d'absence de faille.",
    ],
  },
  {
    id: "conduite",
    title: "7. Conduite interdite",
    body: [
      "Sont interdits : la manipulation de marché, l'utilisation d'informations privilégiées, la coordination avec un KOL listé pour influencer un résultat, l'utilisation de bots abusifs, le contournement d'un blocage géographique et toute activité illégale.",
      "La Plateforme peut geler l'accès à l'interface pour tout compte suspect. Les fonds restant dans les smart contracts demeurent retirables par leur propriétaire.",
    ],
  },
  {
    id: "confidentialite",
    title: "8. Confidentialité",
    body: [
      "La Plateforme ne collecte que les données strictement nécessaires : adresse publique du wallet, historique de transactions on-chain (par nature publiques), adresse email si vous choisissez la connexion par email, et données techniques de connexion.",
      "Aucune donnée n'est vendue à des tiers. Vous pouvez demander la suppression de vos données hors chaîne à tout moment.",
    ],
  },
  {
    id: "responsabilite",
    title: "9. Limitation de responsabilité",
    body: [
      "La Plateforme est fournie « en l'état ». Dans la limite permise par la loi, Marketcoins décline toute responsabilité pour les pertes résultant de l'utilisation de la Plateforme, d'une défaillance de la blockchain, d'un wallet tiers ou d'une source de données.",
    ],
  },
  {
    id: "modifications",
    title: "10. Modifications",
    body: [
      "Les présentes conditions peuvent être modifiées à tout moment. La version en vigueur est celle publiée sur cette page, avec sa date de mise à jour. La poursuite de l'utilisation vaut acceptation.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="grid gap-8 md:grid-cols-[230px_1fr]">
      <aside className="md:sticky md:top-32 md:self-start">
        <nav className="card p-2" aria-label="Sommaire">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block rounded-xl px-3 py-2 text-[14px] font-semibold text-muted transition hover:bg-paper-2 hover:text-ink">
              {s.title}
            </a>
          ))}
        </nav>
      </aside>
      <article className="card fade-up p-6 md:p-10">
        <h1 className="display text-[34px]">Conditions d&apos;utilisation</h1>
        <span className="chip mt-3">Mise à jour le 10 octobre 2026</span>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mt-9 scroll-mt-32">
            <h2 className="font-display text-[21px] font-extrabold tracking-[-0.02em]">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2.5 text-[15px] leading-relaxed text-ink-2">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
