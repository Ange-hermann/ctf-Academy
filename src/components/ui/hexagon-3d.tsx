"use client";

import { useState } from "react";
import { KeyWordIcon } from "@/components/brand/key-word-icon";
import { Signature } from "@/components/brand/signature";
import { tintStyle, type KeyWord } from "@/content/identity";
import { cn } from "@/lib/utils";

/** Hexagone allongé (forme de la brochure). */
const HEX = "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)";

/**
 * Hexagone 3D d'un mot clé : verre sombre, bordure lumineuse, chevron de la couleur du mot.
 * Survol / focus / toucher : inclinaison puis retournement révélant la définition.
 */
export function Hexagon3D({
  keyWord,
  active = false,
  dimmed = false,
  onActivate,
  className,
}: {
  keyWord: KeyWord;
  active?: boolean;
  dimmed?: boolean;
  onActivate?: (slug: KeyWord["slug"] | null) => void;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const isFlipped = flipped || active;

  return (
    <div
      style={tintStyle(keyWord)}
      className={cn(
        "group/hex relative [perspective:1100px] transition-[opacity,filter] duration-500",
        dimmed && "opacity-45 saturate-50",
        className,
      )}
      onPointerEnter={(e) => e.pointerType === "mouse" && onActivate?.(keyWord.slug)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onActivate?.(null)}
    >
      <button
        type="button"
        aria-pressed={isFlipped}
        aria-label={`${keyWord.label} : ${isFlipped ? "masquer" : "afficher"} la définition`}
        onClick={() => setFlipped((f) => !f)}
        onFocus={() => onActivate?.(keyWord.slug)}
        onBlur={() => onActivate?.(null)}
        className="relative block aspect-[1.7/1] w-full rounded-3xl text-left transition-transform duration-700 ease-out-expo [transform-style:preserve-3d] group-hover/hex:[transform:rotateX(6deg)_rotateY(-8deg)_translateZ(12px)]"
      >
        <span
          className={cn(
            "absolute inset-0 block transition-transform duration-700 ease-out-expo [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Face avant */}
          <span className="absolute inset-0 [backface-visibility:hidden]">
            <span
              className="absolute inset-0 bg-[linear-gradient(135deg,var(--tint),color-mix(in_oklab,var(--color-or)_55%,transparent),var(--tint))] opacity-70 transition-opacity group-hover/hex:opacity-100"
              style={{ clipPath: HEX }}
            />
            <span className="absolute inset-[1.5px] bg-gradient-card" style={{ clipPath: HEX }}>
              <span className="absolute inset-0 bg-[radial-gradient(70%_80%_at_20%_0%,color-mix(in_oklab,var(--tint)_22%,transparent),transparent_70%)]" />
            </span>
            <span className="relative flex h-full items-center justify-between gap-3 pr-[9%] pl-[14%]">
              <span>
                <span className="block text-xs font-semibold text-blanc/50">0{keyWord.order}</span>
                <span className="block font-display text-lg font-semibold tracking-[0.14em] text-blanc uppercase sm:text-xl">
                  {keyWord.label}
                </span>
              </span>
              <svg viewBox="0 0 24 48" aria-hidden className="h-[46%] shrink-0 tint-text drop-shadow-[0_0_10px_var(--tint)]">
                <path d="M4 4l14 20L4 44" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
          {/* Face arrière */}
          <span className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="absolute inset-0 tint-bg opacity-80" style={{ clipPath: HEX }} />
            <span className="absolute inset-[1.5px] bg-noir-card" style={{ clipPath: HEX }}>
              <span className="absolute inset-0 tint-soft" />
            </span>
            <span className="relative flex h-full items-center gap-3 px-[12%]">
              <span className="hidden shrink-0 sm:block">
                <Signature kind={keyWord.signature} className="size-11" />
              </span>
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase tint-text">
                  <KeyWordIcon icon={keyWord.icon} className="size-4" /> {keyWord.label}
                </span>
                <span className="mt-1 line-clamp-4 block text-base leading-snug text-blanc/85 lg:text-[0.95rem]">{keyWord.definition}</span>
              </span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
