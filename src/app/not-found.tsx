import Link from "next/link";
import { Emblem } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grain flex min-h-dvh flex-1 flex-col items-center justify-center bg-aura px-6 text-center">
      <Emblem size={64} className="size-16 opacity-80" />
      <p className="mt-8 font-display text-7xl tracking-display text-gradient-or">404</p>
      <h1 className="mt-4 text-2xl text-blanc">Cette page n&apos;existe pas encore</h1>
      <p className="mt-2 max-w-md text-blanc/70">
        Le chemin que vous cherchez est en construction ou a été déplacé. Revenez à l&apos;accueil pour continuer.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </main>
  );
}
