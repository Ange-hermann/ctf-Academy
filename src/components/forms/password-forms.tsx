"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import type { z } from "zod";
import { FormError, HoneypotField } from "@/components/forms/auth-shell";
import { Button } from "@/components/ui/button";
import { FloatingField, PasswordField } from "@/components/ui/floating-field";
import { routes } from "@/config/navigation";
import { forgotPasswordAction, resetPasswordAction } from "@/lib/auth/actions";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const { register, handleSubmit, formState } = useForm<z.input<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "", website: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(undefined);
      const res = await forgotPasswordAction(values);
      if (!res.ok) setError(res.error);
      else setSentTo(values.email);
    }),
  );

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-or/30 bg-or/5 p-6 text-center" role="status">
        <MailCheck aria-hidden className="mx-auto size-10 text-or" />
        <p className="mt-4 text-lg font-semibold text-blanc">C&apos;est envoyé !</p>
        <p className="mt-2 text-blanc/70">
          Si un compte existe pour <strong className="text-blanc">{sentTo}</strong>, vous allez recevoir un lien pour
          choisir un nouveau mot de passe. Pensez à vérifier vos courriers indésirables.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={routes.login}>Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-4">
      <FormError message={error} />
      <HoneypotField {...register("website")} />
      <FloatingField
        label="Adresse e-mail du compte"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        required
        error={formState.errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir le lien"} <ArrowRight />
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, formState } = useForm<z.input<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(undefined);
      const res = await resetPasswordAction(values);
      if (!res.ok) setError(res.error);
      else setDone(true);
    }),
  );

  if (done) {
    return (
      <div className="rounded-2xl border border-or/30 bg-or/5 p-6 text-center" role="status">
        <ShieldCheck aria-hidden className="mx-auto size-10 text-or" />
        <p className="mt-4 text-lg font-semibold text-blanc">Mot de passe mis à jour</p>
        <Button asChild className="mt-6">
          <Link href={routes.studentSpace}>Accéder à mon espace</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={error} />
      <PasswordField
        label="Nouveau mot de passe"
        autoComplete="new-password"
        showStrength
        value={watch("password")}
        error={formState.errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="Confirmer le mot de passe"
        autoComplete="new-password"
        value={watch("confirm")}
        error={formState.errors.confirm?.message}
        {...register("confirm")}
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"} <ArrowRight />
      </Button>
    </form>
  );
}
