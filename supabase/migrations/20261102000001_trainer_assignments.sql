-- Affectation formateur ↔ classe : chaque formateur gère les étudiants de ses formations.
-- La liste de ses classes détermine ce qu'il voit (étudiants, corrections, contenus) dans /admin.
create table public.trainer_assignments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  formation_id uuid not null references public.formations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trainer_id, formation_id)
);

alter table public.trainer_assignments enable row level security;

-- Le formateur lit ses propres affectations ; l'administration lit tout.
create policy "trainer_assignments_read" on public.trainer_assignments
  for select to authenticated
  using (trainer_id = (select auth.uid()) or public.has_role('admin'));
