# Marketcoins

Paris en pot commun sur les KOLs crypto. « Quel KOL fera le plus de profit sur 7 jours ? »

## Fonctionnement

- **Connexion** : n'importe quel wallet Solana (Phantom, Solflare, Backpack… via le Wallet Standard). Le joueur signe un message gratuit, le serveur vérifie la signature et crée le compte. Aucune clé privée ne transite.
- **Pot commun, 0 frais** : toutes les mises d'un marché forment un pot. Ceux qui ont misé sur le KOL gagnant se partagent 100 % du pot au prorata de leur mise. Personne sur le gagnant ou marché annulé : tout le monde est remboursé. La plateforme ne prend aucun risque et n'avance aucun argent.
- **Le % affiché** = part du pot misée sur le KOL. **Cote** = pot ÷ montant misé sur le KOL. Le gain reste une estimation jusqu'à la fermeture des mises (au début du défi). Pas de revente.
- **Plafonds** (`src/lib/limits.ts`) : dépôts jusqu'à 1000 $ sur le compte (solde + mises en cours), 1000 $ max par compte et par marché, retrait minimum 5 $. Les gains au-delà de 1000 $ se gardent. Un dépôt envoyé directement au coffre au-delà du plafond est mis de côté (« à retirer ») : il n'est pas jouable.
- **Registre** : chaque mouvement (dépôt, mise, gain, retrait) est une ligne en micro-USDC, jamais modifiée ni effacée. Le solde est la somme des lignes. Toutes les écritures passent par des fonctions SQL sous verrou (pas de double crédit, pas de solde négatif, même avec des requêtes simultanées).
- **Dépôts** : le site prépare la transaction USDC (wallet du joueur → coffre), la plateforme la signe comme payeuse des frais (0 frais pour le joueur), le joueur la signe dans son wallet, le serveur l'envoie. Le crédit n'a lieu que lorsque la transaction est définitive (« finalized »), lue directement sur la chaîne.

**État actuel** :
- Avec Supabase : connexion, solde, dépôts USDC (devnet) et mises sont réels. Les retraits arrivent à l'étape suivante.
- Sans Supabase (dev local) : connexion réelle, mais solde et mises en démo dans le navigateur.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:3000
```

Autres commandes : `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

## Pages

| Route | Contenu |
|---|---|
| `/` | Accueil : défi en vedette, sidebar de filtres (7D / 30D), cartes de marchés, marchés Oui/Non |
| `/market/kol-top-profit-7d` | Page marché : course au PnL, % du pot et cote par KOL, panneau de mise, répartition du pot, podium, activité, règles, wallets |
| `/market/kol-top-profit-30d` | Même chose sur 30 jours |
| `/compte` | Compte : solde, dépôt / retrait USDC, mises en cours et gain estimé, historique |
| `/comment-ca-marche` | Explication du fonctionnement |
| `/conditions` | Conditions d'utilisation |

## Structure

```
src/data/kols.ts            les 7 KOLs (nom, handle X, wallet Solana, PnL mock, séries)
src/data/markets.ts         les marchés et la répartition mock du pot
src/lib/auth.ts             connexion par signature (SIWS), sessions, comptes (serveur)
src/app/api/auth/           nonce → verify → session (GET / DELETE)
src/lib/solana-wallets.ts   détection des wallets (Wallet Standard) et signature côté navigateur
src/lib/wallet.tsx          état du compte côté navigateur (réel via /api/account, ou démo)
src/lib/solana.ts           Solana côté serveur : RPC Alchemy, transaction de dépôt, lecture des transactions du coffre
src/lib/deposits.ts         détection et crédit des dépôts, synchro du coffre, contrôle coffre ≥ engagements
src/lib/account.ts          solde, mises et historique ; placement d'une mise
src/app/api/account/        compte du joueur connecté
src/app/api/deposit/        prepare → submit → status ; info (adresses publiques du coffre)
src/app/api/bets/           placer une mise
src/app/api/webhooks/alchemy/  webhook Alchemy (signal, signé HMAC)
src/app/api/cron/sync/      filet de sécurité planifié (vercel.json : 1×/jour)
src/lib/limits.ts           plafonds (1000 $, mise max, retrait min)
src/lib/pot.ts              calculs du pot commun (cote, gain estimé)
src/components/             Nav, cartes, graphique PnL, panneau de mise, modales, podium…
src/app/                    pages (App Router, Next 16)
public/kols/            avatars des KOLs
```

## Base de données (Supabase)

1. Supabase → SQL Editor → coller et exécuter `supabase/migrations/0001_init.sql`.
2. Puis `supabase/seed/0001_kols_and_markets.sql` (7 KOLs, 30 jours de PnL, 2 défis).
3. Puis `supabase/migrations/0002_accounts.sql` (comptes et sessions). **Obligatoire pour la connexion** dès que Supabase est configuré.
4. Puis `supabase/migrations/0003_ledger.sql` (registre, dépôts, mises, contrôle du coffre). **Obligatoire pour les dépôts et les mises.**
5. Tous les scripts sont rejouables sans danger.

Tables : `kols`, `kol_stats`, `pnl_snapshots`, `markets`, `outcomes`, `accounts`, `sessions`, `vault_signatures`, `ledger_entries`, `bets`, `solvency_checks` (+ `trades`, `positions` de l'ancien modèle Oui/Non, plus utilisées).
Vues publiques : `market_stats` (pot, joueurs), `outcome_pools` (pot par KOL), `recent_bets` (dernières mises, adresse raccourcie), `kol_pnl_series`.
RLS : lecture publique des données de marché et des agrégats, aucune écriture côté client. Comptes, sessions, registre et mises sont invisibles pour `anon`, et les fonctions d'argent (`credit_deposit`, `place_bet`…) ne sont appelables que par le serveur (service_role).
Les pots se remplissent avec les vraies mises : le seed n'en crée plus.

## Prochaines étapes

1. ~~Connexion multi-wallets et comptes~~ (fait).
2. ~~Registre, dépôts (devnet) et mises~~ (fait).
3. **Retraits** : uniquement vers le wallet du compte, plafonds, frais réseau payés par la plateforme.
4. **PnL des KOLs** : cron qui lit le wallet principal de chaque KOL (Solana Tracker + calcul maison pour comparer) et l'écrit dans Supabase.
5. **Résolution** : désigner le gagnant, répartir le pot, rembourser si personne n'a misé sur lui.

## Variables d'environnement

À définir dans Vercel (Settings → Environment Variables), ou Railway (Variables). Voir `.env.example`.
Le site est déployé par Vercel à partir de la branche `main`.

| Variable | Où la trouver | Exposée au navigateur ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | **non, serveur uniquement** |
| `SESSION_SECRET` | à générer : `openssl rand -hex 32` (64 caractères) | **non, serveur uniquement** |
| `APP_URL` | adresse(s) publique(s) du site, ex. `https://marketcoins.app,https://www.marketcoins.app` | non |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` (défaut) ou `mainnet` | oui |

- `SESSION_SECRET` est **obligatoire en production** : sans lui, la connexion est refusée.
- `APP_URL` : les adresses que les joueurs utilisent. L'adresse est écrite dans le message signé, et les requêtes venues d'une autre adresse sont refusées. Les domaines fournis automatiquement par Vercel (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, `VERCEL_BRANCH_URL`) et Railway (`RAILWAY_PUBLIC_DOMAIN`) sont acceptés d'office. Si ton domaine perso a plusieurs variantes (avec et sans `www`), mets-les toutes dans `APP_URL`.
- Sans les variables Supabase, le site fonctionne avec les données mock et la session tient seulement dans le cookie signé.

### Dépôts USDC

| Variable | Contenu | Exposée au navigateur ? |
|---|---|---|
| `ALCHEMY_API` | clé API Alchemy (app Solana, Node API + Webhooks) | **non** |
| `VAULT_ADDRESS` | adresse publique du coffre qui reçoit les dépôts | non |
| `FEE_PAYER_SECRET_KEY` | clé privée du petit wallet qui paie les frais réseau (base58, format export Phantom) | **non, secret** |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | « Signing key » du webhook Alchemy | **non, secret** |
| `CRON_SECRET` | à générer : `openssl rand -hex 16` (Vercel Cron l'envoie tout seul) | **non, secret** |

Sans `ALCHEMY_API`, `VAULT_ADDRESS` et `FEE_PAYER_SECRET_KEY`, le bouton Déposer affiche « pas encore ouverts ».

**Mise en route sur devnet**
1. Dans Phantom, crée deux comptes : « Coffre devnet » et « Frais devnet ». Copie l'adresse du coffre dans `VAULT_ADDRESS`, exporte la clé privée du compte frais dans `FEE_PAYER_SECRET_KEY`. Garde la clé du coffre à part : elle servira aux retraits.
2. Envoie quelques SOL de test au compte frais : https://faucet.solana.com (réseau devnet).
3. Prends des USDC de test pour ton wallet joueur : https://faucet.circle.com (Solana Devnet).
4. Ouvre `https://<ton-site>/api/deposit/info` et copie `vaultUsdcAccount` (le compte USDC du coffre, c'est lui qui reçoit les dépôts). Puis Alchemy → Webhooks → Address Activity, réseau Solana Devnet, adresse = `vaultUsdcAccount`, URL = `https://<ton-site>/api/webhooks/alchemy`. Copie la « Signing key » dans `ALCHEMY_WEBHOOK_SIGNING_KEY`.
   Sans webhook, les dépôts faits avec le bouton sont quand même crédités (le navigateur suit la transaction) ; le webhook sert pour les envois directs au coffre.
5. Pour voir tes USDC de test dans Phantom : Paramètres → Paramètres développeur → Mode testnet → Solana Devnet.

Le payeur des frais ne détient que quelques SOL : s'il est compromis, la perte est limitée à ces SOL. Les USDC des joueurs sont sur le coffre, dont la clé n'est jamais sur le serveur.
