-- Paramétrage du site : réglages édités par l'administrateur principal
-- (numéro WhatsApp d'assistance, e-mail de contact, ouverture des inscriptions).

create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.site_settings is 'Réglages du site public, édités dans /admin/parametres.';

alter table public.site_settings enable row level security;

-- Lecture publique des réglages exposés au site (numéro d'assistance, ouverture des inscriptions).
create policy "site_settings_read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- Valeurs initiales (vides = retomber sur les valeurs d'environnement / par défaut).
insert into public.site_settings (key, value) values
  ('whatsapp_number', ''),
  ('contact_email', ''),
  ('registrations_open', 'true'),
  ('registration_notice', '')
on conflict (key) do nothing;
