"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/** Curseur doré avec traînée — desktop (pointeur fin) uniquement, désactivé si mouvement réduit. */
export function GoldCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const trailX = useSpring(x, { stiffness: 180, damping: 22, mass: 0.6 });
  const trailY = useSpring(y, { stiffness: 180, damping: 22, mass: 0.6 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHovering(!!(e.target as Element | null)?.closest?.("a, button, [role='button'], input, label, select, textarea"));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[200]">
      <motion.div
        className="absolute -left-4 -top-4 size-8 rounded-full border border-or/50"
        style={{ x: trailX, y: trailY }}
        animate={{ scale: hovering ? 1.6 : 1, opacity: hovering ? 0.9 : 0.5 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        className="absolute -left-1 -top-1 size-2 rounded-full bg-or-light shadow-[0_0_10px_2px_rgba(229,193,88,0.7)]"
        style={{ x, y }}
      />
    </div>
  );
}
