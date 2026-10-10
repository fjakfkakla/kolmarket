# Marketcoins

**The future of memecoins. Trade the future.** Marché de prédiction style Polymarket sur les KOLs crypto (« Quel KOL fera le plus de profit sur 7 jours ? ») et sur les memecoins (« Premier à toucher 1 Md$ de FDV »), avec 0 % de frais.

**État actuel : interface complète avec données mock.** Les marchés memecoins sont en mock uniquement (pas encore dans Supabase). Aucun backend, aucun smart contract, aucune API : le wallet, le solde et les positions sont simulés côté navigateur (localStorage) pour valider le design et l'UX.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:3000
```

Autres commandes : `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

## Pages

| Route | Contenu |
|---|---|
| `/` | **Landing** : héros 3D (planète WebGL + pièces en orbite), « Trade the KOL » et « Trade the potential of your favorite coin » (vrais écrans de l'app joués au défilement), 0 % de frais, porte vers l'app |
| `/app` | L'application : défi en vedette, filtres (KOL, Memecoins, 7 j, 30 j), défis KOL, marchés memecoins, marchés Oui / Non |
| `/market/kol-top-profit-7d` | Page marché KOL : course au PnL, cotes par KOL, ticket d'achat, podium, carnet d'ordres, activité, règles, wallets |
| `/market/kol-top-profit-30d` | Même chose sur 30 jours |
| `/market/premier-1md-fdv` | Page marché memecoin : probabilités, course à 1 Md$ de FDV, ticket d'achat, règles |
| `/compte` | Mon compte : portefeuille (cash + positions), profit / perte (réalisé, latent, graphique 1J / 1S / 1M / Tout), carte du wallet, positions avec P&L, historique |
| `/comment-ca-marche` | Explication du fonctionnement |
| `/conditions` | Conditions d'utilisation |

## Structure

```
src/data/kols.ts             les 7 KOLs (nom, handle X, wallet Solana, PnL mock, séries)
src/data/markets.ts          les marchés KOL et leurs cotes
src/data/coins.ts            les marchés memecoins (course à 1 Md$ de FDV)
src/lib/wallet.tsx           état wallet simulé (à remplacer par @solana/wallet-adapter)
src/components/              Nav, cartes, graphiques, ticket de trade, modales, podium…
src/components/landing/      la landing : planète WebGL, scènes au défilement, écrans de démonstration
src/app/(landing)/           la landing (/)
src/app/(app)/               l'application (/app, /market, /compte…)
src/app/fonts/               Bricolage Grotesque et Inter, servis en local
public/kols/                 avatars des KOLs
```

## Direction artistique

La DA du projet memescanner (papier clair, objets imprimés, Bricolage pour ce qui est gros,
Inter pour le reste, aucune mono), repeinte au bleu Polymarket `#2e5cff`. Les jetons sont dans
`src/app/globals.css` : la plaque (bouton principal), la pilule blanche sur planche, la planche
bleue, la pièce imprimée, la carte de verre et l'aura.

La landing ne charge aucune bibliothèque d'animation : chaque scène est une piste collée
(`position: sticky`) dont la progression se lit sur son rectangle (`landing/scroll.ts`) ; la
planète est un seul shader WebGL (`landing/Planet.tsx`), avec un repli CSS. Rien ne tourne hors
écran ni onglet caché ; en mouvement réduit, tout est posé.

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

Sans ces variables, le site fonctionne avec les données mock.
