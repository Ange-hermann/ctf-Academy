import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileSearch, LogOut, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ApplicationStatus } from "@/components/sections/application-status";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/navigation";
import { studentRoutes } from "@/config/student-nav";
import { churchVision } from "@/content/identity";
import { signOutAction } from "@/lib/auth/actions";
import { getStudentContext } from "@/lib/student/session";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Suivre ma candidature" };

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/** Seule page accessible tant que la candidature n'est pas admise (ou le paiement non confirmé). */
export default async function StudentApplicationPage() {
  const ctx = await getStudentContext();
  if (!ctx) redirect(`${routes.login}?next=${encodeURIComponent(studentRoutes.application)}`);

  return (
    <div className="min-h-dvh bg-aura">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5">
        <Link href={routes.home} aria-label="CTF CHURCH — Accueil" className="rounded-xl">
          <Logo subtitleClassName="hidden sm:block" />
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut /> Se déconnecter
          </Button>
        </form>
      </header>

      <main id="contenu" className="page-enter mx-auto max-w-3xl space-y-8 px-5 pt-6 pb-24">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-or-light uppercase">Espace étudiant</p>
          <h1 className="mt-2 text-3xl tracking-wide sm:text-4xl">
            {ctx.firstName ? `Bonjour, ${ctx.firstName}` : "Suivre ma candidature"}
          </h1>
          <p className="mt-3 text-blanc/70">
            {ctx.enrollment
              ? "Votre inscription est active : votre espace étudiant complet vous attend."
              : "Votre espace étudiant s'ouvrira dès que votre admission sera prononcée et votre paiement confirmé. Voici où en est votre dossier."}
          </p>
          <p className="mt-2 text-sm text-blanc/45 italic">« {churchVision.text} »</p>
        </div>

        {ctx.enrollment && (
          <Button asChild size="lg" halo>
            <Link href={studentRoutes.dashboard}>
              Accéder à mon tableau de bord <ArrowRight />
            </Link>
          </Button>
        )}

        {ctx.applications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line p-8 text-center">
            <FileSearch aria-hidden className="mx-auto size-10 text-or" />
            <h2 className="mt-4 font-sans text-lg font-semibold text-blanc">Aucune candidature pour le moment</h2>
            <p className="mt-2 text-blanc/65">Choisissez une formation pour démarrer votre inscription.</p>
            <Button asChild className="mt-6">
              <Link href={routes.register}>Commencer mon inscription</Link>
            </Button>
          </div>
        ) : (
          ctx.applications.map((a) => (
            <article key={a.id} className="space-y-5 rounded-3xl border border-line bg-gradient-card p-5 sm:p-7">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl tracking-wide">{a.formationName}</h2>
                <p className="text-sm text-blanc/55">
                  Dossier <span className="font-mono text-or-light">{a.reference}</span> ·{" "}
                  {date.format(new Date(a.createdAt))}
                </p>
              </header>
              <ApplicationStatus
                formation={a.formation}
                registrationStatus={a.registrationStatus}
                paymentStatus={a.paymentStatus}
                admissionStatus={a.admissionStatus}
              />
              {(a.registrationStatus !== "complete" ||
                a.paymentStatus === "failed" ||
                a.paymentStatus === "pending") && (
                <Button asChild variant="outline">
                  <Link href={routes.register}>Reprendre mon inscription</Link>
                </Button>
              )}
            </article>
          ))
        )}

        <aside className="flex flex-col gap-4 rounded-3xl border border-or/30 bg-or/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-sans text-base font-semibold text-blanc">Une question sur votre dossier ?</h2>
            <p className="mt-1 text-blanc/70">L&apos;équipe des admissions vous répond sur WhatsApp.</p>
          </div>
          <Button asChild variant="outline">
            <a
              href={whatsappLink("Bonjour CTF ACADEMY, j'ai une question sur ma candidature.")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle /> Écrire sur WhatsApp
            </a>
          </Button>
        </aside>
      </main>
    </div>
  );
}
