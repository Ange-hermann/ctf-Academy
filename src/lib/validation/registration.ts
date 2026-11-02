import { z } from "zod";
import { countryCodes } from "@/content/countries";
import { formations, type Formation, type FormationSlug } from "@/content/formations";
import { accountSchema, honeypot, phoneField } from "@/lib/validation/auth";

export const formationSlugSchema = z.enum(["eds", "edm", "diacres"], { error: "Choisissez une formation." });

/** Questions propres au parcours : règles générées depuis src/content/formations.ts. */
export function answersSchema(formation: Formation) {
  const shape: Record<string, z.ZodType<string | undefined>> = {};
  for (const q of formation.questions) {
    let field: z.ZodType<string | undefined>;
    if (q.type === "yesno") field = z.enum(["oui", "non"], { error: "Répondez par oui ou non." });
    else if (q.type === "select") field = z.enum(q.options as [string, ...string[]], { error: "Choisissez une réponse." });
    else field = z.string().trim().max(q.type === "textarea" ? 1500 : 160, "Réponse trop longue.");
    if (q.required && q.type !== "yesno" && q.type !== "select") {
      field = z.string().trim().min(1, "Ce champ est obligatoire.").max(q.type === "textarea" ? 1500 : 160, "Réponse trop longue.");
    }
    shape[q.name] = q.required ? field : field.optional();
  }
  return z.object(shape);
}

const personalSchema = z.object({
  city: z.string().trim().min(1, "Indiquez votre ville.").max(80, "80 caractères maximum."),
  motivation: z.string().trim().max(1500, "1 500 caractères maximum.").optional(),
  consent: z.literal(true, { error: "Votre accord est nécessaire pour envoyer le dossier." }),
});

/** Étape 2 complète. `account` est omis si l'utilisateur est déjà connecté. */
export function registrationSchema(slug: FormationSlug, withAccount: boolean) {
  const formation = formations.find((f) => f.slug === slug)!;
  return z.object({
    formation: z.literal(slug),
    account: withAccount ? accountSchema : accountSchema.partial().optional(),
    personal: personalSchema,
    answers: answersSchema(formation),
    website: honeypot,
  });
}

export const paymentSchema = z.object({
  kind: z.enum(["registration", "training"], { error: "Type de frais invalide." }),
  method: z.enum(["orange_money", "mtn_momo", "wave", "moov_money", "card"], { error: "Choisissez un moyen de paiement." }),
  country: z.enum(countryCodes, { error: "Choisissez votre pays." }),
  phone: phoneField,
});

export type RegistrationInput = {
  formation: FormationSlug;
  account?: Partial<z.input<typeof accountSchema>>;
  personal: { city: string; motivation?: string; consent: boolean };
  answers: Record<string, string>;
  website?: string;
};
