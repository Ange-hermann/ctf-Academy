import Image from "next/image";

/** Écran de chargement très court, purement CSS : il s'efface seul et ne bloque jamais les clics. */
export function Splash() {
  return (
    <div aria-hidden className="splash pointer-events-none fixed inset-0 z-[300] grid place-items-center bg-noir">
      <div className="relative flex flex-col items-center gap-5">
        <Image src="/brand/emblem.png" alt="" width={96} height={96} priority className="size-20 animate-reveal" />
        <span className="relative block h-px w-32 overflow-hidden bg-or/20">
          <span className="splash-sweep absolute inset-0 bg-gradient-or" />
        </span>
      </div>
    </div>
  );
}
