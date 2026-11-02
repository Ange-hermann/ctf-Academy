"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePerf } from "@/hooks/use-perf";
import { cn } from "@/lib/utils";

const PARTICLES = 16;

/** Petites étincelles dorées : transform/opacity uniquement, désactivées en mouvement réduit ou mode allégé. */
export function GoldBurst({ className }: { className?: string }) {
  const { ready, canAnimate3D } = usePerf();
  const sparks = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2 + (i % 2 ? 0.3 : 0);
        const dist = 60 + (i % 4) * 22;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 4 + (i % 3) * 2, delay: (i % 5) * 0.03 };
      }),
    [],
  );
  if (!ready || !canAnimate3D) return null;
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 grid place-items-center overflow-visible", className)}>
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-gradient-or"
          style={{ width: s.size, height: s.size }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
          transition={{ duration: 0.9, delay: s.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/** Coche dorée dessinée (réutilisable pour les moments de réussite). */
export function GoldCheck({ size = 72 }: { size?: number }) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden className="drop-shadow-[0_0_18px_rgb(201_162_39/0.45)]">
      <circle cx="36" cy="36" r="33" fill="none" stroke="var(--color-or)" strokeOpacity="0.3" strokeWidth="2" />
      <motion.circle
        cx="36"
        cy="36"
        r="33"
        fill="none"
        stroke="var(--color-or-light)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      <motion.path
        d="M22 37.5 32 47 51 26"
        fill="none"
        stroke="var(--color-or-light)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
      />
    </svg>
  );
}

/**
 * Panneau de célébration en bas d'écran : félicite, propose l'action suivante
 * et avance automatiquement au bout de 6 secondes (annulable).
 */
export function CompletionSheet({
  title,
  description,
  actionLabel,
  actionHref,
  onClose,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(6);

  useEffect(() => {
    if (seconds <= 0) {
      router.push(actionHref);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, actionHref, router]);

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 26 } }}
      exit={{ opacity: 0, y: 24, scale: 0.97, transition: { duration: 0.2 } }}
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl border border-or/40 bg-noir-card/95 p-5 shadow-gold-lg backdrop-blur lg:bottom-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-3 right-3 -m-1 grid size-11 place-items-center rounded-full text-blanc/50 hover:text-or-light"
      >
        <X className="size-4" />
      </button>
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <GoldCheck size={64} />
          <GoldBurst />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg tracking-wide text-gradient-or">{title}</p>
          <p className="mt-0.5 text-sm text-blanc/70">{description}</p>
        </div>
      </div>
      <Button asChild className="mt-4 w-full">
        <Link href={actionHref}>
          {actionLabel} <span aria-hidden className="text-noir/70">({seconds} s)</span>
        </Link>
      </Button>
    </motion.div>
  );
}

/** Conteneur AnimatePresence prêt à l'emploi. */
export function CelebrationHost({ children }: { children: React.ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
