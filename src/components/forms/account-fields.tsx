"use client";

import { useEffect } from "react";
import type { FieldErrors, Path, PathValue, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { FloatingField, FloatingSelect, PasswordField, PhoneField } from "@/components/ui/floating-field";
import { countries, getCountry, type CountryCode } from "@/content/countries";

export type AccountValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: CountryCode;
  password: string;
};

/** Devine le pays depuis la langue du navigateur (ex. fr-CI → CI). */
export function guessCountry(): CountryCode | null {
  const region = navigator.languages
    ?.map((l) => l.split("-")[1]?.toUpperCase())
    .find((r) => r && countries.some((c) => c.code === r));
  return (region as CountryCode | undefined) ?? null;
}

/** Champs du compte (création de compte et étape 2 de l'inscription) : minimaux, claviers adaptés. */
export function AccountFields<T extends AccountValues>({
  register,
  errors,
  watch,
  setValue,
}: {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
}) {
  const p = (k: keyof AccountValues) => k as unknown as Path<T>;
  const err = (k: keyof AccountValues) => (errors[k as keyof FieldErrors<T>]?.message as string | undefined) ?? undefined;
  const country = watch(p("country")) as unknown as string;
  const password = watch(p("password")) as unknown as string;

  useEffect(() => {
    if (country) return;
    const guess = guessCountry();
    if (guess) setValue(p("country"), guess as PathValue<T, Path<T>>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FloatingField label="Prénom" autoComplete="given-name" required error={err("firstName")} {...register(p("firstName"))} />
      <FloatingField label="Nom" autoComplete="family-name" required error={err("lastName")} {...register(p("lastName"))} />
      <FloatingField
        label="Adresse e-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        required
        error={err("email")}
        className="sm:col-span-2"
        {...register(p("email"))}
      />
      <FloatingSelect
        label="Pays"
        autoComplete="country"
        required
        error={err("country")}
        options={countries.map((c) => ({ value: c.code, label: `${c.name} (${c.dial})` }))}
        {...register(p("country"))}
      />
      <PhoneField
        label="Téléphone"
        dialCode={getCountry(country)?.dial ?? "+"}
        required
        error={err("phone")}
        hint="Numéro WhatsApp de préférence"
        {...register(p("phone"))}
      />
      <PasswordField
        label="Mot de passe"
        autoComplete="new-password"
        required
        showStrength
        value={password ?? ""}
        error={err("password")}
        hint="8 caractères minimum, avec au moins une lettre et un chiffre"
        className="sm:col-span-2"
        {...register(p("password"))}
      />
    </div>
  );
}
