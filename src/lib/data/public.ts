import "server-only";
import { createClient } from "@supabase/supabase-js";
import { faq as fallbackFaq, type FaqItem } from "@/content/faq";
import { fallbackSessions, type TrainingSession } from "@/content/sessions";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/** Client anonyme sans cookies : les pages publiques restent statiques (revalidées périodiquement). */
const publicClient = () =>
  createClient<Database>(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

export type DataSource = "database" | "fallback";

/** Sessions de formation : Prisma (DATABASE_URL) en priorité, Supabase sinon, contenu statique en dernier recours. */
export async function getSessions(): Promise<{ sessions: TrainingSession[]; source: DataSource }> {
  const db = getDb();
  if (db) {
    try {
      const [rows, formationRows] = await Promise.all([
        db.public_sessions.findMany({ orderBy: { start_date: "asc" } }),
        db.formations.findMany({ select: { id: true, slug: true } }),
      ]);
      const slugById = new Map(formationRows.map((f) => [f.id, f.slug as TrainingSession["formation"]]));
      return {
        source: "database",
        sessions: rows.flatMap((r) => {
          const formation = slugById.get(r.formation_id);
          if (!formation) return [];
          return [
            {
              id: r.id,
              formation,
              label: r.label,
              startDate: r.start_date.toISOString().slice(0, 10),
              endDate: r.end_date.toISOString().slice(0, 10),
              registrationDeadline: r.registration_deadline?.toISOString().slice(0, 10) ?? null,
              status: r.status,
              isExample: r.is_example,
            },
          ];
        }),
      };
    } catch {
      // Poursuit vers le repli ci-dessous.
    }
  }

  if (!isSupabaseConfigured) return { sessions: fallbackSessions, source: "fallback" };
  const client = publicClient();
  const [{ data: rows, error }, { data: formations }] = await Promise.all([
    client.from("sessions").select("*").order("start_date", { ascending: true }),
    client.from("formations").select("id, slug"),
  ]);
  if (error || !rows || !formations) return { sessions: fallbackSessions, source: "fallback" };
  const slugById = new Map(formations.map((f) => [f.id, f.slug]));
  return {
    source: "database",
    sessions: rows.flatMap((r) => {
      const formation = slugById.get(r.formation_id);
      if (!formation) return [];
      return [
        {
          id: r.id,
          formation,
          label: r.label,
          startDate: r.start_date,
          endDate: r.end_date,
          registrationDeadline: r.registration_deadline,
          status: r.status,
          isExample: r.is_example,
        },
      ];
    }),
  };
}

export async function getFaq(): Promise<FaqItem[]> {
  const db = getDb();
  if (db) {
    try {
      const rows = await db.faq.findMany({ where: { is_published: true }, orderBy: { sort_order: "asc" } });
      if (rows.length)
        return rows.map((r) => ({ id: r.id, category: r.category, question: r.question, answer: r.answer, featured: r.featured }));
    } catch {
      // Poursuit vers le repli ci-dessous.
    }
  }

  if (!isSupabaseConfigured) return fallbackFaq;
  const { data, error } = await publicClient()
    .from("faq")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return fallbackFaq;
  return data.map((r) => ({ id: r.id, category: r.category, question: r.question, answer: r.answer, featured: r.featured }));
}
