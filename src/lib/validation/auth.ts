import { z } from "zod";
import { countryCodes } from "@/content/countries";

/** Schémas partagés client / serveur. Messages simples, en français. */

export const emailField = z
  .string({ error: "Indiquez votre adresse e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Indiquez votre adresse e-mail.")
  .pipe(z.email("Cette adresse e-mail n'est pas valide."));

export const passwordField = z
  .string({ error: "Choisissez un mot de passe." })
  .min(8, "Au moins 8 caractères.")
  .max(72, "72 caractères maximum.")
  .regex(/[A-Za-z]/, "Ajoutez au moins une lettre.")
  .regex(/\d/, "Ajoutez au moins un chiffre.");

const name = (label: string) =>
  z
    .string({ error: `Indiquez votre ${label}.` })
    .trim()
    .min(1, `Indiquez votre ${label}.`)
    .max(80, "80 caractères maximum.")
    .regex(/^[\p{L}][\p{L}' -]*$/u, `Votre ${label} ne doit contenir que des lettres.`);

/** Numéro national (sans indicatif) : chiffres et espaces, 6 à 14 chiffres. */
export const phoneField = z
  .string({ error: "Indiquez votre numéro de téléphone." })
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, "").replace(/^0+(?=\d{6,})/, ""))
  .pipe(z.string().regex(/^\d{6,14}$/, "Numéro de téléphone invalide (chiffres uniquement)."));

/** Champ anti-robot invisible : doit rester vide. */
export const honeypot = z.string().max(0).optional();

export const accountSchema = z.object({
  firstName: name("prénom"),
  lastName: name("nom"),
  email: emailField,
  phone: phoneField,
  country: z.enum(countryCodes, { error: "Choisissez votre pays." }),
  password: passwordField,
});

export const signUpSchema = accountSchema.extend({ website: honeypot });

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Indiquez votre mot de passe."),
  remember: z.boolean(),
  next: z.string().optional(),
  website: honeypot,
});

export const forgotPasswordSchema = z.object({ email: emailField, website: honeypot });

export const resetPasswordSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Les mots de passe ne correspondent pas.", path: ["confirm"] });

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;

/** Résultat standard d'une action serveur. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Empêche les redirections ouvertes : uniquement des chemins internes. */
export const safeNext = (next: string | undefined | null, fallback: string) =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
