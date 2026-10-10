-- Marketcoins · migration initiale
-- À exécuter dans Supabase → SQL Editor (ou `supabase db push`).
-- Idempotente : peut être rejouée sans casser l'existant.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- KOLs suivis
-- ---------------------------------------------------------------
create table if not exists public.kols (
  id          text primary key,                 -- slug stable : 'cooker'
  name        text not null,
  handle      text not null,                    -- handle X sans @
  wallet      text not null unique,             -- adresse Solana publique
  avatar_url  text,                             -- /kols/cooker.jpg ou URL
  color       text not null default '#f7b801', -- couleur des courbes
  telegram    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Statistiques agrégées par période, recalculées par le cron
create table if not exists public.kol_stats (
  kol_id      text not null references public.kols(id) on delete cascade,
  period      text not null check (period in ('7D','30D')),
  pnl_usd     numeric(18,2) not null default 0,
  volume_usd  numeric(18,2) not null default 0,
  win_rate    numeric(5,2),
  trades      integer,
  updated_at  timestamptz not null default now(),
  primary key (kol_id, period)
);

-- PnL réalisé par jour et par wallet (source des courbes et de la résolution)
create table if not exists public.pnl_snapshots (
  id            bigint generated always as identity primary key,
  kol_id        text not null references public.kols(id) on delete cascade,
  snapshot_date date not null,
  realized_pnl_usd numeric(18,2) not null default 0,  -- PnL réalisé CE jour-là
  volume_usd    numeric(18,2) not null default 0,
  source        text not null default 'manual',       -- 'solanatracker', 'birdeye', 'kolscan'…
  created_at    timestamptz not null default now(),
  unique (kol_id, snapshot_date)
);
create index if not exists pnl_snapshots_kol_date_idx on public.pnl_snapshots (kol_id, snapshot_date desc);

-- ---------------------------------------------------------------
-- Marchés
-- ---------------------------------------------------------------
create table if not exists public.markets (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  question      text not null,
  category      text not null default 'KOL',
  period        text not null check (period in ('7D','30D')),
  challenge_no  integer,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  closes_at     timestamptz not null,                 -- fermeture des mises
  status        text not null default 'OPEN'
                check (status in ('DRAFT','OPEN','CLOSED','RESOLVED','CANCELLED')),
  rules         text[] not null default '{}',
  featured      boolean not null default false,
  winning_outcome_id uuid,                            -- fk ajoutée plus bas
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (closes_at <= ends_at)
);

create table if not exists public.outcomes (
  id          uuid primary key default gen_random_uuid(),
  market_id   uuid not null references public.markets(id) on delete cascade,
  kol_id      text not null references public.kols(id),
  position    integer not null default 0,
  prob        numeric(6,5) not null default 0 check (prob >= 0 and prob <= 1),
  change_24h  numeric(6,2) not null default 0,       -- variation en points
  updated_at  timestamptz not null default now(),
  unique (market_id, kol_id)
);
create index if not exists outcomes_market_idx on public.outcomes (market_id, position);

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'markets_winning_outcome_fk'
  ) then
    alter table public.markets
      add constraint markets_winning_outcome_fk
      foreign key (winning_outcome_id) references public.outcomes(id);
  end if;
end $$;

-- ---------------------------------------------------------------
-- Trades et positions (écrits uniquement par le serveur)
-- ---------------------------------------------------------------
create table if not exists public.trades (
  id            uuid primary key default gen_random_uuid(),
  wallet        text not null,
  market_id     uuid not null references public.markets(id),
  outcome_id    uuid not null references public.outcomes(id),
  side          text not null check (side in ('OUI','NON')),
  kind          text not null check (kind in ('BUY','SELL')),
  shares        numeric(18,4) not null check (shares > 0),
  price         numeric(6,5) not null check (price > 0 and price < 1),
  amount_usd    numeric(18,2) not null check (amount_usd > 0),
  fee_usd       numeric(18,2) not null default 0,
  tx_signature  text unique,                          -- signature Solana
  created_at    timestamptz not null default now()
);
create index if not exists trades_market_created_idx on public.trades (market_id, created_at desc);
create index if not exists trades_wallet_idx on public.trades (wallet);

create table if not exists public.positions (
  id            uuid primary key default gen_random_uuid(),
  wallet        text not null,
  market_id     uuid not null references public.markets(id),
  outcome_id    uuid not null references public.outcomes(id),
  side          text not null check (side in ('OUI','NON')),
  shares        numeric(18,4) not null check (shares >= 0),
  avg_price     numeric(6,5) not null,
  status        text not null default 'OPEN' check (status in ('OPEN','SOLD','SETTLED')),
  payout_usd    numeric(18,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (wallet, outcome_id, side)
);
create index if not exists positions_wallet_idx on public.positions (wallet);
create index if not exists positions_market_idx on public.positions (market_id);

-- ---------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ declare t text;
begin
  foreach t in array array['markets','outcomes','positions'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_set_updated_at') then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Vues de lecture
-- ---------------------------------------------------------------
-- Volume, pool et nombre de traders par marché
create or replace view public.market_stats as
select
  m.id as market_id,
  coalesce(sum(t.amount_usd), 0)::numeric(18,2)  as volume_usd,
  coalesce(sum(case when t.kind = 'BUY' then t.amount_usd else -t.amount_usd end), 0)::numeric(18,2) as pool_usd,
  count(distinct t.wallet)                        as traders
from public.markets m
left join public.trades t on t.market_id = m.id
group by m.id;

-- Série cumulée de PnL par KOL sur les 30 derniers jours (pour les graphiques)
create or replace view public.kol_pnl_series as
select
  kol_id,
  snapshot_date,
  realized_pnl_usd,
  sum(realized_pnl_usd) over (partition by kol_id order by snapshot_date) as cumulative_pnl_usd
from public.pnl_snapshots
where snapshot_date >= current_date - interval '30 days';

-- ---------------------------------------------------------------
-- Row Level Security
-- Lecture publique des données de marché ; AUCUNE écriture côté client.
-- Toutes les écritures passent par le serveur avec la clé service_role.
-- ---------------------------------------------------------------
alter table public.kols          enable row level security;
alter table public.kol_stats     enable row level security;
alter table public.pnl_snapshots enable row level security;
alter table public.markets       enable row level security;
alter table public.outcomes      enable row level security;
alter table public.trades        enable row level security;
alter table public.positions     enable row level security;

drop policy if exists "kols_public_read"      on public.kols;
drop policy if exists "kol_stats_public_read" on public.kol_stats;
drop policy if exists "pnl_public_read"       on public.pnl_snapshots;
drop policy if exists "markets_public_read"   on public.markets;
drop policy if exists "outcomes_public_read"  on public.outcomes;
drop policy if exists "trades_public_read"    on public.trades;

create policy "kols_public_read"      on public.kols          for select to anon, authenticated using (active);
create policy "kol_stats_public_read" on public.kol_stats     for select to anon, authenticated using (true);
create policy "pnl_public_read"       on public.pnl_snapshots for select to anon, authenticated using (true);
create policy "markets_public_read"   on public.markets       for select to anon, authenticated using (status <> 'DRAFT');
create policy "outcomes_public_read"  on public.outcomes      for select to anon, authenticated using (true);
-- Les trades sont publics (comme sur Polymarket : wallets déjà visibles on-chain)
create policy "trades_public_read"    on public.trades        for select to anon, authenticated using (true);
-- positions : aucune policy → invisible pour anon. Lecture via le serveur (service_role) uniquement.

-- Sécurité par défaut : retirer les droits d'écriture au rôle anon
revoke insert, update, delete on all tables in schema public from anon, authenticated;
