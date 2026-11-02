"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ProgressRing } from "@/components/student/ui/progress-ring";
import { WebGLBoundary, supportsWebGL } from "@/components/three/webgl-boundary";
import { usePerf } from "@/hooks/use-perf";

const ProgressRingScene = dynamic(() => import("@/components/three/student/progress-ring-scene"), { ssr: false });

/**
 * Anneau 3D du tableau de bord : chargé à la demande, seulement si l'appareil le permet
 * (mode complet, WebGL, mouvement non réduit) ; sinon anneau 2D. Survol / toucher : l'anneau s'incline.
 */
export function ProgressRing3D({
  value,
  size = 220,
  children,
}: {
  value: number;
  size?: number;
  children?: React.ReactNode;
}) {
  const { ready, canAnimate3D } = usePerf();
  const [webgl, setWebgl] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !canAnimate3D) return;
    const id = requestAnimationFrame(() => setWebgl(supportsWebGL()));
    return () => cancelAnimationFrame(id);
  }, [ready, canAnimate3D]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fallback = <ProgressRing value={value} size={size} stroke={Math.round(size / 18)} />;
  const use3D = webgl && canAnimate3D;

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      style={{ width: size, height: size }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      role="img"
      aria-label={`Progression globale : ${Math.round(value)} %`}
    >
      <div aria-hidden className="absolute inset-[12%] rounded-full bg-or/10 blur-2xl" />
      <div aria-hidden className="absolute inset-0">
        {use3D && visible ? (
          <WebGLBoundary fallback={fallback}>
            <ProgressRingScene value={value / 100} hovered={hovered} />
          </WebGLBoundary>
        ) : (
          fallback
        )}
      </div>
      {children && <div className="pointer-events-none absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
