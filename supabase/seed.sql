-- CTF ACADEMY — données initiales.
-- ⚠️ Les durées, montants et dates ci-dessous sont des VALEURS D'EXEMPLE (is_example = true).
-- TODO: remplacer par les valeurs officielles de l'Église.

-- Vision (texte officiel)
insert into public.church_vision (text, is_current) values
  ('Former une armée de disciples-adorateurs de Jésus travaillant dans l''excellence pour la transformation et la guérison des familles.', true);

-- 5 mots clés (définitions et versets : TODO texte officiel)
insert into public.key_words (sort_order, slug, label, definition, color, icon, inspiration_text, inspiration_reference) values
  (1, 'adoration', 'Adoration', 'Placer Dieu au centre de toute chose et lui rendre un culte en esprit et en vérité, dans la prière comme dans la vie de chaque jour.', '#F2C230', 'sunrise', 'Dieu est Esprit, et il faut que ceux qui l''adorent l''adorent en esprit et en vérité.', 'Jean 4:24'),
  (2, 'transformation', 'Transformation', 'Être renouvelé de l''intérieur par la Parole pour devenir chaque jour davantage à l''image de Christ.', '#EF7D2D', 'sparkles', 'Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l''intelligence.', 'Romains 12:2'),
  (3, 'guerison', 'Guérison', 'Accueillir la restauration que Dieu apporte aux cœurs, aux âmes et aux corps, et devenir à son tour un canal de guérison.', '#A93BB0', 'heart-pulse', 'Il guérit ceux qui ont le cœur brisé, et il panse leurs blessures.', 'Psaume 147:3'),
  (4, 'famille', 'Famille', 'Bâtir des foyers solides, unis et fondés sur Dieu, première cellule de l''Église et de la société.', '#2BB3C0', 'users', 'Moi et ma maison, nous servirons l''Éternel.', 'Josué 24:15'),
  (5, 'excellence', 'Excellence', 'Servir Dieu avec le meilleur de soi-même : rigueur, fidélité et qualité dans chaque mission confiée.', '#7BC043', 'star', 'Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.', 'Colossiens 3:23');

-- 5 objectifs (texte officiel)
insert into public.church_objectives (number, verb, text, color) values
  (1, 'Gagner', 'le maximum de personnes à Jésus-Christ.', '#F2C230'),
  (2, 'Conduire', 'les familles à vivre une croissance spirituelle, émotionnelle et matérielle, selon les priorités de Dieu.', '#E83E8C'),
  (3, 'Préparer', 'l''église au retour du Seigneur Jésus-Christ.', '#A93BB0'),
  (4, 'Amener', 'les chrétiens à ressembler à Christ.', '#3F6FE0'),
  (5, 'Aider', 'le disciple-adorateur de Jésus à accomplir pleinement sa mission sur la terre.', '#4CCB6C');

-- Formations (durées et frais d'exemple sauf EDS : 3 mois, 10 000 + 30 000 confirmés)
insert into public.formations (slug, acronym, name, tagline, description, duration_label, levels_count, registration_fee, training_fee, requires_selection, is_example, sort_order) values
  ('eds', 'EDS', 'École des STAFs', 'Former des serviteurs fidèles, engagés et excellents au cœur de l''Église.', 'L''École des STAFs prépare les membres engagés à servir l''Église avec excellence, en quatre niveaux progressifs.', '3 mois', 4, 10000, 30000, false, false, 1),
  ('edm', 'EDM', 'École des Disciples Mentors', 'Devenir un disciple qui forme, accompagne et fait grandir d''autres disciples.', 'L''École des Disciples Mentors forme des leaders capables d''accompagner d''autres croyants, en deux niveaux.', '8 mois', 2, 15000, 60000, true, true, 2),
  ('diacres', 'DIACRES', 'Formation des diacres', 'Se préparer au service diaconal, de la formation jusqu''à la consécration.', 'Cours et évaluations, stage pratique, mémoire et soutenance, évaluation pastorale et consécration.', '12 mois', null, 15000, 50000, true, true, 3);

-- Sessions (EXEMPLE : dates)
insert into public.sessions (formation_id, label, start_date, end_date, registration_deadline, status, is_example)
select id, 'Session EDS (exemple)', date '2027-01-11', date '2027-12-17', date '2026-12-20', 'open'::public.session_status, true from public.formations where slug = 'eds'
union all
select id, 'Session EDM (exemple)', date '2027-02-01', date '2027-09-30', date '2027-01-15', 'open'::public.session_status, true from public.formations where slug = 'edm'
union all
select id, 'Formation des diacres (exemple)', date '2027-03-01', date '2028-02-28', date '2027-02-01', 'soon'::public.session_status, true from public.formations where slug = 'diacres'
union all
select id, 'Session EDS précédente (exemple)', date '2026-01-12', date '2026-12-18', null, 'closed'::public.session_status, true from public.formations where slug = 'eds';

-- FAQ (TODO texte officiel)
insert into public.faq (category, question, answer, featured, sort_order) values
  ('inscription', 'Comment m''inscrire à une formation ?', 'Cliquez sur « S''inscrire », choisissez votre formation, remplissez le formulaire puis effectuez le paiement. Tout se fait en 5 étapes, depuis votre téléphone, en quelques minutes.', true, 1),
  ('inscription', 'Puis-je interrompre mon inscription et la reprendre plus tard ?', 'Oui. Vos réponses sont enregistrées automatiquement sur votre appareil. Revenez sur la page d''inscription : vous reprendrez exactement là où vous vous êtes arrêté.', false, 2),
  ('inscription', 'J''ai des difficultés avec le formulaire, qui peut m''aider ?', 'Appuyez sur le bouton WhatsApp présent sur toutes les pages : un membre de l''équipe vous accompagnera pas à pas.', false, 3),
  ('paiement', 'Quels moyens de paiement sont acceptés ?', 'Vous pouvez payer par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) et, selon disponibilité, par carte bancaire.', true, 4),
  ('paiement', 'Vais-je recevoir un reçu ?', 'Oui. Dès que votre paiement est confirmé, un reçu vous est envoyé par e-mail et reste disponible dans votre espace.', false, 5),
  ('paiement', 'Que faire si mon paiement échoue ?', 'Vérifiez votre solde et le numéro saisi, puis réessayez depuis « Suivre ma candidature ». Votre dossier n''est pas perdu. En cas de doute, contactez-nous sur WhatsApp.', false, 6),
  ('admission', 'Mon paiement confirmé signifie-t-il que je suis admis ?', 'Pas forcément. Le paiement, l''inscription et l''admission sont trois étapes distinctes. Pour l''EDM et la formation des diacres, une sélection préalable est réalisée : vous serez informé de la décision par e-mail.', true, 7),
  ('admission', 'Combien de temps faut-il pour connaître la décision d''admission ?', 'Le délai dépend de la formation et de la période. Vous pouvez suivre l''avancement de votre dossier à tout moment dans « Suivre ma candidature ».', false, 8),
  ('admission', 'Que signifie « liste d''attente » ?', 'Votre dossier est retenu mais les places sont complètes pour le moment. Vous serez contacté dès qu''une place se libère ou pour la session suivante.', false, 9),
  ('formations', 'Quelle formation choisir ?', 'L''EDS forme les serviteurs de l''Église, l''EDM forme les disciples qui accompagnent d''autres disciples, et la formation des diacres prépare au service diaconal. Comparez-les sur la page « Durées, objectifs et tarifs ».', false, 10),
  ('formations', 'Les cours sont-ils en ligne ?', 'Oui, les cours sont accessibles en ligne depuis votre espace étudiant (vidéos, documents, sessions en direct sur Zoom). Certaines activités peuvent avoir lieu en présentiel.', false, 11),
  ('formations', 'Puis-je suivre la formation uniquement avec mon téléphone ?', 'Oui. CTF ACADEMY est pensé d''abord pour le téléphone, même avec une connexion modeste.', false, 12);
