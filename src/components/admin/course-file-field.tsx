"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, UploadCloud, X } from "lucide-react";
import { requestCourseUploadAction } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

export type UploadedFile = { path: string; fileName: string; size: number };

export type CourseFileAccept = "video" | "audio" | "pdf" | "any";

const acceptMap: Record<CourseFileAccept, { accept: string; hint: string }> = {
  video: { accept: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov", hint: "MP4, WEBM ou MOV · 500 Mo maximum" },
  audio: { accept: "audio/*,.mp3,.m4a,.wav,.ogg,.aac", hint: "MP3, M4A, WAV, OGG · 200 Mo maximum" },
  pdf: { accept: "application/pdf,.pdf", hint: "PDF · 50 Mo maximum" },
  any: {
    accept: ".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.ogg,.mp4,.webm,.mov",
    hint: "PDF, Word, PowerPoint, Excel, image, audio ou vidéo",
  },
};

/** Type MIME de repli quand le navigateur ne le fournit pas (fréquent pour .m4a, .mov, .docx sous Windows). */
const mimeFromName = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
  };
  return map[ext] ?? "application/octet-stream";
};

const sizeLabel = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1000))} Ko`);

/**
 * Dépôt d'un média de cours : signature serveur (périmètre de la classe), envoi direct au bucket privé
 * avec progression réelle. Le fichier n'est enregistré en base qu'à la validation du formulaire.
 */
export function CourseFileField({
  moduleId,
  accept,
  value,
  onChange,
}: {
  moduleId: string;
  accept: CourseFileAccept;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const { accept: acceptAttr, hint } = acceptMap[accept];
  const busy = progress !== null;

  const upload = (file: File) => {
    setError(null);
    onChange(null);
    setProgress(0);
    const mime = file.type || mimeFromName(file.name);
    void (async () => {
      const signed = await requestCourseUploadAction({ moduleId, fileName: file.name, mime, size: file.size });
      if (!signed.ok || !signed.data) {
        setProgress(null);
        return setError(signed.ok ? "Signature impossible." : signed.error);
      }
      const { url, path } = signed.data;
      const target = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${url}`;
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
          xhr.onerror = () => reject(new Error("network"));
          xhr.open("PUT", target);
          xhr.setRequestHeader("Content-Type", mime);
          xhr.send(file);
        });
        onChange({ path, fileName: file.name, size: file.size });
      } catch (e) {
        const status = e instanceof Error ? e.message : "";
        setError(status === "413" ? "Fichier refusé par le stockage : taille maximale du projet dépassée." : "L'envoi a échoué. Vérifiez votre connexion et réessayez.");
      } finally {
        setProgress(null);
      }
    })();
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={acceptAttr}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {value && !busy ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-light">
          <FileUp aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {value.fileName} · {sizeLabel(value.size)}
          </span>
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          <button type="button" onClick={() => onChange(null)} className="text-xs text-blanc/60 underline-offset-2 hover:underline">
            Retirer
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || !moduleId}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            drag ? "border-or bg-or/10" : "border-line bg-noir-soft hover:border-or/40",
            busy && "cursor-wait",
          )}
        >
          {busy ? (
            <>
              <Loader2 aria-hidden className="size-6 animate-spin text-or-light" />
              <span className="text-sm font-medium text-blanc">Envoi en cours… {progress} %</span>
              <span className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-or/15" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <span className="block h-full origin-left rounded-full bg-gradient-or transition-transform" style={{ transform: `scaleX(${(progress ?? 0) / 100})` }} />
              </span>
            </>
          ) : (
            <>
              <UploadCloud aria-hidden className="size-7 text-or" />
              <span className="text-sm font-medium text-blanc">Déposez un fichier ou cliquez pour choisir</span>
              <span className="text-xs text-blanc/50">{hint} · stockage privé</span>
            </>
          )}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-2 text-xs text-danger-light">
          <X aria-hidden className="size-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
