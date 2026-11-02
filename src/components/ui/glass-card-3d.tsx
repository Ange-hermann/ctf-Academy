"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

type GlassCard3DProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Inclinaison maximale en degrés. */
  tilt?: number;
  glare?: boolean;
};

/**
 * Carte « verre sombre » avec tilt 3D et reflet doré qui suit le pointeur.
 * Sur écran tactile ou mouvement réduit : carte statique (lueur au survol uniquement).
 */
export function GlassCard3D({ children, className, style, tilt = 9, glare = true }: GlassCard3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.5 };
  const rotateX = useSpring(useTransform(py, [0, 1], [tilt, -tilt]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-tilt, tilt]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, color-mix(in oklab, var(--color-or-light) 16%, transparent), transparent 45%)`;

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div className="group/card h-full [perspective:1000px]">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
        className={cn(
          "relative h-full rounded-2xl border border-line bg-gradient-card p-6 text-blanc",
          "transition-[box-shadow,border-color,translate] duration-500 ease-out-expo",
          "hover:-translate-y-1.5 hover:border-or/40 hover:shadow-gold-lg",
          className,
        )}
      >
        {glare && (
          <motion.span
            aria-hidden
            style={{ background: glareBg }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
          />
        )}
        <div className="relative h-full [transform:translateZ(24px)]">{children}</div>
      </motion.div>
    </div>
  );
}
