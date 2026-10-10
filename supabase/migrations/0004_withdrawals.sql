-- Marketcoins · retraits USDC
-- À exécuter après 0003_ledger.sql. Idempotente.
--
-- Un retrait débite le registre tout de suite (l'argent ne peut plus être misé), puis le serveur
-- envoie les USDC depuis le wallet chaud vers le wallet du compte, et seulement celui-là.
-- La signature de la transaction est enregistrée AVANT l'envoi : si le serveur plante, on sait
-- toujours si l'argent est parti, et on ne renvoie qu'une fois l'ancienne transaction expirée.

create table if not exists public.withdrawals (
  id                      uuid primary key default gen_random_uuid(),
  account_id              uuid not null references public.accounts(id),
  destination             text not null,              -- toujours le wallet du compte
  amount_micro            bigint not null check (amount_micro > 0),
  status                  text not null default 'QUEUED'
                          check (status in ('REVIEW','QUEUED','SENDING','CONFIRMED','REFUNDED')),
  -- REVIEW    : montant inhabituel, à valider à la main (passer en QUEUED, ou refund_withdrawal)
  -- QUEUED    : à envoyer (ou en attente que le wallet chaud soit réapprovisionné)
  -- SENDING   : transaction signée et envoyée, en attente de confirmation
  -- CONFIRMED : USDC arrivés, définitif
  -- REFUNDED  : annulé, montant recrédité au compte
  signature               text unique,
  last_valid_block_height bigint,
  attempts                integer not null default 0,
  last_error              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  confirmed_at            timestamptz
);
create index if not exists withdrawals_account_idx on public.withdrawals (account_id, created_at desc);
create index if not exists withdrawals_open_idx on public.withdrawals (created_at) where status in ('QUEUED','SENDING');

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'withdrawals_set_updated_at') then
    create trigger withdrawals_set_updated_at before update on public.withdrawals
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- Lien registre → retrait (débit, et remboursement éventuel)
alter table public.ledger_entries add column if not exists withdrawal_id uuid references public.withdrawals(id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ledger_withdrawal_link') then
    alter table public.ledger_entries add constraint ledger_withdrawal_link
      check (kind <> 'WITHDRAWAL' or (withdrawal_id is not null and amount_micro < 0));
  end if;
end $$;
create unique index if not exists ledger_withdrawal_once on public.ledger_entries (withdrawal_id, bucket) where kind = 'WITHDRAWAL';
create unique index if not exists ledger_withdrawal_refund_once on public.ledger_entries (withdrawal_id, bucket) where kind = 'REFUND' and withdrawal_id is not null;

-- Le contrôle du coffre compte aussi la réserve des retraits (wallet chaud).
alter table public.solvency_checks add column if not exists hot_micro bigint not null default 0;

-- Ce que la plateforme doit : soldes + mises dans les pots + retraits débités mais pas encore arrivés.
create or replace function public.liabilities_micro()
returns bigint language sql stable as $$
  select (coalesce((select sum(amount_micro) from public.ledger_entries), 0)
        + coalesce((select sum(amount_micro) from public.bets where status = 'OPEN'), 0)
        + coalesce((select sum(amount_micro) from public.withdrawals where status in ('REVIEW','QUEUED','SENDING')), 0))::bigint
$$;

-- Demande de retrait. Prend d'abord dans la part « au-delà du plafond », puis dans le solde jouable.
-- Erreurs : COMPTE_BLOQUE, RETRAIT_TROP_PETIT, SOLDE_INSUFFISANT.
create or replace function public.request_withdrawal(
  p_account uuid, p_amount bigint, p_min bigint, p_review_above bigint, p_platform_daily bigint
) returns table (id uuid, status text)
language plpgsql as $$
declare
  v_wallet text;
  v_play   bigint;
  v_excess bigint;
  v_from_excess bigint;
  v_daily  bigint;
  v_status text;
  v_id     uuid;
begin
  -- Un seul retrait traité à la fois sur toute la plateforme : le plafond journalier reste exact.
  perform pg_advisory_xact_lock(hashtext('marketcoins.withdrawals'));

  select a.wallet into v_wallet from public.accounts a where a.id = p_account and a.status = 'ACTIVE' for update;
  if v_wallet is null then raise exception 'COMPTE_BLOQUE'; end if;
  if p_amount is null or p_amount < p_min then raise exception 'RETRAIT_TROP_PETIT'; end if;

  select b.play_micro, b.excess_micro into v_play, v_excess from public.account_balance(p_account) b;
  if p_amount > v_play + v_excess then raise exception 'SOLDE_INSUFFISANT'; end if;
  v_from_excess := least(p_amount, greatest(v_excess, 0));

  select coalesce(sum(w.amount_micro), 0) into v_daily
    from public.withdrawals w
   where w.created_at > now() - interval '24 hours' and w.status <> 'REFUNDED';
  v_status := case when p_amount > p_review_above or v_daily + p_amount > p_platform_daily then 'REVIEW' else 'QUEUED' end;

  insert into public.withdrawals (account_id, destination, amount_micro, status)
  values (p_account, v_wallet, p_amount, v_status)
  returning withdrawals.id into v_id;

  if v_from_excess > 0 then
    insert into public.ledger_entries (account_id, kind, bucket, amount_micro, withdrawal_id)
    values (p_account, 'WITHDRAWAL', 'EXCESS', -v_from_excess, v_id);
  end if;
  if p_amount - v_from_excess > 0 then
    insert into public.ledger_entries (account_id, kind, bucket, amount_micro, withdrawal_id)
    values (p_account, 'WITHDRAWAL', 'PLAY', -(p_amount - v_from_excess), v_id);
  end if;

  return query select v_id, v_status;
end $$;

-- Réserve l'envoi : passe en SENDING avec la signature de la nouvelle transaction, seulement si
-- personne d'autre ne l'a fait entre-temps (comparaison avec la signature précédente).
create or replace function public.mark_withdrawal_sending(
  p_id uuid, p_prev_signature text, p_signature text, p_last_valid_block_height bigint
) returns boolean
language plpgsql as $$
begin
  update public.withdrawals
     set status = 'SENDING', signature = p_signature, last_valid_block_height = p_last_valid_block_height,
         attempts = attempts + 1, last_error = null
   where id = p_id
     and status in ('QUEUED','SENDING')
     and signature is not distinct from p_prev_signature;
  return found;
end $$;

-- Remet en file une transaction qui n'est jamais arrivée (blockhash expiré) ou a échoué on-chain.
create or replace function public.requeue_withdrawal(p_id uuid, p_signature text, p_error text)
returns boolean
language plpgsql as $$
begin
  update public.withdrawals
     set status = 'QUEUED', signature = null, last_valid_block_height = null, last_error = p_error
   where id = p_id and status = 'SENDING' and signature = p_signature;
  return found;
end $$;

create or replace function public.confirm_withdrawal(p_id uuid, p_signature text)
returns boolean
language plpgsql as $$
begin
  update public.withdrawals
     set status = 'CONFIRMED', confirmed_at = now(), last_error = null
   where id = p_id and status = 'SENDING' and signature = p_signature;
  return found;
end $$;

-- Annule un retrait pas encore parti (refus après vérification, par exemple) et recrédite le compte.
create or replace function public.refund_withdrawal(p_id uuid, p_reason text)
returns boolean
language plpgsql as $$
declare v_account uuid;
begin
  select w.account_id into v_account from public.withdrawals w
   where w.id = p_id and w.status in ('REVIEW','QUEUED') for update;
  if v_account is null then return false; end if;
  perform 1 from public.accounts where id = v_account for update;
  insert into public.ledger_entries (account_id, kind, bucket, amount_micro, withdrawal_id)
  select l.account_id, 'REFUND', l.bucket, -l.amount_micro, p_id
    from public.ledger_entries l where l.withdrawal_id = p_id and l.kind = 'WITHDRAWAL';
  update public.withdrawals set status = 'REFUNDED', last_error = p_reason where id = p_id;
  return true;
end $$;

-- Sécurité
alter table public.withdrawals enable row level security;
revoke all on public.withdrawals from anon, authenticated;
revoke all on function public.request_withdrawal(uuid, bigint, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.mark_withdrawal_sending(uuid, text, text, bigint) from public, anon, authenticated;
revoke all on function public.requeue_withdrawal(uuid, text, text) from public, anon, authenticated;
revoke all on function public.confirm_withdrawal(uuid, text) from public, anon, authenticated;
revoke all on function public.refund_withdrawal(uuid, text) from public, anon, authenticated;
revoke all on function public.liabilities_micro() from public, anon, authenticated;
grant execute on function public.request_withdrawal(uuid, bigint, bigint, bigint, bigint) to service_role;
grant execute on function public.mark_withdrawal_sending(uuid, text, text, bigint) to service_role;
grant execute on function public.requeue_withdrawal(uuid, text, text) to service_role;
grant execute on function public.confirm_withdrawal(uuid, text) to service_role;
grant execute on function public.refund_withdrawal(uuid, text) to service_role;
grant execute on function public.liabilities_micro() to service_role;
