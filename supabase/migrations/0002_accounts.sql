-- Marketcoins · comptes joueurs et sessions (connexion par signature de wallet)
-- À exécuter après 0001_init.sql, dans Supabase → SQL Editor.
-- Idempotente : peut être rejouée sans casser l'existant.

-- ---------------------------------------------------------------
-- Comptes : un compte = une adresse de wallet Solana
-- ---------------------------------------------------------------
create table if not exists public.accounts (
  id                 uuid primary key default gen_random_uuid(),
  wallet             text not null unique,              -- adresse publique (base58) ; les retraits ne partent que vers elle
  wallet_app         text,                              -- dernier wallet utilisé : Phantom, Solflare, Backpack…
  status             text not null default 'ACTIVE' check (status in ('ACTIVE','FROZEN')),
  terms_accepted_at  timestamptz not null default now(),-- case « 18 ans + conditions » cochée à l'inscription
  created_at         timestamptz not null default now(),
  last_login_at      timestamptz not null default now(),
  check (length(wallet) between 32 and 44)
);

-- ---------------------------------------------------------------
-- Sessions : révocables (déconnexion, compte suspect)
-- ---------------------------------------------------------------
create table if not exists public.sessions (
  id          uuid primary key,                         -- identifiant porté par le cookie signé
  account_id  uuid not null references public.accounts(id) on delete cascade,
  nonce       text not null unique,                     -- une signature ne peut ouvrir qu'une seule session
  user_agent  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);
create index if not exists sessions_account_idx on public.sessions (account_id);

-- ---------------------------------------------------------------
-- Sécurité : tables privées. Aucune policy → invisibles pour anon et authenticated.
-- Seul le serveur (clé service_role) les lit et les écrit.
-- ---------------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.sessions enable row level security;
revoke all on public.accounts, public.sessions from anon, authenticated;
