-- Médias de cours déposés par les formateurs : audio, vidéo, PDF et documents bureautiques.
-- Les fichiers vivent dans le bucket privé sous cours/<module_id>/… et ne sont servis qu'après
-- vérification RLS de la ressource (route /espace-etudiant/fichier), via URL signée.
alter type public.lesson_kind add value if not exists 'audio';
alter type public.resource_kind add value if not exists 'audio';
alter type public.resource_kind add value if not exists 'video';

update storage.buckets
set file_size_limit = 524288000, -- 500 Mo (vidéos de cours)
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.ms-powerpoint',
      'image/png',
      'image/jpeg',
      'image/webp',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/webm',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]
where id = 'student-files';
