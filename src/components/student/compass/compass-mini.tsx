import { keyWords, tintStyle, type KeyWordSlug } from "@/content/identity";

/** Points du pentagone (sommet 1 en haut, sens horaire). */
export function pentagonPoint(i: number, radius: number, center: number) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return [center + radius * Math.cos(a), center + radius * Math.sin(a)] as const;
}

/** Boussole miniature : pentagone des 5 mots clés, chaque sommet s'illumine selon les leçons suivies. */
export function CompassMini({ values, size = 180 }: { values: { slug: KeyWordSlug; value: number }[]; size?: number }) {
  const c = size / 2;
  const R = size * 0.36;
  const valueOf = (slug: KeyWordSlug) => values.find((v) => v.slug === slug)?.value ?? 0;
  const outline = keyWords.map((_, i) => pentagonPoint(i, R, c).join(",")).join(" ");
  const shape = keyWords.map((k, i) => pentagonPoint(i, R * (0.18 + 0.82 * valueOf(k.slug)), c).join(",")).join(" ");
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Ma boussole : ${keyWords.map((k) => `${k.label} ${Math.round(valueOf(k.slug) * 100)} %`).join(", ")}`}
      className="overflow-visible"
    >
      {[1, 0.66, 0.33].map((s) => (
        <polygon
          key={s}
          points={keyWords.map((_, i) => pentagonPoint(i, R * s, c).join(",")).join(" ")}
          fill="none"
          stroke="var(--color-or)"
          strokeOpacity={0.14}
        />
      ))}
      <polygon points={outline} fill="none" stroke="var(--color-or)" strokeOpacity={0.35} />
      <polygon
        points={shape}
        fill="var(--color-or)"
        fillOpacity={0.16}
        stroke="var(--color-or-light)"
        strokeWidth={1.5}
      />
      {keyWords.map((k, i) => {
        const [x, y] = pentagonPoint(i, R, c);
        const [lx, ly] = pentagonPoint(i, R + 18, c);
        const v = valueOf(k.slug);
        return (
          <g key={k.slug} style={tintStyle(k)}>
            <circle
              cx={x}
              cy={y}
              r={4 + v * 4}
              className="fill-[var(--tint)]"
              style={{ filter: `drop-shadow(0 0 ${2 + v * 8}px var(--tint))`, opacity: 0.45 + v * 0.55 }}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--tint-text)] text-[9px] font-semibold tracking-wider uppercase"
            >
              {k.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
