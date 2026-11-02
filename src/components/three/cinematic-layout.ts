/**
 * Disposition partagée entre la scène WebGL et les calques HTML de la séquence cinématique.
 * Coordonnées normalisées : x ∈ [-1, 1] (gauche → droite), y ∈ [-1, 1] (bas → haut).
 */
export const HEX_NODES = [
  { x: -0.62, y: 0.22 },
  { x: -0.31, y: -0.28 },
  { x: 0, y: 0.22 },
  { x: 0.31, y: -0.28 },
  { x: 0.62, y: 0.22 },
];

export const ORB_CENTER = { x: 0, y: 0.34 };

export const OBJECTIVE_NODES = [
  { x: -0.7, y: -0.5 },
  { x: -0.35, y: -0.5 },
  { x: 0, y: -0.5 },
  { x: 0.35, y: -0.5 },
  { x: 0.7, y: -0.5 },
];

/**
 * Progression du scroll (0 → 1) → état de la scène.
 * 0–0.14 Vision (texte) · 0.14–0.24 dispersion · 0.24–0.44 → hexagones · 0.6–0.78 → orbe et faisceaux.
 */
export function cinematicState(p: number) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const reveal = clamp((p - 0.12) / 0.1);
  const morph = p < 0.5 ? clamp((p - 0.24) / 0.2) : 1 + clamp((p - 0.6) / 0.18);
  return { reveal, morph };
}

/** Position CSS (%) d'un point normalisé. */
export const toPercent = (p: { x: number; y: number }) => ({
  left: `${((p.x + 1) / 2) * 100}%`,
  top: `${((1 - p.y) / 2) * 100}%`,
});
