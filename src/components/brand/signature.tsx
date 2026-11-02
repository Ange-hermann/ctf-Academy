import { cn } from "@/lib/utils";
import type { KeyWord } from "@/content/identity";

/**
 * Micro-animation signature de chaque mot clé (CSS, teinte via --tint) :
 * Adoration = rayons ascendants · Transformation = morphing · Guérison = onde douce
 * Famille = cercles qui se rejoignent · Excellence = étoile qui scintille.
 */
export function Signature({ kind, className }: { kind: KeyWord["signature"]; className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-14 place-items-center overflow-hidden", className)}>
      {kind === "rays" &&
        [0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="absolute bottom-0 w-[3px] rounded-full tint-bg animate-rays"
            style={{ left: `${18 + i * 16}%`, height: "70%", animationDelay: `${i * 0.35}s` }}
          />
        ))}
      {kind === "morph" && <span className="size-8 animate-morph border-2 tint-border-strong tint-soft" />}
      {kind === "wave" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute size-10 rounded-full border-2 tint-border-strong animate-wave"
            style={{ animationDelay: `${i}s` }}
          />
        ))}
      {kind === "circles" && (
        <>
          <span className="absolute size-7 rounded-full border-2 tint-border-strong animate-[circles-left_3s_ease-in-out_infinite]" />
          <span className="absolute size-7 rounded-full border-2 tint-border-strong animate-[circles-right_3s_ease-in-out_infinite]" />
        </>
      )}
      {kind === "twinkle" && (
        <svg viewBox="0 0 24 24" className="size-9 animate-twinkle tint-text">
          <path
            fill="currentColor"
            d="M12 2.5l2.6 6.2 6.7.5-5.1 4.4 1.6 6.5L12 16.6 6.2 20.1l1.6-6.5L2.7 9.2l6.7-.5z"
          />
        </svg>
      )}
    </span>
  );
}
