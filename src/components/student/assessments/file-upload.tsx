"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CloudOff, FileUp, Loader2, UploadCloud, X } from "lucide-react";
import { useOnline } from "@/components/student/layout/offline-banner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { confirmSubmissionAction, requestSubmissionUploadAction } from "@/lib/student/actions/assessments";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,.webp";
const MAX = 20 * 1024 * 1024;

type Phase = "idle" | "signing" | "uploading" | "confirming" | "done";

type Props = {
  quizId: string;
  attemptId: string;
  sessionKey: string;
  questionId: string;
  currentFile: string | null;
  onDone: (fileName: string) => void;
};

/** Dépôt de fichier : validation, envoi direct au stockage privé (URL signée) avec progression réelle, puis confirmation serveur. */
export function FileUpload({ quizId, attemptId, sessionKey, questionId, currentFile, onDone }: Props) {
  const online = useOnline();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(currentFile);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const upload = (file: File) => {
    setError(null);
    if (file.size > MAX) return setError("Fichier trop lourd (20 Mo maximum).");
    if (!/\.(pdf|docx|png|jpe?g|webp)$/i.test(file.name)) return setError("Formats acceptés : PDF, DOCX, PNG, JPG, WEBP.");
    setPhase("signing");
    setProgress(0);

    void (async () => {
      const signed = await requestSubmissionUploadAction({
        quizId,
        attemptId,
        sessionKey,
        fileName: file.name,
        mime: file.type || "application/pdf",
        size: file.size,
      });
      if (!signed.ok || !signed.data) {
        setPhase("idle");
        return setError(signed.ok ? "Signature impossible." : signed.error);
      }
      const { url, path } = signed.data;
      const target = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${url}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Réseau"));
        xhr.open("PUT", target);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      }).then(async () => {
        setPhase("confirming");
        const confirm = await confirmSubmissionAction({ quizId, attemptId, sessionKey, questionId, path, fileName: file.name });
        if (!confirm.ok) {
          setPhase("idle");
          return setError(confirm.error);
        }
        setPhase("done");
        setFileName(file.name);
        onDone(file.name);
        toast({ tone: "success", title: "Fichier déposé", description: file.name });
      }).catch(() => {
        setPhase("idle");
        setError("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
      });
    })();
  };

  const busy = phase === "signing" || phase === "uploading" || phase === "confirming";

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setPhase("uploading");
            upload(f);
          }
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy || !online}
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
          "flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          drag ? "border-or bg-or/10" : "border-line bg-noir/40 hover:border-or/40",
          (busy || !online) && "cursor-not-allowed opacity-60",
        )}
      >
        {busy ? (
          <>
            <Loader2 aria-hidden className="size-8 animate-spin text-or-light" />
            <p className="font-medium text-blanc">
              {phase === "signing" ? "Préparation…" : phase === "confirming" ? "Vérification…" : `Envoi en cours… ${progress} %`}
            </p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-or/15" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full origin-left rounded-full bg-gradient-or transition-transform" style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          </>
        ) : (
          <>
            <UploadCloud aria-hidden className="size-9 text-or" />
            <p className="font-medium text-blanc">Déposez votre fichier ici ou cliquez pour choisir</p>
            <p className="text-sm text-blanc/50">PDF, DOCX ou image · 20 Mo maximum · stockage privé</p>
            {!online && (
              <p className="flex items-center gap-1.5 text-sm text-warning-light">
                <CloudOff aria-hidden className="size-4" /> Connexion requise pour déposer un fichier
              </p>
            )}
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger-light">
          <X aria-hidden className="size-4" /> {error}
        </p>
      )}
      {fileName && phase !== "uploading" && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-light">
          <FileUp aria-hidden className="size-4" />
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
          <CheckCircle2 aria-hidden className="size-4" /> Déposé
        </p>
      )}
      {fileName && !busy && (
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => input.current?.click()} disabled={!online}>
          Remplacer le fichier
        </Button>
      )}
    </div>
  );
}
