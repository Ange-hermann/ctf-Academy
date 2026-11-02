-- Profils d'administration (brief §5) : trois rôles métier s'ajoutent aux cinq existants.
-- admissions  → Responsable des admissions (candidatures, dossiers, inscriptions)
-- pedagogy    → Responsable pédagogique (programmes, modules, calendrier, progression)
-- finance     → Responsable financier (paiements, reçus, échéances, rapports)
-- Les menus/sections de l'espace /admin filtrent par rôle ; les écritures d'administration
-- passent par le client privilégié côté serveur après vérification du rôle (audit systématique).

alter type public.app_role add value if not exists 'admissions';
alter type public.app_role add value if not exists 'pedagogy';
alter type public.app_role add value if not exists 'finance';

-- Lecture des utilisateurs pour l'attribution des rôles : réservée aux administrateurs.
-- (les autres lectures métier restent gérées côté serveur, hors RLS)
create policy "profiles_read_admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'));

create policy "user_roles_read_admin" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));
