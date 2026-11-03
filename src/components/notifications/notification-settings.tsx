"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, playChime, setSoundEnabled } from "@/lib/notifications/chime";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/lib/notifications/push-actions";

type PushState = "checking" | "unsupported" | "denied" | "on" | "off";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Réglages de notification du panneau-cloche : souscription push de l'appareil
 * courant (reçue même application fermée) et son dans l'application.
 * La souscription s'active par appareil — à refaire sur téléphone et ordinateur.
 */
export function NotificationSettings() {
  const [push, setPush] = useState<PushState>("checking");
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    const detect = async () => {
      setSound(isSoundEnabled());
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !vapidKey) {
        setPush("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setPush("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setPush(sub ? "on" : "off");
      } catch {
        if (!cancelled) setPush("unsupported");
      }
    };
    void detect();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  const enablePush = async () => {
    if (!vapidKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const keys = sub.toJSON().keys;
      const res = await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        keys: { p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" },
        userAgent: navigator.userAgent.slice(0, 300),
      });
      if (!res.ok) {
        await sub.unsubscribe();
        setPush("off");
        return;
      }
      setPush("on");
    } catch {
      setPush("off");
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await removePushSubscriptionAction({ endpoint: sub.endpoint });
      }
      setPush("off");
    } catch {
      /* l'état reste reflété par l'interface */
    } finally {
      setBusy(false);
    }
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) void playChime();
  };

  return (
    <div className="space-y-2.5 border-t border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-blanc/70">
          {push === "on" ? <BellRing aria-hidden className="size-4 shrink-0 text-or-light" /> : <BellOff aria-hidden className="size-4 shrink-0" />}
          <span className="truncate">
            {push === "on"
              ? "Push activé sur cet appareil"
              : push === "denied"
                ? "Notifications bloquées par le navigateur"
                : push === "unsupported"
                  ? "Push non pris en charge ici"
                  : "Recevoir sur cet appareil"}
          </span>
        </span>
        {(push === "on" || push === "off") && (
          <button
            type="button"
            onClick={push === "on" ? disablePush : enablePush}
            disabled={busy}
            className="shrink-0 rounded-lg border border-or/40 px-2.5 py-1.5 text-xs font-semibold text-or-light transition-colors hover:bg-or/10 disabled:opacity-50"
          >
            {push === "on" ? "Désactiver" : "Activer"}
          </button>
        )}
      </div>
      {push === "denied" && <p className="text-xs text-blanc/45">Autorisez les notifications dans les réglages du site (cadenas dans la barre d&rsquo;adresse).</p>}
      {isIos && push !== "on" && push !== "unsupported" && (
        <p className="text-xs text-blanc/45">Sur iPhone : ouvrez le site dans Safari puis Partager → « Sur l&rsquo;écran d&rsquo;accueil » pour recevoir les notifications.</p>
      )}
      <button type="button" onClick={toggleSound} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex min-w-0 items-center gap-2 text-sm text-blanc/70">
          {sound ? <Volume2 aria-hidden className="size-4 shrink-0 text-or-light" /> : <VolumeX aria-hidden className="size-4 shrink-0" />}
          <span className="truncate">{sound ? "Son activé dans l'application" : "Son désactivé"}</span>
        </span>
        <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${sound ? "bg-or" : "bg-blanc/15"}`} aria-hidden>
          <span className={`absolute top-0.5 size-4 rounded-full bg-blanc transition-transform ${sound ? "translate-x-4.5" : "translate-x-0.5"}`} />
        </span>
      </button>
    </div>
  );
}
