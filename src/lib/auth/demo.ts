import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

/**
 * Mode démonstration (Supabase non configuré) : session et candidature simulées dans des cookies httpOnly.
 * Aucune donnée réelle n'est stockée ni accessible ; ce mode disparaît dès que Supabase est configuré.
 */
export const DEMO_SESSION_COOKIE = "ctf_demo_session";
export const DEMO_APPLICATION_COOKIE = "ctf_demo_application";

const sessionSchema = z.object({ email: z.string(), firstName: z.string() });

const demoApplicationSchema = z.object({
  id: z.string(),
  reference: z.string(),
  formation: z.enum(["eds", "edm", "diacres"]),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  registrationStatus: z.enum(["draft", "submitted", "complete"]),
  paymentStatus: z.enum(["pending", "confirmed", "failed", "refunded", "partial"]),
  admissionStatus: z.enum(["under_review", "admitted", "rejected", "waitlisted"]),
  createdAt: z.string(),
  payment: z
    .object({
      id: z.string(),
      method: z.enum(["orange_money", "mtn_momo", "wave", "moov_money", "card"]),
      amount: z.number(),
      status: z.enum(["pending", "confirmed", "failed", "refunded", "partial"]),
      createdAt: z.string(),
    })
    .nullable(),
});
export type DemoApplication = z.infer<typeof demoApplicationSchema>;

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function readJson<T>(raw: string | undefined, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getDemoSession() {
  return readJson((await cookies()).get(DEMO_SESSION_COOKIE)?.value, sessionSchema);
}

export async function setDemoSession(session: z.infer<typeof sessionSchema>, remember: boolean) {
  (await cookies()).set(DEMO_SESSION_COOKIE, JSON.stringify(session), {
    ...cookieBase,
    maxAge: remember ? 60 * 60 * 24 * 30 : undefined,
  });
}

export async function clearDemoSession() {
  (await cookies()).delete(DEMO_SESSION_COOKIE);
}

export async function getDemoApplication() {
  return readJson((await cookies()).get(DEMO_APPLICATION_COOKIE)?.value, demoApplicationSchema);
}

export async function setDemoApplication(app: DemoApplication) {
  (await cookies()).set(DEMO_APPLICATION_COOKIE, JSON.stringify(app), { ...cookieBase, maxAge: 60 * 60 * 24 * 30 });
}
