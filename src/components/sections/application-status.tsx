import { BadgeCheck, ClipboardList, CreditCard, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { getFormation } from "@/content/formations";
import type { AdmissionStatus, PaymentStatus, RegistrationStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Props = {
  formation: string;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  admissionStatus: AdmissionStatus;
};

const registrationText: Record<RegistrationStatus, string> = {
  draft: "Votre dossier est en brouillon : terminez le formulaire pour l'envoyer.",
  submitted: "Votre dossier est envoyé. Il sera complet dès la confirmation du paiement.",
  complete: "Votre dossier d'inscription est complet.",
};
const paymentText: Record<PaymentStatus, string> = {
  pending: "Paiement en attente de confirmation. Validez la demande reçue sur votre téléphone.",
  confirmed: "Paiement confirmé. Votre reçu vous a été envoyé par e-mail.",
  failed: "Le paiement n'a pas abouti. Vous pouvez réessayer depuis l'inscription.",
  refunded: "Votre paiement a été remboursé.",
  partial: "Paiement partiel reçu : le solde reste à régler.",
};
const admissionText = (status: AdmissionStatus, selection: boolean): string =>
  ({
    under_review: selection
      ? "Votre candidature est étudiée par l'équipe (sélection préalable). Vous serez informé par e-mail."
      : "Votre candidature est en cours de vérification par l'équipe des admissions.",
    admitted: "Félicitations, vous êtes admis ! L'accès complet à votre espace étudiant est ouvert.",
    rejected: "Votre candidature n'a pas été retenue pour cette session. L'équipe reste disponible pour échanger.",
    waitlisted: "Vous êtes sur liste d'attente. Nous vous contacterons dès qu'une place se libère.",
  })[status];

const nextAction = ({ registrationStatus, paymentStatus, admissionStatus }: Props) => {
  if (registrationStatus === "draft") return "Prochaine étape : terminer le formulaire d'inscription.";
  if (paymentStatus === "failed") return "Prochaine étape : relancer le paiement.";
  if (paymentStatus === "pending" || paymentStatus === "partial") return "Prochaine étape : finaliser le paiement.";
  if (admissionStatus === "under_review") return "Prochaine étape : attendre la décision d'admission.";
  if (admissionStatus === "admitted") return "Prochaine étape : découvrir votre espace étudiant.";
  return null;
};

/** Les 3 statuts, strictement séparés, avec un message clair et la prochaine action. */
export function ApplicationStatus(props: Props) {
  const f = getFormation(props.formation);
  const items: { icon: LucideIcon; title: string; badge: React.ReactNode; text: string; ok: boolean }[] = [
    {
      icon: ClipboardList,
      title: "Inscription",
      badge: <StatusBadge kind="registration" status={props.registrationStatus} />,
      text: registrationText[props.registrationStatus],
      ok: props.registrationStatus === "complete",
    },
    {
      icon: CreditCard,
      title: "Paiement",
      badge: <StatusBadge kind="payment" status={props.paymentStatus} />,
      text: paymentText[props.paymentStatus],
      ok: props.paymentStatus === "confirmed",
    },
    {
      icon: BadgeCheck,
      title: "Admission",
      badge: <StatusBadge kind="admission" status={props.admissionStatus} />,
      text: admissionText(props.admissionStatus, f?.requiresSelection ?? false),
      ok: props.admissionStatus === "admitted",
    },
  ];
  const next = nextAction(props);

  return (
    <div>
      <ol className="relative space-y-4">
        <span aria-hidden className="absolute top-6 bottom-6 left-6 w-px bg-or/20" />
        {items.map(({ icon: Icon, title, badge, text, ok }) => (
          <li key={title} className="relative flex gap-4">
            <span
              className={cn(
                "relative z-10 grid size-12 shrink-0 place-items-center rounded-full border",
                ok ? "border-or bg-gradient-or text-noir shadow-gold" : "border-or/30 bg-noir-soft text-or-light",
              )}
            >
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="flex-1 rounded-2xl border border-line bg-noir/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-sans text-base font-semibold text-blanc">{title}</h3>
                {badge}
              </div>
              <p className="mt-2 text-blanc/70">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      {next && (
        <p className="mt-5 rounded-2xl border border-or/30 bg-or/5 p-4 font-semibold text-or-light" role="status">
          {next}
        </p>
      )}
    </div>
  );
}
