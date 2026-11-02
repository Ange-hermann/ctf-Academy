"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { FormError, HoneypotField } from "@/components/forms/auth-shell";
import { Button } from "@/components/ui/button";
import { FloatingField, PasswordField } from "@/components/ui/floating-field";
import { routes } from "@/config/navigation";
import { signInAction } from "@/lib/auth/actions";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(
    linkError ? "Ce lien n'est plus valide. Connectez-vous ou demandez un nouveau lien." : undefined,
  );
  const {
    register,
    handleSubmit,
    watch,
    setError: setFieldError,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: true, next, website: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(undefined);
      const res = await signInAction(values);
      if (!res.ok) {
        setError(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setFieldError(k as keyof SignInInput, { message: m }));
        return;
      }
      router.push(res.data?.redirectTo ?? routes.studentSpace);
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-4">
      <FormError message={error} />
      <HoneypotField {...register("website")} />
      <FloatingField
        label="Adresse e-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        required
        error={errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        label="Mot de passe"
        autoComplete="current-password"
        required
        value={watch("password")}
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-blanc/80">
          <input type="checkbox" className="size-5 accent-or" {...register("remember")} />
          Se souvenir de moi
        </label>
        <Link href={routes.forgotPassword} className="min-h-11 py-2.5 text-sm font-semibold text-or-light hover:text-or">
          Mot de passe oublié ?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"} <ArrowRight />
      </Button>
      <p className="text-center text-blanc/65">
        Pas encore de compte ?{" "}
        <Link href={routes.signup} className="font-semibold text-or-light hover:text-or">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
