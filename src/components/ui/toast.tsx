"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "error";
type ToastItem = { id: number; title: string; description?: string; tone: ToastTone };
type ToastInput = Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone; duration?: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const icons = { info: Info, success: CheckCircle2, error: XCircle };
const iconColors = { info: "text-or", success: "text-success", error: "text-danger" };

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    ({ duration = 4500, tone = "info", ...input }: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all.slice(-2), { id, tone, ...input }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-3 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = icons[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                role="status"
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 420, damping: 22 } }}
                exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.2 } }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-or/30 bg-noir-card/95 p-4 shadow-gold backdrop-blur"
              >
                <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", iconColors[t.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-blanc">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm text-blanc/70">{t.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Fermer la notification"
                  className="-m-2 grid size-10 place-items-center rounded-full text-blanc/50 hover:text-or-light"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <Toaster>");
  return ctx;
}
