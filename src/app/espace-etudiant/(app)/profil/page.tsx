import Link from "next/link";
import { CalendarDays, GraduationCap, KeyRound, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { Avatar } from "@/components/student/layout/topbar";
import { PreferencesForm } from "@/components/student/profile/preferences-form";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { routes } from "@/content/navigation";
import { getCountry } from "@/content/countries";
import { studentRoutes } from "@/config/student-nav";
import { formatDate } from "@/lib/student/format";
import { getProfile } from "@/lib/student/queries/profile";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Mon profil" };

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-1 py-2.5">
      <Icon aria-hidden className="size-4.5 shrink-0 text-or" />
      <span className="w-28 shrink-0 text-sm text-blanc/50">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-blanc/85">{value}</span>
    </li>
  );
}

export default async function ProfilePage() {
  const ctx = await requireStudent(studentRoutes.profile);
  const profile = await getProfile(ctx);
  const country = profile?.country ? getCountry(profile.country) : null;

  return (
    <>
      <StudentPageHeader
        title="Mon profil"
        description="Vos informations personnelles et vos préférences d'affichage et de notification."
        crumbs={[{ label: "Mon profil", href: studentRoutes.profile }]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Identité */}
        <section aria-labelledby="identity-title" className="rounded-3xl border border-line bg-gradient-card p-6">
          <h2 id="identity-title" className="sr-only">
            Identité
          </h2>
          <div className="flex items-center gap-4">
            <Avatar
              user={{ firstName: ctx.firstName, lastName: ctx.lastName, avatarUrl: ctx.avatarUrl }}
              size={64}
            />
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold text-blanc">
                {ctx.firstName} {ctx.lastName}
              </p>
              <p className="truncate text-sm text-blanc/55">{ctx.email}</p>
            </div>
          </div>

          <ul className="mt-6 divide-y divide-line border-t border-b border-line">
            <InfoRow icon={Mail} label="E-mail" value={ctx.email} />
            <InfoRow icon={Phone} label="Téléphone" value={profile?.phone ?? "—"} />
            <InfoRow icon={MapPin} label="Pays" value={country?.name ?? "—"} />
            <InfoRow
              icon={GraduationCap}
              label="Formation"
              value={`${ctx.enrollment.formationName} · dossier ${ctx.enrollment.reference}`}
            />
            <InfoRow
              icon={CalendarDays}
              label="Membre depuis"
              value={profile ? formatDate(profile.memberSince, ctx.timezone) : "—"}
            />
          </ul>

          <p className="mt-4 flex items-start gap-2 text-xs text-blanc/45">
            <UserRound aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Pour modifier votre nom, e-mail ou téléphone, contactez l&rsquo;administration via Messages et assistance.
          </p>
        </section>

        <div className="space-y-6">
          {/* Préférences */}
          <section id="preferences" aria-labelledby="prefs-title" className="scroll-mt-24 rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <h2 id="prefs-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Préférences
            </h2>
            <div className="mt-5">
              {profile ? (
                <PreferencesForm profile={profile} />
              ) : (
                <p className="text-sm text-blanc/55">Profil indisponible pour le moment.</p>
              )}
            </div>
          </section>

          {/* Sécurité */}
          <section aria-labelledby="security-title" className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <h2 id="security-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Sécurité
            </h2>
            <p className="mt-3 text-sm text-blanc/60">
              Modifiez régulièrement votre mot de passe et ne le partagez jamais.
            </p>
            <Link
              href={routes.resetPassword}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-or/40 px-4 text-sm font-semibold text-or-light transition-colors hover:bg-or/10"
            >
              <KeyRound aria-hidden className="size-4" /> Changer mon mot de passe
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
