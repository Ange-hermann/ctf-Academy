import Link from "next/link";
import { BookMarked, CalendarDays, Download, FileText, Landmark, MessagesSquare, UserRound, Video } from "lucide-react";
import { ThesisComments } from "@/components/student/formation/thesis-comments";
import { UploadField } from "@/components/student/formation/upload-field";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { formationBase } from "@/config/student-nav";
import { formatDate, formatDateTime } from "@/lib/student/format";
import { defenseStatusLabels, getThesis, versionStatusLabels, type VersionStatus } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Mémoire et soutenance — Diacres" };
const HREF = `${formationBase.diacres}/memoire`;

const versionTone: Record<VersionStatus, "warning" | "gold" | "danger" | "success"> = {
  submitted: "warning",
  in_review: "gold",
  to_fix: "danger",
  accepted: "success",
};
const defenseTone = { proposed: "warning", confirmed: "gold", done: "success" } as const;
const fmtSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`);

export default async function DiacresMemoirePage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "diacres") {
    return <WrongFormation expected="l'École des Diacres" current={ctx.enrollment.formationName} />;
  }
  const thesis = await withStudent(ctx.userId, (tx) => getThesis(tx, ctx.userId));

  if (!thesis) {
    return (
      <>
        <StudentPageHeader
          title="Mémoire et soutenance"
          eyebrow="École des Diacres"
          description="Dépôt des versions, relecture avec votre superviseur et soutenance devant jury."
          crumbs={[{ label: "Mémoire et soutenance", href: HREF }]}
        />
        <EmptyState
          icon={BookMarked}
          title="Sujet non encore attribué"
          description="Votre sujet de mémoire et votre superviseur seront publiés ici par l'équipe pédagogique."
        />
      </>
    );
  }

  const versionNumbers = Object.fromEntries(thesis.versions.map((v) => [v.id, v.version]));
  const openComments = thesis.comments.filter((c) => c.status === "open" && !c.parentId).length;

  return (
    <>
      <StudentPageHeader
        title="Mémoire et soutenance"
        eyebrow="École des Diacres"
        description="Dépôt des versions, relecture avec votre superviseur et soutenance devant jury."
        crumbs={[{ label: "Mémoire et soutenance", href: HREF }]}
      />

      <section className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6" aria-labelledby="thesis-title">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
            <BookMarked aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="thesis-title" className="font-semibold text-blanc">
              {thesis.title}
            </h2>
            <p className="text-sm text-blanc/55">
              <UserRound aria-hidden className="mr-1 inline size-4 text-or" />
              Superviseur : {thesis.supervisorName}
            </p>
          </div>
          {thesis.isExample && <ExampleBadge />}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="thesis-versions">
          <h2 id="thesis-versions" className="mb-4 text-xl tracking-wide text-blanc">
            Versions déposées
          </h2>
          {thesis.versions.length === 0 ? (
            <p className="mb-4 text-sm text-blanc/55">Aucune version déposée pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {thesis.versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-noir-soft/40 px-4 py-3.5">
                  <FileText aria-hidden className="size-5 shrink-0 text-or" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-blanc">Version {v.version}</p>
                    <p className="text-xs text-blanc/50">
                      {v.fileName} · {fmtSize(v.sizeBytes)} · {formatDate(v.createdAt, ctx.timezone)}
                    </p>
                  </div>
                  <Badge tone={versionTone[v.status]} dot>
                    {versionStatusLabels[v.status]}
                  </Badge>
                  <Link href={v.fileHref} className="inline-flex items-center gap-1 text-sm font-medium text-or-light hover:text-or hover:underline">
                    <Download aria-hidden className="size-4" /> Ouvrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <UploadField scope="memoire" targetId={thesis.id} label="Déposer une nouvelle version (PDF ou DOCX)" />
          </div>
        </section>

        <section aria-labelledby="thesis-defense">
          <h2 id="thesis-defense" className="mb-4 text-xl tracking-wide text-blanc">
            Soutenance
          </h2>
          {!thesis.defense ? (
            <p className="text-sm text-blanc/55">La soutenance sera programmée une fois votre mémoire accepté.</p>
          ) : (
            <div className="rounded-2xl border border-line bg-noir-soft/40 p-4">
              <div className="flex items-center gap-2">
                <Landmark aria-hidden className="size-4 text-or" />
                <Badge tone={defenseTone[thesis.defense.status]} dot>
                  {defenseStatusLabels[thesis.defense.status]}
                </Badge>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-blanc/70">
                {thesis.defense.scheduledAt && (
                  <li className="flex items-center gap-2">
                    <CalendarDays aria-hidden className="size-4 shrink-0 text-or" />
                    {formatDateTime(thesis.defense.scheduledAt, ctx.timezone)}
                  </li>
                )}
                {thesis.defense.place && <li>Lieu : {thesis.defense.place}</li>}
                {thesis.defense.zoomUrl && (
                  <li>
                    <a href={thesis.defense.zoomUrl} className="inline-flex items-center gap-1.5 font-medium text-or-light hover:text-or hover:underline">
                      <Video aria-hidden className="size-4" /> Lien de visioconférence
                    </a>
                  </li>
                )}
                {thesis.defense.jury.length > 0 && <li>Jury : {thesis.defense.jury.join(", ")}</li>}
                {thesis.defense.status === "proposed" && thesis.defense.proposedDates.length > 0 && (
                  <li>
                    Dates proposées :{" "}
                    {thesis.defense.proposedDates.map((d) => formatDate(d, ctx.timezone)).join(" · ")}
                  </li>
                )}
                {thesis.defense.result && <li className="font-semibold text-or-light">Résultat : {thesis.defense.result}</li>}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="thesis-comments" className="mt-8">
        <h2 id="thesis-comments" className="mb-1 text-xl tracking-wide text-blanc">
          Relecture <span className="font-sans text-sm text-blanc/50">({openComments} point(s) ouvert(s))</span>
        </h2>
        <p className="mb-4 flex items-center gap-1.5 text-sm text-blanc/55">
          <MessagesSquare aria-hidden className="size-4 text-or" />
          Répondez aux commentaires de votre superviseur puis marquez chaque point résolu.
        </p>
        {thesis.comments.length === 0 ? (
          <p className="text-sm text-blanc/55">Aucun commentaire pour le moment.</p>
        ) : (
          <ThesisComments comments={thesis.comments} versionNumbers={versionNumbers} timezone={ctx.timezone} />
        )}
      </section>
    </>
  );
}
