"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ctf-install-dismissed";

const noop = () => () => {};
const snapshotIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const snapshotDismissed = () => localStorage.getItem(DISMISS_KEY) === "1";
const snapshotStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const serverFalse = () => false;

/**
 * Bannière « Installer l'application » des espaces connectés (étudiant, admin).
 * Android/Chrome : bouton qui déclenche l'invite native (beforeinstallprompt).
 * iOS Safari : mode d'emploi « Partager → Sur l'écran d'accueil » (l'installation
 * est manuelle sur iPhone — le push n'existe que dans l'app installée).
 * Masquée en mode app déjà installée, ou après « Plus tard » (localStorage).
 */
export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const ios = useSyncExternalStore(noop, snapshotIos, serverFalse);
  const dismissed = useSyncExternalStore(noop, snapshotDismissed, serverFalse);
  const standalone = useSyncExternalStore(noop, snapshotStandalone, serverFalse);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const visible = !hidden && !standalone && !dismissed && (ios || promptEvent !== null);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setHidden(true);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* stockage indisponible : la bannière réapparaîtra à la prochaine visite */
    }
    setHidden(true);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      className="fixed inset-x-4 bottom-24 z-[60] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-96"
    >
      <div className="relative rounded-2xl border border-or/30 bg-noir-card/95 p-4 shadow-gold-lg backdrop-blur-md">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ne plus afficher"
          className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-lg text-blanc/50 hover:bg-or/10 hover:text-or-light"
        >
          <X aria-hidden className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-or text-noir shadow-gold">
            {ios ? <Share className="size-5" /> : <Download className="size-5" />}
          </span>
          <div className="min-w-0 flex-1 pr-6">
            <p className="font-nav text-sm font-semibold text-or-light">Installez CTF ACADEMY</p>
            <p className="mt-0.5 text-xs leading-relaxed text-blanc/70">
              {ios
                ? "Dans Safari, touchez « Partager » puis « Sur l’écran d’accueil » : votre espace s’ouvrira directement, avec les notifications."
                : "Ouvrez votre espace directement depuis l’écran d’accueil — avec les notifications, même application fermée."}
            </p>
            {!ios && promptEvent && (
              <button
                type="button"
                onClick={install}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-or px-4 font-nav text-sm font-semibold text-noir shadow-gold transition-shadow hover:shadow-gold-lg"
              >
                <Download aria-hidden className="size-4" />
                Installer l’app
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
