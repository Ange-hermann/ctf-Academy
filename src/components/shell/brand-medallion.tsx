import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Médaillon de marque : logo CTF affiché en grand. Rendu statique, avec une
 * légère lueur dorée. `size` fixe la résolution demandée ; l'affichage peut
 * être ajusté via `className`.
 */
export function BrandMedallion({ size = 120, src = "/brand/emblem.png", className }: { size?: number; src?: string; className?: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("select-none object-contain drop-shadow-[0_0_18px_rgb(201_162_39/0.35)]", className)}
    />
  );
}
