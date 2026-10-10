-- Marketcoins · administration : journal des actions signées, origine du résultat
-- À exécuter après 0005_challenges.sql. Idempotente.

-- D'où vient le gagnant proposé : 'auto' (lu chez Solana Tracker) ou 'manual' (décidé dans /admin).
-- Un résultat manuel n'est pas relu avant le paiement : c'est une décision, pas une donnée.
alter table public.markets add column if not exists result_source text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'markets_result_source_check') then
    alter table public.markets add constraint markets_result_source_check
      check (result_source is null or result_source in ('auto','manual'));
  end if;
end $$;

-- Journal des actions d'administration : chacune est signée par le wallet admin.
-- Le nonce est unique : une signature ne peut servir qu'une fois.
create table if not exists public.admin_actions (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  wallet     text not null,
  action     text not null,
  market_id  uuid references public.markets(id),
  details    jsonb,
  nonce      text not null unique,
  signature  text not null,
  outcome    text
);
create index if not exists admin_actions_at_idx on public.admin_actions (at desc);

alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from anon, authenticated;
