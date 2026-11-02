"use client";

import { useEffect, useRef } from "react";
import { usePerf } from "@/hooks/use-perf";
import { tokens } from "@/lib/tokens";
import { cn } from "@/lib/utils";

/**
 * Poussière d'or légère (canvas 2D, pas de WebGL) : dérive lente, s'arrête hors écran.
 * Mode allégé : 3× moins de particules. Mouvement réduit : rien n'est rendu.
 */
export function GoldParticles({ density = 60, className }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { ready, tier, reducedMotion } = usePerf();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !ready || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const count = Math.round(tier === "lite" ? density / 3 : density);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.08 - Math.random() * 0.25,
      a: 0.2 + Math.random() * 0.7,
      t: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let running = false;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.t += 0.02;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(p.t));
        ctx.fillStyle = tokens.orLight;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        frame = requestAnimationFrame(draw);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
    };
  }, [ready, tier, reducedMotion, density]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 size-full", className)} />;
}
