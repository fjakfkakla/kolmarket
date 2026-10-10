/** Types partagés entre le serveur (/api/account) et le navigateur. Montants en USDC. */

export type Bet = {
  id: string;
  marketSlug: string;
  marketTitle: string;
  kolId: string;
  kolName: string;
  amount: number;
  createdAt: number;
  /** Mises terminées : gagnée, perdue ou remboursée, et ce qu'elle a rapporté. */
  status?: "OPEN" | "WON" | "LOST" | "REFUNDED";
  payout?: number | null;
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
  /** Mises des défis terminés, les plus récentes d'abord. */
  settled: Bet[];
  activity: Activity[];
  /** Dépôts USDC branchés (Alchemy, coffre, payeur des frais configurés). */
  depositsEnabled: boolean;
};
