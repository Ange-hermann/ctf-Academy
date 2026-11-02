import { BookOpen, Flame, HandHeart, Shield, Star } from "lucide-react";
import type { Formation } from "@/content/formations";
import { cn } from "@/lib/utils";

/** Médaillon doré 3D propre à chaque formation ; il pivote au survol de la carte parente (`group/card`). */
export function FormationIcon({ icon, className }: { icon: Formation["icon"]; className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-16 place-items-center [perspective:600px]", className)}>
      <span className="absolute inset-0 rounded-2xl bg-or/20 blur-xl" />
      <span className="relative grid size-full place-items-center rounded-2xl border border-or/50 bg-[radial-gradient(circle_at_30%_25%,var(--color-or-light),var(--color-or)_45%,var(--color-or-dark))] text-noir shadow-gold transition-transform duration-1000 ease-out-expo [transform-style:preserve-3d] group-hover/card:[transform:rotateY(360deg)]">
        {icon === "shield" && (
          <span className="relative grid place-items-center">
            <Shield className="size-8" strokeWidth={1.6} />
            <Star className="absolute size-3.5 fill-current" strokeWidth={1.6} />
          </span>
        )}
        {icon === "torch" && <Flame className="size-8" strokeWidth={1.6} />}
        {icon === "hands" && <HandHeart className="size-8" strokeWidth={1.6} />}
        {icon === "book" && <BookOpen className="size-8" strokeWidth={1.6} />}
      </span>
    </span>
  );
}
