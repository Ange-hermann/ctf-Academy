import { ClipboardCheck, Flag, Video, Wallet, type LucideIcon } from "lucide-react";
import type { EventKind } from "@/lib/student/queries/calendar";

export const eventIcons: Record<EventKind, LucideIcon> = { live: Video, assessment: ClipboardCheck, payment: Wallet, milestone: Flag };

export const eventLabels: Record<EventKind, string> = {
  live: "Cours en direct",
  assessment: "Évaluation",
  payment: "Échéance de paiement",
  milestone: "Jalon de formation",
};
