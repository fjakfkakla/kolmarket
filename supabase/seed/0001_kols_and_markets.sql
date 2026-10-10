-- Marketcoins · seed : 7 KOLs, stats et 30 jours de PnL de démonstration.
-- À exécuter APRÈS 0001_init.sql. Rejouable (upserts).
-- Les stats et le PnL de démo sont remplacés par les vrais chiffres (Solana Tracker) à la première synchro.

-- ---------------------------------------------------------------
-- KOLs
-- ---------------------------------------------------------------
insert into public.kols (id, name, handle, wallet, avatar_url, color, telegram) values
  ('cooker',     'Cooker',   'CookerFlips', '8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6', '/kols/cooker.jpg',     '#f59e0b', 'https://t.me/CookersCooks'),
  ('cented',     'Cented',   'Cented7',     'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o', '/kols/cented.jpg',     '#3b82f6', null),
  ('decu',       'decu',     'notdecu',     '4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9', '/kols/decu.jpg',       '#8b5cf6', 'https://t.me/DecusCalls'),
  ('chester',    'chester',  'Chestererer', 'PMJA8UQDyWTFw2Smhyp9jGA6aTaP7jKHR7BPudrgyYN', '/kols/chester.jpg',    '#10b981', null),
  ('blu6k',      'blu6k',    'blu6k',       '8Ltv5royXzxVG3tAhVhRnfXrzapS5Dwqt1ocxprgu6YP', '/kols/blu6k.jpg',      '#06b6d4', null),
  ('zeropnl',    'zeropnl',  'zeropnl',     '4xY9T1Q7foJzJsJ6YZDSsfp9zkzeZsXnxd45SixduMmr', '/kols/zeropnl.jpg',    '#ef4444', null),
  ('trustnoest', 'trunoest', 'trunoest',    'ardinRsN1mNYVeoJWTBsWeYeXvuR9UUDGMsCDKpb6AT', '/kols/trustnoest.jpg', '#ec4899', null)
on conflict (id) do update set
  name = excluded.name, handle = excluded.handle, wallet = excluded.wallet,
  avatar_url = excluded.avatar_url, color = excluded.color, telegram = excluded.telegram;

-- ---------------------------------------------------------------
-- Stats agrégées (valeurs de démo, le cron les écrasera)
-- ---------------------------------------------------------------
insert into public.kol_stats (kol_id, period, pnl_usd, volume_usd, win_rate, trades) values
  ('cooker',     '7D',  39600, 188000, 61, 142), ('cooker',     '30D', 112400, 640000, 59, 510),
  ('cented',     '7D',  29400,  70000, 58,  89), ('cented',     '30D',  96800, 310000, 57, 340),
  ('decu',       '7D',  28800, 125000, 54, 203), ('decu',       '30D',  71200, 480000, 52, 790),
  ('chester',    '7D',  19200,  54000, 63,  61), ('chester',    '30D',  44900, 190000, 60, 240),
  ('blu6k',      '7D',  17100,  35000, 66,  47), ('blu6k',      '30D',  38300, 120000, 64, 170),
  ('zeropnl',    '7D',  12400,  41000, 49, 118), ('zeropnl',    '30D',  25100, 150000, 48, 420),
  ('trustnoest', '7D',   8900,  22000, 57,  38), ('trustnoest', '30D',  31700,  95000, 56, 150)
on conflict (kol_id, period) do update set
  pnl_usd = excluded.pnl_usd, volume_usd = excluded.volume_usd,
  win_rate = excluded.win_rate, trades = excluded.trades, updated_at = now();

-- ---------------------------------------------------------------
-- 30 jours de PnL quotidien (déterministe, somme ≈ pnl 30D)
-- ---------------------------------------------------------------
insert into public.pnl_snapshots (kol_id, snapshot_date, realized_pnl_usd, volume_usd, source)
select
  s.kol_id,
  d::date,
  round((s.pnl_usd / 30.0) * (0.35 + 1.3 * (((extract(doy from d)::int * s.seed) % 11) / 10.0)), 2),
  round((s.volume_usd / 30.0) * (0.5 + ((extract(doy from d)::int * s.seed) % 7) / 6.0), 2),
  'seed'
from (
  select ks.kol_id, ks.pnl_usd, ks.volume_usd,
         row_number() over (order by ks.kol_id) * 7 + 3 as seed
  from public.kol_stats ks where ks.period = '30D'
) s
cross join generate_series(current_date - interval '29 days', current_date, interval '1 day') d
on conflict (kol_id, snapshot_date) do nothing;

-- ---------------------------------------------------------------
-- Défis
-- ---------------------------------------------------------------
-- Plus de marchés ici : le serveur crée lui-même chaque défi (7 jours chaque semaine, 30 jours
-- chaque mois) avec ses KOLs, dès que la tâche planifiée tourne (src/lib/challenges.ts).
