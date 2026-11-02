-- CTF ACADEMY — Refonte design : médiathèque (photos, vidéos), événements publics
-- et quatrième formation « École de pastorale ».
-- Lecture publique limitée aux éléments publiés ; écriture réservée aux rôles autorisés
-- (le back-office arrive avec le prompt d'administration).

-- ───────────────────────── Médiathèque ─────────────────────────
create table public.media_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null default '',
  cover text not null default '',
  year smallint not null check (year between 2000 and 2100),
  is_published boolean not null default true,
  is_example boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.media_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.media_albums (id) on delete cascade,
  title text not null default '',
  caption text not null default '',
  storage_path text not null, -- chemin dans le bucket « media » ou URL publique
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  taken_at timestamptz,
  featured boolean not null default false,
  sort_order smallint not null default 0,
  is_published boolean not null default true,
  is_example boolean not null default true,
  created_at timestamptz not null default now()
);
create index media_photos_album_idx on public.media_photos (album_id, sort_order);
create index media_photos_featured_idx on public.media_photos (featured) where featured and is_published;

create table public.media_videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null default '',
  source text not null check (source in ('upload', 'youtube', 'vimeo')),
  url text not null,
  poster text not null default '',
  duration_sec integer not null default 0 check (duration_sec >= 0),
  category text not null check (category in ('cultes', 'formations', 'temoignages', 'evenements')),
  published_at timestamptz not null default now(),
  featured boolean not null default false,
  is_published boolean not null default true,
  is_example boolean not null default true,
  created_at timestamptz not null default now()
);
create index media_videos_featured_idx on public.media_videos (featured) where featured and is_published;

-- ───────────────────────── Événements ─────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null default '',
  type text not null check (type in ('culte', 'conference', 'formation', 'ceremonie', 'retraite', 'concert')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  place text not null default '',
  address text not null default '',
  cover text not null default '',
  register_url text,
  featured boolean not null default false,
  status text not null default 'brouillon' check (status in ('brouillon', 'publie', 'annule')),
  is_example boolean not null default true,
  created_at timestamptz not null default now()
);
create index events_starts_idx on public.events (starts_at) where status = 'publie';

-- ───────────────────────── École de pastorale ─────────────────────────
-- Le contrôle de slug doit accepter la quatrième formation.
alter table public.formations drop constraint if exists formations_slug_check;
alter table public.formations add constraint formations_slug_check
  check (slug in ('eds', 'edm', 'diacres', 'pastorale'));

insert into public.formations (
  slug, acronym, name, tagline, description, duration_label, levels_count,
  registration_fee, training_fee, currency, requires_selection, is_example, sort_order
)
select
  'pastorale', 'EP', 'École de pastorale',
  'Former les pasteurs et responsables de demain.',
  'L''École de pastorale prépare les serviteurs appelés au ministère pastoral. (Exemple — texte officiel à venir.)',
  'À définir', null,
  0, 0, 'XOF', true, true, 4
where not exists (select 1 from public.formations where slug = 'pastorale');

-- ───────────────────────── Sécurité (RLS) ─────────────────────────
alter table public.media_albums enable row level security;
alter table public.media_photos enable row level security;
alter table public.media_videos enable row level security;
alter table public.events enable row level security;

-- Lecture publique : uniquement les éléments publiés.
create policy media_albums_read on public.media_albums
  for select using (is_published);
create policy media_photos_read on public.media_photos
  for select using (is_published and exists (
    select 1 from public.media_albums a where a.id = album_id and a.is_published
  ));
create policy media_videos_read on public.media_videos
  for select using (is_published);
create policy events_read on public.events
  for select using (status = 'publie');

-- Écriture : réservée au rôle service (back-office à venir). Aucune policy insert/update/delete
-- pour anon/authenticated → l'écriture depuis l'API publique est impossible.

-- Bucket « media » : lecture publique des fichiers publiés, écriture restreinte au service.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy media_storage_read on storage.objects
  for select using (bucket_id = 'media');
