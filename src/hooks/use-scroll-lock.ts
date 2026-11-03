"use client";

import { useEffect } from "react";

let lockCount = 0;
let savedOverflow = "";

/**
 * Verrouillage du défilement de la page, partagé entre les panneaux qui se
 * superposent (tiroir mobile, menu plein écran, visionneuse…). Un compteur
 * évite que deux verrous posés en même temps se restaurent mutuellement une
 * valeur « hidden » — seul le premier verrou mémorise l'état initial et seul
 * le dernier déverrouillage le restaure.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockCount += 1;
    if (lockCount === 1) {
      savedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.documentElement.style.overflow = savedOverflow;
      }
    };
  }, [locked]);
}
