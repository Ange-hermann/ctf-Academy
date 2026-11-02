/**
 * Les trois statuts d'une candidature sont distincts et indépendants :
 * un paiement confirmé ne signifie pas une admission.
 */

export type Tone = "neutral" | "gold" | "success" | "danger" | "warning";

export const registrationStatuses = {
  draft: { label: "Brouillon", tone: "neutral" },
  submitted: { label: "Soumise", tone: "gold" },
  complete: { label: "Complète", tone: "success" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const paymentStatuses = {
  pending: { label: "En attente", tone: "warning" },
  confirmed: { label: "Confirmé", tone: "success" },
  failed: { label: "Échoué", tone: "danger" },
  refunded: { label: "Remboursé", tone: "neutral" },
  partial: { label: "Partiel", tone: "gold" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const admissionStatuses = {
  under_review: { label: "En étude", tone: "gold" },
  admitted: { label: "Admis", tone: "success" },
  rejected: { label: "Refusé", tone: "danger" },
  waitlisted: { label: "Liste d'attente", tone: "warning" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export type RegistrationStatus = keyof typeof registrationStatuses;
export type PaymentStatus = keyof typeof paymentStatuses;
export type AdmissionStatus = keyof typeof admissionStatuses;
