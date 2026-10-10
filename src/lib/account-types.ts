/** Types partagés entre le serveur (/api/account) et le navigateur. Montants en USDC. */

export type Bet = {
  id: string;
  marketSlug: string;
  marketTitle: string;
  kolId: string;
  kolName: string;
  amount: number;
  createdAt: number;
};

export type Activity = {
  id: string;
  type: "DEPOT" | "RETRAIT" | "MISE" | "GAIN" | "REMBOURSEMENT" | "AJUSTEMENT";
  label: string;
  amount: number;
  at: number;
};

export type AccountData = {
  /** Solde jouable. */
  balance: number;
  /** Dépôts au-delà du plafond : retirables, pas jouables. */
  excess: number;
  /** Misé sur des marchés pas encore résolus. */
  inPlay: number;
  bets: Bet[];
  activity: Activity[];
  /** Dépôts USDC branchés (Alchemy, coffre, payeur des frais configurés). */
  depositsEnabled: boolean;
};
