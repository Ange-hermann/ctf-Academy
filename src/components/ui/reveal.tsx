"use client";

import { motion } from "motion/react";

const variants = {
  div: motion.div,
  li: motion.li,
  section: motion.section,
} as const;

/** Révélation au scroll : légère rotation 3D, translation en Z, flou → net. */
export function Reveal({
  as = "div",
  delay = 0,
  className,
  children,
}: {
  as?: keyof typeof variants;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const Comp = variants[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 40, rotateX: 8, scale: 0.97, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformPerspective: 1000 }}
    >
      {children}
    </Comp>
  );
}
