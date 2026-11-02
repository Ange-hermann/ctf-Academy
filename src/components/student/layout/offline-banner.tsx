"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Bannière claire en cas de coupure réseau : les leçons déjà ouvertes restent consultables. */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm text-warning-light"
        >
          <WifiOff aria-hidden className="size-4 shrink-0" />
          Mode hors-ligne : les leçons déjà consultées restent disponibles. Vos actions seront envoyées au retour du
          réseau.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
