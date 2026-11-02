import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { StudentProviders } from "@/components/student/layout/providers";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/navigation";
import { isStudentSpaceAvailable } from "@/lib/student/session";

export const metadata: Metadata = {
  title: { default: "Espace étudiant", template: "%s · Espace étudiant" },
  robots: { index: false, follow: false },
};

export default function StudentRootLayout({ children }: LayoutProps<"/espace-etudiant">) {
  if (!isStudentSpaceAvailable) {
    return (
      <main className="grid min-h-dvh place-items-center bg-aura px-5">
        <div className="max-w-md rounded-3xl border border-line bg-gradient-card p-8 text-center">
          <Logo className="justify-center" />
          <Settings2 aria-hidden className="mx-auto mt-8 size-10 text-or" />
          <h1 className="mt-4 text-2xl tracking-wide">Espace étudiant indisponible</h1>
          <p className="mt-3 text-blanc/70">
            L&apos;espace étudiant nécessite la base de données de l&apos;école. Il n&apos;est pas disponible en mode
            démonstration.
          </p>
          <Button asChild className="mt-6">
            <Link href={routes.home}>Retour au site</Link>
          </Button>
        </div>
      </main>
    );
  }
  return <StudentProviders>{children}</StudentProviders>;
}
