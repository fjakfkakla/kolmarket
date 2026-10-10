/**
 * Règles d'argent de la plateforme, partagées par l'interface et (plus tard) le serveur.
 * Montants en USDC. 0 frais partout : aucune commission sur les mises, dépôts ou retraits.
 */

/** Un compte ne peut pas dépasser ce montant (solde + mises en cours) par ses dépôts. Les gains, eux, peuvent le dépasser. */
export const DEPOSIT_CAP = 1000;
/** Mise totale maximale d'un compte sur un même marché. */
export const MAX_STAKE_PER_MARKET = 1000;
export const MIN_BET = 1;
export const MIN_DEPOSIT = 1;
/** Évite qu'on paie le réseau pour des retraits de quelques centimes. Ce n'est pas un frais. */
export const MIN_WITHDRAWAL = 5;
/** Au-delà, un retrait attend une validation manuelle (filet de sécurité si la base était piratée). */
export const WITHDRAWAL_REVIEW_ABOVE = 2000;
/** Total des retraits de toute la plateforme sur 24 h au-delà duquel tout passe en validation manuelle. */
export const PLATFORM_DAILY_WITHDRAWALS = 10000;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Montant au centime près (pas de fractions de centime). */
export const isCents = (n: number) => Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

/** Ce que le compte peut encore déposer. */
export function depositRoom(balance: number, inPlay: number) {
  return Math.max(0, round2(DEPOSIT_CAP - balance - inPlay));
}

export function checkDeposit(amount: number, balance: number, inPlay: number): string | null {
  const room = depositRoom(balance, inPlay);
  if (!(amount > 0)) return "Montant invalide.";
  if (amount < MIN_DEPOSIT) return `Dépôt minimum : ${MIN_DEPOSIT} $.`;
  if (room <= 0) return `Plafond atteint : tu as déjà ${DEPOSIT_CAP} $ ou plus sur ton compte.`;
  if (amount > room) return `Tu peux déposer ${room} $ maximum (plafond ${DEPOSIT_CAP} $).`;
  return null;
}

export function checkWithdraw(amount: number, balance: number): string | null {
  if (!(amount > 0)) return "Montant invalide.";
  if (amount < MIN_WITHDRAWAL) return `Retrait minimum : ${MIN_WITHDRAWAL} $.`;
  if (amount > balance) return "Solde insuffisant.";
  return null;
}

export function checkBet(amount: number, balance: number, stakedOnMarket: number, open: boolean): string | null {
  if (!open) return "Les mises sont fermées sur ce marché.";
  if (!(amount >= MIN_BET)) return `Mise minimum : ${MIN_BET} $.`;
  if (stakedOnMarket + amount > MAX_STAKE_PER_MARKET) {
    const left = round2(MAX_STAKE_PER_MARKET - stakedOnMarket);
    return left > 0
      ? `Tu peux encore miser ${left} $ sur ce marché (maximum ${MAX_STAKE_PER_MARKET} $).`
      : `Tu as atteint le maximum de ${MAX_STAKE_PER_MARKET} $ sur ce marché.`;
  }
  if (amount > balance) return "Solde insuffisant. Dépose des USDC.";
  return null;
}
