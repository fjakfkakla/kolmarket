import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "objet",
    title: "1. Objet",
    body: [
      "Marketcoins (« la Plateforme ») permet de miser des USDC sur des marchés en pot commun portant sur la performance de traders publics (« KOLs ») mesurée à partir de données blockchain publiques.",
      "Les présentes conditions régissent l'accès et l'utilisation de la Plateforme. En connectant un wallet ou en misant, vous les acceptez sans réserve.",
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
    id: "fonds",
    title: "3. Compte et conservation des fonds",
    body: [
      "Votre compte est lié à l'adresse publique du wallet Solana avec lequel vous vous connectez, par une simple signature. La Plateforme n'a jamais accès à votre wallet ni à vos clés privées.",
      "Les USDC que vous déposez sont conservés par la Plateforme dans un coffre dédié jusqu'à leur retrait. Les retraits sont envoyés uniquement vers l'adresse du wallet lié au compte.",
      "Plafonds : vos dépôts ne peuvent pas porter votre compte (solde et mises en cours) au-delà de 1000 USDC ; les gains peuvent dépasser ce montant et restent retirables. Retrait minimum : 5 USDC.",
      "Aucun frais n'est prélevé sur les dépôts, les mises ou les retraits ; les frais du réseau Solana sont pris en charge par la Plateforme.",
      "Vous êtes seul responsable de la sécurité de votre wallet, de votre phrase de récupération et de vos appareils. Aucune transaction signée ne peut être annulée.",
    ],
  },
  {
    id: "marches",
    title: "4. Fonctionnement des marchés",
    body: [
      "Chaque marché définit une question, une période, une liste de résultats possibles et une règle de résolution publiée avant l'ouverture. Cette règle fait foi.",
      "Chaque marché fonctionne en pot commun : toutes les mises forment un pot unique. À la résolution, les comptes ayant misé sur le résultat gagnant se partagent 100 % du pot, au prorata de leur mise. Aucune commission n'est prélevée.",
      "Le pourcentage affiché pour chaque résultat est la part du pot misée sur lui. La cote et le gain affichés avant la fermeture des mises sont des estimations : ils évoluent selon les mises des autres participants.",
      "Les mises ferment à la date indiquée. Une mise ne peut être ni annulée ni revendue. La mise totale d'un compte est limitée à 1000 USDC par marché.",
      "Si aucune mise n'a été placée sur le résultat gagnant, ou si le marché est annulé, toutes les mises sont remboursées.",
    ],
  },
  {
    id: "resolution",
    title: "5. Résolution et correction",
    body: [
      "Le PnL réalisé de chaque wallet listé est compté en journées UTC, d'après les données de Solana Tracker. Environ 12 heures après la fin du défi, le résultat est publié avec le PnL de chaque KOL.",
      "Le pot est payé automatiquement 24 heures après la publication. Pendant ce délai, Marketcoins peut corriger le résultat en cas d'erreur manifeste des données ; le délai de 24 heures repart alors.",
      "En cas d'égalité, de changement de wallet d'un KOL, de données indisponibles ou incohérentes, ou de manipulation avérée, le marché est annulé et toutes les mises sont remboursées sans frais.",
      "Les décisions prises conformément à la règle publiée sont définitives.",
    ],
  },
  {
    id: "risques",
    title: "6. Avertissement sur les risques",
    body: [
      "Miser sur ces marchés comporte un risque de perte totale de la mise. Ne misez jamais plus que ce que vous pouvez vous permettre de perdre.",
      "Les KOLs listés ne sont ni affiliés ni partenaires de la Plateforme. Leur performance passée ne préjuge pas de leur performance future.",
      "La conservation des fonds par la Plateforme comporte des risques (piratage, défaillance technique, erreur de données). La Plateforme applique des plafonds de dépôt, de mise et de retrait et des contrôles automatiques, sans garantie d'absence de faille.",
    ],
  },
  {
    id: "conduite",
    title: "7. Conduite interdite",
    body: [
      "Sont interdits : la manipulation de marché, l'utilisation d'informations privilégiées, la coordination avec un KOL listé pour influencer un résultat, l'utilisation de bots abusifs, le contournement d'un blocage géographique et toute activité illégale.",
      "La Plateforme peut geler tout compte suspect le temps d'une vérification. Sauf fraude avérée, le solde d'un compte gelé reste retirable vers le wallet lié au compte.",
    ],
  },
  {
    id: "confidentialite",
    title: "8. Confidentialité",
    body: [
      "La Plateforme ne collecte que les données strictement nécessaires : adresse publique du wallet, historique de vos dépôts, mises et retraits, et données techniques de connexion (navigateur, dates de session).",
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
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-28 md:self-start">
        <div className="card p-3">
          <div className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-muted">Sommaire</div>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-cream-2 hover:text-ink">{s.title}</a>
          ))}
        </div>
      </aside>
      <article className="card p-6 md:p-10 fade-up">
        <h1 className="text-3xl font-bold">Conditions d&apos;utilisation</h1>
        <p className="mt-2 text-sm text-muted">Dernière mise à jour : 10 octobre 2026</p>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mt-8 scroll-mt-28">
            <h2 className="text-lg font-bold">{s.title}</h2>
            {s.body.map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-muted">{p}</p>)}
          </section>
        ))}
      </article>
    </div>
  );
}
