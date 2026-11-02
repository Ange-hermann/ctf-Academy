import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studentRoutes } from "@/config/student-nav";

export default function StudentNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-line bg-gradient-card p-8 text-center">
      <Compass aria-hidden className="mx-auto size-10 text-or" />
      <h1 className="mt-4 text-2xl tracking-wide">Contenu introuvable</h1>
      <p className="mt-2 text-blanc/70">
        Ce contenu n&apos;existe pas ou n&apos;est pas encore ouvert pour votre formation.
      </p>
      <Button asChild className="mt-6">
        <Link href={studentRoutes.dashboard}>Revenir au tableau de bord</Link>
      </Button>
    </div>
  );
}
