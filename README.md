# Marketcoins

Paris en pot commun sur les KOLs crypto. « Quel KOL fera le plus de profit sur 7 jours ? »

## Fonctionnement

- **Connexion** : n'importe quel wallet Solana (Phantom, Solflare, Backpack… via le Wallet Standard). Le joueur signe un message gratuit, le serveur vérifie la signature et crée le compte. Aucune clé privée ne transite.
- **Pot commun, 0 frais** : toutes les mises d'un marché forment un pot. Ceux qui ont misé sur le KOL gagnant se partagent 100 % du pot au prorata de leur mise. Personne sur le gagnant ou marché annulé : tout le monde est remboursé. La plateforme ne prend aucun risque et n'avance aucun argent.
- **Le % affiché** = part du pot misée sur le KOL. **Cote** = pot ÷ montant misé sur le KOL. Le gain reste une estimation jusqu'à la fermeture des mises (au début du défi). Pas de revente.
- **Plafonds** (`src/lib/limits.ts`) : dépôts jusqu'à 1000 $ sur le compte (solde + mises en cours), 1000 $ max par compte et par marché, retrait minimum 5 $. Les gains au-delà de 1000 $ se gardent.

**État actuel** : connexion réelle (signature + session + compte Supabase). Le solde, les dépôts, retraits et mises sont encore une démo gardée dans le navigateur, par adresse, en attendant le registre et les dépôts USDC.

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
src/lib/wallet.tsx          état du compte : session réelle, solde et mises de démo
src/lib/limits.ts           plafonds (1000 $, mise max, retrait min)
src/lib/pot.ts              calculs du pot commun (cote, gain estimé)
src/components/             Nav, cartes, graphique PnL, panneau de mise, modales, podium…
src/app/                    pages (App Router, Next 16)
public/kols/            avatars des KOLs
```

## Base de données (Supabase)

1. Supabase → SQL Editor → coller et exécuter `supabase/migrations/0001_init.sql`.
2. Puis `supabase/seed/0001_kols_and_markets.sql` (7 KOLs, 30 jours de PnL, 2 défis, quelques mises).
3. Puis `supabase/migrations/0002_accounts.sql` (comptes et sessions). **Obligatoire pour la connexion** dès que Supabase est configuré.
4. Tous les scripts sont rejouables sans danger.

Tables : `kols`, `kol_stats`, `pnl_snapshots`, `markets`, `outcomes`, `trades`, `positions`, `accounts`, `sessions`.
Vues : `market_stats` (volume, pot, joueurs), `kol_pnl_series` (PnL cumulé 30 j).
RLS : lecture publique des données de marché, aucune écriture côté client. `positions`, `accounts` et `sessions` sont invisibles pour `anon` : seul le serveur (service_role) y accède.
`trades` et `positions` datent du modèle Oui/Non : elles seront remplacées par le registre et la table des mises.

## Prochaines étapes

1. ~~Connexion multi-wallets et comptes~~ (fait).
2. **Registre et dépôts** (devnet) : registre comptable en micro-USDC, coffre de la plateforme, dépôts détectés par Alchemy et crédités une seule fois, contrôle « coffre ≥ total des soldes ».
3. **Retraits** : uniquement vers le wallet du compte, plafonds, frais réseau payés par la plateforme.
4. **PnL des KOLs** : cron qui lit le wallet principal de chaque KOL (Solana Tracker + calcul maison pour comparer) et l'écrit dans Supabase.
5. **Mises et résolution** : table des mises, fermeture au début du défi, répartition du pot, remboursements.

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
