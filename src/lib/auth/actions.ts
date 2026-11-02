"use server";

import { redirect } from "next/navigation";
import { routes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getCountry } from "@/content/countries";
import { clearDemoSession, setDemoSession } from "@/lib/auth/demo";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  safeNext,
  signInSchema,
  signUpSchema,
  zodFieldErrors,
  type ActionResult,
} from "@/lib/validation/auth";

const BOT_REJECTED: ActionResult = { ok: false, error: "Requête refusée." };

export async function signInAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  if (parsed.data.website) return BOT_REJECTED;
  const limit = await rateLimit("sign-in", { limit: 6, windowMs: 5 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const { email, password, remember, next } = parsed.data;
  const redirectTo = safeNext(next, routes.studentSpace);

  if (!isSupabaseConfigured) {
    await setDemoSession({ email, firstName: email.split("@")[0] }, remember);
    return { ok: true, data: { redirectTo } };
  }

  const supabase = await createSupabaseServerClient({ persistent: remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const unconfirmed = error.message.toLowerCase().includes("confirm");
    return {
      ok: false,
      error: unconfirmed
        ? "Confirmez d'abord votre adresse e-mail grâce au lien reçu, puis reconnectez-vous."
        : "E-mail ou mot de passe incorrect.",
    };
  }
  return { ok: true, data: { redirectTo } };
}

export async function signUpAction(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  if (parsed.data.website) return BOT_REJECTED;
  const limit = await rateLimit("sign-up", { limit: 4, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const { firstName, lastName, email, phone, country, password } = parsed.data;

  if (!isSupabaseConfigured) {
    await setDemoSession({ email, firstName }, true);
    return { ok: true, data: { needsConfirmation: false } };
  }

  const supabase = await createSupabaseServerClient();
  const dial = getCountry(country)?.dial ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteConfig.url}/auth/callback?next=${encodeURIComponent(routes.studentSpace)}`,
      data: { first_name: firstName, last_name: lastName, phone: `${dial}${phone}`, country },
    },
  });
  if (error) return { ok: false, error: "La création du compte a échoué. Réessayez dans un instant." };
  // Supabase masque les comptes existants : identities vide → e-mail déjà utilisé.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "Un compte existe déjà avec cet e-mail. Connectez-vous ou réinitialisez votre mot de passe." };
  }
  return { ok: true, data: { needsConfirmation: !data.session } };
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  if (parsed.data.website) return BOT_REJECTED;
  const limit = await rateLimit("forgot-password", { limit: 3, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteConfig.url}/auth/callback?next=${encodeURIComponent(routes.resetPassword)}`,
    });
  }
  // Réponse identique que le compte existe ou non (pas d'énumération des comptes).
  return { ok: true };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "Le lien a expiré. Demandez un nouveau lien de réinitialisation." };
  return { ok: true };
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    await clearDemoSession();
  }
  redirect(routes.home);
}
