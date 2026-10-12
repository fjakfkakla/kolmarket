# Marketcoins

Marché de prédiction sur les KOLs crypto, style Polymarket. « Quel KOL fera le plus de profit sur 7 jours ? »

**État actuel : interface complète avec données mock.** Aucun backend, aucun smart contract, aucune API : le wallet, le solde et les positions sont simulés côté navigateur (localStorage) pour valider le design et l'UX.

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
| `/market/kol-top-profit-7d` | Page marché : course au PnL, cotes par KOL, panneau d'achat, podium, carnet d'ordres, activité, règles, wallets |
| `/market/kol-top-profit-30d` | Même chose sur 30 jours |
| `/compte` | Portefeuille : solde, dépôt / retrait USDC, positions, historique |
| `/comment-ca-marche` | Explication du fonctionnement |
| `/conditions` | Conditions d'utilisation |

## Structure

```
src/data/kols.ts        les 7 KOLs (nom, handle X, wallet Solana, PnL mock, séries)
src/data/markets.ts     les marchés et leurs cotes
src/lib/wallet.tsx      état wallet simulé (à remplacer par @solana/wallet-adapter)
src/components/         Nav, cartes, graphique PnL, panneau de trade, modales, podium…
src/app/                pages (App Router, Next 16)
public/kols/            avatars des KOLs
```

## Base de données (Supabase)

1. Supabase → SQL Editor → coller et exécuter `supabase/migrations/0001_init.sql`.
2. Puis `supabase/seed/0001_kols_and_markets.sql` (7 KOLs, 30 jours de PnL, 2 défis, quelques trades).
3. Les deux scripts sont rejouables sans danger.

Tables : `kols`, `kol_stats`, `pnl_snapshots`, `markets`, `outcomes`, `trades`, `positions`.
Vues : `market_stats` (volume, pool, traders), `kol_pnl_series` (PnL cumulé 30 j).
RLS : lecture publique des données de marché, aucune écriture côté client, `positions` invisible pour `anon`.

## Prochaines étapes

1. **Wallet réel** : `@solana/wallet-adapter-react` + Phantom/Solflare/Backpack, lecture du solde USDC.
2. **Données KOL réelles** : cron qui lit le PnL des wallets (Solana Tracker, Birdeye ou kolscan) et l'écrit dans Supabase.
3. **Smart contract** : programme Anchor parimutuel ou AMM simple, résolution par multisig.
4. **Backend Supabase** : tables `kols`, `markets`, `outcomes`, `pnl_snapshots`, `positions` ; RLS en lecture publique.
5. **Déploiement** : Railway ou Vercel, variables d'environnement pour Supabase et le RPC Solana.

## Variables d'environnement

À définir dans Railway (Variables) ou Vercel (Environment Variables). Voir `.env.example`.

| Variable | Où la trouver | Exposée au navigateur ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | **non, serveur uniquement** |
| `CHRONO` | `NO`, `NOW` ou une date ISO (voir ci-dessous) | non |

**Chrono** (variable `CHRONO` dans Railway) :
- `NO` : chrono figé sur la durée du défi (7 j / 30 j).
- `NOW` : le défi démarre au moment où Railway redéploie et le chrono défile. L'heure de lancement est écrite dans les logs (`[chrono] CHRONO=NOW → lancé le …`). Attention : tout redéploiement ou redémarrage relance le chrono à zéro ; remplacer `NOW` par la date des logs pour la figer.
- une date ISO (ex. `2026-10-20T20:00:00+02:00`) : le défi démarre à cette date.
- absente : dates de la base (ou du mock).

Sans les variables Supabase, le site fonctionne avec les données mock.
