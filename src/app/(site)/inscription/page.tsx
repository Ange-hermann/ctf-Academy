import Image from "next/image";
import { AuthShell } from "@/components/forms/auth-shell";
import { InscriptionGuide } from "@/components/forms/inscription-guide";
import { RegistrationWizard } from "@/components/forms/registration-wizard";
import { routes } from "@/config/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveApplication } from "@/lib/registration/store";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

/**
 * Ligne de caractères répartis sur toute la largeur du bloc conteneur :
 * empilées dans une colonne à largeur automatique, les lignes affichées
 * font exactement la même longueur (la plus longue fixe la mesure).
 */
function SpreadLine({
  text,
  className,
  charClassName,
}: {
  text: string;
  className?: string;
  charClassName?: string;
}) {
  return (
    <>
      <span aria-hidden className={cn("flex justify-between", className)}>
        {Array.from(text).map((ch, i) => (
          <span key={i} className={charClassName}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}

export const metadata = pageMetadata({
  title: "Inscription en ligne",
  description:
    "Inscrivez-vous à l'EDS — École des STAFS en 7 étapes : conditions d'admission, compte, formulaire, rendez-vous d'entretien, frais d'inscription, accès et paiement des cours.",
  path: routes.register,
});

export default async function RegisterPage() {
  const [user, app, settings] = await Promise.all([getCurrentUser(), getActiveApplication(), getSiteSettings()]);
  // Inscriptions fermées : seule la reprise d'une candidature déjà commencée reste possible.
  const closed = !settings.registrationsOpen && !app;

  return (
    <AuthShell
      wide
      emblem={false}
      masthead={
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:justify-between">
          {/* @container : les polices en cqw se calent sur la moitié de la carte, sans déborder sur la photo */}
          <div className="flex w-full min-w-0 flex-col pr-4 @container sm:w-1/2 sm:pr-6">
            <h1>
              <SpreadLine
                text="EDS — École des STAFS"
                className="font-display text-[clamp(1.1rem,7.5cqw,3rem)] font-extrabold uppercase"
                charClassName="text-gradient-gold-metal"
              />
            </h1>
            <SpreadLine
              text="STAF — Serviteur pour la Transformation"
              className="mt-3 font-nav text-[clamp(0.5rem,2.6cqw,0.8rem)] font-semibold text-or-light/90 uppercase"
            />
            <SpreadLine
              text="et l'Adoration dans les Familles"
              className="font-nav text-[clamp(0.5rem,2.6cqw,0.8rem)] font-semibold text-or-light/90 uppercase"
            />
            <p className="mt-12 text-sm text-blanc/70 sm:text-base">
              Comment s&rsquo;inscrire et commencer votre formation&nbsp;?
            </p>
            <p className="mt-2 text-sm text-blanc/70 sm:text-base">
              Bienvenue à la CTF Academy ! Nous sommes heureux de vous accompagner dans votre parcours de formation et de
              croissance spirituelle. Pour accéder aux cours, veuillez suivre les étapes ci-dessous.
            </p>
            <InscriptionGuide />
          </div>
          <span className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-or/40 shadow-gold-sm sm:aspect-auto sm:self-stretch">
            <Image
              src="/dip.jpg"
              alt=""
              fill
              sizes="(min-width: 640px) 30rem, 100vw"
              className="object-cover object-[50%_15%] sm:object-center"
            />
          </span>
        </div>
      }
      breadcrumb={[{ label: "Inscription", href: routes.register }]}
    >
      {closed ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-or/30 bg-noir-card p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-or-light">Inscriptions fermées</h2>
          <p className="mt-3 text-sm leading-relaxed text-blanc/70">{settings.registrationNotice}</p>
        </div>
      ) : (
        <RegistrationWizard
          user={user ? { firstName: user.firstName, email: user.email } : null}
          resume={
            app
              ? {
                  reference: app.reference,
                  formation: app.formation,
                  registrationStatus: app.registrationStatus,
                  paymentStatus: app.paymentStatus,
                  admissionStatus: app.admissionStatus,
                }
              : null
          }
        />
      )}
    </AuthShell>
  );
}
