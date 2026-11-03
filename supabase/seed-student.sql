-- CTF ACADEMY — données de DÉMONSTRATION de l'espace étudiant.
-- ⚠️ Tout ce qui suit est un EXEMPLE (is_example = true) : notes, montants, dates et contenus ne sont pas officiels.
-- Rejouable : supprime d'abord les comptes de démonstration et les contenus d'exemple, puis les recrée.
-- Comptes (mot de passe commun : Exemple2026) :
--   eds.demo@example.com      — étudiante EDS (niveau 2)
--   edm.demo@example.com      — étudiant EDM (niveau 2)
--   diacre.demo@example.com   — étudiante de la formation des diacres (stage et mémoire)
--   candidat.demo@example.com — candidature en étude (accès limité au suivi)
--   superviseur.demo@example.com / formateur.demo@example.com — rôles d'encadrement
--   admin.demo@example.com      — administrateur principal (accès complet à /admin)

-- ───────────────────────── Nettoyage des données d'exemple ─────────────────────────
delete from auth.users where id in (
  'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004',
  'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006',
  'd0000000-0000-4000-8000-000000000007'
);
delete from public.modules where is_example;
delete from public.quizzes where is_example;
delete from public.live_sessions where is_example;
delete from public.announcements where is_example;
delete from public.admin_documents where is_example;
delete from public.calendar_events where is_example;

-- ───────────────────────── Fonctions temporaires ─────────────────────────
create or replace function pg_temp.seed_user(uid uuid, mail text, first text, last text, phone text, country text, r public.app_role)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
    extensions.crypt('Exemple2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', first, 'last_name', last, 'phone', phone, 'country', country),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true), 'email', now(), now(), now()
  );
  insert into public.user_roles (user_id, role) values (uid, r);
end $$;

create or replace function pg_temp.f(slug text) returns uuid language sql as $$
  select id from public.formations where formations.slug = f.slug
$$;

create or replace function pg_temp.lvl(fslug text, n int) returns uuid language sql as $$
  select id from public.levels where formation_id = pg_temp.f(fslug) and number = n
$$;

create or replace function pg_temp.add_module(
  fslug text, level_n int, mslug text, title text, summary text, objectives text[], kws text[], objs int[], sort int
) returns uuid language plpgsql as $$
declare mid uuid;
begin
  insert into public.modules (formation_id, level_id, slug, title, summary, description, objectives, duration_minutes, sort_order)
  values (
    pg_temp.f(fslug), pg_temp.lvl(fslug, level_n), mslug, title, summary,
    summary || ' Ce module associe enseignements, ressources à télécharger et une séance en direct. Contenu d''exemple, à remplacer par le programme officiel.',
    objectives, 90, sort
  ) returning id into mid;
  insert into public.module_key_words (module_id, key_word_slug) select mid, unnest(kws);
  insert into public.module_objectives (module_id, objective_number) select mid, unnest(objs);
  insert into public.resources (module_id, kind, title, url, size_bytes, sort_order)
  values (mid, 'pdf', 'Support de cours — ' || title || ' (exemple)', '/demo/support-de-cours-exemple.pdf', 4200, 1);
  return mid;
end $$;

create or replace function pg_temp.add_lesson(mid uuid, lslug text, title text, intro text, points text[], is_video boolean, sort int)
returns uuid language plpgsql as $$
declare lid uuid;
begin
  insert into public.lessons (module_id, slug, title, kind, content, video_url, chapters, duration_minutes, sort_order)
  values (
    mid, lslug, title,
    case when is_video then 'video'::public.lesson_kind else 'text'::public.lesson_kind end,
    '## Introduction' || E'\n\n' || intro || E'\n\n' ||
    '## Points clés' || E'\n\n' || (select string_agg('- ' || p, E'\n') from unnest(points) p) || E'\n\n' ||
    '## Pour méditer' || E'\n\n' ||
    'Prenez un moment pour relire ces points et notez dans l''onglet « Notes » ce que vous souhaitez mettre en pratique cette semaine.' || E'\n\n' ||
    '> Contenu d''exemple — à remplacer par le support officiel du formateur.',
    case when is_video then 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' end,
    case when is_video then '[{"at":0,"label":"Introduction"},{"at":2,"label":"Enseignement"},{"at":4,"label":"Application"}]'::jsonb else '[]'::jsonb end,
    case when is_video then 12 else 8 end,
    sort
  ) returning id into lid;
  return lid;
end $$;

create or replace function pg_temp.lesson(fslug text, mslug text, lslug text) returns uuid language sql as $$
  select l.id from public.lessons l join public.modules m on m.id = l.module_id
  where m.formation_id = pg_temp.f(fslug) and m.slug = mslug and l.slug = lslug
$$;

create or replace function pg_temp.add_question(
  qid uuid, kind public.question_kind, prompt text, options jsonb, answer jsonb, explanation text, lid uuid, sort int, pts int default 1
) returns uuid language plpgsql as $$
declare id uuid;
begin
  insert into public.questions (quiz_id, kind, prompt, options, points, lesson_id, sort_order)
  values (qid, kind, prompt, options, pts, lid, sort) returning questions.id into id;
  insert into public.question_keys (question_id, answer, explanation) values (id, answer, explanation);
  return id;
end $$;

-- Tentative corrigée (réponses = corrigé sauf pour les questions listées dans « wrong »).
create or replace function pg_temp.graded_attempt(qid uuid, uid uuid, days_ago int, wrong int[] default '{}')
returns void language plpgsql as $$
declare aid uuid; total numeric := 0; got numeric := 0; q record;
begin
  insert into public.quiz_attempts (quiz_id, user_id, status, started_at, submitted_at, feedback)
  values (qid, uid, 'graded', now() - make_interval(days => days_ago, mins => 12), now() - make_interval(days => days_ago),
    'Bon travail. Relisez les points signalés avant le prochain quiz. (exemple)')
  returning id into aid;
  for q in select qs.id, qs.points, qs.sort_order, k.answer from public.questions qs join public.question_keys k on k.question_id = qs.id
    where qs.quiz_id = qid order by qs.sort_order loop
    total := total + q.points;
    if q.sort_order = any (wrong) then
      insert into public.answers (attempt_id, question_id, value, is_correct, points_awarded)
      values (aid, q.id, '"Réponse incomplète (exemple)"'::jsonb, false, 0);
    else
      got := got + q.points;
      insert into public.answers (attempt_id, question_id, value, is_correct, points_awarded) values (aid, q.id, q.answer, true, q.points);
    end if;
  end loop;
  update public.quiz_attempts set score = got, max_score = total where id = aid;
  insert into public.grades (user_id, quiz_id, module_id, label, score, max_score, comment, grader_name, graded_at)
  select uid, qid, module_id, title, got, total, 'Correction automatique (exemple)', 'CTF ACADEMY', now() - make_interval(days => days_ago)
  from public.quizzes where id = qid;
end $$;

create or replace function pg_temp.complete(uid uuid, lid uuid, days_ago int) returns void language sql as $$
  insert into public.lesson_progress (user_id, lesson_id, position_seconds, progress_percent, completed_at, celebrated_at, updated_at)
  values (uid, lid, 0, 100, now() - make_interval(days => days_ago), now() - make_interval(days => days_ago), now() - make_interval(days => days_ago))
$$;

-- ───────────────────────── Comptes ─────────────────────────
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000001', 'eds.demo@example.com', 'Awa', 'Exemple', '+22500000001', 'CI', 'student');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000002', 'edm.demo@example.com', 'Koffi', 'Exemple', '+22500000002', 'CI', 'student');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000003', 'diacre.demo@example.com', 'Esther', 'Exemple', '+22500000003', 'CI', 'student');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000004', 'superviseur.demo@example.com', 'Superviseur', 'Exemple', '+22500000004', 'CI', 'supervisor');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000005', 'formateur.demo@example.com', 'Formateur', 'Exemple', '+22500000005', 'CI', 'trainer');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000006', 'candidat.demo@example.com', 'Paul', 'Exemple', '+22500000006', 'CI', 'student');
select pg_temp.seed_user('d0000000-0000-4000-8000-000000000007', 'admin.demo@example.com', 'Admin', 'Exemple', '+22500000007', 'CI', 'admin');

-- ───────────────────────── Niveaux (intitulés : src/content/formations.ts) ─────────────────────────
insert into public.levels (formation_id, number, title, description) values
  (pg_temp.f('eds'), 1, 'Niveau 1 — Fondements', 'Les bases de la vie chrétienne et de l''adoration.'),
  (pg_temp.f('eds'), 2, 'Niveau 2 — Croissance', 'Caractère, discipline spirituelle et vie de l''Église.'),
  (pg_temp.f('eds'), 3, 'Niveau 3 — Service', 'Les départements, le travail en équipe et la fidélité.'),
  (pg_temp.f('eds'), 4, 'Niveau 4 — Excellence', 'Responsabilité, exemplarité et préparation à la graduation STAF.'),
  (pg_temp.f('edm'), 1, 'Niveau 1 — Disciple affermi', 'Maturité, caractère et vie de disciple.'),
  (pg_temp.f('edm'), 2, 'Niveau 2 — Disciple mentor', 'Mentorat, leadership et suivi de responsabilités.'),
  (pg_temp.f('diacres'), 1, 'Cours et évaluations', 'Enseignements fondamentaux et évaluations écrites.'),
  (pg_temp.f('diacres'), 2, 'Stage pratique', 'Un stage encadré, suivi par un superviseur, avec rapport.'),
  (pg_temp.f('diacres'), 3, 'Mémoire et soutenance', 'Rédaction d''un mémoire et soutenance devant un jury.'),
  (pg_temp.f('diacres'), 4, 'Évaluation pastorale', 'Évaluation par l''équipe pastorale et décision de consécration.')
on conflict (formation_id, number) do update set title = excluded.title, description = excluded.description;

-- ───────────────────────── Modules et leçons ─────────────────────────
do $$
declare m uuid;
begin
  -- EDS
  m := pg_temp.add_module('eds', 1, 'vie-d-adorateur', 'La vie d''adorateur', 'Placer Dieu au centre de sa vie et de son service.',
    array['Comprendre le sens biblique de l''adoration', 'Installer une vie de prière régulière'], array['adoration'], array[4], 1);
  perform pg_temp.add_lesson(m, 'qu-est-ce-que-l-adoration', 'Qu''est-ce que l''adoration ?', 'L''adoration ne se limite pas au chant : c''est une attitude du cœur qui reconnaît la grandeur de Dieu dans chaque domaine de la vie.', array['Adorer, c''est reconnaître qui est Dieu', 'L''adoration engage toute la vie', 'Le culte personnel prépare le culte collectif'], true, 1);
  perform pg_temp.add_lesson(m, 'la-priere-au-quotidien', 'La prière au quotidien', 'La prière est la respiration du disciple. Elle se construit par la régularité, l''écoute et la confiance.', array['Choisir un moment et un lieu', 'Prier avec la Parole', 'Tenir un carnet de prière'], false, 2);
  perform pg_temp.add_lesson(m, 'adorer-en-esprit-et-en-verite', 'Adorer en esprit et en vérité', 'Jésus invite à une adoration sincère, conduite par l''Esprit et fondée sur la vérité de la Parole.', array['La sincérité du cœur', 'La place de l''Esprit', 'La vérité comme fondement'], false, 3);

  m := pg_temp.add_module('eds', 1, 'fondements-de-la-foi', 'Les fondements de la foi', 'Revenir aux bases solides de la vie chrétienne.',
    array['Expliquer le salut en Jésus-Christ', 'Faire de la Parole sa nourriture quotidienne'], array['transformation'], array[1, 4], 2);
  perform pg_temp.add_lesson(m, 'le-salut-en-jesus-christ', 'Le salut en Jésus-Christ', 'Le salut est un don de Dieu reçu par la foi. Il transforme notre identité et notre manière de vivre.', array['La grâce de Dieu', 'La foi qui reçoit', 'Une vie nouvelle'], true, 1);
  perform pg_temp.add_lesson(m, 'la-parole-nourriture-du-disciple', 'La Parole, nourriture du disciple', 'Lire, méditer et appliquer la Parole : trois gestes simples pour grandir chaque jour.', array['Lire avec un plan', 'Méditer un verset', 'Mettre en pratique'], false, 2);
  perform pg_temp.add_lesson(m, 'le-bapteme-et-la-vie-nouvelle', 'Le baptême et la vie nouvelle', 'Le baptême marque publiquement l''engagement à suivre Christ et ouvre une vie de disciple.', array['Le sens du baptême', 'Un engagement public', 'Marcher en nouveauté de vie'], false, 3);

  m := pg_temp.add_module('eds', 2, 'caractere-du-serviteur', 'Le caractère du serviteur', 'Développer l''humilité, la fidélité et la discipline.',
    array['Identifier les traits du caractère de Christ', 'Mettre en place une discipline spirituelle'], array['transformation', 'excellence'], array[4], 3);
  perform pg_temp.add_lesson(m, 'l-humilite', 'L''humilité', 'Le serviteur suit l''exemple de Jésus qui s''est abaissé pour servir.', array['Servir sans chercher la gloire', 'Accepter la correction', 'Honorer les autres'], true, 1);
  perform pg_temp.add_lesson(m, 'la-fidelite-dans-les-petites-choses', 'La fidélité dans les petites choses', 'La fidélité se construit dans le quotidien : ponctualité, parole tenue, constance.', array['La ponctualité', 'La parole donnée', 'La constance'], false, 2);
  perform pg_temp.add_lesson(m, 'la-discipline-spirituelle', 'La discipline spirituelle', 'Prière, jeûne et lecture régulière forment le serviteur de l''intérieur.', array['Un rythme réaliste', 'Le jeûne', 'Rendre compte à un responsable'], false, 3);

  m := pg_temp.add_module('eds', 3, 'servir-en-equipe', 'Servir en équipe', 'Comprendre les départements et collaborer avec sagesse.',
    array['Connaître l''organisation des départements', 'Communiquer et gérer les tensions'], array['famille', 'excellence'], array[2], 4);
  perform pg_temp.add_lesson(m, 'les-departements-de-l-eglise', 'Les départements de l''Église', 'Chaque département sert la vision commune ; connaître leur rôle aide à mieux servir.', array['Le rôle de chaque département', 'La complémentarité', 'Servir la vision'], true, 1);
  perform pg_temp.add_lesson(m, 'communiquer-et-collaborer', 'Communiquer et collaborer', 'Une équipe unie communique avec clarté, respect et bienveillance.', array['Écouter avant de parler', 'Clarifier les attentes', 'Rendre compte'], false, 2);
  perform pg_temp.add_lesson(m, 'gerer-les-conflits-avec-sagesse', 'Gérer les conflits avec sagesse', 'Les désaccords sont normaux ; la sagesse biblique aide à les traverser sans blesser.', array['Aller vers l''autre', 'Chercher la paix', 'Demander de l''aide'], false, 3);

  m := pg_temp.add_module('eds', 4, 'excellence-dans-le-service', 'L''excellence dans le service', 'Porter une responsabilité avec exemplarité.',
    array['Assumer une responsabilité', 'Se préparer à la graduation STAF'], array['excellence'], array[5], 5);
  perform pg_temp.add_lesson(m, 'porter-une-responsabilite', 'Porter une responsabilité', 'Être responsable, c''est répondre de sa mission devant Dieu et devant l''Église.', array['Comprendre sa mission', 'S''organiser', 'Rendre compte'], true, 1);
  perform pg_temp.add_lesson(m, 'etre-un-exemple', 'Être un exemple', 'Le STAF inspire par sa conduite autant que par ses paroles.', array['La cohérence', 'L''intégrité', 'L''encouragement'], false, 2);
  perform pg_temp.add_lesson(m, 'preparer-sa-graduation', 'Préparer sa graduation', 'La graduation couronne un parcours ; elle se prépare par la fidélité jusqu''au bout.', array['Les conditions de graduation', 'Le bilan personnel', 'L''engagement après la graduation'], false, 3);

  -- EDM
  m := pg_temp.add_module('edm', 1, 'maturite-spirituelle', 'Maturité spirituelle', 'Grandir vers la stature de Christ.',
    array['Discerner les marques de la maturité', 'Persévérer dans l''épreuve'], array['transformation'], array[4], 1);
  perform pg_temp.add_lesson(m, 'grandir-vers-la-maturite', 'Grandir vers la maturité', 'La maturité spirituelle est un chemin : elle se mesure à la ressemblance avec Christ.', array['Les marques de la maturité', 'Le temps et la patience', 'L''accompagnement'], true, 1);
  perform pg_temp.add_lesson(m, 'le-caractere-de-christ', 'Le caractère de Christ', 'Le fruit de l''Esprit révèle le caractère de Christ en nous.', array['L''amour', 'La maîtrise de soi', 'La douceur'], false, 2);
  perform pg_temp.add_lesson(m, 'perseverer-dans-l-epreuve', 'Persévérer dans l''épreuve', 'L''épreuve affermit la foi lorsqu''elle est traversée avec Dieu.', array['Le sens de l''épreuve', 'Tenir ferme', 'Être soutenu'], false, 3);

  m := pg_temp.add_module('edm', 1, 'vie-de-disciple', 'La vie de disciple', 'Marcher avec Dieu au quotidien et en communauté.',
    array['Ancrer sa marche dans la Parole', 'Vivre la communion fraternelle'], array['adoration'], array[4, 5], 2);
  perform pg_temp.add_lesson(m, 'marcher-avec-dieu', 'Marcher avec Dieu', 'Le disciple marche avec Dieu dans l''écoute et l''obéissance.', array['L''écoute', 'L''obéissance', 'La confiance'], true, 1);
  perform pg_temp.add_lesson(m, 'le-disciple-et-la-parole', 'Le disciple et la Parole', 'La Parole oriente les décisions et forme le jugement du disciple.', array['Étudier', 'Mémoriser', 'Appliquer'], false, 2);
  perform pg_temp.add_lesson(m, 'le-disciple-et-la-communaute', 'Le disciple et la communauté', 'On ne grandit pas seul : la communauté encourage, corrige et envoie.', array['La communion', 'L''exhortation', 'L''envoi'], false, 3);

  m := pg_temp.add_module('edm', 2, 'art-du-mentorat', 'L''art du mentorat', 'Accompagner d''autres disciples avec sagesse.',
    array['Appliquer les principes du mentorat biblique', 'Conduire une rencontre de mentorat'], array['famille', 'transformation'], array[2, 5], 3);
  perform pg_temp.add_lesson(m, 'principes-du-mentorat-biblique', 'Les principes du mentorat biblique', 'De Moïse à Josué, de Paul à Timothée : le mentorat est au cœur de la Bible.', array['Une relation de confiance', 'Un objectif de croissance', 'Un temps défini'], true, 1);
  perform pg_temp.add_lesson(m, 'ecouter-et-accompagner', 'Écouter et accompagner', 'Le mentor écoute d''abord ; il pose des questions qui aident l''autre à avancer.', array['L''écoute active', 'Les bonnes questions', 'La confidentialité'], false, 2);
  perform pg_temp.add_lesson(m, 'conduire-une-rencontre', 'Conduire une rencontre de mentorat', 'Une rencontre structurée laisse une trace : un objectif, un échange, un engagement.', array['Préparer la rencontre', 'Fixer un engagement', 'Faire le suivi'], false, 3);

  m := pg_temp.add_module('edm', 2, 'leadership-serviteur', 'Le leadership serviteur', 'Diriger à la manière de Jésus.',
    array['Définir le leadership serviteur', 'Former d''autres leaders'], array['excellence'], array[5], 4);
  perform pg_temp.add_lesson(m, 'le-leadership-selon-jesus', 'Le leadership selon Jésus', 'Jésus a lavé les pieds de ses disciples : le leader sert d''abord.', array['Servir pour diriger', 'L''exemple', 'La vision'], true, 1);
  perform pg_temp.add_lesson(m, 'prendre-des-decisions', 'Prendre des décisions', 'Décider avec prière, conseil et sagesse.', array['Prier', 'Consulter', 'Assumer'], false, 2);
  perform pg_temp.add_lesson(m, 'former-d-autres-leaders', 'Former d''autres leaders', 'Le leader multiplie : il forme ceux qui le remplaceront.', array['Repérer', 'Former', 'Confier'], false, 3);

  -- Diacres
  m := pg_temp.add_module('diacres', 1, 'fondement-du-diaconat', 'Le fondement du diaconat', 'Ce que dit la Bible du service diaconal.',
    array['Expliquer l''origine biblique du diaconat', 'Connaître les qualifications du diacre'], array['adoration'], array[3], 1);
  perform pg_temp.add_lesson(m, 'le-diaconat-dans-les-ecritures', 'Le diaconat dans les Écritures', 'Dès les premières communautés, des serviteurs ont été choisis pour veiller aux besoins de tous.', array['Actes 6', 'Le service des tables', 'Un ministère reconnu'], true, 1);
  perform pg_temp.add_lesson(m, 'les-qualifications-du-diacre', 'Les qualifications du diacre', 'Le diacre est choisi pour sa conduite, sa foi et sa fidélité.', array['Une conduite irréprochable', 'Une foi affermie', 'Une famille bien conduite'], false, 2);
  perform pg_temp.add_lesson(m, 'le-diacre-et-l-eglise-locale', 'Le diacre et l''Église locale', 'Le diacre sert la vision de l''Église locale, en lien avec l''équipe pastorale.', array['La collaboration pastorale', 'Le service concret', 'La disponibilité'], false, 3);

  m := pg_temp.add_module('diacres', 1, 'service-et-familles', 'Le service et les familles', 'Servir les familles avec compassion.',
    array['Identifier les besoins des familles', 'Accompagner dans l''épreuve'], array['famille', 'guerison'], array[2], 2);
  perform pg_temp.add_lesson(m, 'servir-les-familles', 'Servir les familles', 'Le diacre est attentif aux familles et à leurs besoins concrets.', array['Visiter', 'Écouter', 'Orienter'], true, 1);
  perform pg_temp.add_lesson(m, 'accompagner-dans-l-epreuve', 'Accompagner dans l''épreuve', 'Deuil, maladie, difficultés : accompagner avec présence et discrétion.', array['La présence', 'La prière', 'La discrétion'], false, 2);
  perform pg_temp.add_lesson(m, 'la-compassion-en-action', 'La compassion en action', 'La compassion devient service quand elle se traduit en actes.', array['Voir', 'S''approcher', 'Agir'], false, 3);

  m := pg_temp.add_module('diacres', 1, 'integrite-du-serviteur', 'L''intégrité du serviteur', 'Servir avec intégrité et se préparer à la consécration.',
    array['Gérer avec transparence', 'Se préparer à la consécration'], array['guerison'], array[3, 5], 3);
  perform pg_temp.add_lesson(m, 'l-integrite', 'L''intégrité', 'L''intégrité est la cohérence entre la foi, les paroles et les actes.', array['La cohérence', 'La transparence', 'La redevabilité'], true, 1);
  perform pg_temp.add_lesson(m, 'gerer-les-biens-de-l-eglise', 'Gérer les biens de l''Église', 'Gérer les biens confiés avec fidélité et rigueur.', array['La fidélité', 'La rigueur', 'Le compte rendu'], false, 2);
  perform pg_temp.add_lesson(m, 'se-preparer-a-la-consecration', 'Se préparer à la consécration', 'La consécration est un engagement solennel qui se prépare dans la prière.', array['La prière', 'Le discernement', 'L''engagement'], false, 3);
end $$;

-- ───────────────────────── Séances en direct ─────────────────────────
insert into public.live_sessions (formation_id, module_id, title, description, starts_at, duration_minutes, zoom_url, replay_url)
select pg_temp.f(s.f), (select id from public.modules where formation_id = pg_temp.f(s.f) and slug = s.m), s.t, s.d,
  date_trunc('hour', now()) + s.at, 60, 'https://zoom.us/test',
  case when s.at < interval '0' then 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' end
from (values
  ('eds', 'caractere-du-serviteur', 'Cours en direct — L''humilité du serviteur', 'Enseignement et questions-réponses (exemple).', interval '1 day 19 hours'),
  ('eds', 'caractere-du-serviteur', 'Atelier — La discipline spirituelle', 'Atelier pratique en petits groupes (exemple).', interval '6 days 19 hours'),
  ('eds', 'vie-d-adorateur', 'Cours en direct — La prière au quotidien', 'Replay disponible (exemple).', interval '-6 days'),
  ('edm', 'art-du-mentorat', 'Cours en direct — Écouter et accompagner', 'Mises en situation de mentorat (exemple).', interval '2 days 19 hours'),
  ('edm', 'leadership-serviteur', 'Atelier — Prendre des décisions', 'Étude de cas (exemple).', interval '8 days 19 hours'),
  ('edm', 'maturite-spirituelle', 'Cours en direct — Grandir vers la maturité', 'Replay disponible (exemple).', interval '-5 days'),
  ('diacres', 'service-et-familles', 'Cours en direct — Servir les familles', 'Enseignement et témoignages (exemple).', interval '1 day 18 hours'),
  ('diacres', 'integrite-du-serviteur', 'Atelier — Gérer les biens de l''Église', 'Atelier pratique (exemple).', interval '9 days 18 hours'),
  ('diacres', 'fondement-du-diaconat', 'Cours en direct — Le diaconat dans les Écritures', 'Replay disponible (exemple).', interval '-7 days')
) as s(f, m, t, d, at);

-- ───────────────────────── Évaluations ─────────────────────────
insert into public.quizzes (formation_id, module_id, level_id, kind, title, instructions, due_at, duration_minutes, max_attempts, pass_score)
values
  (pg_temp.f('eds'), (select id from public.modules where slug = 'vie-d-adorateur'), pg_temp.lvl('eds', 1), 'quiz', 'Quiz — La vie d''adorateur', 'Répondez aux questions sur le module « La vie d''adorateur ».', now() - interval '12 days', 10, 2, 60),
  (pg_temp.f('eds'), (select id from public.modules where slug = 'caractere-du-serviteur'), pg_temp.lvl('eds', 2), 'quiz', 'Quiz — Le caractère du serviteur', 'Un quiz court pour vérifier vos acquis. Vous disposez de 10 minutes.', now() + interval '5 days', 10, 2, 60),
  (pg_temp.f('eds'), (select id from public.modules where slug = 'caractere-du-serviteur'), pg_temp.lvl('eds', 2), 'exercise', 'Exercice — Mon plan de discipline spirituelle', 'Rédigez votre plan de discipline spirituelle (une page) et déposez-le au format PDF ou DOCX.', now() + interval '10 days', null, 1, 50),
  (pg_temp.f('eds'), null, pg_temp.lvl('eds', 2), 'exam', 'Examen — Niveau 2', 'Examen de fin de niveau. Une seule tentative, 20 minutes.', now() + interval '20 days', 20, 1, 60),
  (pg_temp.f('edm'), (select id from public.modules where slug = 'maturite-spirituelle'), pg_temp.lvl('edm', 1), 'quiz', 'Quiz — Maturité spirituelle', 'Vérifiez vos acquis du module.', now() - interval '20 days', 10, 2, 60),
  (pg_temp.f('edm'), (select id from public.modules where slug = 'art-du-mentorat'), pg_temp.lvl('edm', 2), 'quiz', 'Quiz — L''art du mentorat', 'Un quiz court sur les principes du mentorat.', now() + interval '4 days', 10, 2, 60),
  (pg_temp.f('edm'), null, pg_temp.lvl('edm', 2), 'exam', 'Examen — Niveau 2', 'Examen de fin de parcours.', now() + interval '30 days', 25, 1, 60),
  (pg_temp.f('diacres'), (select id from public.modules where slug = 'fondement-du-diaconat'), pg_temp.lvl('diacres', 1), 'quiz', 'Quiz — Le diaconat dans les Écritures', 'Vérifiez vos acquis du module.', now() + interval '3 days', 10, 3, 70),
  (pg_temp.f('diacres'), null, pg_temp.lvl('diacres', 1), 'exam', 'Examen — Cours fondamentaux', 'Examen écrit des cours fondamentaux.', now() + interval '25 days', 30, 1, 60);

-- Questions (une banque variée : choix unique, multiple, vrai/faux, réponse courte, texte long, association, fichier)
do $$
declare q uuid;
begin
  q := (select id from public.quizzes where title = 'Quiz — La vie d''adorateur');
  perform pg_temp.add_question(q, 'single', 'Selon la leçon, l''adoration est d''abord…', '[{"id":"a","label":"Un style de musique"},{"id":"b","label":"Une attitude du cœur envers Dieu"},{"id":"c","label":"Un moment réservé au dimanche"}]', '"b"', 'L''adoration engage toute la vie, pas seulement le chant.', pg_temp.lesson('eds', 'vie-d-adorateur', 'qu-est-ce-que-l-adoration'), 1);
  perform pg_temp.add_question(q, 'multiple', 'Quels gestes aident à installer une vie de prière régulière ?', '[{"id":"a","label":"Choisir un moment et un lieu"},{"id":"b","label":"Prier avec la Parole"},{"id":"c","label":"Attendre d''en avoir envie"},{"id":"d","label":"Tenir un carnet de prière"}]', '["a","b","d"]', 'La régularité se construit par des habitudes simples.', pg_temp.lesson('eds', 'vie-d-adorateur', 'la-priere-au-quotidien'), 2);
  perform pg_temp.add_question(q, 'true_false', 'Jésus invite à adorer « en esprit et en vérité ».', '[]', 'true', 'Jean 4:24.', pg_temp.lesson('eds', 'vie-d-adorateur', 'adorer-en-esprit-et-en-verite'), 3);
  perform pg_temp.add_question(q, 'short', 'Citez la référence biblique de « en esprit et en vérité ».', '[]', '["jean 4:24","jean 4.24","jean 4 24"]', 'Jean 4:24.', pg_temp.lesson('eds', 'vie-d-adorateur', 'adorer-en-esprit-et-en-verite'), 4);

  q := (select id from public.quizzes where title = 'Quiz — Le caractère du serviteur');
  perform pg_temp.add_question(q, 'single', 'Quel exemple illustre le mieux l''humilité du serviteur ?', '[{"id":"a","label":"Servir pour être remarqué"},{"id":"b","label":"Servir sans chercher la gloire"},{"id":"c","label":"Refuser toute correction"}]', '"b"', 'Le serviteur suit l''exemple de Jésus.', pg_temp.lesson('eds', 'caractere-du-serviteur', 'l-humilite'), 1);
  perform pg_temp.add_question(q, 'true_false', 'La fidélité se construit surtout dans les grandes occasions.', '[]', 'false', 'Elle se construit dans le quotidien.', pg_temp.lesson('eds', 'caractere-du-serviteur', 'la-fidelite-dans-les-petites-choses'), 2);
  perform pg_temp.add_question(q, 'multiple', 'Quels éléments font partie d''une discipline spirituelle ?', '[{"id":"a","label":"La prière"},{"id":"b","label":"Le jeûne"},{"id":"c","label":"La lecture régulière"},{"id":"d","label":"L''improvisation permanente"}]', '["a","b","c"]', 'Un rythme réaliste et régulier.', pg_temp.lesson('eds', 'caractere-du-serviteur', 'la-discipline-spirituelle'), 3);
  perform pg_temp.add_question(q, 'match', 'Associez chaque qualité à sa manifestation.', '{"left":[{"id":"h","label":"Humilité"},{"id":"f","label":"Fidélité"},{"id":"d","label":"Discipline"}],"right":[{"id":"1","label":"Accepter la correction"},{"id":"2","label":"Tenir sa parole"},{"id":"3","label":"Prier chaque jour"}]}', '{"h":"1","f":"2","d":"3"}', 'Chaque qualité se voit dans des actes concrets.', null, 4);
  perform pg_temp.add_question(q, 'long', 'En quelques lignes, décrivez une situation où vous avez choisi la fidélité.', '[]', 'null', 'Réponse personnelle, relue par le formateur.', null, 5, 2);

  q := (select id from public.quizzes where title = 'Exercice — Mon plan de discipline spirituelle');
  perform pg_temp.add_question(q, 'file', 'Déposez votre plan de discipline spirituelle (PDF ou DOCX, 10 Mo maximum).', '[]', 'null', 'Corrigé par le formateur.', null, 1, 10);

  q := (select id from public.quizzes where title = 'Examen — Niveau 2' and formation_id = pg_temp.f('eds'));
  perform pg_temp.add_question(q, 'single', 'La discipline spirituelle repose d''abord sur…', '[{"id":"a","label":"Un rythme réaliste et régulier"},{"id":"b","label":"Des efforts ponctuels intenses"}]', '"a"', '', null, 1);
  perform pg_temp.add_question(q, 'true_false', 'Rendre compte à un responsable aide à persévérer.', '[]', 'true', '', null, 2);
  perform pg_temp.add_question(q, 'long', 'Expliquez comment l''humilité transforme le service en équipe.', '[]', 'null', 'Correction par le formateur.', null, 3, 4);

  q := (select id from public.quizzes where title = 'Quiz — Maturité spirituelle');
  perform pg_temp.add_question(q, 'single', 'La maturité spirituelle se mesure surtout à…', '[{"id":"a","label":"L''ancienneté dans l''Église"},{"id":"b","label":"La ressemblance avec Christ"},{"id":"c","label":"Le nombre de responsabilités"}]', '"b"', '', pg_temp.lesson('edm', 'maturite-spirituelle', 'grandir-vers-la-maturite'), 1);
  perform pg_temp.add_question(q, 'multiple', 'Quels traits font partie du fruit de l''Esprit ?', '[{"id":"a","label":"L''amour"},{"id":"b","label":"La maîtrise de soi"},{"id":"c","label":"L''orgueil"},{"id":"d","label":"La douceur"}]', '["a","b","d"]', 'Galates 5:22-23.', pg_temp.lesson('edm', 'maturite-spirituelle', 'le-caractere-de-christ'), 2);
  perform pg_temp.add_question(q, 'true_false', 'L''épreuve peut affermir la foi.', '[]', 'true', '', pg_temp.lesson('edm', 'maturite-spirituelle', 'perseverer-dans-l-epreuve'), 3);

  q := (select id from public.quizzes where title = 'Quiz — L''art du mentorat');
  perform pg_temp.add_question(q, 'single', 'Dans une rencontre de mentorat, le mentor commence par…', '[{"id":"a","label":"Donner des conseils"},{"id":"b","label":"Écouter"},{"id":"c","label":"Raconter son parcours"}]', '"b"', '', pg_temp.lesson('edm', 'art-du-mentorat', 'ecouter-et-accompagner'), 1);
  perform pg_temp.add_question(q, 'match', 'Associez chaque binôme biblique.', '{"left":[{"id":"m","label":"Moïse"},{"id":"p","label":"Paul"}],"right":[{"id":"j","label":"Josué"},{"id":"t","label":"Timothée"}]}', '{"m":"j","p":"t"}', '', pg_temp.lesson('edm', 'art-du-mentorat', 'principes-du-mentorat-biblique'), 2);
  perform pg_temp.add_question(q, 'true_false', 'La confidentialité est essentielle dans le mentorat.', '[]', 'true', '', null, 3);
  perform pg_temp.add_question(q, 'short', 'Quel mot résume l''engagement pris en fin de rencontre ?', '[]', '["engagement","un engagement"]', '', pg_temp.lesson('edm', 'art-du-mentorat', 'conduire-une-rencontre'), 4);

  q := (select id from public.quizzes where title = 'Examen — Niveau 2' and formation_id = pg_temp.f('edm'));
  perform pg_temp.add_question(q, 'long', 'Présentez votre démarche de mentorat auprès d''un disciple.', '[]', 'null', '', null, 1, 5);

  q := (select id from public.quizzes where title = 'Quiz — Le diaconat dans les Écritures');
  perform pg_temp.add_question(q, 'single', 'Dans quel livre trouve-t-on le choix des premiers serviteurs ?', '[{"id":"a","label":"Actes des apôtres"},{"id":"b","label":"Lévitique"},{"id":"c","label":"Apocalypse"}]', '"a"', 'Actes 6.', pg_temp.lesson('diacres', 'fondement-du-diaconat', 'le-diaconat-dans-les-ecritures'), 1);
  perform pg_temp.add_question(q, 'multiple', 'Quelles qualités sont attendues d''un diacre ?', '[{"id":"a","label":"Une conduite irréprochable"},{"id":"b","label":"Une foi affermie"},{"id":"c","label":"La recherche du prestige"}]', '["a","b"]', '', pg_temp.lesson('diacres', 'fondement-du-diaconat', 'les-qualifications-du-diacre'), 2);
  perform pg_temp.add_question(q, 'true_false', 'Le diacre sert en lien avec l''équipe pastorale.', '[]', 'true', '', pg_temp.lesson('diacres', 'fondement-du-diaconat', 'le-diacre-et-l-eglise-locale'), 3);

  q := (select id from public.quizzes where title = 'Examen — Cours fondamentaux');
  perform pg_temp.add_question(q, 'long', 'Expliquez le rôle du diacre auprès des familles.', '[]', 'null', '', null, 1, 5);
end $$;

-- ───────────────────────── Candidatures, échéanciers, paiements, reçus ─────────────────────────
insert into public.applications (reference, user_id, formation_id, registration_status, payment_status, admission_status, submitted_at, completed_at, created_at)
values
  ('CTF-EX-EDS-0001', 'd0000000-0000-4000-8000-000000000001', pg_temp.f('eds'), 'complete', 'partial', 'admitted', now() - interval '60 days', now() - interval '58 days', now() - interval '60 days'),
  ('CTF-EX-EDM-0001', 'd0000000-0000-4000-8000-000000000002', pg_temp.f('edm'), 'complete', 'partial', 'admitted', now() - interval '90 days', now() - interval '88 days', now() - interval '90 days'),
  ('CTF-EX-DIA-0001', 'd0000000-0000-4000-8000-000000000003', pg_temp.f('diacres'), 'complete', 'confirmed', 'admitted', now() - interval '120 days', now() - interval '118 days', now() - interval '120 days'),
  ('CTF-EX-EDM-0002', 'd0000000-0000-4000-8000-000000000006', pg_temp.f('edm'), 'complete', 'confirmed', 'under_review', now() - interval '3 days', now() - interval '3 days', now() - interval '3 days');

do $$
declare
  r record; sid uuid; pid uuid; n int := 0;
begin
  for r in select * from (values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'CTF-EX-EDS-0001', 'Frais d''inscription', -58, 10000, 10000, 'paid', 'orange_money'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'CTF-EX-EDS-0001', 'Formation — 1er versement', -30, 20000, 20000, 'paid', 'wave'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'CTF-EX-EDS-0001', 'Formation — 2e versement', 20, 20000, 0, 'upcoming', null),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'CTF-EX-EDM-0001', 'Frais d''inscription', -88, 15000, 15000, 'paid', 'mtn_momo'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'CTF-EX-EDM-0001', 'Formation — 1er versement', -5, 30000, 10000, 'late', 'mtn_momo'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'CTF-EX-EDM-0001', 'Formation — 2e versement', 40, 30000, 0, 'upcoming', null),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'CTF-EX-DIA-0001', 'Frais d''inscription', -118, 15000, 15000, 'paid', 'orange_money'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'CTF-EX-DIA-0001', 'Formation — versement unique', -110, 50000, 50000, 'paid', 'card')
  ) as v(uid, ref, label, due, amount, paid, status, method) loop
    insert into public.payment_schedules (user_id, application_id, label, due_date, amount, paid_amount, status)
    values (r.uid, (select id from public.applications where reference = r.ref), r.label, current_date + r.due, r.amount, r.paid, r.status::public.schedule_status)
    returning id into sid;
    if r.paid > 0 then
      n := n + 1;
      insert into public.payments (application_id, user_id, amount, method, provider, provider_reference, status, confirmed_at, schedule_id, created_at)
      values ((select id from public.applications where reference = r.ref), r.uid, r.paid, r.method, 'mock', 'EX-PAY-' || lpad(n::text, 4, '0'),
        'confirmed', now() + make_interval(days => least(r.due, -1)), sid, now() + make_interval(days => least(r.due, -1)))
      returning id into pid;
      insert into public.receipts (user_id, payment_id, number, issued_at)
      values (r.uid, pid, 'REC-EX-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0'), now() + make_interval(days => least(r.due, -1)));
    end if;
  end loop;
end $$;

-- ───────────────────────── Progression ─────────────────────────
do $$
declare
  eds uuid := 'd0000000-0000-4000-8000-000000000001';
  edm uuid := 'd0000000-0000-4000-8000-000000000002';
  dia uuid := 'd0000000-0000-4000-8000-000000000003';
begin
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'vie-d-adorateur', 'qu-est-ce-que-l-adoration'), 24);
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'vie-d-adorateur', 'la-priere-au-quotidien'), 22);
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'vie-d-adorateur', 'adorer-en-esprit-et-en-verite'), 21);
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'fondements-de-la-foi', 'le-salut-en-jesus-christ'), 18);
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'fondements-de-la-foi', 'la-parole-nourriture-du-disciple'), 15);
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'fondements-de-la-foi', 'le-bapteme-et-la-vie-nouvelle'), 13);
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'caractere-du-serviteur', 'l-humilite'), 3);
  perform pg_temp.complete(eds, pg_temp.lesson('eds', 'caractere-du-serviteur', 'la-fidelite-dans-les-petites-choses'), 2);
  insert into public.lesson_progress (user_id, lesson_id, position_seconds, progress_percent, updated_at)
  values (eds, pg_temp.lesson('eds', 'caractere-du-serviteur', 'la-discipline-spirituelle'), 0, 40, now() - interval '1 day');

  perform pg_temp.complete(edm, pg_temp.lesson('edm', 'maturite-spirituelle', 'grandir-vers-la-maturite'), 30);
  perform pg_temp.complete(edm, pg_temp.lesson('edm', 'maturite-spirituelle', 'le-caractere-de-christ'), 27);
  perform pg_temp.complete(edm, pg_temp.lesson('edm', 'maturite-spirituelle', 'perseverer-dans-l-epreuve'), 25);
  perform pg_temp.complete(edm, pg_temp.lesson('edm', 'vie-de-disciple', 'marcher-avec-dieu'), 20);
  perform pg_temp.complete(edm, pg_temp.lesson('edm', 'vie-de-disciple', 'le-disciple-et-la-parole'), 18);
  perform pg_temp.complete(edm, pg_temp.lesson('edm', 'vie-de-disciple', 'le-disciple-et-la-communaute'), 16);
  insert into public.lesson_progress (user_id, lesson_id, position_seconds, progress_percent, updated_at)
  values (edm, pg_temp.lesson('edm', 'art-du-mentorat', 'principes-du-mentorat-biblique'), 2, 45, now() - interval '2 days');

  perform pg_temp.complete(dia, pg_temp.lesson('diacres', 'fondement-du-diaconat', 'le-diaconat-dans-les-ecritures'), 9);
  perform pg_temp.complete(dia, pg_temp.lesson('diacres', 'fondement-du-diaconat', 'les-qualifications-du-diacre'), 6);
  insert into public.lesson_progress (user_id, lesson_id, position_seconds, progress_percent, updated_at)
  values (dia, pg_temp.lesson('diacres', 'fondement-du-diaconat', 'le-diacre-et-l-eglise-locale'), 0, 30, now() - interval '1 day');

  perform pg_temp.graded_attempt((select id from public.quizzes where title = 'Quiz — La vie d''adorateur'), eds, 12, array[4]);
  perform pg_temp.graded_attempt((select id from public.quizzes where title = 'Quiz — Maturité spirituelle'), edm, 20);
  perform pg_temp.graded_attempt((select id from public.quizzes where title = 'Quiz — Le diaconat dans les Écritures'), dia, 4, array[2, 3]);

  insert into public.grades (user_id, module_id, label, score, max_score, comment, grader_name, graded_at) values
    (eds, (select id from public.modules where slug = 'fondements-de-la-foi'), 'Travail écrit — Les fondements de la foi', 15, 20, 'Réflexion claire et bien structurée. (exemple)', 'Formateur (exemple)', now() - interval '14 days'),
    (edm, (select id from public.modules where slug = 'vie-de-disciple'), 'Travail écrit — La vie de disciple', 16.5, 20, 'Très bonne mise en pratique. (exemple)', 'Formateur (exemple)', now() - interval '15 days');
end $$;

-- ───────────────────────── Validations ─────────────────────────
insert into public.validations (user_id, formation_id, kind, level_id, title, description, criteria, decision, decided_at, signatory, certificate_number) values
  ('d0000000-0000-4000-8000-000000000001', pg_temp.f('eds'), 'level', pg_temp.lvl('eds', 1), 'Validation du niveau 1 — Fondements', 'Le niveau 1 de l''École des STAFs est validé.',
    '[{"label":"Toutes les leçons terminées","met":true},{"label":"Note minimale de 60 % aux évaluations","met":true},{"label":"Présence aux séances en direct","met":true}]',
    'granted', now() - interval '10 days', 'Direction de CTF ACADEMY (exemple)', 'CTF-EX-EDS-N1-0001'),
  ('d0000000-0000-4000-8000-000000000001', pg_temp.f('eds'), 'level', pg_temp.lvl('eds', 2), 'Validation du niveau 2 — Croissance', '',
    '[{"label":"Toutes les leçons terminées","met":false},{"label":"Note minimale de 60 % aux évaluations","met":false},{"label":"Présence aux séances en direct","met":true}]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000001', pg_temp.f('eds'), 'level', pg_temp.lvl('eds', 3), 'Validation du niveau 3 — Service', '', '[]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000001', pg_temp.f('eds'), 'level', pg_temp.lvl('eds', 4), 'Validation du niveau 4 — Excellence', '', '[]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000001', pg_temp.f('eds'), 'graduation', null, 'Graduation STAF', 'La graduation couronne les 4 niveaux validés.',
    '[{"label":"4 niveaux validés","met":false},{"label":"Reconnaissance du service","met":false},{"label":"Avis favorable de la direction","met":false}]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000001', pg_temp.f('eds'), 'service', null, 'Reconnaissance du service', 'Reconnaissance officielle du service accompli dans un département.',
    '[{"label":"40 heures de service","met":false},{"label":"Attestation du responsable de département","met":true}]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000002', pg_temp.f('edm'), 'level', pg_temp.lvl('edm', 1), 'Validation du niveau 1 — Disciple affermi', 'Le niveau 1 de l''École des Disciples Mentors est validé.',
    '[{"label":"Toutes les leçons terminées","met":true},{"label":"Note minimale de 60 % aux évaluations","met":true}]',
    'granted', now() - interval '12 days', 'Direction de CTF ACADEMY (exemple)', 'CTF-EX-EDM-N1-0001'),
  ('d0000000-0000-4000-8000-000000000002', pg_temp.f('edm'), 'level', pg_temp.lvl('edm', 2), 'Validation du niveau 2 — Disciple mentor', '',
    '[{"label":"Toutes les leçons terminées","met":false},{"label":"3 exercices de mentorat validés","met":false},{"label":"2 travaux de leadership validés","met":false}]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000002', pg_temp.f('edm'), 'path', null, 'Validation du parcours EDM', 'Validation du parcours complet de Disciple Mentor.',
    '[{"label":"2 niveaux validés","met":false},{"label":"Suivi des responsabilités favorable","met":false}]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000003', pg_temp.f('diacres'), 'level', pg_temp.lvl('diacres', 1), 'Validation des cours fondamentaux', '',
    '[{"label":"Toutes les leçons terminées","met":false},{"label":"Note minimale aux évaluations","met":false}]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000003', pg_temp.f('diacres'), 'defense', null, 'Soutenance du mémoire', 'Résultat de la soutenance devant le jury.', '[]', 'pending', null, null, null),
  ('d0000000-0000-4000-8000-000000000003', pg_temp.f('diacres'), 'consecration', null, 'Décision de consécration', 'Décision de l''équipe pastorale après l''ensemble du parcours.', '[]', 'pending', null, null, null);

-- ───────────────────────── EDS : service ─────────────────────────
insert into public.service_records (user_id, activity, department, served_on, hours, recognized) values
  ('d0000000-0000-4000-8000-000000000001', 'Accueil lors du culte du dimanche', 'Accueil', current_date - 28, 4, true),
  ('d0000000-0000-4000-8000-000000000001', 'Préparation de la salle', 'Logistique', current_date - 21, 3, true),
  ('d0000000-0000-4000-8000-000000000001', 'Accueil lors du culte du dimanche', 'Accueil', current_date - 14, 4, false),
  ('d0000000-0000-4000-8000-000000000001', 'Soutien à la journée des familles', 'Familles', current_date - 7, 6, false);

-- ───────────────────────── EDM : mentorat, leadership, responsabilités ─────────────────────────
insert into public.mentoring_exercises (user_id, title, instructions, due_at, status, response, submitted_at, feedback, feedback_by) values
  ('d0000000-0000-4000-8000-000000000002', 'Première rencontre de mentorat', 'Conduisez une première rencontre et rédigez un compte rendu (objectif, échange, engagement).', now() - interval '15 days', 'validated', 'Compte rendu déposé. (exemple)', now() - interval '16 days', 'Compte rendu précis, engagement clair. (exemple)', 'Formateur (exemple)'),
  ('d0000000-0000-4000-8000-000000000002', 'Suivi à un mois', 'Faites le point avec votre disciple sur l''engagement pris et notez les progrès.', now() + interval '6 days', 'submitted', 'Rencontre réalisée, compte rendu joint. (exemple)', now() - interval '1 day', null, null),
  ('d0000000-0000-4000-8000-000000000002', 'Étude de cas — accompagner dans l''épreuve', 'Analysez le cas proposé et décrivez votre démarche d''accompagnement.', now() + interval '14 days', 'todo', null, null, null, null);
insert into public.leadership_works (user_id, title, instructions, due_at, status, response, submitted_at, score, max_score, feedback, feedback_by) values
  ('d0000000-0000-4000-8000-000000000002', 'Projet de service en équipe', 'Concevez un projet de service avec votre équipe : objectif, étapes, rôles, évaluation.', now() - interval '3 days', 'to_revise', 'Première version du projet. (exemple)', now() - interval '6 days', null, null, 'Précisez les rôles et le calendrier, puis déposez une nouvelle version. (exemple)', 'Formateur (exemple)'),
  ('d0000000-0000-4000-8000-000000000002', 'Plan de formation d''un futur leader', 'Proposez un plan pour former un futur responsable sur six mois.', now() + interval '21 days', 'todo', null, null, null, null, null, null);
insert into public.responsibilities (user_id, role, place, starts_on, ends_on, supervisor_name, status, notes) values
  ('d0000000-0000-4000-8000-000000000002', 'Responsable de cellule', 'Cellule de quartier (exemple)', current_date - 120, null, 'Responsable des cellules (exemple)', 'active',
    jsonb_build_array(
      jsonb_build_object('date', current_date - 30, 'author', 'Responsable des cellules (exemple)', 'text', 'Bonne dynamique du groupe, participation en hausse.'),
      jsonb_build_object('date', current_date - 7, 'author', 'Responsable des cellules (exemple)', 'text', 'Prévoir la formation d''un adjoint.'))),
  ('d0000000-0000-4000-8000-000000000002', 'Assistant au département jeunesse', 'Département jeunesse (exemple)', current_date - 300, current_date - 130, 'Responsable jeunesse (exemple)', 'completed',
    jsonb_build_array(jsonb_build_object('date', current_date - 135, 'author', 'Responsable jeunesse (exemple)', 'text', 'Mission accomplie avec fidélité.')));

-- ───────────────────────── Diacres : stage, rapport, mémoire, soutenance, pastorale ─────────────────────────
do $$
declare
  dia uuid := 'd0000000-0000-4000-8000-000000000003';
  sup uuid := 'd0000000-0000-4000-8000-000000000004';
  iid uuid; tid uuid; v1 uuid; v2 uuid; c1 uuid;
begin
  insert into public.internships (user_id, place, supervisor_id, supervisor_name, starts_on, ends_on, target_hours)
  values (dia, 'Département d''entraide aux familles (exemple)', sup, 'Superviseur Exemple', current_date - 45, current_date + 45, 120)
  returning id into iid;
  insert into public.internship_steps (internship_id, title, description, sort_order, due_on, status, validated_at, comment) values
    (iid, 'Observation', 'Découvrir le fonctionnement du département et observer les diacres en service.', 1, current_date - 30, 'validated', now() - interval '28 days', 'Observation attentive et ponctuelle. (exemple)'),
    (iid, 'Pratique encadrée', 'Servir sous la supervision d''un diacre : visites, accueil, entraide.', 2, current_date + 15, 'in_progress', null, null),
    (iid, 'Évaluation finale', 'Bilan avec le superviseur et validation du stage.', 3, current_date + 45, 'pending', null, null);
  insert into public.internship_hours (internship_id, worked_on, hours, activity, validated) values
    (iid, current_date - 40, 6, 'Observation du service d''entraide', true),
    (iid, current_date - 33, 8, 'Visites aux familles avec un diacre', true),
    (iid, current_date - 26, 7, 'Accueil et orientation des familles', true),
    (iid, current_date - 19, 9, 'Organisation d''une distribution', true),
    (iid, current_date - 12, 10, 'Visites et suivi des familles', false),
    (iid, current_date - 5, 12, 'Préparation de la journée des familles', false);
  insert into public.internship_reports (internship_id, user_id, version, storage_path, file_name, size_bytes, status, supervisor_comment, created_at)
  values (iid, dia, 1, dia || '/rapport/v1-rapport-de-stage-exemple.pdf', 'rapport-de-stage-v1.pdf', 4200, 'to_fix',
    'Développez davantage la partie « bilan personnel » et ajoutez le décompte des heures. (exemple)', now() - interval '8 days');

  insert into public.theses (user_id, title, supervisor_id, supervisor_name)
  values (dia, 'Le diacre, serviteur des familles (exemple)', sup, 'Superviseur Exemple') returning id into tid;
  insert into public.thesis_versions (thesis_id, version, storage_path, file_name, size_bytes, mime_type, status, author_id, created_at) values
    (tid, 1, dia || '/memoire/v1-memoire-exemple.pdf', 'memoire-v1.pdf', 4200, 'application/pdf', 'to_fix', dia, now() - interval '25 days')
    returning id into v1;
  insert into public.thesis_versions (thesis_id, version, storage_path, file_name, size_bytes, mime_type, status, author_id, created_at) values
    (tid, 2, dia || '/memoire/v2-memoire-exemple.pdf', 'memoire-v2.pdf', 4200, 'application/pdf', 'in_review', dia, now() - interval '4 days')
    returning id into v2;
  insert into public.thesis_comments (thesis_id, version_id, author_id, author_name, author_role, section, body, status, created_at)
  values (tid, v1, sup, 'Superviseur Exemple', 'supervisor', 'Introduction', 'La problématique doit être formulée plus clairement dès l''introduction. (exemple)', 'resolved', now() - interval '22 days')
  returning id into c1;
  insert into public.thesis_comments (thesis_id, version_id, parent_id, author_id, author_name, author_role, section, body, status, created_at) values
    (tid, v1, c1, dia, 'Esther Exemple', 'student', 'Introduction', 'Merci, j''ai reformulé la problématique dans la version 2. (exemple)', 'resolved', now() - interval '5 days');
  insert into public.thesis_comments (thesis_id, version_id, author_id, author_name, author_role, section, body, status, created_at) values
    (tid, v2, sup, 'Superviseur Exemple', 'supervisor', 'Chapitre 2 — page 12', 'Appuyez votre analyse sur au moins deux exemples concrets tirés du stage. (exemple)', 'open', now() - interval '2 days'),
    (tid, v2, sup, 'Superviseur Exemple', 'supervisor', 'Bibliographie', 'Harmonisez le format des références. (exemple)', 'open', now() - interval '2 days');
  insert into public.defense_sessions (thesis_id, proposed_dates, place, zoom_url, jury, status)
  values (tid, array[date_trunc('day', now()) + interval '35 days 10 hours', date_trunc('day', now()) + interval '38 days 15 hours'],
    'Salle de formation (exemple)', 'https://zoom.us/test', array['Président du jury (exemple)', 'Superviseur Exemple', 'Membre de l''équipe pastorale (exemple)'], 'proposed');

  insert into public.pastoral_evaluations (user_id, title, status, evaluator_name, scheduled_on, evaluated_at, feedback) values
    (dia, 'Évaluation du service', 'done', 'Équipe pastorale (exemple)', current_date - 20, now() - interval '20 days', 'Service fidèle et apprécié des familles. (exemple)'),
    (dia, 'Entretien pastoral', 'pending', 'Équipe pastorale (exemple)', current_date + 50, null, null);
end $$;

-- ───────────────────────── Communication ─────────────────────────
insert into public.announcements (formation_id, title, body, pinned, author_name, published_at) values
  (null, 'Bienvenue dans votre espace étudiant', 'Retrouvez ici vos cours, évaluations, paiements et validations. En cas de difficulté, l''assistance est disponible dans « Messages et assistance ». (exemple)', true, 'Direction de CTF ACADEMY', now() - interval '20 days'),
  (null, 'Maintenance prévue', 'Une courte maintenance est prévue ce week-end : l''espace restera accessible, quelques lenteurs sont possibles. (exemple)', false, 'Équipe technique', now() - interval '2 days'),
  (pg_temp.f('eds'), 'Ouverture du niveau 2', 'Les modules du niveau 2 « Croissance » sont disponibles. Bon parcours ! (exemple)', false, 'Coordination EDS', now() - interval '9 days'),
  (pg_temp.f('edm'), 'Exercices de mentorat', 'Pensez à déposer vos comptes rendus de mentorat avant la date limite. (exemple)', false, 'Coordination EDM', now() - interval '4 days'),
  (pg_temp.f('diacres'), 'Dates de soutenance', 'Les créneaux de soutenance sont proposés dans l''espace mémoire. Merci de les confirmer. (exemple)', true, 'Coordination des diacres', now() - interval '3 days');

insert into public.announcement_reads (user_id, announcement_id)
select 'd0000000-0000-4000-8000-000000000001', id from public.announcements where title = 'Bienvenue dans votre espace étudiant';

insert into public.admin_documents (formation_id, category, title, description, url, sort_order) values
  (null, 'reglement', 'Règlement intérieur (exemple)', 'Les règles de vie et d''assiduité de CTF ACADEMY.', '/demo/reglement-interieur-exemple.pdf', 1),
  (null, 'calendrier', 'Calendrier officiel (exemple)', 'Les grandes dates de l''année de formation.', '/demo/calendrier-officiel-exemple.pdf', 2),
  (null, 'contacts', 'Contacts utiles (exemple)', 'Secrétariat, coordination et assistance.', '/demo/contacts-exemple.pdf', 3);

do $$
declare r record; t uuid;
begin
  for r in select * from (values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'Awa Exemple', 'Question sur la discipline spirituelle'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'Koffi Exemple', 'Compte rendu de mentorat'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'Esther Exemple', 'Préparation de la pratique encadrée')
  ) as v(uid, name, subject) loop
    insert into public.message_threads (student_id, staff_id, staff_name, category, subject, created_at, updated_at)
    values (r.uid, 'd0000000-0000-4000-8000-000000000005', 'Formateur Exemple', 'trainer', r.subject, now() - interval '3 days', now() - interval '3 hours')
    returning id into t;
    insert into public.messages (thread_id, author_id, author_name, body, read_at, created_at) values
      (t, r.uid, r.name, 'Bonjour, j''aurais une question sur ce point du cours. Pouvez-vous m''aider ? (exemple)', now() - interval '2 days', now() - interval '3 days'),
      (t, 'd0000000-0000-4000-8000-000000000005', 'Formateur Exemple', 'Bonjour ! Bien sûr. Relisez d''abord la leçon associée, puis dites-moi ce qui reste flou. (exemple)', now() - interval '2 days', now() - interval '2 days'),
      (t, 'd0000000-0000-4000-8000-000000000005', 'Formateur Exemple', 'Je vous propose d''en parler aussi lors du prochain cours en direct. (exemple)', null, now() - interval '3 hours');
    insert into public.message_threads (student_id, staff_name, category, subject, created_at, updated_at)
    values (r.uid, 'Secrétariat Exemple', 'administrative', 'Votre dossier d''étudiant', now() - interval '10 days', now() - interval '10 days')
    returning id into t;
    insert into public.messages (thread_id, author_name, body, read_at, created_at)
    values (t, 'Secrétariat Exemple', 'Votre dossier est complet. Vos reçus sont disponibles dans « Mes paiements ». (exemple)', now() - interval '9 days', now() - interval '10 days');
    insert into public.notifications (user_id, category, title, body, href, read_at, created_at) values
      (r.uid, 'message', 'Nouveau message du formateur', 'Formateur Exemple vous a répondu.', '/espace-etudiant/messages/formateurs', null, now() - interval '3 hours'),
      (r.uid, 'live', 'Cours en direct demain', 'Pensez à rejoindre la séance sur Zoom.', '/espace-etudiant/calendrier', null, now() - interval '5 hours'),
      (r.uid, 'grade', 'Nouvelle note disponible', 'Votre quiz a été corrigé.', '/espace-etudiant/evaluations?onglet=resultats', now() - interval '4 days', now() - interval '5 days');
  end loop;
  insert into public.notifications (user_id, category, title, body, href, created_at) values
    ('d0000000-0000-4000-8000-000000000003', 'comment', 'Nouveau commentaire sur votre mémoire', 'Votre superviseur a commenté la version 2.', '/espace-etudiant/diacres/memoire', now() - interval '2 days'),
    ('d0000000-0000-4000-8000-000000000001', 'validation', 'Niveau 1 validé', 'Félicitations, votre niveau 1 est validé !', '/espace-etudiant/validations', now() - interval '10 days');
end $$;

insert into public.support_tickets (user_id, category, subject, description, status, resolution, created_at, updated_at) values
  ('d0000000-0000-4000-8000-000000000001', 'video', 'La vidéo ne se lance pas', 'Sur mon téléphone, la vidéo de la leçon reste noire. (exemple)', 'resolved', 'Mettez à jour votre navigateur ou activez le mode allégé. (exemple)', now() - interval '18 days', now() - interval '17 days');

insert into public.calendar_events (formation_id, kind, title, description, starts_at) values
  (pg_temp.f('eds'), 'milestone', 'Fin du niveau 2 (exemple)', 'Date indicative de fin du niveau 2.', date_trunc('day', now()) + interval '28 days 9 hours'),
  (pg_temp.f('edm'), 'milestone', 'Bilan de mi-parcours (exemple)', 'Rencontre de bilan avec la coordination.', date_trunc('day', now()) + interval '18 days 18 hours'),
  (pg_temp.f('diacres'), 'milestone', 'Fin du stage pratique (exemple)', 'Date de fin prévue du stage.', date_trunc('day', now()) + interval '45 days 9 hours');
