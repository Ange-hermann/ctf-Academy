import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const STUDENT_BUCKET = "student-files";
export const SIGNED_URL_TTL = 120; // secondes : URL courtes, régénérées à chaque consultation

export const allowedUploadTypes = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;
export type AllowedMime = keyof typeof allowedUploadTypes;

export const maxUploadBytes = (kind: "document" | "image") => (kind === "image" ? 5 : 20) * 1024 * 1024;

/** Médias de cours déposés par les formateurs : type MIME → catégorie de ressource. */
export const courseMediaTypes = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/msword": "document",
  "application/vnd.ms-powerpoint": "document",
  "image/png": "document",
  "image/jpeg": "document",
  "image/webp": "document",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/x-m4a": "audio",
  "audio/aac": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/ogg": "audio",
  "audio/webm": "audio",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
} as const;
export type CourseMediaKind = (typeof courseMediaTypes)[keyof typeof courseMediaTypes];

/** Plafonds par catégorie (le bucket accepte au plus 500 Mo). */
export const courseMediaMaxBytes: Record<CourseMediaKind, number> = {
  pdf: 50 * 1024 * 1024,
  document: 50 * 1024 * 1024,
  audio: 200 * 1024 * 1024,
  video: 500 * 1024 * 1024,
};

/** Durée de validité des URL de lecture : l'audio et la vidéo se lisent par plages pendant toute la séance. */
export const MEDIA_URL_TTL = 4 * 3600;

/**
 * URL signée de lecture (bucket privé). À n'appeler qu'APRÈS avoir vérifié sous RLS que l'utilisateur
 * a le droit de voir l'enregistrement qui référence ce fichier.
 */
export async function signedReadUrl(path: string, downloadName?: string, ttl = SIGNED_URL_TTL) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin.storage.from(STUDENT_BUCKET).createSignedUrl(path, ttl, downloadName ? { download: downloadName } : undefined);
  return data?.signedUrl ?? null;
}

/** URL signée de dépôt : le navigateur envoie le fichier directement au stockage (barre de progression réelle). */
export async function signedUploadUrl(path: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin.storage.from(STUDENT_BUCKET).createSignedUploadUrl(path);
  return data ? { url: data.signedUrl, token: data.token, path: data.path } : null;
}

/** Vérifie côté serveur le fichier réellement déposé (taille et type) avant de l'enregistrer. */
export async function inspectUpload(path: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const folder = path.split("/").slice(0, -1).join("/");
  const name = path.split("/").pop()!;
  const { data } = await admin.storage.from(STUDENT_BUCKET).list(folder, { search: name, limit: 1 });
  const file = data?.find((f) => f.name === name);
  if (!file) return null;
  const meta = file.metadata as { size?: number; mimetype?: string } | null;
  return { size: Number(meta?.size ?? 0), mime: String(meta?.mimetype ?? "") };
}

export async function removeUpload(path: string) {
  await createSupabaseAdminClient()?.storage.from(STUDENT_BUCKET).remove([path]);
}

/** Nom de fichier sûr (ASCII, sans chemin). */
export const safeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80) || "fichier";
