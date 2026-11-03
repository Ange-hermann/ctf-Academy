/** Messages vocaux : règles partagées entre l'enregistreur (navigateur) et les actions serveur. */

export const VOICE_MAX_SECONDS = 300;
export const VOICE_MAX_BYTES = 10 * 1024 * 1024;

/** Type MIME sans paramètres de codec (« audio/webm;codecs=opus » → « audio/webm »), accepté par le bucket. */
export const baseMime = (mime: string) => mime.split(";")[0].trim().toLowerCase();

const extensions: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/aac": "aac" };

export const voiceExtension = (mime: string): string | null => extensions[baseMime(mime)] ?? null;

export const formatDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

export const voiceLabel = (sec: number) => `Message vocal · ${formatDuration(sec)}`;

/** Reconnaît une pièce jointe vocale à son nom de fichier (lecteur intégré au lieu d'un simple lien). */
export const isVoiceAttachment = (name: string | null | undefined) => !!name && /^message-vocal\.(webm|m4a|ogg|mp3|aac)$/.test(name);
