import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { getKeyWord, tintStyle, type ChurchObjective, type KeyWordSlug } from "@/content/identity";
import {
  admissionStatuses,
  paymentStatuses,
  registrationStatuses,
  type AdmissionStatus,
  type PaymentStatus,
  type RegistrationStatus,
} from "@/lib/statuses";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm leading-none font-medium",
  {
    variants: {
      tone: {
        neutral: "border-blanc/15 bg-blanc/5 text-blanc/75",
        gold: "border-or/35 bg-or/10 text-or-light",
        success: "border-success/35 bg-success/10 text-success-light",
        danger: "border-danger/35 bg-danger/10 text-danger-light",
        warning: "border-warning/35 bg-warning/10 text-warning-light",
      },
    },
    defaultVariants: { tone: "gold" },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { dot?: boolean };

export function Badge({ className, tone, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Marqueur des valeurs d'exemple (tarifs, dates, durées non officiels). */
export function ExampleBadge({ className }: { className?: string }) {
  return (
    <span
      title="Valeur d'exemple, à confirmer par l'Église"
      className={cn(
        "inline-flex items-center rounded-full border border-dashed border-or/40 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wider text-or-light/90 uppercase",
        className,
      )}
    >
      Exemple
    </span>
  );
}

type StatusBadgeProps =
  | { kind: "registration"; status: RegistrationStatus }
  | { kind: "payment"; status: PaymentStatus }
  | { kind: "admission"; status: AdmissionStatus };

const statusMaps = { registration: registrationStatuses, payment: paymentStatuses, admission: admissionStatuses };
const statusPrefix = { registration: "Inscription", payment: "Paiement", admission: "Admission" };

export function StatusBadge(props: StatusBadgeProps) {
  const { label, tone } = (statusMaps[props.kind] as Record<string, { label: string; tone: BadgeProps["tone"] }>)[
    props.status
  ];
  return (
    <Badge tone={tone} dot>
      <span className="sr-only">{statusPrefix[props.kind]} : </span>
      {label}
    </Badge>
  );
}

/** Pastille d'un mot clé : couleur + libellé (jamais la couleur seule). */
export function KeyWordPill({ slug, className }: { slug: KeyWordSlug; className?: string }) {
  const kw = getKeyWord(slug);
  return (
    <span
      style={tintStyle(kw)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-noir-soft/80 px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase tint-border tint-text tint-glow",
        className,
      )}
    >
      <span aria-hidden className="size-2 rounded-full tint-dot" />
      {kw.label}
    </span>
  );
}

export function ObjectivePill({ objective, className }: { objective: ChurchObjective; className?: string }) {
  return (
    <span
      style={tintStyle(objective)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-noir-soft/80 px-3 py-1 text-xs font-semibold tint-border tint-text",
        className,
      )}
    >
      <span aria-hidden className="grid size-5 place-items-center rounded-full text-[0.7rem] font-bold text-noir tint-bg">
        {objective.number}
      </span>
      <span className="sr-only">Objectif {objective.number} :</span>
      {objective.verb}
    </span>
  );
}
