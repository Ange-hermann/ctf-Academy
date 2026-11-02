"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-aura px-6 text-center grain">
      <Emblem size={64} className="size-16 opacity-80" />
      <h1 className="mt-8 text-3xl text-blanc">Un imprévu est survenu</h1>
      <p className="mt-3 max-w-md text-blanc/70">
        La page n&apos;a pas pu s&apos;afficher correctement. Vérifiez votre connexion puis réessayez.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RotateCcw /> Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </main>
  );
}
