import { cn } from "@/lib/utils";

/**
 * Ligne dorée lumineuse (bas de la barre supérieure) : s'estompe vers la gauche,
 * traversée par un éclat toutes les ~7 s. Se place en absolu dans un parent relatif.
 */
export function GoldLine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-px", className)}>
      <span className="absolute inset-0 bg-linear-to-r from-transparent via-or/55 to-or shadow-[0_0_10px_rgb(201_162_39/0.45)]" />
      <span className="absolute inset-y-0 left-0 w-1/3 animate-line-shine bg-linear-to-r from-transparent via-or-light/90 to-transparent motion-reduce:animate-none" />
    </span>
  );
}
