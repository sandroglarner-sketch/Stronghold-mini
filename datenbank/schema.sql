-- Stronghold Mini: Tabellen für Einladungen und Freischaltungen.
-- In Supabase unter «SQL Editor» einfügen und «Run» drücken. Mehrfach ausführen schadet nicht.
-- Nur der Server (mit Secret Key) schreibt und liest hier; Browser haben keinen direkten Zugriff (RLS an, keine Regeln).

create table if not exists public.einladungen (
  code       text primary key,                                   -- persönlicher Einladungscode eines Spielers
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.einladung_besuche (
  code       text not null references public.einladungen(code) on delete cascade,
  geraet     text not null,                                      -- zufällige Kennung des Geräts des Freundes
  created_at timestamptz not null default now(),
  primary key (code, geraet)
);

create table if not exists public.freischaltungen (
  user_id    uuid not null references auth.users(id) on delete cascade,
  einheit    text not null,                                      -- z. B. 'crossbow'
  grund      text,                                               -- z. B. 'einladung'
  created_at timestamptz not null default now(),
  primary key (user_id, einheit)
);

alter table public.einladungen       enable row level security;
alter table public.einladung_besuche enable row level security;
alter table public.freischaltungen   enable row level security;

grant all on public.einladungen, public.einladung_besuche, public.freischaltungen to service_role;

-- 19.11.: Spielerprofil (Anzeigename, Story-Fortschritt) und Freundesliste
create table if not exists public.spieler (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  story      int  not null default 0,                            -- so viele Story-Gegner besiegt
  gesehen    timestamptz not null default now()
);

create table if not exists public.freunde (
  user_id    uuid not null references auth.users(id) on delete cascade,
  freund_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, freund_id)                               -- immer in beide Richtungen eingetragen
);

alter table public.spieler enable row level security;
alter table public.freunde enable row level security;
grant all on public.spieler, public.freunde to service_role;

-- 21.11.: Elo für Online-Partien (nur zwischen zwei Konten) und öffentliche Rangliste
alter table public.spieler add column if not exists elo int not null default 1000;
alter table public.spieler add column if not exists partien int not null default 0;

-- 21.11.: gewählter König (nur Optik) fürs Bild in der Freundesliste
alter table public.spieler add column if not exists koenig text;

-- 22.11.: Edelsteine und Shop. Kontostand = verdient (Online-Siege x2, Niederlagen x1, besiegte Story-Gegner x1, eingeladene Freunde x20) minus ausgegeben.
alter table public.spieler add column if not exists pvp_siege int;
alter table public.spieler add column if not exists pvp_niederlagen int;
alter table public.spieler add column if not exists edel_ausgegeben int not null default 0;
alter table public.spieler add column if not exists gekauft text not null default '';   -- im Shop gekaufte Karten, mit Komma
-- Nachzahlung für alte Online-Partien: Siege aus der Elo geschätzt (Start 1000, je Partie etwa ±16). Nur einmal (wo noch leer).
update public.spieler
   set pvp_siege = least(partien, greatest(0, round((partien + (elo - 1000) / 16.0) / 2)))::int,
       pvp_niederlagen = partien - least(partien, greatest(0, round((partien + (elo - 1000) / 16.0) / 2)))::int
 where pvp_siege is null;
alter table public.spieler alter column pvp_siege set default 0;
alter table public.spieler alter column pvp_niederlagen set default 0;

-- 22.11.: Geschenke vom Entwickler (Karten mit Regel geschenk, z. B. Prinzessin). gezeigt = Geschenk-Fenster schon gesehen.
alter table public.freischaltungen add column if not exists gezeigt boolean not null default true;
-- Geschenk vergeben (E-Mail einsetzen; erscheint beim nächsten Öffnen als Geschenk):
-- insert into public.freischaltungen (user_id, einheit, grund, gezeigt)
-- select id, 'prinzessin', 'geschenk', false from auth.users where email = 'name@beispiel.ch'
-- on conflict (user_id, einheit) do update set grund = 'geschenk', gezeigt = false;
-- Geschenk wieder wegnehmen:
-- delete from public.freischaltungen where einheit = 'prinzessin' and user_id = (select id from auth.users where email = 'name@beispiel.ch');
