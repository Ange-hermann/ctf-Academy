"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, TorusGeometry, type Group, type Mesh } from "three";
import { tokens } from "@/lib/tokens";

const RADIUS = 1.15;
const TUBE = 0.13;

function Ring({ value, hovered }: { value: number; hovered: boolean }) {
  const group = useRef<Group>(null);
  const arc = useRef<Mesh>(null);
  const current = useRef(0.001);
  const target = Math.max(0.001, Math.min(1, value));
  const { invalidate, pointer } = useThree();

  useFrame((_, delta) => {
    let moving = false;
    if (arc.current && Math.abs(current.current - target) > 0.002) {
      current.current = MathUtils.damp(current.current, target, 3.2, delta);
      arc.current.geometry.dispose();
      arc.current.geometry = new TorusGeometry(RADIUS, TUBE, 24, 160, current.current * Math.PI * 2);
      moving = true;
    }
    if (group.current) {
      const tx = hovered ? -pointer.y * 0.5 - 0.25 : -0.32;
      const ty = hovered ? pointer.x * 0.6 : 0.18;
      group.current.rotation.x = MathUtils.damp(group.current.rotation.x, tx, 5, delta);
      group.current.rotation.y = MathUtils.damp(group.current.rotation.y, ty, 5, delta);
      if (Math.abs(group.current.rotation.x - tx) > 0.001 || Math.abs(group.current.rotation.y - ty) > 0.001) moving = true;
    }
    if (moving) invalidate();
  });

  useEffect(() => invalidate(), [hovered, invalidate]);

  return (
    <group ref={group} rotation={[-0.32, 0.18, 0]}>
      <mesh>
        <torusGeometry args={[RADIUS, TUBE * 0.55, 16, 120]} />
        <meshStandardMaterial color={tokens.orDark} metalness={0.9} roughness={0.55} transparent opacity={0.35} />
      </mesh>
      <mesh ref={arc} rotation={[0, 0, Math.PI / 2]} scale={[-1, 1, 1]}>
        <torusGeometry args={[RADIUS, TUBE, 24, 160, 0.001]} />
        <meshStandardMaterial color={tokens.or} metalness={1} roughness={0.22} emissive={tokens.orDark} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/** Anneau de progression 3D : tore doré métallique, rendu à la demande (aucune image calculée au repos). */
export default function ProgressRingScene({ value, hovered }: { value: number; hovered: boolean }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [0, 0, 4.2], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color={tokens.blanc} />
      <pointLight position={[-3, -2, 3]} intensity={18} color={tokens.orLight} />
      <Ring value={value} hovered={hovered} />
    </Canvas>
  );
}
