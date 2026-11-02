"use client";

import { create } from "zustand";

/** État d'interface éphémère de l'espace étudiant (aucune donnée métier). */
type StudentUi = {
  paletteOpen: boolean;
  moreOpen: boolean;
  /** Mode concentration du lecteur de cours : masque la navigation. */
  focusMode: boolean;
  setPalette: (open: boolean) => void;
  setMore: (open: boolean) => void;
  setFocusMode: (on: boolean) => void;
};

export const useStudentUi = create<StudentUi>((set) => ({
  paletteOpen: false,
  moreOpen: false,
  focusMode: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setMore: (moreOpen) => set({ moreOpen }),
  setFocusMode: (focusMode) => set({ focusMode }),
}));
