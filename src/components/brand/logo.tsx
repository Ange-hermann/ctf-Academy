import Image from "next/image";
import { cn } from "@/lib/utils";

type EmblemProps = {
  className?: string;
  /** Taille d'affichage en px (sert à générer des images optimisées à la bonne résolution). */
  size?: number;
  animated?: boolean;
  priority?: boolean;
  alt?: string;
};

/** Emblème officiel CTF (cercle + croix dorée), généré depuis public/logo.jpeg. */
export function Emblem({ className, size = 48, animated = false, priority = false, alt = "" }: EmblemProps) {
  return (
    <Image
      src="/brand/emblem.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn("size-10 select-none object-contain", animated && "animate-reveal", className)}
      draggable={false}
    />
  );
}

export function Logo({
  className,
  compact = false,
  subtitleClassName,
}: {
  className?: string;
  compact?: boolean;
  subtitleClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3 [perspective:400px]", className)}>
      <Emblem size={44} className="size-11 animate-coin-turn drop-shadow-[0_0_10px_rgb(201_162_39/0.35)]" alt={compact ? "CTF ACADEMY" : ""} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold tracking-[0.2em] text-gradient-or">CTF ACADEMY</span>
          <span className={cn("mt-1 text-[0.65rem] tracking-[0.18em] text-blanc/60 uppercase", subtitleClassName)}>
            Centre de Transformation des Familles
          </span>
        </span>
      )}
    </span>
  );
}

/** Logo complet de l'Église (texte + emblème), fond transparent. */
export function ChurchLogo({ className, width = 220 }: { className?: string; width?: number }) {
  return (
    <Image
      src="/brand/logo-full.png"
      alt="CTF Church — Centre de Transformation des Familles"
      width={width}
      height={Math.round((width * 764) / 625)}
      className={cn("h-auto select-none", className)}
      draggable={false}
    />
  );
}
