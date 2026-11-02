import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { FormationSlug } from "@/content/formations";
import { getDemoApplication } from "@/lib/auth/demo";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AdmissionStatus, PaymentStatus, RegistrationStatus } from "@/lib/supabase/types";

/**
 * Lien entre le navigateur et le dossier en cours : cookie httpOnly « id.jeton ».
 * Seul le haché SHA-256 du jeton est stocké en base (table application_access_tokens).
 */
export const APPLICATION_COOKIE = "ctf_application";

export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const newReference = (slug: FormationSlug) =>
  `CTF-${slug.slice(0, 3).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;

export async function setApplicationCookie(id: string, token: string) {
  (await cookies()).set(APPLICATION_COOKIE, `${id}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export type ActiveApplication = {
  id: string;
  reference: string;
  formation: FormationSlug;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  admissionStatus: AdmissionStatus;
};

/** Dossier en cours pour ce navigateur (vérifié par jeton), ou null. */
export async function getActiveApplication(): Promise<ActiveApplication | null> {
  const raw = (await cookies()).get(APPLICATION_COOKIE)?.value;

  const db = getDb();
  if (db) {
    if (!raw) return null;
    const [id, token] = raw.split(".");
    if (!id || !token) return null;
    try {
      const stored = await db.application_access_tokens.findUnique({ where: { application_id: id } });
      if (!stored) return null;
      const a = Buffer.from(stored.token_hash, "hex");
      const b = Buffer.from(hashToken(token), "hex");
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      const app = await db.applications.findUnique({
        where: { id },
        include: { formations: { select: { slug: true } }, profiles: true },
      });
      if (!app) return null;
      return {
        id: app.id,
        reference: app.reference,
        formation: app.formations.slug as FormationSlug,
        userId: app.user_id,
        firstName: app.profiles.first_name,
        lastName: app.profiles.last_name,
        email: app.profiles.email,
        phone: app.profiles.phone ?? "",
        registrationStatus: app.registration_status,
        paymentStatus: app.payment_status,
        admissionStatus: app.admission_status,
      };
    } catch {
      // Base injoignable : la reprise de dossier est best-effort, on dégrade en « pas de dossier ».
      return null;
    }
  }

  if (!isSupabaseConfigured) {
    const demo = await getDemoApplication();
    return demo ? { ...demo, userId: null } : null;
  }
  const admin = createSupabaseAdminClient();
  if (!raw || !admin) return null;
  const [id, token] = raw.split(".");
  if (!id || !token) return null;

  const { data: stored } = await admin.from("application_access_tokens").select("token_hash").eq("application_id", id).maybeSingle();
  if (!stored) return null;
  const a = Buffer.from(stored.token_hash, "hex");
  const b = Buffer.from(hashToken(token), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const { data: app } = await admin.from("applications").select("*").eq("id", id).maybeSingle();
  if (!app) return null;
  const [{ data: formation }, { data: profile }] = await Promise.all([
    admin.from("formations").select("slug").eq("id", app.formation_id).maybeSingle(),
    admin.from("profiles").select("*").eq("id", app.user_id).maybeSingle(),
  ]);
  if (!formation || !profile) return null;
  return {
    id: app.id,
    reference: app.reference,
    formation: formation.slug,
    userId: app.user_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    phone: profile.phone ?? "",
    registrationStatus: app.registration_status,
    paymentStatus: app.payment_status,
    admissionStatus: app.admission_status,
  };
}
