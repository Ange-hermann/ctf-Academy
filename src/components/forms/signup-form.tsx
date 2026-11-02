"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MailCheck } from "lucide-react";
import { AccountFields } from "@/components/forms/account-fields";
import { FormError, HoneypotField } from "@/components/forms/auth-shell";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/navigation";
import { signUpAction } from "@/lib/auth/actions";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";

export function SignUpForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [checkEmail, setCheckEmail] = useState(false);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "", website: "" },
  });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(undefined);
      const res = await signUpAction(values);
      if (!res.ok) {
        setError(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => form.setError(k as keyof SignUpInput, { message: m }));
        return;
      }
      if (res.data?.needsConfirmation) setCheckEmail(true);
      else {
        router.push(routes.studentSpace);
        router.refresh();
      }
    }),
  );

  if (checkEmail) {
    return (
      <div className="rounded-2xl border border-or/30 bg-or/5 p-6 text-center">
        <MailCheck aria-hidden className="mx-auto size-10 text-or" />
        <p className="mt-4 text-lg font-semibold text-blanc">Vérifiez votre boîte e-mail</p>
        <p className="mt-2 text-blanc/70">
          Un lien de confirmation vient de vous être envoyé. Cliquez dessus pour activer votre compte.
        </p>
        <Button asChild className="mt-6">
          <Link href={routes.register}>Commencer mon inscription</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      <FormError message={error} />
      <HoneypotField {...form.register("website")} />
      <AccountFields register={form.register} errors={form.formState.errors} watch={form.watch} setValue={form.setValue} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"} <ArrowRight />
      </Button>
      <p className="text-center text-blanc/65">
        Déjà inscrit ?{" "}
        <Link href={routes.login} className="font-semibold text-or-light hover:text-or">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
