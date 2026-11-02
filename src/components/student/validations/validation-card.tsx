import Link from "next/link";
import { Award, BadgeCheck, CircleCheck, CircleX, Clock3, Download, FileSignature } from "lucide-react";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { studentRoutes } from "@/config/student-nav";
import { formatDate } from "@/lib/student/format";
import { validationKindLabels, type Validation } from "@/lib/student/queries/finance";

const decisionTone = { pending: "warning", granted: "success", refused: "danger" } as const;
const decisionLabel = { pending: "En attente", granted: "Accordée", refused: "Refusée" } as const;

/** Une décision officielle : critères, signataire et lien vers le certificat PDF vérifiable. */
export function ValidationCard({ v, timezone }: { v: Validation; timezone: string }) {
  return (
    <li className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
          <Award aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-blanc">{v.title}</h3>
          <p className="text-sm text-blanc/55">
            {validationKindLabels[v.kind]}
            {v.levelTitle ? ` · ${v.levelTitle}` : ""}
          </p>
        </div>
        <Badge tone={decisionTone[v.decision]} dot>
          {decisionLabel[v.decision]}
        </Badge>
        {v.isExample && <ExampleBadge />}
      </div>

      {v.description && <p className="mt-4 text-sm text-blanc/70">{v.description}</p>}

      {v.criteria.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {v.criteria.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              {c.met ? (
                <CircleCheck aria-hidden className="size-4 shrink-0 text-success-light" />
              ) : (
                <Clock3 aria-hidden className="size-4 shrink-0 text-blanc/35" />
              )}
              <span className={c.met ? "text-blanc/80" : "text-blanc/50"}>{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-sm text-blanc/55">
        {v.decidedAt && (
          <span className="inline-flex items-center gap-1.5">
            <FileSignature aria-hidden className="size-4 text-or" />
            Décision du {formatDate(v.decidedAt, timezone)}
            {v.signatory ? ` · ${v.signatory}` : ""}
          </span>
        )}
        {v.certificateNumber && (
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck aria-hidden className="size-4 text-or" />N° {v.certificateNumber}
          </span>
        )}
        {v.decision === "granted" && v.certificateNumber && (
          <Link
            href={`${studentRoutes.validations}/certificat/${v.id}`}
            className="inline-flex items-center gap-1.5 font-semibold text-or-light hover:text-or hover:underline"
          >
            <Download aria-hidden className="size-4" /> Télécharger le certificat (PDF)
          </Link>
        )}
        {v.decision === "refused" && (
          <span className="inline-flex items-center gap-1.5 text-danger-light">
            <CircleX aria-hidden className="size-4" /> Décision motivée par l&rsquo;équipe pédagogique
          </span>
        )}
      </div>
    </li>
  );
}

/** Liste des validations groupées : « En attente de décision » puis « Décisions rendues ». */
export function ValidationList({ items, timezone }: { items: Validation[]; timezone: string }) {
  const pending = items.filter((v) => v.decision === "pending");
  const decided = items.filter((v) => v.decision !== "pending");
  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section aria-labelledby="pending-title">
          <h2 id="pending-title" className="text-xl tracking-wide text-blanc">
            En attente de décision
          </h2>
          <ul className="mt-4 space-y-4">
            {pending.map((v) => (
              <ValidationCard key={v.id} v={v} timezone={timezone} />
            ))}
          </ul>
        </section>
      )}
      {decided.length > 0 && (
        <section aria-labelledby="decided-title">
          <h2 id="decided-title" className="text-xl tracking-wide text-blanc">
            Décisions rendues
          </h2>
          <ul className="mt-4 space-y-4">
            {decided.map((v) => (
              <ValidationCard key={v.id} v={v} timezone={timezone} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
