"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { HEX_NODES, OBJECTIVE_NODES, ORB_CENTER, cinematicState } from "@/components/three/cinematic-layout";
import { churchObjectives, churchVision, keyWords } from "@/content/identity";
import { tokens } from "@/lib/tokens";

const COUNT = 6000;

/** Échantillonne les pixels du texte de la Vision rendu dans un canvas 2D (forme de départ des particules). */
function sampleVisionText(count: number) {
  const canvas = document.createElement("canvas");
  const W = 1200;
  const H = 420;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const pts: [number, number][] = [];
  if (ctx) {
    ctx.fillStyle = tokens.blanc;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 64px serif";
    const words = churchVision.text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > W * 0.92 && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    lines.push(line);
    const lh = H / (lines.length + 0.6);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, lh * (i + 0.8)));
    const data = ctx.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (data[(y * W + x) * 4 + 3] > 128) pts.push([x / W, y / H]);
  }
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const p = pts.length ? pts[Math.floor(Math.random() * pts.length)] : [Math.random(), Math.random()];
    out[i * 2] = (p[0] - 0.5) * 1.7; // largeur ≈ 85 % de l'écran
    out[i * 2 + 1] = -(p[1] - 0.5) * 0.62;
  }
  return out;
}

/** Point aléatoire sur le contour d'un hexagone allongé. */
function hexPerimeter(rx: number, ry: number) {
  const corners = [
    [-rx, 0],
    [-rx * 0.8, ry],
    [rx * 0.8, ry],
    [rx, 0],
    [rx * 0.8, -ry],
    [-rx * 0.8, -ry],
  ];
  const s = Math.floor(Math.random() * 6);
  const a = corners[s];
  const b = corners[(s + 1) % 6];
  const t = Math.random();
  const jitter = (Math.random() - 0.5) * 0.04;
  return [a[0] + (b[0] - a[0]) * t + jitter, a[1] + (b[1] - a[1]) * t + jitter];
}

const vertex = /* glsl */ `
  uniform float uMorph;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uReveal;
  attribute vec3 posB;
  attribute vec3 posC;
  attribute vec3 colB;
  attribute vec3 colC;
  attribute float aDelay;
  attribute float aSize;
  uniform vec3 uGold;
  varying vec3 vColor;
  varying float vAlpha;
  float ease(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
  void main() {
    float e1 = ease(clamp((uMorph - aDelay * 0.35) / 0.65, 0.0, 1.0));
    float e2 = ease(clamp((uMorph - 1.0 - aDelay * 0.35) / 0.65, 0.0, 1.0));
    vec3 p = mix(mix(position, posB, e1), posC, e2);
    float swirl = e1 * (1.0 - e1) + e2 * (1.0 - e2);
    float t = uTime * 0.6 + aDelay * 40.0;
    p += vec3(sin(t), cos(t * 1.3), sin(t * 0.7)) * (0.04 + swirl * 1.6);
    vColor = mix(mix(uGold, colB, e1), colC, e2);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z);
    vAlpha = uReveal * (0.45 + 0.55 * fract(aDelay * 13.7));
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.0, d) * vAlpha);
  }
`;

function Particles({ progress }: { progress: MotionValue<number> }) {
  const { viewport, gl } = useThree();
  const W = viewport.width / 2;
  const H = viewport.height / 2;
  const portrait = viewport.width < viewport.height;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const a = new Float32Array(COUNT * 3);
    const b = new Float32Array(COUNT * 3);
    const c = new Float32Array(COUNT * 3);
    const cb = new Float32Array(COUNT * 3);
    const cc = new Float32Array(COUNT * 3);
    const delay = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    const text = sampleVisionText(COUNT);
    const kwColors = keyWords.map((k) => new THREE.Color(k.hex));
    const objColors = churchObjectives.map((o) => new THREE.Color(o.hex));
    const gold = new THREE.Color(tokens.orLight);
    const unit = Math.min(W, H);
    const textScale = portrait ? 0.95 : 1;

    for (let i = 0; i < COUNT; i++) {
      // A — texte de la Vision
      a[i * 3] = text[i * 2] * W * textScale;
      a[i * 3 + 1] = text[i * 2 + 1] * H * 1.3;
      a[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

      // B — 5 hexagones
      const k = i % 5;
      const node = HEX_NODES[k];
      const [hx, hy] = hexPerimeter(unit * (portrait ? 0.24 : 0.2), unit * (portrait ? 0.13 : 0.115));
      b[i * 3] = node.x * W + hx;
      b[i * 3 + 1] = node.y * H + hy;
      b[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
      cb.set([kwColors[k].r, kwColors[k].g, kwColors[k].b], i * 3);

      // C — orbe (55 %) + 5 faisceaux (45 %)
      const ox = ORB_CENTER.x * W;
      const oy = ORB_CENTER.y * H;
      const r = unit * 0.2;
      if (i < COUNT * 0.55) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const rr = r * (0.82 + Math.random() * 0.18);
        c[i * 3] = ox + rr * Math.sin(ph) * Math.cos(th);
        c[i * 3 + 1] = oy + rr * Math.sin(ph) * Math.sin(th);
        c[i * 3 + 2] = rr * Math.cos(ph);
        cc.set([gold.r, gold.g, gold.b], i * 3);
      } else {
        const o = i % 5;
        const end = OBJECTIVE_NODES[o];
        const ex = end.x * W;
        const ey = end.y * H;
        const ang = Math.atan2(ey - oy, ex - ox);
        const sx = ox + Math.cos(ang) * r;
        const sy = oy + Math.sin(ang) * r;
        const t = Math.pow(Math.random(), 0.8);
        c[i * 3] = sx + (ex - sx) * t + (Math.random() - 0.5) * 0.05;
        c[i * 3 + 1] = sy + (ey - sy) * t + (Math.random() - 0.5) * 0.05;
        c[i * 3 + 2] = 0;
        cc.set([objColors[o].r, objColors[o].g, objColors[o].b], i * 3);
      }
      delay[i] = Math.random();
      size[i] = 0.8 + Math.random() * 1.8;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(a, 3));
    geo.setAttribute("posB", new THREE.BufferAttribute(b, 3));
    geo.setAttribute("posC", new THREE.BufferAttribute(c, 3));
    geo.setAttribute("colB", new THREE.BufferAttribute(cb, 3));
    geo.setAttribute("colC", new THREE.BufferAttribute(cc, 3));
    geo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return geo;
  }, [W, H, portrait]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uMorph: { value: 0 },
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uGold: { value: new THREE.Color(tokens.orLight) },
        },
      }),
    [gl],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const u = material.uniforms;
    const { reveal, morph } = cinematicState(progress.get());
    u.uTime.value = state.clock.elapsedTime;
    u.uMorph.value = THREE.MathUtils.damp(u.uMorph.value, morph, 5, delta);
    u.uReveal.value = THREE.MathUtils.damp(u.uReveal.value, reveal, 5, delta);
  });

  return <points geometry={geometry} material={material} />;
}

export default function VisionCinematicScene({ progress, active }: { progress: MotionValue<number>; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 10], fov: 45 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <Particles progress={progress} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.2} intensity={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
