"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
};

/** Présence d'un cookie de session Supabase (« sb-…-auth-token ») : suffisant pour l'affichage, jamais pour l'accès. */
const snapshot = () => /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);

/**
 * L'utilisateur semble connecté : le site public affiche « Mon espace » au lieu de « S'inscrire ».
 * Lecture côté client pour conserver les pages publiques statiques ; l'accès réel est contrôlé par proxy.ts.
 */
export function useSignedIn() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
