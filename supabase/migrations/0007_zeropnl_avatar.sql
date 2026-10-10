-- Marketcoins · la photo de profil X de zeropnl (jusqu'ici sans photo : ses initiales sur une pièce).
-- À exécuter après 0006_admin.sql. Idempotente.
update public.kols set avatar_url = '/kols/zeropnl.jpg' where id = 'zeropnl' and avatar_url is null;
