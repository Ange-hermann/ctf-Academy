import { CalendarDays, ClipboardCheck, Flame, MessageSquareQuote, UserRound } from "lucide-react";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { ValidationList } from "@/components/student/validations/validation-card";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { formationBase } from "@/config/student-nav";
import { formatDate, formatDateTime } from "@/lib/student/format";
import { getPastoralEvaluations } from "@/lib/student/queries/formation";
import { getValidations } from "@/lib/student/queries/finance";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Évaluation pastorale — Diacres" };
const HREF = `${formationBase.diacres}/consecration`;

export default async function DiacresConsecrationPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "diacres") {
    return <WrongFormation expected="l'École des Diacres" current={ctx.enrollment.formationName} />;
  }
  const [evaluations, validations] = await Promise.all([
    withStudent(ctx.userId, (tx) => getPastoralEvaluations(tx)),
    getValidations(ctx),
  ]);
  const decisions = validations.filter((v) => v.kind === "consecration" || v.kind === "defense");

  return (
    <>
      <StudentPageHeader
        title="Évaluation pastorale"
        eyebrow="École des Diacres"
        description="Évaluations de votre exercice pastoral et décisions relatives à la consécration."
        crumbs={[{ label: "Évaluation pastorale", href: HREF }]}
      />

      <section aria-labelledby="pc-evals">
        <h2 id="pc-evals" className="mb-4 text-xl tracking-wide text-blanc">
          Évaluations
        </h2>
        {evaluations.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="Aucune évaluation programmée"
            description="Les entretiens et bilans pastoraux seront programmés ici par l'équipe."
          />
        ) : (
          <ul className="space-y-4">
            {evaluations.map((e) => (
              <li key={e.id} className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
                    <ClipboardCheck aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-blanc">{e.title}</h3>
                    <p className="text-sm text-blanc/55">
                      {e.evaluatorName && (
                        <>
                          <UserRound aria-hidden className="mr-1 inline size-4 text-or" />
                          {e.evaluatorName} ·{" "}
                        </>
                      )}
                      {e.status === "done" && e.evaluatedAt
                        ? `Réalisée le ${formatDateTime(e.evaluatedAt, ctx.timezone)}`
                        : e.scheduledOn
                          ? `Prévue le ${formatDate(e.scheduledOn, ctx.timezone)}`
                          : "Date à confirmer"}
                    </p>
                  </div>
                  <Badge tone={e.status === "done" ? "success" : "warning"} dot>
                    {e.status === "done" ? "Réalisée" : "En attente"}
                  </Badge>
                  {e.isExample && <ExampleBadge />}
                </div>
                {e.feedback && (
                  <div className="mt-4 rounded-2xl border border-or/25 bg-or/5 px-4 py-3">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-or-light uppercase">
                      <MessageSquareQuote aria-hidden className="size-3.5" /> Bilan de l&rsquo;évaluateur
                    </p>
                    <p className="mt-2 text-sm whitespace-pre-line text-blanc/75">{e.feedback}</p>
                  </div>
                )}
                {e.status !== "done" && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-blanc/50">
                    <CalendarDays aria-hidden className="size-4 text-or" /> Le bilan sera publié après l&rsquo;évaluation.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pc-decisions" className="mt-10">
        <h2 id="pc-decisions" className="mb-4 text-xl tracking-wide text-blanc">
          Décisions officielles
        </h2>
        {decisions.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="Aucune décision enregistrée"
            description="Les décisions de soutenance et de consécration apparaîtront ici."
          />
        ) : (
          <ValidationList items={decisions} timezone={ctx.timezone} />
        )}
      </section>
    </>
  );
}
