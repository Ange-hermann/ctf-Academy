import { Banknote, BookOpenCheck, Flame, GraduationCap, HeartHandshake, History, KeyRound, LayoutDashboard, LifeBuoy, ScrollText, Settings, ShieldCheck, Tent, Users } from "lucide-react";
import type { AdminIcon } from "@/config/admin-nav";

export const adminIcons: Record<AdminIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  candidates: ScrollText,
  pedagogy: GraduationCap,
  classroom: Users,
  corrections: BookOpenCheck,
  finance: Banknote,
  stages: Tent,
  diacres: Flame,
  edm: HeartHandshake,
  pastorale: ShieldCheck,
  access: KeyRound,
  assistance: LifeBuoy,
  journal: History,
  settings: Settings,
};
