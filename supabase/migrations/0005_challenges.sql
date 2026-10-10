-- Marketcoins · défis : résultats, proposition du gagnant, paiement du pot, remboursements
-- À exécuter après 0004_withdrawals.sql. Idempotente.
--
-- Cycle d'un défi : OPEN (mises jusqu'à closes_at, puis course) → PROPOSED (gagnant affiché,
-- 24 h pour corriger une erreur) → RESOLVED (pot payé) ; ou CANCELLED (toutes les mises remboursées).
-- Les dates de données sont des journées UTC : c'est ainsi que Solana Tracker compte le PnL.

alter table public.markets add column if not exists data_start date;   -- premier jour UTC compté
alter table public.markets add column if not exists data_end   date;   -- dernier jour UTC compté
alter table public.markets add column if not exists proposed_at timestamptz;
alter table public.markets add column if not exists resolution_note text;

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'markets_status_check') then
    alter table public.markets drop constraint markets_status_check;
  end if;
  alter table public.markets add constraint markets_status_check
    check (status in ('DRAFT','OPEN','CLOSED','PROPOSED','RESOLVED','CANCELLED'));
end $$;

-- PnL final de chaque KOL sur la période, tel que lu à la résolution (public : transparence)
create table if not exists public.market_results (
  market_id         uuid not null references public.markets(id) on delete cascade,
  kol_id            text not null references public.kols(id),
  realized_pnl_usd  numeric(18,2),             -- null = donnée indisponible
  days_counted      integer,
  source            text not null default 'solanatracker',
  fetched_at        timestamptz not null default now(),
  primary key (market_id, kol_id)
);

-- Petit stockage clé/valeur pour les tâches planifiées (dernière synchro du PnL…)
create table if not exists public.app_state (
  key         text primary key,
  value       jsonb,
  updated_at  timestamptz not null default now()
);

-- Un gain ou un remboursement de mise ne peut être inscrit qu'une fois par mise.
create unique index if not exists ledger_payout_once on public.ledger_entries (bet_id) where kind = 'PAYOUT';
create unique index if not exists ledger_bet_refund_once on public.ledger_entries (bet_id) where kind = 'REFUND' and bet_id is not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ledger_payout_link') then
    alter table public.ledger_entries add constraint ledger_payout_link
      check (kind <> 'PAYOUT' or (bet_id is not null and amount_micro > 0 and bucket = 'PLAY'));
  end if;
end $$;

-- Propose le gagnant une fois le défi terminé (ou le remplace pendant les 24 h) : relance les 24 h.
create or replace function public.propose_result(p_market uuid, p_winning_kol text, p_note text)
returns boolean
language plpgsql as $$
declare v_outcome uuid;
begin
  select o.id into v_outcome from public.outcomes o where o.market_id = p_market and o.kol_id = p_winning_kol;
  if v_outcome is null then raise exception 'KOL_INCONNU'; end if;
  update public.markets
     set status = 'PROPOSED', winning_outcome_id = v_outcome, proposed_at = now(), resolution_note = p_note
   where id = p_market and status in ('OPEN','CLOSED','PROPOSED') and ends_at <= now();
  return found;
end $$;

-- Rembourse chaque mise encore en jeu d'un marché, sur le solde jouable (usage interne).
create or replace function public.refund_open_bets(p_market uuid)
returns integer
language plpgsql as $$
declare v_count integer := 0; r record;
begin
  for r in select b.id, b.account_id, b.amount_micro from public.bets b
            where b.market_id = p_market and b.status = 'OPEN' order by b.created_at, b.id for update loop
    insert into public.ledger_entries (account_id, kind, bucket, amount_micro, bet_id)
    values (r.account_id, 'REFUND', 'PLAY', r.amount_micro, r.id);
    update public.bets set status = 'REFUNDED', payout_micro = r.amount_micro, settled_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Annule un défi pas encore payé : toutes les mises sont remboursées. Renvoie le statut final.
create or replace function public.cancel_market(p_market uuid, p_reason text)
returns text
language plpgsql as $$
declare v_status text;
begin
  select status into v_status from public.markets where id = p_market for update;
  if v_status is null then raise exception 'MARCHE_INCONNU'; end if;
  if v_status not in ('DRAFT','OPEN','CLOSED','PROPOSED') then return v_status; end if;
  perform public.refund_open_bets(p_market);
  update public.markets
     set status = 'CANCELLED', winning_outcome_id = null, resolved_at = now(), resolution_note = p_reason
   where id = p_market;
  return 'CANCELLED';
end $$;

-- Paie le pot d'un défi proposé depuis au moins p_min_age : les gagnants se partagent 100 % du pot,
-- au prorata de leur mise. Arrondi au micro-USDC par la méthode du plus grand reste : la somme
-- versée est exactement le pot. Personne sur le gagnant : tout le monde est remboursé. Idempotente.
create or replace function public.settle_market(p_market uuid, p_min_age interval)
returns text
language plpgsql as $$
declare
  v_market public.markets%rowtype;
  v_pot    numeric;
  v_win    numeric;
  r        record;
begin
  select * into v_market from public.markets where id = p_market for update;
  if not found then raise exception 'MARCHE_INCONNU'; end if;
  if v_market.status <> 'PROPOSED' then return v_market.status; end if;
  if v_market.proposed_at > now() - p_min_age then return 'PROPOSED'; end if;

  select coalesce(sum(b.amount_micro), 0),
         coalesce(sum(b.amount_micro) filter (where b.outcome_id = v_market.winning_outcome_id), 0)
    into v_pot, v_win
    from public.bets b where b.market_id = p_market and b.status = 'OPEN';

  if v_win = 0 then
    -- Personne n'a misé sur le gagnant (ou aucune mise) : le gagnant reste affiché, les mises reviennent.
    perform public.refund_open_bets(p_market);
    update public.markets set status = 'RESOLVED', resolved_at = now() where id = p_market;
    return 'RESOLVED';
  end if;

  -- Part de chaque mise gagnante : quotient entier de mise × pot / misé sur le gagnant ;
  -- les micro-USDC restants vont un par un aux plus grands restes, puis aux mises les plus anciennes.
  for r in
    with w as (
      select b.id, b.account_id, b.created_at,
             div(b.amount_micro::numeric * v_pot, v_win) as base,
             mod(b.amount_micro::numeric * v_pot, v_win) as rest
        from public.bets b
       where b.market_id = p_market and b.status = 'OPEN' and b.outcome_id = v_market.winning_outcome_id
    ), ranked as (
      select w.*, row_number() over (order by w.rest desc, w.created_at, w.id) as rn,
             v_pot - sum(w.base) over () as leftover
        from w
    )
    select ranked.id, ranked.account_id, (ranked.base + case when ranked.rn <= ranked.leftover then 1 else 0 end)::bigint as share
      from ranked
  loop
    insert into public.ledger_entries (account_id, kind, bucket, amount_micro, bet_id)
    values (r.account_id, 'PAYOUT', 'PLAY', r.share, r.id);
    update public.bets set status = 'WON', payout_micro = r.share, settled_at = now() where id = r.id;
  end loop;

  update public.bets set status = 'LOST', payout_micro = 0, settled_at = now()
   where market_id = p_market and status = 'OPEN';
  update public.markets set status = 'RESOLVED', resolved_at = now() where id = p_market;
  return 'RESOLVED';
end $$;

-- ---------------------------------------------------------------
-- Les deux premiers défis (créés par le seed) passent au calendrier UTC :
-- 7 jours = lundi → dimanche ; 30 jours = mois calendaire. Les mises déjà faites restent attachées.
-- ---------------------------------------------------------------
update public.markets set
  slug = 'kol-7d-2026-10-12',
  title = 'Quel KOL fera le plus de profit du 12 au 18 octobre ?',
  question = 'Quel KOL fera le plus de profit ?',
  data_start = '2026-10-12', data_end = '2026-10-18',
  starts_at = '2026-10-12 00:00:00+00', closes_at = '2026-10-12 00:00:00+00', ends_at = '2026-10-18 23:59:59+00',
  featured = true,
  rules = array[
    'Gagnant : le KOL dont le wallet principal affiche le plus gros PnL réalisé, en USD, du lundi 12 octobre 00:00 au dimanche 18 octobre 23:59, heure UTC.',
    'PnL réalisé : gains et pertes des ventes faites pendant le défi, positions encore ouvertes exclues. Source : Solana Tracker, journée UTC par journée UTC. Les positions jugées suspectes, par exemple des tokens reçus sans achat, comptent pour zéro.',
    'Résultat proposé le lundi 19 octobre vers 12:00 UTC, avec le PnL de chaque KOL. Il est payé 24 h plus tard : ce délai sert à corriger une erreur de données.',
    'Pot commun, 0 frais : ceux qui ont misé sur le KOL gagnant se partagent 100 % du pot, au prorata de leur mise. Si personne n''a misé sur le gagnant, tout le monde est remboursé.',
    'Les mises ferment au début de la période. Pas de revente : chaque mise reste en jeu jusqu''au résultat. Le gain affiché avant la fermeture est une estimation.',
    'Mise maximale : 1000 $ par compte sur ce marché.',
    'En cas d''égalité, de données indisponibles ou incohérentes, le défi est annulé et toutes les mises sont remboursées.'
  ]
where slug = 'kol-top-profit-7d' and data_start is null;

update public.markets set
  slug = 'kol-30d-2026-11',
  title = 'Quel KOL fera le plus de profit en novembre ?',
  question = 'Quel KOL fera le plus de profit ?',
  data_start = '2026-11-01', data_end = '2026-11-30',
  starts_at = '2026-11-01 00:00:00+00', closes_at = '2026-11-01 00:00:00+00', ends_at = '2026-11-30 23:59:59+00',
  featured = false,
  rules = array[
    'Gagnant : le KOL dont le wallet principal affiche le plus gros PnL réalisé, en USD, du dimanche 1er novembre 00:00 au lundi 30 novembre 23:59, heure UTC.',
    'PnL réalisé : gains et pertes des ventes faites pendant le défi, positions encore ouvertes exclues. Source : Solana Tracker, journée UTC par journée UTC. Les positions jugées suspectes, par exemple des tokens reçus sans achat, comptent pour zéro.',
    'Résultat proposé le mardi 1er décembre vers 12:00 UTC, avec le PnL de chaque KOL. Il est payé 24 h plus tard : ce délai sert à corriger une erreur de données.',
    'Pot commun, 0 frais : ceux qui ont misé sur le KOL gagnant se partagent 100 % du pot, au prorata de leur mise. Si personne n''a misé sur le gagnant, tout le monde est remboursé.',
    'Les mises ferment au début de la période. Pas de revente : chaque mise reste en jeu jusqu''au résultat. Le gain affiché avant la fermeture est une estimation.',
    'Mise maximale : 1000 $ par compte sur ce marché.',
    'En cas d''égalité, de données indisponibles ou incohérentes, le défi est annulé et toutes les mises sont remboursées.'
  ]
where slug = 'kol-top-profit-30d' and data_start is null;

-- ---------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------
alter table public.market_results enable row level security;
alter table public.app_state      enable row level security;
drop policy if exists "market_results_public_read" on public.market_results;
create policy "market_results_public_read" on public.market_results for select to anon, authenticated using (true);
grant select on public.market_results to anon, authenticated;
revoke insert, update, delete on public.market_results from anon, authenticated;
revoke all on public.app_state from anon, authenticated;
revoke all on function public.propose_result(uuid, text, text) from public, anon, authenticated;
revoke all on function public.refund_open_bets(uuid) from public, anon, authenticated;
revoke all on function public.cancel_market(uuid, text) from public, anon, authenticated;
revoke all on function public.settle_market(uuid, interval) from public, anon, authenticated;
grant execute on function public.propose_result(uuid, text, text) to service_role;
grant execute on function public.refund_open_bets(uuid) to service_role;
grant execute on function public.cancel_market(uuid, text) to service_role;
grant execute on function public.settle_market(uuid, interval) to service_role;
