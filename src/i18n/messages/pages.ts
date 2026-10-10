import { defineMessages } from "./types";

/**
 * Pages statiques (« Comment ça marche », conditions d'utilisation). Rendu serveur uniquement.
 * Dans `how.example`, `**texte**` = gras, `++texte++` = gras vert (gain).
 */
export const pages = defineMessages({
  en: {
    how: {
      metaTitle: "How it works",
      titleA: "How it",
      titleB: "works",
      steps: [
        {
          title: "Connect your wallet",
          text: "Phantom, Solflare, Backpack or any Solana wallet. One free signature creates your account; your key never leaves your wallet.",
        },
        {
          title: "Deposit USDC",
          text: "Up to $1,000 in your account, 0 fees: we pay the network for you. Withdraw to your wallet whenever you want.",
        },
        {
          title: "Bet on your KOL",
          text: "Pick the one who'll make the most profit. The % shown is the share of the pool bet on them. Betting closes when the challenge starts, $1,000 max per market.",
        },
        {
          title: "Winner takes the pool",
          text: "One challenge every week (Monday to Sunday, UTC) and one every month. The result is posted the next day around 12:00 UTC; 24 h later, everyone who bet on the top PnL splits the whole pool.",
        },
      ],
      exampleTitle: "An example",
      example: [
        "The pool is **$10,000**, with **$2,000** bet on **{name}**: they're at 20%, odds ×5.",
        "You bet **$100** on them. The pool grows to $10,100, with $2,100 on {name}.",
        "They finish #1 in PnL: you get 100 / 2,100 × 10,100 ≈ ++$481++, a $381 profit.",
        "They lose: your bet goes to the winners. The payout is only an estimate until betting closes: if others also bet on them, it goes down.",
      ],
      chip: "20% of pool · ×5.0",
      stake: "Bet",
      oddsAfter: "Odds after your bet",
      fees: "Fees",
      ifWins: "If {name} wins",
      oddsValue: "×4.8",
      feesValue: "0%",
      features: [
        {
          title: "Protected funds",
          text: "Deposits are held in the Marketcoins vault and can only go back to your own wallet. We never touch your wallet.",
        },
        {
          title: "Transparent resolution",
          text: "Rule published in advance, each KOL's PnL read from Solana Tracker and published figure by figure. The pool is paid out 24 h later, leaving time to fix any error.",
        },
        {
          title: "0 fees",
          text: "None on bets, deposits or withdrawals. 100% of the pool goes to the winners.",
        },
      ],
      cta: "See the current challenge",
    },
    terms: {
      metaTitle: "Terms of use",
      title: "Terms of use",
      updated: "Last updated October 10, 2026",
      toc: "Contents",
      sections: {
        objet: {
          title: "1. Purpose",
          body: [
            "Marketcoins (“the Platform”) lets you bet USDC on pooled markets about the performance of public traders (“KOLs”), measured from public blockchain data.",
            "These terms govern access to and use of the Platform. By connecting a wallet or placing a bet, you accept them without reservation.",
          ],
        },
        eligibilite: {
          title: "2. Eligibility",
          body: [
            "You must be at least 18 years old and have the legal capacity to enter into a contract.",
            "Access is prohibited to residents of jurisdictions where prediction markets or online betting are banned or subject to a license the Platform does not hold. It is your responsibility to check the laws that apply in your country of residence.",
            "The Platform may apply geographic blocking and refuse access at any time.",
          ],
        },
        fonds: {
          title: "3. Account and custody of funds",
          body: [
            "Your account is linked to the public address of the Solana wallet you sign in with, through a simple signature. The Platform never has access to your wallet or your private keys.",
            "The USDC you deposit is held by the Platform in a dedicated vault until it is withdrawn. Withdrawals are sent only to the address of the wallet linked to the account.",
            "Limits: your deposits cannot bring your account (balance plus open bets) above 1,000 USDC; winnings may exceed this amount and remain withdrawable. Minimum withdrawal: 5 USDC.",
            "No fees are charged on deposits, bets or withdrawals; Solana network fees are covered by the Platform.",
            "You alone are responsible for the security of your wallet, your recovery phrase and your devices. No signed transaction can be reversed.",
          ],
        },
        marches: {
          title: "4. How markets work",
          body: [
            "Each market defines a question, a period, a list of possible outcomes and a resolution rule published before it opens. That rule is authoritative.",
            "Each market works as a common pool: all bets form a single pool. At resolution, the accounts that bet on the winning outcome share 100% of the pool, in proportion to their bet. No commission is taken.",
            "The percentage shown for each outcome is the share of the pool bet on it. The odds and payout shown before betting closes are estimates: they change with the other participants' bets.",
            "Betting closes on the date shown. A bet can be neither cancelled nor resold. An account's total bet is limited to 1,000 USDC per market.",
            "If no bet was placed on the winning outcome, or if the market is cancelled, all bets are refunded.",
          ],
        },
        resolution: {
          title: "5. Resolution and correction",
          body: [
            "The realized PnL of each listed wallet is counted in UTC days, based on Solana Tracker data. About 12 hours after the challenge ends, the result is published along with each KOL's PnL.",
            "The pool is paid out automatically 24 hours after publication. During this period, Marketcoins may correct the result in the event of a manifest data error; the 24-hour period then starts over.",
            "In the event of a tie, a change of a KOL's wallet, unavailable or inconsistent data, or proven manipulation, the market is cancelled and all bets are refunded at no cost.",
            "Decisions made in accordance with the published rule are final.",
          ],
        },
        risques: {
          title: "6. Risk warning",
          body: [
            "Betting on these markets carries a risk of losing your entire bet. Never bet more than you can afford to lose.",
            "The listed KOLs are neither affiliated with nor partners of the Platform. Their past performance is no indication of their future performance.",
            "Custody of funds by the Platform carries risks (hacking, technical failure, data error). The Platform applies deposit, bet and withdrawal limits and automated checks, with no guarantee that no vulnerability exists.",
          ],
        },
        conduite: {
          title: "7. Prohibited conduct",
          body: [
            "The following are prohibited: market manipulation, use of inside information, coordinating with a listed KOL to influence an outcome, use of abusive bots, circumventing geographic blocking, and any illegal activity.",
            "The Platform may freeze any suspicious account while it is reviewed. Except in cases of proven fraud, the balance of a frozen account remains withdrawable to the wallet linked to the account.",
          ],
        },
        confidentialite: {
          title: "8. Privacy",
          body: [
            "The Platform collects only the data that is strictly necessary: your wallet's public address, the history of your deposits, bets and withdrawals, and technical connection data (browser, session dates).",
            "No data is sold to third parties. You may request the deletion of your off-chain data at any time.",
          ],
        },
        responsabilite: {
          title: "9. Limitation of liability",
          body: [
            "The Platform is provided “as is”. To the extent permitted by law, Marketcoins disclaims all liability for losses resulting from use of the Platform or from a failure of the blockchain, a third-party wallet or a data source.",
          ],
        },
        modifications: {
          title: "10. Changes",
          body: [
            "These terms may be changed at any time. The version in force is the one published on this page, with its last-updated date. Continued use constitutes acceptance.",
          ],
        },
      },
    },
  },
  fr: {
    how: {
      metaTitle: "Comment ça marche",
      titleA: "Comment ça",
      titleB: "marche",
      steps: [
        {
          title: "Connecte ton wallet",
          text: "Phantom, Solflare, Backpack ou n'importe quel wallet Solana. Une signature gratuite crée ton compte, ta clé ne quitte jamais ton wallet.",
        },
        {
          title: "Dépose des USDC",
          text: "Jusqu'à 1000 $ sur ton compte, 0 frais : on paie le réseau pour toi. Tu retires quand tu veux, vers ton wallet.",
        },
        {
          title: "Mise sur ton KOL",
          text: "Choisis celui qui fera le plus de profit. Le % affiché, c'est la part du pot misée sur lui. Les mises ferment au départ du défi, 1000 $ maximum par marché.",
        },
        {
          title: "Le gagnant prend le pot",
          text: "Un défi chaque semaine (lundi au dimanche, UTC) et un chaque mois. Résultat publié le lendemain vers 12:00 UTC ; 24 h plus tard, ceux qui ont misé sur le meilleur PnL se partagent tout le pot.",
        },
      ],
      exampleTitle: "Un exemple",
      example: [
        "Le pot fait **10 000 $**, dont **2 000 $** misés sur **{name}** : il est à 20 %, cote ×5.",
        "Tu mises **100 $** sur lui. Le pot passe à 10 100 $, dont 2 100 $ sur {name}.",
        "Il termine n°1 au PnL : tu touches 100 / 2 100 × 10 100 ≈ ++481 $++, soit 381 $ de gain.",
        "Il perd : ta mise va aux gagnants. Le gain reste une estimation jusqu'à la fermeture des mises : si d'autres misent aussi sur lui, il baisse.",
      ],
      chip: "20 % du pot · ×5.0",
      stake: "Mise",
      oddsAfter: "Cote après ta mise",
      fees: "Frais",
      ifWins: "Si {name} gagne",
      oddsValue: "×4.8",
      feesValue: "0 %",
      features: [
        {
          title: "Fonds protégés",
          text: "Les dépôts sont gardés dans le coffre de Marketcoins et ne repartent que vers ton propre wallet. On ne touche jamais à ton wallet.",
        },
        {
          title: "Résolution transparente",
          text: "Règle publiée à l'avance, PnL de chaque KOL lu sur Solana Tracker et publié chiffre par chiffre. Le pot est payé 24 h plus tard, le temps de corriger une erreur.",
        },
        {
          title: "0 frais",
          text: "Ni sur les mises, ni sur les dépôts, ni sur les retraits. 100 % du pot va aux gagnants.",
        },
      ],
      cta: "Voir le défi en cours",
    },
    terms: {
      metaTitle: "Conditions d'utilisation",
      title: "Conditions d'utilisation",
      updated: "Mise à jour le 10 octobre 2026",
      toc: "Sommaire",
      sections: {
        objet: {
          title: "1. Objet",
          body: [
            "Marketcoins (« la Plateforme ») permet de miser des USDC sur des marchés en pot commun portant sur la performance de traders publics (« KOLs ») mesurée à partir de données blockchain publiques.",
            "Les présentes conditions régissent l'accès et l'utilisation de la Plateforme. En connectant un wallet ou en misant, vous les acceptez sans réserve.",
          ],
        },
        eligibilite: {
          title: "2. Éligibilité",
          body: [
            "Vous devez avoir au moins 18 ans et la capacité juridique de contracter.",
            "L'accès est interdit aux résidents des juridictions où les marchés de prédiction ou les paris en ligne sont prohibés ou soumis à licence que la Plateforme ne détient pas. Il vous appartient de vérifier la législation applicable dans votre pays de résidence.",
            "La Plateforme peut appliquer un blocage géographique et refuser l'accès à tout moment.",
          ],
        },
        fonds: {
          title: "3. Compte et conservation des fonds",
          body: [
            "Votre compte est lié à l'adresse publique du wallet Solana avec lequel vous vous connectez, par une simple signature. La Plateforme n'a jamais accès à votre wallet ni à vos clés privées.",
            "Les USDC que vous déposez sont conservés par la Plateforme dans un coffre dédié jusqu'à leur retrait. Les retraits sont envoyés uniquement vers l'adresse du wallet lié au compte.",
            "Plafonds : vos dépôts ne peuvent pas porter votre compte (solde et mises en cours) au-delà de 1000 USDC ; les gains peuvent dépasser ce montant et restent retirables. Retrait minimum : 5 USDC.",
            "Aucun frais n'est prélevé sur les dépôts, les mises ou les retraits ; les frais du réseau Solana sont pris en charge par la Plateforme.",
            "Vous êtes seul responsable de la sécurité de votre wallet, de votre phrase de récupération et de vos appareils. Aucune transaction signée ne peut être annulée.",
          ],
        },
        marches: {
          title: "4. Fonctionnement des marchés",
          body: [
            "Chaque marché définit une question, une période, une liste de résultats possibles et une règle de résolution publiée avant l'ouverture. Cette règle fait foi.",
            "Chaque marché fonctionne en pot commun : toutes les mises forment un pot unique. À la résolution, les comptes ayant misé sur le résultat gagnant se partagent 100 % du pot, au prorata de leur mise. Aucune commission n'est prélevée.",
            "Le pourcentage affiché pour chaque résultat est la part du pot misée sur lui. La cote et le gain affichés avant la fermeture des mises sont des estimations : ils évoluent selon les mises des autres participants.",
            "Les mises ferment à la date indiquée. Une mise ne peut être ni annulée ni revendue. La mise totale d'un compte est limitée à 1000 USDC par marché.",
            "Si aucune mise n'a été placée sur le résultat gagnant, ou si le marché est annulé, toutes les mises sont remboursées.",
          ],
        },
        resolution: {
          title: "5. Résolution et correction",
          body: [
            "Le PnL réalisé de chaque wallet listé est compté en journées UTC, d'après les données de Solana Tracker. Environ 12 heures après la fin du défi, le résultat est publié avec le PnL de chaque KOL.",
            "Le pot est payé automatiquement 24 heures après la publication. Pendant ce délai, Marketcoins peut corriger le résultat en cas d'erreur manifeste des données ; le délai de 24 heures repart alors.",
            "En cas d'égalité, de changement de wallet d'un KOL, de données indisponibles ou incohérentes, ou de manipulation avérée, le marché est annulé et toutes les mises sont remboursées sans frais.",
            "Les décisions prises conformément à la règle publiée sont définitives.",
          ],
        },
        risques: {
          title: "6. Avertissement sur les risques",
          body: [
            "Miser sur ces marchés comporte un risque de perte totale de la mise. Ne misez jamais plus que ce que vous pouvez vous permettre de perdre.",
            "Les KOLs listés ne sont ni affiliés ni partenaires de la Plateforme. Leur performance passée ne préjuge pas de leur performance future.",
            "La conservation des fonds par la Plateforme comporte des risques (piratage, défaillance technique, erreur de données). La Plateforme applique des plafonds de dépôt, de mise et de retrait et des contrôles automatiques, sans garantie d'absence de faille.",
          ],
        },
        conduite: {
          title: "7. Conduite interdite",
          body: [
            "Sont interdits : la manipulation de marché, l'utilisation d'informations privilégiées, la coordination avec un KOL listé pour influencer un résultat, l'utilisation de bots abusifs, le contournement d'un blocage géographique et toute activité illégale.",
            "La Plateforme peut geler tout compte suspect le temps d'une vérification. Sauf fraude avérée, le solde d'un compte gelé reste retirable vers le wallet lié au compte.",
          ],
        },
        confidentialite: {
          title: "8. Confidentialité",
          body: [
            "La Plateforme ne collecte que les données strictement nécessaires : adresse publique du wallet, historique de vos dépôts, mises et retraits, et données techniques de connexion (navigateur, dates de session).",
            "Aucune donnée n'est vendue à des tiers. Vous pouvez demander la suppression de vos données hors chaîne à tout moment.",
          ],
        },
        responsabilite: {
          title: "9. Limitation de responsabilité",
          body: [
            "La Plateforme est fournie « en l'état ». Dans la limite permise par la loi, Marketcoins décline toute responsabilité pour les pertes résultant de l'utilisation de la Plateforme, d'une défaillance de la blockchain, d'un wallet tiers ou d'une source de données.",
          ],
        },
        modifications: {
          title: "10. Modifications",
          body: [
            "Les présentes conditions peuvent être modifiées à tout moment. La version en vigueur est celle publiée sur cette page, avec sa date de mise à jour. La poursuite de l'utilisation vaut acceptation.",
          ],
        },
      },
    },
  },
  es: {
    how: {
      metaTitle: "Cómo funciona",
      titleA: "Cómo",
      titleB: "funciona",
      steps: [
        {
          title: "Conecta tu wallet",
          text: "Phantom, Solflare, Backpack o cualquier wallet de Solana. Una firma gratuita crea tu cuenta; tu clave nunca sale de tu wallet.",
        },
        {
          title: "Deposita USDC",
          text: "Hasta 1000 $ en tu cuenta, 0 comisiones: nosotros pagamos la red por ti. Retira a tu wallet cuando quieras.",
        },
        {
          title: "Apuesta por tu KOL",
          text: "Elige al que hará más beneficio. El % que ves es la parte del bote apostada por él. Las apuestas cierran al empezar el reto, 1000 $ como máximo por mercado.",
        },
        {
          title: "El ganador se lleva el bote",
          text: "Un reto cada semana (de lunes a domingo, UTC) y uno cada mes. El resultado se publica al día siguiente hacia las 12:00 UTC; 24 h después, quienes apostaron por el mejor PnL se reparten todo el bote.",
        },
      ],
      exampleTitle: "Un ejemplo",
      example: [
        "El bote es de **10 000 $**, de los que **2000 $** están apostados por **{name}**: está al 20 %, cuota ×5.",
        "Apuestas **100 $** por él. El bote sube a 10 100 $, con 2100 $ por {name}.",
        "Termina n.º 1 en PnL: cobras 100 / 2100 × 10 100 ≈ ++481 $++, es decir, 381 $ de ganancia.",
        "Si pierde, tu apuesta va para los ganadores. La ganancia es solo una estimación hasta que cierran las apuestas: si otros también apuestan por él, baja.",
      ],
      chip: "20 % del bote · ×5.0",
      stake: "Apuesta",
      oddsAfter: "Cuota tras tu apuesta",
      fees: "Comisiones",
      ifWins: "Si gana {name}",
      oddsValue: "×4.8",
      feesValue: "0 %",
      features: [
        {
          title: "Fondos protegidos",
          text: "Los depósitos se guardan en la bóveda de Marketcoins y solo pueden volver a tu propia wallet. Nunca tocamos tu wallet.",
        },
        {
          title: "Resolución transparente",
          text: "Regla publicada de antemano, PnL de cada KOL leído en Solana Tracker y publicado cifra a cifra. El bote se paga 24 h después, el tiempo de corregir un error.",
        },
        {
          title: "0 comisiones",
          text: "Ni en las apuestas, ni en los depósitos, ni en los retiros. El 100 % del bote va para los ganadores.",
        },
      ],
      cta: "Ver el reto en curso",
    },
    terms: {
      metaTitle: "Condiciones de uso",
      title: "Condiciones de uso",
      updated: "Actualizado el 10 de octubre de 2026",
      toc: "Índice",
      sections: {
        objet: {
          title: "1. Objeto",
          body: [
            "Marketcoins («la Plataforma») permite apostar USDC en mercados de bote común sobre el rendimiento de traders públicos («KOLs»), medido a partir de datos públicos de la blockchain.",
            "Las presentes condiciones regulan el acceso a la Plataforma y su uso. Al conectar una wallet o apostar, las aceptas sin reservas.",
          ],
        },
        eligibilite: {
          title: "2. Requisitos",
          body: [
            "Debes tener al menos 18 años y capacidad jurídica para contratar.",
            "El acceso está prohibido a los residentes de jurisdicciones en las que los mercados de predicción o las apuestas en línea están prohibidos o sujetos a una licencia que la Plataforma no posee. Te corresponde comprobar la legislación aplicable en tu país de residencia.",
            "La Plataforma puede aplicar un bloqueo geográfico y denegar el acceso en cualquier momento.",
          ],
        },
        fonds: {
          title: "3. Cuenta y custodia de los fondos",
          body: [
            "Tu cuenta está vinculada a la dirección pública de la wallet de Solana con la que inicias sesión, mediante una simple firma. La Plataforma nunca tiene acceso a tu wallet ni a tus claves privadas.",
            "Los USDC que depositas quedan custodiados por la Plataforma en una bóveda dedicada hasta que los retiras. Los retiros se envían únicamente a la dirección de la wallet vinculada a la cuenta.",
            "Límites: tus depósitos no pueden llevar tu cuenta (saldo y apuestas en curso) por encima de 1000 USDC; las ganancias pueden superar ese importe y siguen siendo retirables. Retiro mínimo: 5 USDC.",
            "No se cobra ninguna comisión por los depósitos, las apuestas ni los retiros; las comisiones de la red Solana corren a cargo de la Plataforma.",
            "Eres el único responsable de la seguridad de tu wallet, de tu frase de recuperación y de tus dispositivos. Ninguna transacción firmada puede revertirse.",
          ],
        },
        marches: {
          title: "4. Funcionamiento de los mercados",
          body: [
            "Cada mercado define una pregunta, un periodo, una lista de resultados posibles y una regla de resolución publicada antes de su apertura. Esa regla es la que prevalece.",
            "Cada mercado funciona como un bote común: todas las apuestas forman un único bote. En la resolución, las cuentas que apostaron por el resultado ganador se reparten el 100 % del bote, en proporción a su apuesta. No se cobra ninguna comisión.",
            "El porcentaje que se muestra para cada resultado es la parte del bote apostada por él. La cuota y la ganancia que se muestran antes del cierre de las apuestas son estimaciones: cambian según las apuestas de los demás participantes.",
            "Las apuestas cierran en la fecha indicada. Una apuesta no puede cancelarse ni revenderse. La apuesta total de una cuenta está limitada a 1000 USDC por mercado.",
            "Si nadie apostó por el resultado ganador, o si el mercado se cancela, se reembolsan todas las apuestas.",
          ],
        },
        resolution: {
          title: "5. Resolución y corrección",
          body: [
            "El PnL realizado de cada wallet listada se cuenta en días UTC, según los datos de Solana Tracker. Unas 12 horas después del final del reto, se publica el resultado con el PnL de cada KOL.",
            "El bote se paga automáticamente 24 horas después de la publicación. Durante ese plazo, Marketcoins puede corregir el resultado en caso de error manifiesto en los datos; el plazo de 24 horas vuelve entonces a empezar.",
            "En caso de empate, cambio de wallet de un KOL, datos no disponibles o incoherentes, o manipulación demostrada, el mercado se cancela y todas las apuestas se reembolsan sin coste.",
            "Las decisiones tomadas conforme a la regla publicada son definitivas.",
          ],
        },
        risques: {
          title: "6. Advertencia sobre los riesgos",
          body: [
            "Apostar en estos mercados conlleva el riesgo de perder toda la apuesta. Nunca apuestes más de lo que puedas permitirte perder.",
            "Los KOLs listados no están afiliados a la Plataforma ni son socios suyos. Su rendimiento pasado no garantiza su rendimiento futuro.",
            "La custodia de los fondos por parte de la Plataforma conlleva riesgos (hackeo, fallo técnico, error en los datos). La Plataforma aplica límites de depósito, apuesta y retiro y controles automáticos, sin garantía de que no exista ningún fallo.",
          ],
        },
        conduite: {
          title: "7. Conductas prohibidas",
          body: [
            "Están prohibidos: la manipulación del mercado, el uso de información privilegiada, la coordinación con un KOL listado para influir en un resultado, el uso abusivo de bots, la elusión de un bloqueo geográfico y cualquier actividad ilegal.",
            "La Plataforma puede congelar cualquier cuenta sospechosa mientras se verifica. Salvo fraude demostrado, el saldo de una cuenta congelada sigue siendo retirable a la wallet vinculada a la cuenta.",
          ],
        },
        confidentialite: {
          title: "8. Privacidad",
          body: [
            "La Plataforma solo recopila los datos estrictamente necesarios: la dirección pública de la wallet, el historial de tus depósitos, apuestas y retiros, y datos técnicos de conexión (navegador, fechas de sesión).",
            "No se vende ningún dato a terceros. Puedes solicitar la eliminación de tus datos fuera de la cadena en cualquier momento.",
          ],
        },
        responsabilite: {
          title: "9. Limitación de responsabilidad",
          body: [
            "La Plataforma se ofrece «tal cual». En la medida en que lo permita la ley, Marketcoins declina toda responsabilidad por las pérdidas derivadas del uso de la Plataforma o de un fallo de la blockchain, de una wallet de terceros o de una fuente de datos.",
          ],
        },
        modifications: {
          title: "10. Modificaciones",
          body: [
            "Las presentes condiciones pueden modificarse en cualquier momento. La versión vigente es la publicada en esta página, con su fecha de actualización. Seguir usando la Plataforma implica su aceptación.",
          ],
        },
      },
    },
  },
});
