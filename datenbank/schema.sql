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
