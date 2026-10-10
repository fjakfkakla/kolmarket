import { fmt } from "./config";
import type { ClientDictionary } from "./messages";

/**
 * Le serveur (API, règles de limits.ts) renvoie ses messages en français : c'est la langue source.
 * On les traduit à l'affichage, d'après le texte exact ou un motif pour ceux qui contiennent un montant.
 * Un message inconnu est rendu tel quel.
 */

type AccountT = Pick<ClientDictionary, "account">;
type ErrorKey = Exclude<keyof ClientDictionary["account"]["errors"], "yourWallet">;

const EXACT: Record<string, ErrorKey> = {
  "Origine refusée.": "originRefused",
  "Adresse Solana invalide.": "invalidAddress",
  "Connexion indisponible pour le moment.": "signInUnavailable",
  "Signature manquante.": "signatureMissing",
  "Demande expirée, recommence la connexion.": "signInExpired",
  "Signature invalide.": "signatureInvalid",
  "Signature déjà utilisée, recommence la connexion.": "signatureUsed",
  "Non autorisé.": "unauthorized",
  "Compte indisponible pour le moment.": "accountUnavailable",
  "Mise invalide.": "betInvalid",
  "Montant invalide (au centime près).": "amountCents",
  "Mise indisponible pour le moment.": "betUnavailable",
  "Les retraits ne sont pas encore ouverts.": "withdrawalsClosed",
  "Retrait indisponible pour le moment.": "withdrawalUnavailable",
  "Retrait inconnu.": "withdrawalUnknown",
  "Les dépôts ne sont pas encore ouverts.": "depositsClosed",
  "Demande expirée, recommence le dépôt.": "depositExpired",
  "Transaction manquante.": "transactionMissing",
  "Dépôt indisponible pour le moment.": "depositUnavailable",
  "Dépôt inconnu.": "depositUnknown",
  "Suivi indisponible pour le moment.": "trackingUnavailable",
  "Base de données non configurée.": "dbMissing",
  "Connecte-toi d'abord.": "signInFirst",
  "Connexion impossible.": "connectFailed",
  "Aucun compte autorisé dans le wallet.": "noAccount",
  "Demande refusée dans le wallet.": "requestRejected",
  "Signature refusée dans le wallet.": "signatureRejected",
  "Signature impossible.": "signatureFailed",
  "Dépôt annulé dans le wallet.": "depositCanceled",
  "Service indisponible.": "serviceUnavailable",
  "La transaction a échoué sur le réseau. Aucun USDC n'a bougé.": "txFailed",
  "La transaction n'est jamais arrivée. Aucun USDC n'a bougé, réessaie.": "txDropped",
  "Dépôt reçu mais non attribué : contacte le support.": "depositUnassigned",
  "Le réseau est lent : ton dépôt sera crédité dès qu'il sera confirmé.": "networkSlow",
  "Dépôt impossible.": "depositFailed",
  "Retrait impossible.": "withdrawalFailed",
  "Ton compte est en cours de vérification.": "accountUnderReview",
  "Solde insuffisant.": "insufficientBalance",
  "Retrait impossible pour le moment.": "withdrawalImpossible",
  "Ce marché n'existe pas.": "marketUnknown",
  "Les mises sont fermées sur ce marché.": "betsClosed",
  "Ce KOL ne fait pas partie du marché.": "kolUnknown",
  "Solde insuffisant. Dépose des USDC.": "insufficientDeposit",
  "Mise impossible pour le moment.": "betImpossible",
  "Montant invalide.": "amountInvalid",
  "Transaction illisible.": "txUnreadable",
  "Ton wallet a modifié la transaction. Réessaie.": "txModified",
  "Le réseau a refusé la transaction. Vérifie ton solde USDC et réessaie.": "txRefused",
};

/** Messages avec paramètres : motif, clé, noms des groupes capturés (dans l'ordre). */
const PATTERNS: [RegExp, ErrorKey, string[]][] = [
  [/^Dépôt minimum : (.+) \$\.$/, "minDeposit", ["amount"]],
  [/^Retrait minimum : (.+) \$\.$/, "minWithdrawal", ["amount"]],
  [/^Mise minimum : (.+) \$\.$/, "minBet", ["amount"]],
  [/^Plafond atteint : tu as déjà (.+) \$ ou plus sur ton compte\.$/, "capReached", ["cap"]],
  [/^Tu peux déposer (.+) \$ maximum \(plafond (.+) \$\)\.$/, "depositMax", ["room", "cap"]],
  [/^Tu peux encore miser (.+) \$ sur ce marché \(maximum (.+) \$\)\.$/, "betLeft", ["left", "max"]],
  [/^Tu as atteint le maximum de (.+) \$ sur ce marché\.$/, "betMaxReached", ["max"]],
  [/^Sélectionne le compte (.+) dans (.+)\.$/, "selectAccount", ["account", "wallet"]],
  [/^Ouvre (.+) pour signer le dépôt\.$/, "openWalletDeposit", ["wallet"]],
  [/^Ouvre (.+) pour signer\.$/, "openWalletSign", ["wallet"]],
  [/^(.+) ne sait pas signer cette transaction\.$/, "cantSign", ["wallet"]],
  [/^Ton wallet n'a que (.+) USDC sur (.+)\.$/, "walletOnlyHas", ["amount", "network"]],
];

/** Traduit un message d'erreur venu du serveur ou des règles partagées ; inconnu → rendu tel quel. */
export function translateError(msg: string, t: AccountT): string {
  const e = t.account.errors;
  const key = EXACT[msg];
  if (key) return e[key];
  for (const [re, k, names] of PATTERNS) {
    const m = re.exec(msg);
    if (!m) continue;
    const vars: Record<string, string> = {};
    names.forEach((n, i) => {
      const v = m[i + 1];
      vars[n] = n === "wallet" && v === "ton wallet" ? e.yourWallet : v;
    });
    return fmt(e[k], vars);
  }
  return msg;
}

const WITHDRAWAL_STATE: Record<string, keyof ClientDictionary["account"]["activity"]["withdrawalState"]> = {
  "en vérification": "review",
  "en attente": "queued",
  "envoi en cours": "sending",
  arrivé: "confirmed",
  annulé: "refunded",
};

/**
 * Traduit le libellé d'une ligne d'historique (composé en français par le serveur, ou par la démo).
 * `title` traduit au passage le titre de marché qui suit « KOL · ».
 */
export function translateActivityLabel(label: string, t: AccountT, title: (fr: string) => string = (s) => s): string {
  const a = t.account.activity;
  const ty = t.account.types;
  const exact: Record<string, string> = {
    "Dépôt USDC": a.deposit,
    "Dépôt USDC au-delà du plafond (à retirer)": a.depositExcess,
    "Retrait annulé : montant recrédité": a.withdrawalRefunded,
    "Retrait USDC vers ton wallet": a.withdrawal,
    "Dépôt USDC (démo)": a.demoDeposit,
    "Retrait USDC vers le wallet (démo)": a.demoWithdrawal,
    Mise: ty.bet,
    Gain: ty.payout,
    Remboursement: ty.refund,
    Ajustement: ty.adjustment,
  };
  if (label in exact) return exact[label];
  const parts = label.split(" · ");
  if (parts[0] === "Retrait USDC vers ton wallet" && parts.length === 2) {
    const s = WITHDRAWAL_STATE[parts[1]];
    return `${a.withdrawal} · ${s ? a.withdrawalState[s] : parts[1]}`;
  }
  // « [Gain|Remboursement · ]KOL · titre du marché »
  const prefix = parts[0] === "Gain" ? ty.payout : parts[0] === "Remboursement" ? ty.refund : null;
  const rest = prefix ? parts.slice(1) : parts;
  if (rest.length >= 2) {
    const [kol, ...titleParts] = rest;
    return [...(prefix ? [prefix] : []), kol, title(titleParts.join(" · "))].join(" · ");
  }
  return label;
}
