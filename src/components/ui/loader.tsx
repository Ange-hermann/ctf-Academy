import { Emblem } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Chargement : emblème doré qui se trace et respire. */
export function Loader({ label = "Chargement…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative animate-float">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-or/15" />
        <Emblem animated size={56} className="relative size-14 drop-shadow-[0_0_12px_rgba(201,162,39,0.45)]" />
      </div>
      <span className="text-sm tracking-[0.2em] text-or-light/80 uppercase">{label}</span>
    </div>
  );
}
