-- CTF ACADEMY — Partie 2 : espace étudiant
-- Principe : un étudiant ne lit et n'écrit que ses propres données ; les contenus pédagogiques ne sont lisibles
-- que par les étudiants admis (et à jour de paiement) de la formation concernée. RLS sur TOUTES les tables.
-- Les décisions, notes et corrections sont écrites uniquement par le serveur (clé service) ou les rôles autorisés.

-- ───────────────────────── Types ─────────────────────────
create type public.app_role as enum ('student', 'trainer', 'supervisor', 'pastor', 'admin');
create type public.lesson_kind as enum ('video', 'text', 'pdf', 'live');
create type public.resource_kind as enum ('pdf', 'link', 'document');
create type public.assessment_kind as enum ('quiz', 'exercise', 'exam');
create type public.question_kind as enum ('single', 'multiple', 'true_false', 'short', 'long', 'file', 'match');
create type public.attempt_status as enum ('in_progress', 'submitted', 'graded');
create type public.submission_status as enum ('submitted', 'in_review', 'graded');
create type public.validation_kind as enum ('level', 'path', 'graduation', 'service', 'defense', 'consecration');
create type public.decision_status as enum ('pending', 'granted', 'refused');
create type public.schedule_status as enum ('paid', 'upcoming', 'late', 'partial');
create type public.thread_category as enum ('trainer', 'administrative');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');
create type public.notification_category as enum ('announcement', 'message', 'grade', 'comment', 'validation', 'live', 'payment', 'assessment');
create type public.event_kind as enum ('live', 'assessment', 'payment', 'milestone');
create type public.work_status as enum ('todo', 'submitted', 'to_revise', 'validated');
create type public.step_status as enum ('pending', 'in_progress', 'validated', 'redo');
create type public.report_status as enum ('draft', 'submitted', 'to_fix', 'validated');
create type public.version_status as enum ('submitted', 'in_review', 'to_fix', 'accepted');
create type public.comment_status as enum ('open', 'resolved');
create type public.defense_status as enum ('proposed', 'confirmed', 'done');
create type public.evaluation_status as enum ('pending', 'done');

-- ───────────────────────── Profils : préférences ─────────────────────────
alter table public.profiles
  add column avatar_url text,
  add column timezone text not null default 'Africa/Abidjan',
  add column lite_mode boolean not null default false;
grant update (avatar_url, timezone, lite_mode) on public.profiles to authenticated;

-- ───────────────────────── Rôles ─────────────────────────
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

create or replace function public.has_role(r public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = r)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role <> 'student')
$$;

-- Formation suivie : candidature ADMISE et paiement confirmé ou partiel (échéancier en cours).
create or replace function public.enrolled_formation()
returns uuid language sql stable security definer set search_path = '' as $$
  select a.formation_id from public.applications a
  where a.user_id = (select auth.uid())
    and a.admission_status = 'admitted'
    and a.payment_status in ('confirmed', 'partial')
  order by a.created_at desc
  limit 1
$$;

create or replace function public.can_read_formation(f uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select f is not distinct from public.enrolled_formation() or public.is_staff()
$$;

-- ───────────────────────── Contenus pédagogiques ─────────────────────────
create table public.levels (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  number smallint not null check (number between 1 and 9),
  title text not null,
  description text not null default '',
  min_score smallint not null default 60 check (min_score between 0 and 100),
  unique (formation_id, number)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  level_id uuid references public.levels (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text not null default '',
  description text not null default '',
  objectives text[] not null default '{}',
  duration_minutes integer not null default 0,
  sort_order smallint not null default 0,
  is_example boolean not null default true,
  created_at timestamptz not null default now(),
  unique (formation_id, slug)
);
create index modules_formation_idx on public.modules (formation_id, sort_order);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  kind public.lesson_kind not null default 'text',
  content text not null default '',
  video_url text,
  captions_url text,
  chapters jsonb not null default '[]'::jsonb, -- [{ "at": secondes, "label": "…" }]
  duration_minutes integer not null default 0,
  sort_order smallint not null default 0,
  is_example boolean not null default true,
  unique (module_id, slug)
);
create index lessons_module_idx on public.lessons (module_id, sort_order);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  kind public.resource_kind not null,
  title text not null,
  url text,
  storage_path text,
  size_bytes integer,
  sort_order smallint not null default 0,
  check (url is not null or storage_path is not null)
);

create table public.module_key_words (
  module_id uuid not null references public.modules (id) on delete cascade,
  key_word_slug text not null references public.key_words (slug) on delete cascade,
  primary key (module_id, key_word_slug)
);

create table public.module_objectives (
  module_id uuid not null references public.modules (id) on delete cascade,
  objective_number smallint not null references public.church_objectives (number) on delete cascade,
  primary key (module_id, objective_number)
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  module_id uuid references public.modules (id) on delete set null,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  zoom_url text,
  replay_url text,
  is_example boolean not null default true
);
create index live_sessions_formation_idx on public.live_sessions (formation_id, starts_at);

-- ───────────────────────── Progression et notes personnelles ─────────────────────────
create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  completed_at timestamptz,
  celebrated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.student_notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null check (char_length(body) between 3 and 2000),
  answer text,
  answered_by text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Évaluations ─────────────────────────
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  module_id uuid references public.modules (id) on delete set null,
  level_id uuid references public.levels (id) on delete set null,
  kind public.assessment_kind not null default 'quiz',
  title text not null,
  instructions text not null default '',
  attachment_url text,
  due_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  max_attempts smallint not null default 1 check (max_attempts > 0),
  pass_score smallint not null default 60 check (pass_score between 0 and 100),
  is_example boolean not null default true,
  created_at timestamptz not null default now()
);
create index quizzes_formation_idx on public.quizzes (formation_id, due_at);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  kind public.question_kind not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb, -- [{id,label}] ; association : {"left":[…],"right":[…]}
  points smallint not null default 1 check (points > 0),
  lesson_id uuid references public.lessons (id) on delete set null, -- leçon à revoir en cas d'erreur
  sort_order smallint not null default 0
);

-- Corrigés : AUCUNE politique → jamais lisibles par les étudiants. Utilisés uniquement par le serveur.
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  answer jsonb not null,
  explanation text not null default ''
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(6, 2),
  max_score numeric(6, 2),
  tab_leaves smallint not null default 0,
  session_key text not null default gen_random_uuid()::text,
  feedback text,
  celebrated_at timestamptz
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id);
-- Une seule tentative active par quiz et par étudiant.
create unique index quiz_attempts_active_idx on public.quiz_attempts (user_id, quiz_id) where status = 'in_progress';

create table public.answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  value jsonb not null default 'null'::jsonb,
  is_correct boolean,
  points_awarded numeric(6, 2),
  feedback text,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attempt_id uuid references public.quiz_attempts (id) on delete set null,
  storage_path text not null,
  file_name text not null,
  size_bytes integer not null check (size_bytes > 0),
  mime_type text not null,
  status public.submission_status not null default 'submitted',
  created_at timestamptz not null default now()
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete set null,
  module_id uuid references public.modules (id) on delete set null,
  label text not null,
  score numeric(6, 2) not null,
  max_score numeric(6, 2) not null check (max_score > 0),
  comment text,
  grader_name text,
  graded_at timestamptz not null default now(),
  is_example boolean not null default true
);
create index grades_user_idx on public.grades (user_id, graded_at);

-- ───────────────────────── Validations officielles ─────────────────────────
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  formation_id uuid not null references public.formations (id),
  kind public.validation_kind not null,
  level_id uuid references public.levels (id) on delete set null,
  title text not null,
  description text not null default '',
  criteria jsonb not null default '[]'::jsonb, -- [{ "label": "…", "met": true }]
  decision public.decision_status not null default 'pending',
  decided_at timestamptz,
  signatory text,
  certificate_number text unique,
  celebrated_at timestamptz,
  is_example boolean not null default true,
  created_at timestamptz not null default now()
);
create index validations_user_idx on public.validations (user_id);

-- ───────────────────────── Paiements : échéancier et reçus ─────────────────────────
create table public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  label text not null,
  due_date date not null,
  amount integer not null check (amount > 0),
  paid_amount integer not null default 0 check (paid_amount >= 0),
  status public.schedule_status not null default 'upcoming',
  is_example boolean not null default true
);
create index payment_schedules_user_idx on public.payment_schedules (user_id, due_date);

alter table public.payments add column schedule_id uuid references public.payment_schedules (id) on delete set null;

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  number text not null unique,
  issued_at timestamptz not null default now()
);

-- ───────────────────────── Communication ─────────────────────────
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid references public.formations (id) on delete cascade, -- null : toute l'école
  title text not null,
  body text not null,
  pinned boolean not null default false,
  author_name text not null default 'CTF ACADEMY',
  published_at timestamptz not null default now(),
  is_example boolean not null default true
);

create table public.announcement_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  staff_id uuid references public.profiles (id) on delete set null,
  staff_name text not null,
  category public.thread_category not null default 'trainer',
  subject text not null check (char_length(subject) between 2 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index message_threads_student_idx on public.message_threads (student_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 4000),
  attachment_path text,
  attachment_name text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_id, created_at);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('connexion', 'video', 'paiement', 'evaluation', 'autre')),
  subject text not null check (char_length(subject) between 3 and 160),
  description text not null check (char_length(description) between 10 and 4000),
  screenshot_path text,
  status public.ticket_status not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_documents (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid references public.formations (id) on delete cascade, -- null : tous
  category text not null check (category in ('reglement', 'calendrier', 'contacts', 'notice')),
  title text not null,
  description text not null default '',
  url text not null,
  sort_order smallint not null default 0,
  is_example boolean not null default true
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null,
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null,
  in_app boolean not null default true,
  email boolean not null default false,
  primary key (user_id, category)
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid references public.formations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  kind public.event_kind not null,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  zoom_url text,
  href text,
  is_example boolean not null default true,
  check (formation_id is not null or user_id is not null)
);

-- ───────────────────────── EDS : reconnaissance du service ─────────────────────────
create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity text not null,
  department text not null default '',
  served_on date not null,
  hours numeric(5, 1) not null check (hours > 0),
  recognized boolean not null default false,
  is_example boolean not null default true
);

-- ───────────────────────── EDM : mentorat, leadership, responsabilités ─────────────────────────
create table public.mentoring_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  instructions text not null default '',
  due_at timestamptz,
  status public.work_status not null default 'todo',
  response text,
  storage_path text,
  file_name text,
  submitted_at timestamptz,
  feedback text,
  feedback_by text,
  is_example boolean not null default true
);

create table public.leadership_works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  instructions text not null default '',
  due_at timestamptz,
  status public.work_status not null default 'todo',
  response text,
  storage_path text,
  file_name text,
  submitted_at timestamptz,
  score numeric(6, 2),
  max_score numeric(6, 2),
  feedback text,
  feedback_by text,
  is_example boolean not null default true
);

create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  place text not null,
  starts_on date not null,
  ends_on date,
  supervisor_name text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  notes jsonb not null default '[]'::jsonb, -- [{ "date": "…", "author": "…", "text": "…" }]
  is_example boolean not null default true
);

-- ───────────────────────── Diacres : stage, rapport, mémoire, soutenance, pastorale ─────────────────────────
create table public.internships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  place text not null,
  supervisor_id uuid references public.profiles (id) on delete set null,
  supervisor_name text not null,
  starts_on date not null,
  ends_on date not null,
  target_hours integer not null check (target_hours > 0),
  is_example boolean not null default true
);

create table public.internship_steps (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships (id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order smallint not null default 0,
  due_on date,
  status public.step_status not null default 'pending',
  validated_at timestamptz,
  comment text
);

create table public.internship_hours (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships (id) on delete cascade,
  worked_on date not null,
  hours numeric(4, 1) not null check (hours > 0 and hours <= 24),
  activity text not null check (char_length(activity) between 3 and 500),
  validated boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.internship_reports (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version integer not null check (version > 0),
  storage_path text,
  file_name text,
  size_bytes integer,
  body text,
  status public.report_status not null default 'draft',
  supervisor_comment text,
  created_at timestamptz not null default now(),
  unique (internship_id, version)
);

create table public.theses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  title text not null,
  supervisor_id uuid references public.profiles (id) on delete set null,
  supervisor_name text not null,
  created_at timestamptz not null default now(),
  is_example boolean not null default true
);

create table public.thesis_versions (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.theses (id) on delete cascade,
  version integer not null check (version > 0),
  storage_path text not null,
  file_name text not null,
  size_bytes integer not null check (size_bytes > 0),
  mime_type text not null,
  status public.version_status not null default 'submitted',
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (thesis_id, version)
);

create table public.thesis_comments (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.theses (id) on delete cascade,
  version_id uuid not null references public.thesis_versions (id) on delete cascade,
  parent_id uuid references public.thesis_comments (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_role public.app_role not null,
  section text,
  body text not null check (char_length(body) between 1 and 4000),
  status public.comment_status not null default 'open',
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now()
);
create index thesis_comments_version_idx on public.thesis_comments (version_id, created_at);

create table public.defense_sessions (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null unique references public.theses (id) on delete cascade,
  proposed_dates timestamptz[] not null default '{}',
  scheduled_at timestamptz,
  place text,
  zoom_url text,
  jury text[] not null default '{}',
  status public.defense_status not null default 'proposed',
  result text,
  is_example boolean not null default true
);

create table public.pastoral_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  status public.evaluation_status not null default 'pending',
  evaluator_name text,
  scheduled_on date,
  evaluated_at timestamptz,
  feedback text,
  is_example boolean not null default true
);

-- ───────────────────────── Journal d'audit (serveur uniquement) ─────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Fonctions d'accès ─────────────────────────
create or replace function public.owns_internship(i uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.internships where id = i and user_id = (select auth.uid()))
$$;

create or replace function public.supervises_internship(i uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.internships where id = i and supervisor_id = (select auth.uid()))
    or public.has_role('admin')
$$;

create or replace function public.can_access_thesis(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.theses
    where id = t and (user_id = (select auth.uid()) or supervisor_id = (select auth.uid()))
  ) or public.has_role('admin')
$$;

create or replace function public.module_formation(m uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select formation_id from public.modules where id = m
$$;

create or replace function public.quiz_formation(q uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select formation_id from public.quizzes where id = q
$$;

create or replace function public.owns_thread(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.message_threads
    where id = t and (student_id = (select auth.uid()) or staff_id = (select auth.uid()))
  )
$$;

-- Un nouveau message remonte la conversation en tête de liste.
create or replace function public.touch_thread()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.message_threads set updated_at = now() where id = new.thread_id;
  return new;
end $$;
create trigger messages_touch_thread after insert on public.messages
  for each row execute function public.touch_thread();

-- ───────────────────────── Row Level Security ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'user_roles', 'levels', 'modules', 'lessons', 'resources', 'module_key_words', 'module_objectives', 'live_sessions',
    'lesson_progress', 'student_notes', 'lesson_questions', 'quizzes', 'questions', 'question_keys', 'quiz_attempts',
    'answers', 'submissions', 'grades', 'validations', 'payment_schedules', 'receipts', 'announcements',
    'announcement_reads', 'message_threads', 'messages', 'support_tickets', 'admin_documents', 'notifications',
    'notification_preferences', 'calendar_events', 'service_records', 'mentoring_exercises', 'leadership_works',
    'responsibilities', 'internships', 'internship_steps', 'internship_hours', 'internship_reports', 'theses',
    'thesis_versions', 'thesis_comments', 'defense_sessions', 'pastoral_evaluations', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Rôles : chacun voit les siens.
create policy "roles_select_own" on public.user_roles for select to authenticated using (user_id = (select auth.uid()));

-- Contenus : étudiants admis de la formation (ou équipe pédagogique).
create policy "levels_read" on public.levels for select to authenticated using (public.can_read_formation(formation_id));
create policy "modules_read" on public.modules for select to authenticated using (public.can_read_formation(formation_id));
create policy "lessons_read" on public.lessons for select to authenticated
  using (public.can_read_formation(public.module_formation(module_id)));
create policy "resources_read" on public.resources for select to authenticated
  using (public.can_read_formation(public.module_formation(module_id)));
create policy "module_key_words_read" on public.module_key_words for select to authenticated
  using (public.can_read_formation(public.module_formation(module_id)));
create policy "module_objectives_read" on public.module_objectives for select to authenticated
  using (public.can_read_formation(public.module_formation(module_id)));
create policy "live_sessions_read" on public.live_sessions for select to authenticated using (public.can_read_formation(formation_id));
create policy "quizzes_read" on public.quizzes for select to authenticated using (public.can_read_formation(formation_id));
create policy "questions_read" on public.questions for select to authenticated
  using (public.can_read_formation(public.quiz_formation(quiz_id)));
-- question_keys : aucune politique (corrigés réservés au serveur).

-- Progression, notes et questions : propriétaire uniquement.
create policy "progress_own" on public.lesson_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes_own" on public.student_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "lesson_questions_select_own" on public.lesson_questions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy "lesson_questions_insert_own" on public.lesson_questions for insert to authenticated
  with check (user_id = (select auth.uid()) and answer is null);

-- Évaluations : lecture de ses tentatives ; écriture des tentatives et notes réservée au serveur.
create policy "attempts_select_own" on public.quiz_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "answers_select_own" on public.answers for select to authenticated
  using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));
create policy "submissions_select_own" on public.submissions for select to authenticated using (user_id = (select auth.uid()));
create policy "grades_select_own" on public.grades for select to authenticated using (user_id = (select auth.uid()));

-- Validations, paiements, reçus : lecture seule pour l'étudiant.
create policy "validations_select_own" on public.validations for select to authenticated using (user_id = (select auth.uid()));
create policy "schedules_select_own" on public.payment_schedules for select to authenticated using (user_id = (select auth.uid()));
create policy "receipts_select_own" on public.receipts for select to authenticated using (user_id = (select auth.uid()));

-- Annonces et documents : formation de l'étudiant ou toute l'école.
create policy "announcements_read" on public.announcements for select to authenticated
  using (formation_id is null or public.can_read_formation(formation_id));
create policy "announcement_reads_own" on public.announcement_reads for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "admin_documents_read" on public.admin_documents for select to authenticated
  using (formation_id is null or public.can_read_formation(formation_id));

-- Messagerie : participants de la conversation.
create policy "threads_select_participant" on public.message_threads for select to authenticated
  using (student_id = (select auth.uid()) or staff_id = (select auth.uid()));
create policy "threads_insert_student" on public.message_threads for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "messages_select_participant" on public.messages for select to authenticated using (public.owns_thread(thread_id));
create policy "messages_insert_participant" on public.messages for insert to authenticated
  with check (public.owns_thread(thread_id) and author_id = (select auth.uid()) and read_at is null);
create policy "messages_mark_read" on public.messages for update to authenticated
  using (public.owns_thread(thread_id) and author_id is distinct from (select auth.uid()))
  with check (public.owns_thread(thread_id));
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

create policy "tickets_select_own" on public.support_tickets for select to authenticated using (user_id = (select auth.uid()));
create policy "tickets_insert_own" on public.support_tickets for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open' and resolution is null);

create policy "notifications_select_own" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_mark_read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy "notification_prefs_own" on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "calendar_read" on public.calendar_events for select to authenticated
  using (user_id = (select auth.uid()) or (user_id is null and public.can_read_formation(formation_id)));

-- Parcours spécifiques : lecture par l'étudiant ; décisions et retours écrits par le serveur / les rôles autorisés.
create policy "service_select_own" on public.service_records for select to authenticated using (user_id = (select auth.uid()));
create policy "mentoring_select_own" on public.mentoring_exercises for select to authenticated using (user_id = (select auth.uid()));
create policy "leadership_select_own" on public.leadership_works for select to authenticated using (user_id = (select auth.uid()));
create policy "responsibilities_select_own" on public.responsibilities for select to authenticated using (user_id = (select auth.uid()));
create policy "pastoral_select_own" on public.pastoral_evaluations for select to authenticated using (user_id = (select auth.uid()));

-- Stage : l'étudiant et son superviseur.
create policy "internships_select" on public.internships for select to authenticated
  using (user_id = (select auth.uid()) or supervisor_id = (select auth.uid()) or public.has_role('admin'));
create policy "internship_steps_select" on public.internship_steps for select to authenticated
  using (public.owns_internship(internship_id) or public.supervises_internship(internship_id));
create policy "internship_steps_supervisor_update" on public.internship_steps for update to authenticated
  using (public.supervises_internship(internship_id)) with check (public.supervises_internship(internship_id));
create policy "internship_hours_select" on public.internship_hours for select to authenticated
  using (public.owns_internship(internship_id) or public.supervises_internship(internship_id));
create policy "internship_hours_insert_own" on public.internship_hours for insert to authenticated
  with check (public.owns_internship(internship_id) and validated = false);
create policy "internship_reports_select" on public.internship_reports for select to authenticated
  using (public.owns_internship(internship_id) or public.supervises_internship(internship_id));

-- Mémoire : étudiant, superviseur, administration.
create policy "theses_select" on public.theses for select to authenticated using (public.can_access_thesis(id));
create policy "thesis_versions_select" on public.thesis_versions for select to authenticated using (public.can_access_thesis(thesis_id));
create policy "thesis_comments_select" on public.thesis_comments for select to authenticated using (public.can_access_thesis(thesis_id));
-- L'étudiant ne fait que répondre (parent obligatoire) ; le superviseur peut ouvrir un commentaire.
create policy "thesis_comments_insert" on public.thesis_comments for insert to authenticated
  with check (
    public.can_access_thesis(thesis_id) and author_id = (select auth.uid()) and status = 'open'
    and (
      (author_role = 'student' and parent_id is not null
        and exists (select 1 from public.theses t where t.id = thesis_id and t.user_id = (select auth.uid())))
      or (author_role = 'supervisor'
        and exists (select 1 from public.theses t where t.id = thesis_id and t.supervisor_id = (select auth.uid())))
    )
  );
create policy "thesis_comments_resolve" on public.thesis_comments for update to authenticated
  using (public.can_access_thesis(thesis_id)) with check (public.can_access_thesis(thesis_id));
revoke update on public.thesis_comments from authenticated;
grant update (status) on public.thesis_comments to authenticated;
create policy "defense_select" on public.defense_sessions for select to authenticated using (public.can_access_thesis(thesis_id));

-- Écritures privilégiées : jamais par l'étudiant via l'API.
revoke insert, update, delete on public.quiz_attempts, public.answers, public.submissions, public.grades,
  public.validations, public.payment_schedules, public.receipts, public.question_keys, public.audit_log,
  public.service_records, public.mentoring_exercises, public.leadership_works, public.responsibilities,
  public.pastoral_evaluations, public.internships, public.internship_reports, public.theses, public.thesis_versions,
  public.defense_sessions, public.levels, public.modules, public.lessons, public.resources, public.quizzes,
  public.questions, public.live_sessions, public.announcements, public.admin_documents, public.calendar_events,
  public.user_roles
  from anon, authenticated;
revoke all on public.question_keys, public.audit_log from anon, authenticated;

-- ───────────────────────── Stockage privé ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-files', 'student-files', false, 20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do nothing;

-- Chemins : <user_id>/<dossier>/<fichier>. Lecture directe de ses propres fichiers ; dépôts via URL signées serveur.
create policy "student_files_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'student-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────────────────── Temps réel ─────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.messages, public.notifications, public.announcements, public.thesis_comments;
exception when undefined_object then
  null; -- publication absente hors Supabase
end $$;
