import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "gold" | "success" | "danger" | "warning";

/** Titre de page admin : sobre, sans animation (règle projet : transform/opacity, pas d'animation superflue en administration). */
export function AdminIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <p className="font-display text-xs font-semibold tracking-[0.28em] text-or uppercase">Administration</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-blanc sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-3xl text-sm text-blanc/60">{subtitle}</p>}
    </header>
  );
}

export function StatCard({ label, value, detail, href, icon }: { label: string; value: string | number; detail?: string; href?: string; icon?: ReactNode }) {
  const body = (
    <div className="h-full rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card transition-colors hover:border-or/50">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-blanc/55 uppercase">{label}</p>
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-or/30 bg-or/10 text-or-light">{icon}</span>}
      </div>
      <p className="font-display mt-2 text-3xl font-bold text-or-light">{value}</p>
      {detail && <p className="mt-1 text-xs text-blanc/50">{detail}</p>}
    </div>
  );
  return href ? (
    <a href={href} className="block" aria-label={`${label} : ${value}`}>
      {body}
    </a>
  ) : (
    body
  );
}

export function AdminSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-blanc">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-blanc/50 uppercase">
            {head.map((h) => (
              <th key={h} scope="col" className={cn("px-2 py-2 font-medium whitespace-nowrap")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">{children}</tbody>
      </table>
    </div>
  );
}

const statusTones: Record<string, BadgeTone> = {
  submitted: "warning",
  under_review: "warning",
  pending: "warning",
  partial: "warning",
  late: "danger",
  failed: "danger",
  rejected: "danger",
  to_fix: "danger",
  open: "warning",
  draft: "neutral",
  confirmed: "success",
  admitted: "success",
  complete: "success",
  paid: "success",
  validated: "success",
  accepted: "success",
  done: "success",
  graded: "success",
  resolved: "success",
  granted: "success",
  refused: "danger",
  active: "success",
  completed: "neutral",
  waitlisted: "gold",
  in_review: "gold",
  in_progress: "gold",
  upcoming: "neutral",
  refunded: "neutral",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Déposée",
  complete: "Complète",
  under_review: "En examen",
  admitted: "Admis",
  rejected: "Refusé",
  waitlisted: "Liste d'attente",
  pending: "En attente",
  confirmed: "Confirmé",
  failed: "Échoué",
  refunded: "Remboursé",
  partial: "Partiel",
  paid: "Réglée",
  late: "En retard",
  upcoming: "À venir",
  validated: "Validé",
  to_fix: "À corriger",
  in_review: "En relecture",
  accepted: "Acceptée",
  open: "Ouvert",
  in_progress: "En cours",
  done: "Réalisée",
  graded: "Corrigée",
  redo: "À reprendre",
  resolved: "Résolu",
  granted: "Accordée",
  refused: "Refusée",
  active: "Active",
  completed: "Clôturée",
};

/** Étiquette de statut harmonisée (libellé FR + teinte) pour toutes les tables admin. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTones[status] ?? "neutral"}>{statusLabels[status] ?? status}</Badge>;
}
