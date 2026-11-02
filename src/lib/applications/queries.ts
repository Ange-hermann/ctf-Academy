import "server-only";
import type { FormationSlug } from "@/content/formations";
import { getDemoApplication } from "@/lib/auth/demo";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdmissionStatus, PaymentMethod, PaymentStatus, RegistrationStatus } from "@/lib/supabase/types";

export type ApplicationSummary = {
  id: string;
  reference: string;
  formation: FormationSlug;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  admissionStatus: AdmissionStatus;
  createdAt: string;
  payments: { id: string; amount: number; method: PaymentMethod; status: PaymentStatus; createdAt: string }[];
};

/** Candidatures de l'utilisateur connecté (RLS : uniquement les siennes) ou candidature de démonstration. */
export async function getMyApplications(): Promise<ApplicationSummary[]> {
  const db = getDb();
  if (db) {
    // La session utilisateur reste gérée par Supabase Auth ; Prisma ne lit que les données.
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : null;
    const userId = supabase ? (await supabase.auth.getUser()).data.user?.id : null;
    if (!userId) return [];
    const apps = await db.applications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      include: { formations: { select: { slug: true } }, payments: { orderBy: { created_at: "desc" } } },
    });
    return apps.map((a) => ({
      id: a.id,
      reference: a.reference,
      formation: a.formations.slug as FormationSlug,
      registrationStatus: a.registration_status,
      paymentStatus: a.payment_status,
      admissionStatus: a.admission_status,
      createdAt: a.created_at.toISOString(),
      payments: a.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method as PaymentMethod,
        status: p.status,
        createdAt: p.created_at.toISOString(),
      })),
    }));
  }

  if (!isSupabaseConfigured) {
    const demo = await getDemoApplication();
    if (!demo) return [];
    return [
      {
        id: demo.id,
        reference: demo.reference,
        formation: demo.formation,
        registrationStatus: demo.registrationStatus,
        paymentStatus: demo.paymentStatus,
        admissionStatus: demo.admissionStatus,
        createdAt: demo.createdAt,
        payments: demo.payment ? [demo.payment] : [],
      },
    ];
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: apps }, { data: formations }, { data: payments }] = await Promise.all([
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("formations").select("id, slug"),
    supabase.from("payments").select("*").order("created_at", { ascending: false }),
  ]);
  const slugById = new Map((formations ?? []).map((f) => [f.id, f.slug]));
  return (apps ?? []).flatMap((a) => {
    const formation = slugById.get(a.formation_id);
    if (!formation) return [];
    return [
      {
        id: a.id,
        reference: a.reference,
        formation,
        registrationStatus: a.registration_status,
        paymentStatus: a.payment_status,
        admissionStatus: a.admission_status,
        createdAt: a.created_at,
        payments: (payments ?? [])
          .filter((p) => p.application_id === a.id)
          .map((p) => ({ id: p.id, amount: p.amount, method: p.method, status: p.status, createdAt: p.created_at })),
      },
    ];
  });
}
