"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studentRoutes } from "@/config/student-nav";

/** Erreur claire, jamais d'écran blanc : réessayer ou revenir au tableau de bord. */
export default function StudentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-3xl border border-danger/30 bg-danger/5 p-8 text-center">
      <TriangleAlert aria-hidden className="mx-auto size-10 text-danger-light" />
      <h1 className="mt-4 text-2xl tracking-wide">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-2 text-blanc/70">
        La connexion est peut-être instable. Vos données ne sont pas perdues : réessayez dans un instant.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw /> Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href={studentRoutes.dashboard}>Tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
