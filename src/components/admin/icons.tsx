import { Banknote, BookOpenCheck, GraduationCap, KeyRound, LayoutDashboard, ScrollText, ShieldCheck, Tent } from "lucide-react";
import type { AdminIcon } from "@/config/admin-nav";

export const adminIcons: Record<AdminIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  candidates: ScrollText,
  pedagogy: GraduationCap,
  corrections: BookOpenCheck,
  finance: Banknote,
  stages: Tent,
  pastorale: ShieldCheck,
  access: KeyRound,
};
