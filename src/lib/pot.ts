/**
 * Calculs du pot commun (pari mutuel), 0 frais.
 * Ceux qui ont misé sur le gagnant se partagent tout le pot, au prorata de leur mise.
 * Si personne n'a misé sur le gagnant, tout le monde est remboursé.
 */

/** Cote actuelle : ce que rapporte 1 $ si ce résultat gagne. `null` si personne n'a encore misé dessus. */
export function odds(pot: number, outcomePool: number): number | null {
  return outcomePool > 0 ? pot / outcomePool : null;
}

/** Gain estimé d'une nouvelle mise, en tenant compte du fait qu'elle grossit elle-même le pot et le résultat. */
export function estimatePayout(pot: number, outcomePool: number, stake: number): number {
  if (stake <= 0) return 0;
  return (stake * (pot + stake)) / (outcomePool + stake);
}

/** Gain d'une mise déjà placée (déjà comptée dans `pot` et `outcomePool`). */
export function payoutOf(pot: number, outcomePool: number, stake: number): number {
  return outcomePool > 0 ? (stake * pot) / outcomePool : 0;
}
