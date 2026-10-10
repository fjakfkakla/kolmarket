-- Marketcoins · registre comptable, dépôts USDC et mises en pot commun
-- À exécuter après 0002_accounts.sql. Idempotente.
--
-- Montants en micro-USDC (6 décimales) : 1 USDC = 1 000 000. Jamais de nombres à virgule.
-- Le solde d'un joueur n'est jamais stocké : c'est la somme de ses lignes de registre.
-- Les plafonds (1000 USDC…) sont passés par le serveur depuis src/lib/limits.ts.

-- ---------------------------------------------------------------
-- Transactions vues sur le compte USDC du coffre
-- Une signature = une transaction Solana. Chaque dépôt n'est crédité qu'une fois.
-- ---------------------------------------------------------------
create table if not exists public.vault_signatures (
  signature     text primary key,
  status        text not null default 'PENDING'
                check (status in ('PENDING','CREDITED','UNMATCHED','IGNORED','FAILED','DROPPED')),
  -- PENDING   : vue, pas encore définitive (« finalized »)
  -- CREDITED  : dépôt crédité au compte de l'expéditeur
  -- UNMATCHED : USDC reçus d'un wallet sans compte → à rembourser à la main
  -- IGNORED   : pas un dépôt (sortie du coffre, autre token…)
  -- FAILED    : transaction échouée on-chain ; DROPPED : jamais arrivée
  account_id    uuid references public.accounts(id),
  sender        text,
  amount_micro  bigint,
  play_micro    bigint,       -- part créditée en solde jouable
  excess_micro  bigint,       -- part au-delà du plafond : retirable seulement
  slot          bigint,
  block_time    timestamptz,
  first_seen_at timestamptz not null default now(),
  processed_at  timestamptz
);
create index if not exists vault_signatures_pending_idx on public.vault_signatures (first_seen_at) where status = 'PENDING';

-- ---------------------------------------------------------------
-- Mises
-- ---------------------------------------------------------------
create table if not exists public.bets (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id),
  market_id     uuid not null references public.markets(id),
  outcome_id    uuid not null references public.outcomes(id),
  amount_micro  bigint not null check (amount_micro > 0),
  status        text not null default 'OPEN' check (status in ('OPEN','WON','LOST','REFUNDED')),
  payout_micro  bigint,
  created_at    timestamptz not null default now(),
  settled_at    timestamptz
);
create index if not exists bets_account_idx on public.bets (account_id, created_at desc);
create index if not exists bets_market_idx on public.bets (market_id, outcome_id);

-- ---------------------------------------------------------------
-- Registre : une ligne par mouvement, jamais modifiée ni effacée
-- ---------------------------------------------------------------
create table if not exists public.ledger_entries (
  id            bigint generated always as identity primary key,
  account_id    uuid not null references public.accounts(id),
  kind          text not null check (kind in ('DEPOSIT','WITHDRAWAL','BET','PAYOUT','REFUND','ADJUSTMENT')),
  bucket        text not null default 'PLAY' check (bucket in ('PLAY','EXCESS')),
  -- PLAY   : solde jouable
  -- EXCESS : dépôt au-delà du plafond, retirable mais pas jouable
  amount_micro  bigint not null check (amount_micro <> 0),   -- + crédit, − débit
  signature     text references public.vault_signatures(signature),
  bet_id        uuid references public.bets(id),
  created_at    timestamptz not null default now(),
  check (kind <> 'DEPOSIT' or (signature is not null and amount_micro > 0)),
  check (kind <> 'BET' or (bet_id is not null and amount_micro < 0 and bucket = 'PLAY'))
);
create index if not exists ledger_account_idx on public.ledger_entries (account_id, created_at desc);
-- Filets de sécurité : un dépôt ne peut être crédité qu'une fois, une mise débitée qu'une fois.
create unique index if not exists ledger_deposit_once on public.ledger_entries (signature, bucket) where kind = 'DEPOSIT';
create unique index if not exists ledger_bet_once on public.ledger_entries (bet_id) where kind = 'BET';

create or replace function public.ledger_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger_entries est en ajout seul : corriger avec une ligne ADJUSTMENT';
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'ledger_entries_append_only') then
    create trigger ledger_entries_append_only before update or delete on public.ledger_entries
      for each row execute function public.ledger_append_only();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ledger_entries_no_truncate') then
    create trigger ledger_entries_no_truncate before truncate on public.ledger_entries
      for each statement execute function public.ledger_append_only();
  end if;
end $$;

-- ---------------------------------------------------------------
-- Contrôle du coffre : USDC détenus ≥ ce que la plateforme doit aux joueurs
-- ---------------------------------------------------------------
create table if not exists public.solvency_checks (
  id                 bigint generated always as identity primary key,
  checked_at         timestamptz not null default now(),
  vault_micro        bigint not null,
  liabilities_micro  bigint not null,
  ok                 boolean not null
);

-- ---------------------------------------------------------------
-- Fonctions (appelées uniquement par le serveur, clé service_role)
-- ---------------------------------------------------------------

-- Solde d'un compte : jouable, au-delà du plafond, et misé sur des marchés pas encore résolus.
create or replace function public.account_balance(p_account uuid)
returns table (play_micro bigint, excess_micro bigint, in_play_micro bigint)
language sql stable as $$
  select
    coalesce((select sum(amount_micro) from public.ledger_entries where account_id = p_account and bucket = 'PLAY'), 0)::bigint,
    coalesce((select sum(amount_micro) from public.ledger_entries where account_id = p_account and bucket = 'EXCESS'), 0)::bigint,
    coalesce((select sum(amount_micro) from public.bets where account_id = p_account and status = 'OPEN'), 0)::bigint
$$;

-- Ce que la plateforme doit : tous les soldes + les mises encore dans les pots.
create or replace function public.liabilities_micro()
returns bigint language sql stable as $$
  select (coalesce((select sum(amount_micro) from public.ledger_entries), 0)
        + coalesce((select sum(amount_micro) from public.bets where status = 'OPEN'), 0))::bigint
$$;

-- Crédite un dépôt définitif. Idempotente : rappeler avec la même signature ne crédite jamais deux fois.
-- Jusqu'au plafond, le dépôt va en solde jouable ; au-delà, en EXCESS (retirable seulement).
create or replace function public.credit_deposit(
  p_signature text, p_sender text, p_amount bigint, p_slot bigint, p_block_time timestamptz, p_cap bigint
) returns text
language plpgsql as $$
declare
  v_status  text;
  v_account uuid;
  v_play    bigint;
  v_in_play bigint;
  v_to_play bigint;
  v_excess  bigint;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'MONTANT_INVALIDE'; end if;

  insert into public.vault_signatures (signature) values (p_signature) on conflict do nothing;
  select status into v_status from public.vault_signatures where signature = p_signature for update;
  if v_status <> 'PENDING' then return v_status; end if;

  -- Verrou sur le compte : dépôts, mises et retraits d'un même joueur passent l'un après l'autre.
  select id into v_account from public.accounts where wallet = p_sender for update;
  if v_account is null then
    update public.vault_signatures
       set status = 'UNMATCHED', sender = p_sender, amount_micro = p_amount, slot = p_slot,
           block_time = p_block_time, processed_at = now()
     where signature = p_signature;
    return 'UNMATCHED';
  end if;

  select b.play_micro, b.in_play_micro into v_play, v_in_play from public.account_balance(v_account) b;
  v_to_play := least(p_amount, greatest(0, p_cap - v_play - v_in_play));
  v_excess  := p_amount - v_to_play;

  if v_to_play > 0 then
    insert into public.ledger_entries (account_id, kind, bucket, amount_micro, signature)
    values (v_account, 'DEPOSIT', 'PLAY', v_to_play, p_signature);
  end if;
  if v_excess > 0 then
    insert into public.ledger_entries (account_id, kind, bucket, amount_micro, signature)
    values (v_account, 'DEPOSIT', 'EXCESS', v_excess, p_signature);
  end if;

  update public.vault_signatures
     set status = 'CREDITED', account_id = v_account, sender = p_sender, amount_micro = p_amount,
         play_micro = v_to_play, excess_micro = v_excess, slot = p_slot, block_time = p_block_time,
         processed_at = now()
   where signature = p_signature;
  return 'CREDITED';
end $$;

-- Classe une transaction du coffre qui n'est pas un dépôt à créditer (sortie, échec, jamais arrivée).
create or replace function public.mark_signature(p_signature text, p_status text, p_slot bigint, p_block_time timestamptz)
returns text
language plpgsql as $$
declare v_status text;
begin
  if p_status not in ('IGNORED','FAILED','DROPPED') then raise exception 'STATUT_INVALIDE'; end if;
  insert into public.vault_signatures (signature) values (p_signature) on conflict do nothing;
  update public.vault_signatures
     set status = p_status, slot = p_slot, block_time = p_block_time, processed_at = now()
   where signature = p_signature and status = 'PENDING'
  returning status into v_status;
  return coalesce(v_status, (select status from public.vault_signatures where signature = p_signature));
end $$;

-- Place une mise : vérifie tout sous verrou, puis inscrit la mise et son débit ensemble.
-- Erreurs : COMPTE_BLOQUE, MARCHE_INCONNU, MISES_FERMEES, KOL_INCONNU, MISE_TROP_PETITE,
--           PLAFOND_MARCHE (detail = ce qu'il reste possible, en micro-USDC), SOLDE_INSUFFISANT.
create or replace function public.place_bet(
  p_account uuid, p_market_slug text, p_kol_id text, p_amount bigint, p_min bigint, p_max_per_market bigint
) returns uuid
language plpgsql as $$
declare
  v_market  public.markets%rowtype;
  v_outcome uuid;
  v_staked  bigint;
  v_play    bigint;
  v_bet     uuid;
begin
  perform 1 from public.accounts where id = p_account and status = 'ACTIVE' for update;
  if not found then raise exception 'COMPTE_BLOQUE'; end if;

  select * into v_market from public.markets where slug = p_market_slug;
  if not found then raise exception 'MARCHE_INCONNU'; end if;
  if v_market.status <> 'OPEN' or now() >= v_market.closes_at then raise exception 'MISES_FERMEES'; end if;

  select id into v_outcome from public.outcomes where market_id = v_market.id and kol_id = p_kol_id;
  if v_outcome is null then raise exception 'KOL_INCONNU'; end if;
  if p_amount is null or p_amount < p_min then raise exception 'MISE_TROP_PETITE'; end if;

  select coalesce(sum(amount_micro), 0) into v_staked
    from public.bets where account_id = p_account and market_id = v_market.id and status <> 'REFUNDED';
  if v_staked + p_amount > p_max_per_market then
    raise exception 'PLAFOND_MARCHE' using detail = greatest(0, p_max_per_market - v_staked)::text;
  end if;

  select coalesce(sum(amount_micro), 0) into v_play
    from public.ledger_entries where account_id = p_account and bucket = 'PLAY';
  if v_play < p_amount then raise exception 'SOLDE_INSUFFISANT'; end if;

  insert into public.bets (account_id, market_id, outcome_id, amount_micro)
  values (p_account, v_market.id, v_outcome, p_amount)
  returning id into v_bet;
  insert into public.ledger_entries (account_id, kind, bucket, amount_micro, bet_id)
  values (p_account, 'BET', 'PLAY', -p_amount, v_bet);
  return v_bet;
end $$;

-- ---------------------------------------------------------------
-- Vues publiques (agrégats, aucune donnée de compte)
-- ---------------------------------------------------------------

-- Pot de chaque KOL dans chaque marché
create or replace view public.outcome_pools as
select o.market_id, o.id as outcome_id, o.kol_id,
       coalesce(sum(b.amount_micro) filter (where b.status <> 'REFUNDED'), 0)::bigint as pool_micro
from public.outcomes o
left join public.bets b on b.outcome_id = o.id
group by o.market_id, o.id, o.kol_id;

-- Pot total et nombre de joueurs par marché (remplace l'ancien calcul sur `trades`)
create or replace view public.market_stats as
select
  m.id as market_id,
  (coalesce(sum(b.amount_micro), 0) / 1000000.0)::numeric(18,2) as volume_usd,
  (coalesce(sum(b.amount_micro) filter (where b.status <> 'REFUNDED'), 0) / 1000000.0)::numeric(18,2) as pool_usd,
  count(distinct b.account_id) as traders
from public.markets m
left join public.bets b on b.market_id = m.id
group by m.id;

-- Dernières mises, adresse raccourcie (les adresses sont de toute façon publiques on-chain)
create or replace view public.recent_bets as
select b.id, b.market_id, o.kol_id, b.amount_micro, b.created_at,
       left(a.wallet, 4) || '…' || right(a.wallet, 4) as wallet_short
from public.bets b
join public.outcomes o on o.id = b.outcome_id
join public.accounts a on a.id = b.account_id
where b.status <> 'REFUNDED';

-- ---------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------
alter table public.vault_signatures enable row level security;
alter table public.bets             enable row level security;
alter table public.ledger_entries   enable row level security;
alter table public.solvency_checks  enable row level security;
revoke all on public.vault_signatures, public.bets, public.ledger_entries, public.solvency_checks from anon, authenticated;

-- Les fonctions qui touchent à l'argent ne sont appelables que par le serveur.
revoke all on function public.account_balance(uuid) from public, anon, authenticated;
revoke all on function public.liabilities_micro() from public, anon, authenticated;
revoke all on function public.credit_deposit(text, text, bigint, bigint, timestamptz, bigint) from public, anon, authenticated;
revoke all on function public.mark_signature(text, text, bigint, timestamptz) from public, anon, authenticated;
revoke all on function public.place_bet(uuid, text, text, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.ledger_append_only() from public, anon, authenticated;
grant execute on function public.account_balance(uuid) to service_role;
grant execute on function public.liabilities_micro() to service_role;
grant execute on function public.credit_deposit(text, text, bigint, bigint, timestamptz, bigint) to service_role;
grant execute on function public.mark_signature(text, text, bigint, timestamptz) to service_role;
grant execute on function public.place_bet(uuid, text, text, bigint, bigint, bigint) to service_role;

-- Les vues agrégées sont lisibles par tous (comme les données de marché).
grant select on public.outcome_pools, public.market_stats, public.recent_bets to anon, authenticated;
