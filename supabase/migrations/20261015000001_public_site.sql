-- CTF ACADEMY — Partie 1 : site public et inscription en ligne
-- Trois statuts STRICTEMENT indépendants sur chaque candidature : inscription, paiement, admission.

-- ───────────────────────── Types ─────────────────────────
create type public.registration_status as enum ('draft', 'submitted', 'complete');
create type public.payment_status as enum ('pending', 'confirmed', 'failed', 'refunded', 'partial');
create type public.admission_status as enum ('under_review', 'admitted', 'rejected', 'waitlisted');
create type public.session_status as enum ('open', 'soon', 'closed');
create type public.faq_category as enum ('inscription', 'paiement', 'admission', 'formations');

-- ───────────────────────── Utilitaires ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── Profils ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null,
  phone text check (phone ~ '^\+[0-9]{6,16}$'),
  country char(2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription (métadonnées Supabase Auth).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone, country)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'À compléter'),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), 'À compléter'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'country', '')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Contenus publics ─────────────────────────
create table public.formations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('eds', 'edm', 'diacres')),
  acronym text not null,
  name text not null,
  tagline text not null,
  description text not null,
  duration_label text not null,
  levels_count smallint,
  registration_fee integer not null check (registration_fee >= 0),
  training_fee integer not null check (training_fee >= 0),
  currency char(3) not null default 'XOF',
  requires_selection boolean not null default false,
  is_example boolean not null default true, -- true tant que durées / tarifs ne sont pas officiels
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger formations_updated_at before update on public.formations
  for each row execute function public.set_updated_at();

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  registration_deadline date,
  status public.session_status not null default 'soon',
  is_example boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index sessions_formation_idx on public.sessions (formation_id, start_date);

create table public.church_vision (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
-- Historique conservé : une seule version courante à la fois.
create unique index church_vision_current_idx on public.church_vision (is_current) where is_current;

create table public.key_words (
  id uuid primary key default gen_random_uuid(),
  sort_order smallint not null unique check (sort_order between 1 and 5),
  slug text not null unique,
  label text not null,
  definition text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null,
  inspiration_text text,
  inspiration_reference text,
  updated_at timestamptz not null default now()
);
create trigger key_words_updated_at before update on public.key_words
  for each row execute function public.set_updated_at();

create table public.church_objectives (
  id uuid primary key default gen_random_uuid(),
  number smallint not null unique check (number between 1 and 5),
  verb text not null,
  text text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);
create trigger church_objectives_updated_at before update on public.church_objectives
  for each row execute function public.set_updated_at();

create table public.faq (
  id uuid primary key default gen_random_uuid(),
  category public.faq_category not null,
  question text not null,
  answer text not null,
  featured boolean not null default false,
  is_published boolean not null default true,
  sort_order smallint not null default 0
);

-- ───────────────────────── Candidatures ─────────────────────────
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  formation_id uuid not null references public.formations (id),
  session_id uuid references public.sessions (id),
  -- Trois statuts distincts et indépendants :
  registration_status public.registration_status not null default 'draft',
  payment_status public.payment_status not null default 'pending',
  admission_status public.admission_status not null default 'under_review',
  draft jsonb not null default '{}'::jsonb,   -- brouillon de l'assistant (reprise du dossier)
  answers jsonb not null default '{}'::jsonb, -- réponses validées (questions propres au parcours)
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_user_idx on public.applications (user_id);
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- Jeton opaque (haché SHA-256) permettant au navigateur ayant créé le dossier d'en suivre le paiement,
-- même avant confirmation de l'e-mail. RLS activée SANS politique : accessible uniquement par la clé service.
create table public.application_access_tokens (
  application_id uuid primary key references public.applications (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount > 0),
  currency char(3) not null default 'XOF',
  method text not null check (method in ('orange_money', 'mtn_momo', 'wave', 'moov_money', 'card')),
  provider text not null,
  provider_reference text unique,
  phone text,
  status public.payment_status not null default 'pending',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_application_idx on public.payments (application_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.formations enable row level security;
alter table public.sessions enable row level security;
alter table public.church_vision enable row level security;
alter table public.key_words enable row level security;
alter table public.church_objectives enable row level security;
alter table public.faq enable row level security;
alter table public.applications enable row level security;
alter table public.payments enable row level security;
alter table public.application_access_tokens enable row level security;

-- Contenus publics : lecture seule pour tous. Aucune écriture (administration : partie 2).
create policy "formations_public_read" on public.formations for select to anon, authenticated using (true);
create policy "sessions_public_read" on public.sessions for select to anon, authenticated using (true);
create policy "vision_public_read" on public.church_vision for select to anon, authenticated using (is_current);
create policy "key_words_public_read" on public.key_words for select to anon, authenticated using (true);
create policy "objectives_public_read" on public.church_objectives for select to anon, authenticated using (true);
create policy "faq_public_read" on public.faq for select to anon, authenticated using (is_published);

-- Profils : chacun lit et modifie uniquement le sien (création par trigger).
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Candidatures : lecture de ses propres dossiers ; mise à jour limitée au brouillon.
-- La création et tous les changements de statut passent par le serveur (clé service, après validation).
create policy "applications_select_own" on public.applications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "applications_update_own_draft" on public.applications for update to authenticated
  using ((select auth.uid()) = user_id and registration_status = 'draft')
  with check ((select auth.uid()) = user_id);

-- Restreint les colonnes modifiables par l'utilisateur : jamais les statuts.
revoke update on public.applications from authenticated;
grant update (draft, session_id) on public.applications to authenticated;
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone, country) on public.profiles to authenticated;
revoke all on public.application_access_tokens from anon, authenticated;

-- Paiements : lecture de ses propres paiements uniquement.
create policy "payments_select_own" on public.payments for select to authenticated
  using ((select auth.uid()) = user_id);
