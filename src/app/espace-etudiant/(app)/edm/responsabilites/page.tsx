import { CalendarDays, ClipboardList, MapPin, StickyNote, UserRound } from "lucide-react";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { formationBase } from "@/config/student-nav";
import { formatDate } from "@/lib/student/format";
import { getResponsibilities } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Suivi des responsabilités — EDM" };
const HREF = `${formationBase.edm}/responsabilites`;

const statusMeta = (status: string): { label: string; tone: "success" | "warning" | "neutral" } =>
  status === "active"
    ? { label: "En cours", tone: "success" }
    : status === "done"
      ? { label: "Terminée", tone: "neutral" }
      : { label: status, tone: "warning" };

export default async function EdmResponsabilitesPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "edm") {
    return <WrongFormation expected="l'École des Mentors" current={ctx.enrollment.formationName} />;
  }
  const responsibilities = await withStudent(ctx.userId, (tx) => getResponsibilities(tx));

  return (
    <>
      <StudentPageHeader
        title="Suivi des responsabilités"
        eyebrow="École des Mentors"
        description="Les rôles concrets qui vous sont confiés pendant la formation, leur période et le suivi de votre référent."
        crumbs={[{ label: "Suivi des responsabilités", href: HREF }]}
      />
      {responsibilities.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune responsabilité confiée"
          description="Les rôles qui vous seront confiés (accueil, intercession, coordination…) apparaîtront ici."
        />
      ) : (
        <ul className="space-y-4">
          {responsibilities.map((r) => {
            const meta = statusMeta(r.status);
            return (
              <li key={r.id} className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
                    <ClipboardList aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-blanc">{r.role}</h2>
                    <p className="inline-flex items-center gap-1.5 text-sm text-blanc/55">
                      <MapPin aria-hidden className="size-4 text-or" /> {r.place}
                    </p>
                  </div>
                  <Badge tone={meta.tone} dot>
                    {meta.label}
                  </Badge>
                  {r.isExample && <ExampleBadge />}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-blanc/60">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays aria-hidden className="size-4 text-or" />
                    {formatDate(r.startsOn, ctx.timezone)}
                    {r.endsOn ? ` → ${formatDate(r.endsOn, ctx.timezone)}` : " → en cours"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound aria-hidden className="size-4 text-or" /> Référent : {r.supervisorName}
                  </span>
                </div>

                {r.notes.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-line pt-4">
                    {r.notes.map((n, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blanc/70">
                        <StickyNote aria-hidden className="mt-0.5 size-4 shrink-0 text-or/70" />
                        <span>
                          {n.label && <span className="font-medium text-or-light">{n.label} · </span>}
                          {n.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
