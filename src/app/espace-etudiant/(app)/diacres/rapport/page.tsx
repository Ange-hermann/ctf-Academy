import Link from "next/link";
import { FileText, MessageSquareQuote, Paperclip } from "lucide-react";
import { ReportForm } from "@/components/student/formation/report-form";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { formationBase } from "@/config/student-nav";
import { formatDateTime } from "@/lib/student/format";
import { getInternship, reportStatusLabels, type ReportStatus } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Rapport de stage — Diacres" };
const HREF = `${formationBase.diacres}/rapport`;

const tone: Record<ReportStatus, "neutral" | "warning" | "danger" | "success"> = {
  draft: "neutral",
  submitted: "warning",
  to_fix: "danger",
  validated: "success",
};

export default async function DiacresRapportPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "diacres") {
    return <WrongFormation expected="l'École des Diacres" current={ctx.enrollment.formationName} />;
  }
  const stage = await withStudent(ctx.userId, (tx) => getInternship(tx, ctx.userId));

  return (
    <>
      <StudentPageHeader
        title="Rapport de stage"
        eyebrow="École des Diacres"
        description="Les versions de votre rapport et les commentaires de votre référent, version après version."
        crumbs={[{ label: "Rapport de stage", href: HREF }]}
      />
      {!stage ? (
        <EmptyState
          icon={FileText}
          title="Aucun stage attribué"
          description="Le rapport suivra votre stage pratique : il apparaîtra ici dès qu'une version sera déposée."
          action={{ label: "Voir le suivi du stage", href: `${formationBase.diacres}/stage` }}
        />
      ) : (
        <>
          <ReportForm internshipId={stage.id} />
          {stage.reports.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={FileText}
                title="Aucune version déposée"
                description="Rédigez votre rapport en ligne ou déposez le fichier : chaque envoi crée une nouvelle version."
              />
            </div>
          ) : (
        <ol className="mt-6 space-y-4">
          {stage.reports.map((r) => (
            <li key={r.id} className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
                  <FileText aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-blanc">Version {r.version}</h2>
                  <p className="text-sm text-blanc/55">Déposée le {formatDateTime(r.createdAt, ctx.timezone)}</p>
                </div>
                <Badge tone={tone[r.status]} dot>
                  {reportStatusLabels[r.status]}
                </Badge>
              </div>

              {r.fileHref && (
                <Link
                  href={r.fileHref}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-or-light hover:text-or hover:underline"
                >
                  <Paperclip aria-hidden className="size-4" /> {r.fileName ?? "Fichier du rapport"}
                </Link>
              )}
              {r.body && <p className="mt-3 text-sm whitespace-pre-line text-blanc/75">{r.body}</p>}

              {r.supervisorComment && (
                <div className="mt-4 rounded-2xl border border-or/25 bg-or/5 px-4 py-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-or-light uppercase">
                    <MessageSquareQuote aria-hidden className="size-3.5" /> Commentaire du référent
                  </p>
                  <p className="mt-2 text-sm whitespace-pre-line text-blanc/75">{r.supervisorComment}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
          )}
        </>
      )}
    </>
  );
}
