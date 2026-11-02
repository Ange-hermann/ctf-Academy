"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

/** Fine ligne dorée de progression de lecture. */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className={cn("h-0.5 origin-left bg-gradient-or shadow-gold", className)}
      style={{ scaleX }}
    />
  );
}
