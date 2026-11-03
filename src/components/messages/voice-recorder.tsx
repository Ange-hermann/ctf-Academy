"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCcw, SendHorizonal, Square, Trash2 } from "lucide-react";
import { baseMime, formatDuration, VOICE_MAX_BYTES, VOICE_MAX_SECONDS } from "@/lib/messages/voice";
import type { ActionResult } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

type Phase = "idle" | "recording" | "preview" | "sending";

const CANDIDATE_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const pickMime = () =>
  typeof MediaRecorder === "undefined" ? null : (CANDIDATE_MIMES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null);

const putFile = (url: string, blob: Blob, mime: string) =>
  new Promise<void>((resolve, reject) => {
    const target = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${url}`;
    const xhr = new XMLHttpRequest();
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.open("PUT", target);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.send(blob);
  });

/**
 * Message vocal : enregistrement au micro (5 min max), réécoute, puis envoi direct au stockage privé
 * via URL signée — le serveur vérifie le fichier avant de créer le message.
 */
export function VoiceRecorder({
  requestUpload,
  send,
  onSent,
  onError,
  disabled,
}: {
  requestUpload: (mime: string, size: number) => Promise<ActionResult<{ url: string; path: string }>>;
  send: (path: string, durationSec: number) => Promise<ActionResult<{ id: string } | undefined>>;
  onSent: (result: { id?: string; durationSec: number }) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; mime: string; duration: number } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const start = async () => {
    const mime = pickMime();
    if (!mime || !navigator.mediaDevices?.getUserMedia) return onError("L'enregistrement audio n'est pas pris en charge par ce navigateur.");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return onError("Accès au micro refusé. Autorisez le micro dans votre navigateur pour enregistrer.");
    }
    chunks.current = [];
    const rec = new MediaRecorder(stream.current, { mimeType: mime });
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const type = baseMime(rec.mimeType || mime);
      const blob = new Blob(chunks.current, { type });
      stopTracks();
      if (blob.size > VOICE_MAX_BYTES) {
        setPhase("idle");
        return onError("Message vocal trop lourd (10 Mo maximum).");
      }
      setPreview({ blob, url: URL.createObjectURL(blob), mime: type, duration });
      setPhase("preview");
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    setSeconds(0);
    rec.start(1000);
    setPhase("recording");
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= VOICE_MAX_SECONDS) recorder.current?.stop();
    }, 250);
  };

  const stop = () => recorder.current?.state === "recording" && recorder.current.stop();

  const cancel = () => {
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stopTracks();
    setPreview(null);
    setPhase("idle");
  };

  const submit = async () => {
    if (!preview) return;
    setPhase("sending");
    const signed = await requestUpload(preview.mime, preview.blob.size);
    if (!signed.ok || !signed.data) {
      setPhase("preview");
      return onError(signed.ok ? "Signature impossible." : signed.error);
    }
    try {
      await putFile(signed.data.url, preview.blob, preview.mime);
    } catch {
      setPhase("preview");
      return onError("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
    }
    const res = await send(signed.data.path, preview.duration);
    if (!res.ok) {
      setPhase("preview");
      return onError(res.error);
    }
    onSent({ id: res.data?.id, durationSec: preview.duration });
    setPreview(null);
    setPhase("idle");
  };

  if (phase === "idle")
    return (
      <button
        type="button"
        onClick={() => void start()}
        disabled={disabled}
        aria-label="Enregistrer un message vocal"
        title="Message vocal"
        className="grid size-11 shrink-0 place-items-center rounded-xl border border-or/30 text-or-light transition-colors hover:bg-or/10 disabled:opacity-50"
      >
        <Mic aria-hidden className="size-5" />
      </button>
    );

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-or/30 bg-noir-soft px-3 py-2" role="group" aria-label="Message vocal">
      {phase === "recording" ? (
        <>
          <span className="relative flex size-3 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-3 rounded-full bg-danger" />
          </span>
          <span className="text-sm font-medium text-blanc tabular" aria-live="polite">
            {formatDuration(seconds)} <span className="text-blanc/45">/ {formatDuration(VOICE_MAX_SECONDS)}</span>
          </span>
          <span className="flex-1" />
          <button type="button" onClick={cancel} aria-label="Annuler l'enregistrement" className="grid size-9 place-items-center rounded-lg text-blanc/60 hover:text-blanc">
            <Trash2 aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={stop} className="flex min-h-9 items-center gap-1.5 rounded-lg bg-or/15 px-3 text-sm font-medium text-or-light hover:bg-or/25">
            <Square aria-hidden className="size-3.5 fill-current" /> Arrêter
          </button>
        </>
      ) : (
        <>
          {preview && <audio controls src={preview.url} className="h-9 min-w-0 flex-1" aria-label="Réécouter le message vocal" />}
          <button
            type="button"
            onClick={cancel}
            disabled={phase === "sending"}
            aria-label="Supprimer et recommencer"
            className="grid size-9 place-items-center rounded-lg text-blanc/60 hover:text-blanc disabled:opacity-50"
          >
            <RotateCcw aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={phase === "sending"}
            aria-label="Envoyer le message vocal"
            className={cn("grid size-9 place-items-center rounded-lg bg-gradient-or text-noir shadow-gold disabled:opacity-60")}
          >
            {phase === "sending" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <SendHorizonal aria-hidden className="size-4" />}
          </button>
        </>
      )}
    </div>
  );
}

/** Lecture d'un message vocal reçu (URL protégée : vérification des droits puis URL signée). */
export function VoiceNote({ src, label }: { src: string; label: string }) {
  return <audio controls preload="metadata" src={src} className="mt-1 h-10 w-full max-w-72" aria-label={label} />;
}
