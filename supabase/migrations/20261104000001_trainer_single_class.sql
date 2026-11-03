-- Un formateur = une seule classe : une formation ET un niveau (ex. EDS niveau 2).
-- Les étudiants d'une classe sont les admis de la formation dont le niveau en cours est ce niveau.
alter table public.trainer_assignments
  add column if not exists level_id uuid references public.levels(id) on delete cascade;

-- Reprise des affectations existantes : premier niveau non validé par les étudiants de démonstration, sinon niveau 1.
update public.trainer_assignments ta
set level_id = coalesce(
  (select l.id from public.levels l
   where l.formation_id = ta.formation_id
     and l.number = 2
     and exists (select 1 from public.levels l2 where l2.formation_id = ta.formation_id and l2.number > 1)),
  (select l.id from public.levels l where l.formation_id = ta.formation_id order by l.number limit 1)
)
where ta.level_id is null;

-- Une seule classe par formateur (on garde la plus récente s'il y en avait plusieurs).
delete from public.trainer_assignments ta
using public.trainer_assignments newer
where ta.trainer_id = newer.trainer_id and ta.created_at < newer.created_at;

alter table public.trainer_assignments drop constraint if exists trainer_assignments_trainer_id_formation_id_key;
alter table public.trainer_assignments add constraint trainer_assignments_trainer_id_key unique (trainer_id);

-- Le niveau d'une formation doit appartenir à cette formation.
create or replace function public.check_trainer_assignment_level()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.level_id is not null and not exists (
    select 1 from public.levels where id = new.level_id and formation_id = new.formation_id
  ) then
    raise exception 'Le niveau ne correspond pas à la formation';
  end if;
  return new;
end $$;
drop trigger if exists trainer_assignments_level_check on public.trainer_assignments;
create trigger trainer_assignments_level_check before insert or update on public.trainer_assignments
  for each row execute function public.check_trainer_assignment_level();

-- Planning et annonces ciblés par niveau (null = toute la formation).
alter table public.live_sessions add column if not exists level_id uuid references public.levels(id) on delete set null;
alter table public.calendar_events add column if not exists level_id uuid references public.levels(id) on delete set null;
alter table public.announcements add column if not exists level_id uuid references public.levels(id) on delete set null;
