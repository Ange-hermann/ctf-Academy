"use server";

import { randomUUID } from "node:crypto";
import { routes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getCountry } from "@/content/countries";
import { currency, formatAmount, getFormation } from "@/content/formations";
import { getDemoApplication, setDemoApplication, setDemoSession } from "@/lib/auth/demo";
import { getEmailSender } from "@/lib/notifications/email";
import { registrationConfirmationEmail } from "@/lib/notifications/templates";
import { getWhatsAppNotifier } from "@/lib/notifications/whatsapp";
import { getDb } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/provider";
import {
  getActiveApplication,
  hashToken,
  newReference,
  newToken,
  setApplicationCookie,
} from "@/lib/registration/store";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdmissionStatus, PaymentStatus, RegistrationStatus } from "@/lib/supabase/types";
import { zodFieldErrors, type ActionResult } from "@/lib/validation/auth";
import { formationSlugSchema, paymentSchema, registrationSchema } from "@/lib/validation/registration";

export type Statuses = {
  reference: string;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  admissionStatus: AdmissionStatus;
};

const CONFIG_ERROR: ActionResult<never> = {
  ok: false,
  error: "L'inscription en ligne est momentanément indisponible. Contactez-nous sur WhatsApp.",
};

/** Étape 2 → envoi du dossier : création du compte (si besoin) et de la candidature « soumise ». */
export async function submitApplicationAction(input: unknown): Promise<ActionResult<Statuses>> {
  const slug = formationSlugSchema.safeParse((input as { formation?: unknown } | null)?.formation);
  if (!slug.success) return { ok: false, error: "Choisissez une formation." };

  const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : null;
  const sessionUser = supabase ? (await supabase.auth.getUser()).data.user : null;

  const parsed = registrationSchema(slug.data, !sessionUser).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  const { account, personal, answers, website } = parsed.data;
  if (website) return { ok: false, error: "Requête refusée." };

  const limit = await rateLimit("registration", { limit: 4, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const reference = newReference(slug.data);
  const base: Statuses = { reference, registrationStatus: "submitted", paymentStatus: "pending", admissionStatus: "under_review" };

  // ── Mode démonstration ──
  if (!supabase) {
    const acc = account as { firstName: string; lastName: string; email: string; phone: string; country: string };
    const dial = getCountry(acc.country)?.dial ?? "";
    await setDemoApplication({
      ...base,
      id: randomUUID(),
      formation: slug.data,
      firstName: acc.firstName,
      lastName: acc.lastName,
      email: acc.email,
      phone: `${dial}${acc.phone}`,
      createdAt: new Date().toISOString(),
      payment: null,
    });
    await setDemoSession({ email: acc.email, firstName: acc.firstName }, true);
    return { ok: true, data: base };
  }

  // ── Base de données : Prisma d'abord, Supabase en repli ──
  const db = getDb();
  const admin = createSupabaseAdminClient();
  if (!db && !admin) return CONFIG_ERROR;

  let userId = sessionUser?.id ?? null;
  if (!userId) {
    const acc = account as { firstName: string; lastName: string; email: string; phone: string; country: string; password: string };
    const dial = getCountry(acc.country)?.dial ?? "";
    const { data, error } = await supabase.auth.signUp({
      email: acc.email,
      password: acc.password,
      options: {
        emailRedirectTo: `${siteConfig.url}/auth/callback?next=${encodeURIComponent(routes.application)}`,
        data: { first_name: acc.firstName, last_name: acc.lastName, phone: `${dial}${acc.phone}`, country: acc.country },
      },
    });
    if (error || !data.user) return { ok: false, error: "La création du compte a échoué. Réessayez dans un instant." };
    if (data.user.identities?.length === 0) {
      return {
        ok: false,
        error: "Un compte existe déjà avec cet e-mail. Connectez-vous : votre brouillon est conservé.",
        fieldErrors: { "account.email": "Adresse déjà utilisée." },
      };
    }
    userId = data.user.id;
  }

  const formationRow = db
    ? await db.formations.findUnique({ where: { slug: slug.data }, select: { id: true } })
    : (await admin!.from("formations").select("id").eq("slug", slug.data).maybeSingle()).data;
  if (!formationRow) return CONFIG_ERROR;

  const answersJson = { ...answers, city: personal.city, motivation: personal.motivation ?? "" };
  const submittedAt = new Date();
  let appId: string;
  if (db) {
    const app = await db.applications.create({
      data: {
        reference,
        user_id: userId,
        formation_id: formationRow.id,
        registration_status: "submitted",
        payment_status: "pending",
        admission_status: "under_review",
        answers: answersJson,
        submitted_at: submittedAt,
      },
      select: { id: true },
    });
    appId = app.id;
  } else {
    const { data: app, error: insertError } = await admin!
      .from("applications")
      .insert({
        reference,
        user_id: userId,
        formation_id: formationRow.id,
        registration_status: "submitted",
        payment_status: "pending",
        admission_status: "under_review",
        answers: answersJson,
        submitted_at: submittedAt.toISOString(),
      })
      .select("id")
      .single();
    if (insertError || !app) return CONFIG_ERROR;
    appId = app.id;
  }

  const token = newToken();
  if (db) {
    await db.application_access_tokens.create({ data: { application_id: appId, token_hash: hashToken(token) } });
  } else {
    await admin!.from("application_access_tokens").insert({ application_id: appId, token_hash: hashToken(token) });
  }
  await setApplicationCookie(appId, token);
  return { ok: true, data: base };
}

/** Lancement d'un paiement (frais d'inscription ou de formation). Le montant est toujours recalculé côté serveur. */
export async function startPaymentAction(input: unknown): Promise<ActionResult<Statuses>> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  const limit = await rateLimit("payment", { limit: 6, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const app = await getActiveApplication();
  if (!app) return { ok: false, error: "Dossier introuvable. Recommencez l'inscription." };

  const formation = getFormation(app.formation)!;
  const phone = `${getCountry(parsed.data.country)?.dial ?? ""}${parsed.data.phone}`;
  const provider = getPaymentProvider();
  const kind = parsed.data.kind;

  let amount = (kind === "registration" ? formation.fees.registration : formation.fees.training).value;
  const db = getDb();
  const admin = !db && isSupabaseConfigured ? createSupabaseAdminClient() : null;
  if (db) {
    const f = await db.formations.findUnique({
      where: { slug: app.formation },
      select: { registration_fee: true, training_fee: true },
    });
    const dbAmount = f && (kind === "registration" ? f.registration_fee : f.training_fee);
    if (dbAmount != null) amount = dbAmount;
  } else if (admin) {
    const { data: f } = await admin.from("formations").select("registration_fee, training_fee").eq("slug", app.formation).maybeSingle();
    const dbAmount = f && (kind === "registration" ? f.registration_fee : f.training_fee);
    if (dbAmount != null) amount = dbAmount;
  }

  // Un paiement du même montant déjà en cours ou confirmé n'est pas relancé.
  if (db) {
    const existing = await db.payments.findFirst({
      where: { application_id: app.id, amount, status: { in: ["pending", "confirmed"] } },
      select: { id: true },
    });
    if (existing) return { ok: true, data: app };
  } else if (!admin) {
    const demo = await getDemoApplication();
    const s = demo?.payment?.status;
    if (demo?.payment?.amount === amount && (s === "pending" || s === "confirmed")) return { ok: true, data: app };
  } else {
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("application_id", app.id)
      .eq("amount", amount)
      .in("status", ["pending", "confirmed"])
      .limit(1);
    if (existing?.length) return { ok: true, data: app };
  }

  let initiation;
  try {
    initiation = await provider.initiate({
      amount,
      currency: currency.code,
      method: parsed.data.method,
      phone,
      reference: app.reference,
      customer: { firstName: app.firstName, lastName: app.lastName, email: app.email },
      description: `${kind === "registration" ? "Frais d'inscription" : "Frais de formation"} — ${formation.name}`,
    });
  } catch {
    return { ok: false, error: "Le service de paiement est indisponible pour le moment. Réessayez plus tard." };
  }

  if (db) {
    await db.payments.create({
      data: {
        application_id: app.id,
        user_id: app.userId!,
        amount,
        currency: currency.code,
        method: parsed.data.method,
        provider: provider.name,
        provider_reference: initiation.providerReference,
        phone,
        status: "pending",
      },
    });
    await db.applications.update({ where: { id: app.id }, data: { payment_status: "pending" } });
  } else if (!admin) {
    const demo = await getDemoApplication();
    if (!demo) return { ok: false, error: "Dossier introuvable." };
    await setDemoApplication({
      ...demo,
      paymentStatus: "pending",
      payment: {
        id: initiation.providerReference,
        method: parsed.data.method,
        amount,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    });
  } else {
    await admin.from("payments").insert({
      application_id: app.id,
      user_id: app.userId!,
      amount,
      currency: currency.code,
      method: parsed.data.method,
      provider: provider.name,
      provider_reference: initiation.providerReference,
      phone,
      status: "pending",
    });
    await admin.from("applications").update({ payment_status: "pending" }).eq("id", app.id);
  }
  return { ok: true, data: { ...app, paymentStatus: "pending" } };
}

/** Vérifie le paiement en cours et met à jour les statuts (sans jamais toucher à l'admission). */
export async function checkPaymentAction(): Promise<ActionResult<Statuses>> {
  const app = await getActiveApplication();
  if (!app) return { ok: false, error: "Dossier introuvable." };
  if (app.paymentStatus === "confirmed") return { ok: true, data: app };

  const provider = getPaymentProvider();
  const db = getDb();
  const admin = !db && isSupabaseConfigured ? createSupabaseAdminClient() : null;
  let payment: { reference: string; amount: number } | null = null;

  if (db) {
    const p = await db.payments.findFirst({
      where: { application_id: app.id, provider_reference: { not: null } },
      orderBy: { created_at: "desc" },
      select: { provider_reference: true, amount: true },
    });
    if (p?.provider_reference) payment = { reference: p.provider_reference, amount: p.amount };
  } else if (!admin) {
    const demo = await getDemoApplication();
    if (demo?.payment) payment = { reference: demo.payment.id, amount: demo.payment.amount };
  } else {
    const { data } = await admin
      .from("payments")
      .select("provider_reference, amount")
      .eq("application_id", app.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.provider_reference) payment = { reference: data.provider_reference, amount: data.amount };
  }
  if (!payment) return { ok: true, data: app };

  let status: PaymentStatus;
  try {
    status = await provider.getStatus(payment.reference);
  } catch {
    return { ok: true, data: app };
  }
  if (status === app.paymentStatus) return { ok: true, data: app };

  const registrationStatus: RegistrationStatus = status === "confirmed" ? "complete" : app.registrationStatus;
  const now = new Date();

  if (db) {
    await db.payments.updateMany({
      where: { provider_reference: payment.reference },
      data: { status, confirmed_at: status === "confirmed" ? now : null },
    });
    await db.applications.update({
      where: { id: app.id },
      data: { payment_status: status, registration_status: registrationStatus, completed_at: status === "confirmed" ? now : null },
    });
  } else if (!admin) {
    const demo = await getDemoApplication();
    if (demo?.payment) {
      await setDemoApplication({ ...demo, paymentStatus: status, registrationStatus, payment: { ...demo.payment, status } });
    }
  } else {
    await admin
      .from("payments")
      .update({ status, confirmed_at: status === "confirmed" ? now.toISOString() : null })
      .eq("provider_reference", payment.reference);
    await admin
      .from("applications")
      .update({
        payment_status: status,
        registration_status: registrationStatus,
        completed_at: status === "confirmed" ? now.toISOString() : null,
      })
      .eq("id", app.id);
  }

  if (status === "confirmed") {
    const formation = getFormation(app.formation)!;
    const amountLabel = formatAmount({ value: payment.amount, isExample: false });
    const mail = registrationConfirmationEmail({
      firstName: app.firstName,
      formationName: formation.name,
      reference: app.reference,
      amountLabel,
      requiresSelection: formation.requiresSelection,
    });
    await Promise.allSettled([
      getEmailSender().send({ to: app.email, ...mail }),
      getWhatsAppNotifier().sendText(
        app.phone,
        `CTF ACADEMY : votre inscription à ${formation.name} est enregistrée (dossier ${app.reference}). Paiement de ${amountLabel} confirmé.`,
      ),
    ]);
  }

  return { ok: true, data: { ...app, paymentStatus: status, registrationStatus } };
}

/** Reprise : statuts du dossier en cours (ou null). */
export async function getActiveStatusesAction(): Promise<Statuses | null> {
  const app = await getActiveApplication();
  return app
    ? {
        reference: app.reference,
        registrationStatus: app.registrationStatus,
        paymentStatus: app.paymentStatus,
        admissionStatus: app.admissionStatus,
      }
    : null;
}
