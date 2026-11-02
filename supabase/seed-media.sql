-- CTF ACADEMY — seed d'exemple : médiathèque (3 albums, 12 photos), 4 vidéos, 6 événements.
-- Tout est marqué « Exemple » (is_example = true). À remplacer par les contenus officiels
-- quand le module « Médiathèque et événements » de l'administration sera livré.
-- Les chemins /media/… désignent les visuels de remplacement générés (public/media/),
-- ou des chemins du bucket storage « media » une fois les fichiers déposés.

-- ───────────────────────── Albums (3) ─────────────────────────
insert into public.media_albums (id, slug, title, description, cover, year, sort_order) values
  ('a0000001-0000-4000-8000-000000000001', 'campus', 'Le campus',
   'Le bâtiment et les espaces de l''Académie. (Exemple)',
   '/media/photos/campus-1.png', extract(year from now())::smallint, 1),
  ('a0000001-0000-4000-8000-000000000002', 'cultes', 'Cultes et célébrations',
   'Moments d''adoration et d''enseignement. (Exemple)',
   '/media/photos/culte-1.png', extract(year from now())::smallint, 2),
  ('a0000001-0000-4000-8000-000000000003', 'evenements', 'Événements',
   'Conférences, graduations et temps forts. (Exemple)',
   '/media/photos/event-1.png', extract(year from now())::smallint, 3)
on conflict (slug) do nothing;

-- ───────────────────────── Photos (12) ─────────────────────────
insert into public.media_photos (album_id, title, caption, storage_path, width, height, featured, sort_order) values
  ('a0000001-0000-4000-8000-000000000001', 'Photo campus 1 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/campus-1.png', 1200, 900, true, 1),
  ('a0000001-0000-4000-8000-000000000001', 'Photo campus 2 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/campus-2.png', 1200, 800, false, 2),
  ('a0000001-0000-4000-8000-000000000001', 'Photo campus 3 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/campus-3.png', 1200, 1000, false, 3),
  ('a0000001-0000-4000-8000-000000000001', 'Photo campus 4 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/campus-4.png', 1200, 800, true, 4),
  ('a0000001-0000-4000-8000-000000000002', 'Photo cultes 1 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/culte-1.png', 1200, 800, true, 1),
  ('a0000001-0000-4000-8000-000000000002', 'Photo cultes 2 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/culte-2.png', 1200, 1000, false, 2),
  ('a0000001-0000-4000-8000-000000000002', 'Photo cultes 3 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/culte-3.png', 1200, 800, false, 3),
  ('a0000001-0000-4000-8000-000000000002', 'Photo cultes 4 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/culte-4.png', 1200, 900, true, 4),
  ('a0000001-0000-4000-8000-000000000003', 'Photo evenements 1 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/event-1.png', 1200, 800, true, 1),
  ('a0000001-0000-4000-8000-000000000003', 'Photo evenements 2 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/event-2.png', 1200, 900, false, 2),
  ('a0000001-0000-4000-8000-000000000003', 'Photo evenements 3 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/event-3.png', 1200, 800, false, 3),
  ('a0000001-0000-4000-8000-000000000003', 'Photo evenements 4 (Exemple)', 'Légende de la photo (Exemple).', '/media/photos/event-4.png', 1200, 1000, false, 4);

-- ───────────────────────── Vidéos (4) ─────────────────────────
-- url vide : les exemples n'embarquent pas de source tierce (iframe chargée au clic).
insert into public.media_videos (slug, title, description, source, url, poster, duration_sec, category, published_at, featured) values
  ('culte-dadoration-exemple', 'Culte d''adoration (Exemple)',
   'Un moment d''adoration et de louange à l''Église. (Exemple)',
   'upload', '', '/media/videos/culte.png', 342, 'cultes', now() - interval '7 days', true),
  ('enseignement-vision-exemple', 'Enseignement sur la Vision (Exemple)',
   'Comprendre la Vision du Centre de Transformation des Familles. (Exemple)',
   'upload', '', '/media/videos/enseignement.png', 2880, 'formations', now() - interval '14 days', false),
  ('temoignage-famille-exemple', 'Témoignage : une famille transformée (Exemple)',
   'Le récit d''une famille restaurée par la grâce. (Exemple)',
   'upload', '', '/media/videos/temoignage.png', 438, 'temoignages', now() - interval '21 days', false),
  ('ceremonie-graduation-exemple', 'Cérémonie de graduation (Exemple)',
   'La consécration des STAFs et mentors diplômés. (Exemple)',
   'upload', '', '/media/videos/ceremonie.png', 5520, 'evenements', now() - interval '40 days', false)
on conflict (slug) do nothing;

-- ───────────────────────── Événements (6 : 3 à venir, 3 passés) ─────────────────────────
insert into public.events (slug, title, description, type, starts_at, ends_at, place, address, cover, featured, status) values
  ('conference-familles-exemple', 'Conférence « Familles transformées » (Exemple)',
   'Une conférence pour équiper les couples et les familles : enseignements, ateliers et temps d''échange. (Exemple — texte officiel à venir.)',
   'conference', now() + interval '12 days', now() + interval '12 days' + interval '8 hours',
   'Auditorium CTF (Exemple)', 'Adresse de l''Église (Exemple)', '/media/events/conference.png', true, 'publie'),
  ('journee-portes-ouvertes-exemple', 'Journée portes ouvertes (Exemple)',
   'Venez découvrir les formations de CTF ACADEMY, rencontrer les formateurs et visiter le campus. (Exemple — texte officiel à venir.)',
   'formation', now() + interval '21 days', now() + interval '21 days' + interval '3 hours',
   'Campus CTF (Exemple)', 'Adresse de l''Église (Exemple)', '/media/events/seminaire.png', false, 'publie'),
  ('graduation-eds-exemple', 'Graduation de l''École des STAFs (Exemple)',
   'La cérémonie officielle de fin de parcours : remise des attestations et consécration des STAFs. (Exemple — texte officiel à venir.)',
   'ceremonie', now() + interval '34 days', now() + interval '34 days' + interval '3 hours',
   'Auditorium CTF (Exemple)', 'Adresse de l''Église (Exemple)', '/media/events/graduation.png', true, 'publie'),
  ('culte-special-exemple', 'Culte spécial d''action de grâce (Exemple)',
   'Un culte de célébration ouvert à tous. (Exemple — texte officiel à venir.)',
   'culte', now() - interval '9 days', now() - interval '9 days' + interval '3 hours',
   'Auditorium CTF (Exemple)', 'Adresse de l''Église (Exemple)', '/media/events/culte.png', false, 'publie'),
  ('retraite-leadership-exemple', 'Retraite de leadership (Exemple)',
   'Deux journées de retraite pour les responsables et mentors. (Exemple — texte officiel à venir.)',
   'retraite', now() - interval '30 days', now() - interval '29 days',
   'Lieu de retraite (Exemple)', 'Adresse à confirmer (Exemple)', '/media/events/retraite.png', false, 'publie'),
  ('concert-louange-exemple', 'Concert de louange (Exemple)',
   'Une soirée de louange et d''adoration avec les équipes de l''Église. (Exemple — texte officiel à venir.)',
   'concert', now() - interval '48 days', now() - interval '48 days' + interval '2 hours',
   'Auditorium CTF (Exemple)', 'Adresse de l''Église (Exemple)', '/media/events/concert.png', false, 'publie')
on conflict (slug) do nothing;
