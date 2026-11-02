"use client";

import { useEffect } from "react";
import { completeLessonAction, saveLessonProgressAction, saveNoteAction } from "@/lib/student/actions/courses";

type QueuedAction =
  | { kind: "progress"; key: string; payload: { lessonId: string; positionSeconds: number; progressPercent: number } }
  | { kind: "note"; key: string; payload: { lessonId: string; body: string } }
  | { kind: "complete"; key: string; payload: { lessonId: string } };

const STORAGE_KEY = "ctf-offline-queue";
const runners = { progress: saveLessonProgressAction, note: saveNoteAction, complete: completeLessonAction };

const read = (): QueuedAction[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as QueuedAction[];
  } catch {
    return [];
  }
};
const write = (q: QueuedAction[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch {
    /* stockage plein ou indisponible : l'action sera perdue, la page reste utilisable */
  }
};

/** Ajoute (ou remplace, même clé) une action à envoyer au retour du réseau. */
function enqueue(action: QueuedAction) {
  write([...read().filter((a) => a.key !== action.key), action]);
}

let flushing = false;
export async function flushOfflineQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    for (const action of read()) {
      try {
        await runners[action.kind](action.payload);
        write(read().filter((a) => a.key !== action.key));
      } catch {
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

/** Exécute l'action, ou la met en file d'attente si le réseau est coupé (brouillons et progression jamais perdus). */
export async function runOrQueue<K extends QueuedAction["kind"]>(kind: K, payload: Extract<QueuedAction, { kind: K }>["payload"]) {
  const key = `${kind}:${payload.lessonId}`;
  if (!navigator.onLine) {
    enqueue({ kind, key, payload } as QueuedAction);
    return { queued: true as const };
  }
  try {
    const result = await (runners[kind] as (p: typeof payload) => Promise<unknown>)(payload);
    return { queued: false as const, result };
  } catch {
    enqueue({ kind, key, payload } as QueuedAction);
    return { queued: true as const };
  }
}

/** Synchronise la file d'attente au chargement et à chaque retour du réseau. */
export function useOfflineSync() {
  useEffect(() => {
    void flushOfflineQueue();
    const onOnline = () => void flushOfflineQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
}
