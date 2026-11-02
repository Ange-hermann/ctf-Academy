import { cn } from "@/lib/utils";

/** Squelette doré (reflet doux) : jamais de spinner générique pendant le chargement. */
export function SkeletonGold({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton-gold rounded-2xl", className)} />;
}

/** Squelette générique d'une page de l'espace étudiant. */
export function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Chargement de la page" className="space-y-8">
      <div className="space-y-3">
        <SkeletonGold className="h-4 w-40 rounded-full" />
        <SkeletonGold className="h-10 w-72 max-w-full rounded-xl" />
        <SkeletonGold className="h-4 w-96 max-w-full rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <SkeletonGold key={i} className="h-40" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
