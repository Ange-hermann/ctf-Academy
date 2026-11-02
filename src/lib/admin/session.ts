import "server-only";
import { redirect } from "next/navigation";
import { routes } from "@/config/navigation";
import { getStudentContext, type StudentContext } from "@/lib/student/session";

/** Rôles métier de l'administration (brief §5) — `student` n'ouvre jamais l'espace /admin. */
export type AdminRole = "admin" | "admissions" | "pedagogy" | "trainer" | "finance" | "supervisor" | "pastor";
export const ADMIN_ROLES: AdminRole[] = ["admin", "admissions", "pedagogy", "trainer", "finance", "supervisor", "pastor"];

export const adminRoleLabels: Record<AdminRole, string> = {
  admin: "Administrateur principal",
  admissions: "Responsable des admissions",
  pedagogy: "Responsable pédagogique",
  trainer: "Formateur",
  finance: "Responsable financier",
  supervisor: "Superviseur stages & mémoires",
  pastor: "Équipe pastorale",
};

export const hasAdminRole = (ctx: StudentContext, allowed: readonly AdminRole[]) =>
  ctx.roles.some((r) => (allowed as readonly string[]).includes(r));

/** Garde de l'espace /admin : session + au moins un rôle autre que « student ». */
export async function requireStaff(from = "/admin"): Promise<StudentContext> {
  const ctx = await getStudentContext();
  if (!ctx) redirect(`${routes.login}?next=${encodeURIComponent(from)}`);
  if (!ctx.roles.some((r) => r !== "student")) redirect("/espace-etudiant");
  return ctx;
}

/** Garde d'une section : rôle requis, sinon retour au tableau de bord admin. */
export async function requireAdminRoles(allowed: readonly AdminRole[], from: string): Promise<StudentContext> {
  const ctx = await requireStaff(from);
  if (!hasAdminRole(ctx, allowed)) redirect("/admin");
  return ctx;
}
