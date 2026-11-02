import Link from "next/link";
import { FileSearch } from "lucide-react";
import { AuthShell } from "@/components/forms/auth-shell";
import { ApplicationStatus } from "@/components/sections/application-status";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/navigation";
import { paymentMethods } from "@/content/admissions";
import { formatAmount, getFormation } from "@/content/formations";
import { getMyApplications } from "@/lib/applications/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Suivre ma candidature",
  description: "Suivez l'avancement de votre inscription, de votre paiement et de votre admission.",
  path: routes.application,
  noIndex: true,
});

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function ApplicationPage() {
  const [user, applications] = await Promise.all([getCurrentUser(), getMyApplications()]);
  return (
    <AuthShell
      wide
      title="Suivre ma candidature"
      subtitle={user?.firstName ? `Bonjour ${user.firstName}, voici où en est votre dossier.` : "Voici où en est votre dossier."}
      breadcrumb={[
        { label: "Mon compte", href: "/compte" },
        { label: "Suivre ma candidature", href: routes.application },
      ]}
    >
      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <FileSearch aria-hidden className="mx-auto size-10 text-or" />
          <p className="mt-4 text-lg font-semibold text-blanc">Aucune candidature pour le moment</p>
          <p className="mt-2 text-blanc/65">Choisissez une formation pour démarrer votre inscription en 5 étapes.</p>
          <Button asChild className="mt-6">
            <Link href={routes.register}>Commencer mon inscription</Link>
          </Button>
        </div>
      ) : (
        applications.map((a) => {
          const f = getFormation(a.formation);
          return (
            <article key={a.id} className="space-y-5 rounded-2xl border border-line bg-noir/30 p-5 sm:p-6">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl tracking-wide">{f?.name}</h2>
                <p className="text-sm text-blanc/55">
                  Dossier <span className="font-mono text-or-light">{a.reference}</span> · {date.format(new Date(a.createdAt))}
                </p>
              </header>
              <ApplicationStatus
                formation={a.formation}
                registrationStatus={a.registrationStatus}
                paymentStatus={a.paymentStatus}
                admissionStatus={a.admissionStatus}
              />
              {a.payments.length > 0 && (
                <div>
                  <h3 className="font-sans text-sm font-semibold tracking-[0.2em] text-or-light uppercase">Paiements</h3>
                  <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
                    {a.payments.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-blanc/80">
                        <span>{paymentMethods.find((m) => m.id === p.method)?.label}</span>
                        <span className="font-semibold text-blanc">{formatAmount({ value: p.amount, isExample: false })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(a.registrationStatus !== "complete" || a.paymentStatus === "failed") && (
                <Button asChild variant="outline">
                  <Link href={routes.register}>Reprendre mon inscription</Link>
                </Button>
              )}
            </article>
          );
        })
      )}
    </AuthShell>
  );
}
