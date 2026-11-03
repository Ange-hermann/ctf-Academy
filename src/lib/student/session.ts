import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { routes } from "@/config/navigation";
import { studentRoutes } from "@/config/student-nav";
import type { FormationSlug } from "@/content/formations";
import type { Prisma } from "@/generated/prisma/client";
import { getDb, isPrismaConfigured } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdmissionStatus, PaymentStatus, RegistrationStatus } from "@/lib/supabase/types";

export type StudentApplication = {
  id: string;
  reference: string;
  formationId: string;
  formation: FormationSlug;
  formationName: string;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  admissionStatus: AdmissionStatus;
  createdAt: string;
};

export type StudentContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  timezone: string;
  liteMode: boolean;
  applications: StudentApplication[];
  /** Candidature ouvrant l'accès complet : admis ET paiement confirmé ou partiel (échéancier). */
  enrollment: StudentApplication | null;
  roles: string[];
};

export type EnrolledContext = StudentContext & { enrollment: StudentApplication };
export type Tx = Prisma.TransactionClient;

export const isStudentSpaceAvailable = isSupabaseConfigured && isPrismaConfigured;

export const isActiveEnrollment = (a: Pick<StudentApplication, "admissionStatus" | "paymentStatus">) =>
  a.admissionStatus === "admitted" && (a.paymentStatus === "confirmed" || a.paymentStatus === "partial");

/** Identité vérifiée (JWT Supabase) + profil + candidatures. Mis en cache pour la durée de la requête. */
export const getStudentContext = cache(async (): Promise<StudentContext | null> => {
  const db = getDb();
  if (!isSupabaseConfigured || !db) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [profile, apps, roles] = await Promise.all([
    db.profiles.findUnique({ where: { id: userId } }),
    db.applications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      include: { formations: { select: { slug: true, name: true } } },
    }),
    db.user_roles.findMany({ where: { user_id: userId }, select: { role: true } }),
  ]);

  const applications: StudentApplication[] = apps.map((a) => ({
    id: a.id,
    reference: a.reference,
    formationId: a.formation_id,
    formation: a.formations.slug as FormationSlug,
    formationName: a.formations.name,
    registrationStatus: a.registration_status,
    paymentStatus: a.payment_status,
    admissionStatus: a.admission_status,
    createdAt: a.created_at.toISOString(),
  }));

  return {
    userId,
    email: profile?.email ?? (typeof data.claims.email === "string" ? data.claims.email : ""),
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    timezone: profile?.timezone ?? "Africa/Abidjan",
    liteMode: profile?.lite_mode ?? false,
    applications,
    enrollment: applications.find(isActiveEnrollment) ?? null,
    roles: roles.map((r) => r.role),
  };
});

/** Vrai si le compte a un rôle d'encadrement (admin, formateur, pastor…) en plus ou à la place de « student ». */
export const hasStaffRole = (ctx: Pick<StudentContext, "roles">) => ctx.roles.some((r) => r !== "student");

/** Garde des pages de l'espace : session obligatoire, puis inscription active (sinon « Suivre ma candidature »). */
export async function requireStudent(from: string = studentRoutes.dashboard): Promise<EnrolledContext> {
  const ctx = await getStudentContext();
  if (!ctx) redirect(`${routes.login}?next=${encodeURIComponent(from)}`);
  // Un compte d'encadrement sans admission active n'a rien à faire ici : direction l'administration.
  if (!ctx.enrollment && hasStaffRole(ctx)) redirect(routes.admin);
  if (!ctx.enrollment) redirect(studentRoutes.application);
  return ctx as EnrolledContext;
}

/**
 * Exécute des requêtes Prisma SOUS LA RLS de l'étudiant : rôle « authenticated » et identité JWT
 * positionnés pour la transaction. Défense en profondeur : même une requête mal filtrée ne renvoie
 * que les données autorisées par les politiques Supabase.
 */
export async function withStudent<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = getDb();
  if (!db) throw new Error("Base de données non configurée");
  return db.$transaction(
    async (tx) => {
      const claims = JSON.stringify({ sub: userId, role: "authenticated" });
      await tx.$executeRaw`select set_config('request.jwt.claims', ${claims}, true), set_config('role', 'authenticated', true)`;
      return fn(tx);
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

/** Journal d'audit des actions sensibles (serveur uniquement, hors RLS). */
export async function audit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  meta: Prisma.InputJsonValue = {},
) {
  await getDb()?.audit_log.create({ data: { user_id: userId, action, entity, entity_id: entityId, meta } });
}
