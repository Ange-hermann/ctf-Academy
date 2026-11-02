"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarCheck, Check, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { PaymentLogo } from "@/components/brand/payment-logo";
import { AccountFields, guessCountry, type AccountValues } from "@/components/forms/account-fields";
import { FormError, HoneypotField } from "@/components/forms/auth-shell";
import { ExampleBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingField, FloatingSelect, FloatingTextarea, PhoneField } from "@/components/ui/floating-field";
import { CheckList } from "@/components/ui/check-list";
import { StepPath } from "@/components/ui/step-path";
import { routes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { commonConditions, paymentMethods, registrationSteps } from "@/content/admissions";
import { countries, getCountry, type CountryCode } from "@/content/countries";
import { formatAmount, getFormation, type FormationQuestion, type FormationSlug } from "@/content/formations";
import {
  checkPaymentAction,
  startPaymentAction,
  submitApplicationAction,
  type Statuses,
} from "@/lib/registration/actions";
import { accountSchema } from "@/lib/validation/auth";
import { paymentSchema, registrationSchema } from "@/lib/validation/registration";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type WizardValues = AccountValues & {
  city: string;
  motivation: string;
  consent: boolean;
  website: string;
  answers: Record<string, string>;
};

type Props = {
  user: { firstName: string; email: string } | null;
  resume?: (Statuses & { formation: FormationSlug }) | null;
};

/** Transforme les chemins serveur (« account.email », « personal.city ») en chemins du formulaire à plat. */
const flatPath = (path: string) => path.replace(/^(account|personal)\./, "");

/** Rend une question propre à la formation (texte, zone, liste, oui/non). */
function QuestionField({
  q,
  form,
}: {
  q: FormationQuestion;
  form: ReturnType<typeof useForm<WizardValues>>;
}) {
  const name = `answers.${q.name}` as Path<WizardValues>;
  const error = (form.formState.errors.answers?.[q.name] as { message?: string } | undefined)?.message;
  if (q.type === "textarea")
    return <FloatingTextarea label={q.label} required={q.required} hint={q.hint} error={error} {...form.register(name)} />;
  if (q.type === "select")
    return (
      <FloatingSelect
        label={q.label}
        required={q.required}
        error={error}
        options={q.options.map((o) => ({ value: o, label: o }))}
        {...form.register(name)}
      />
    );
  if (q.type === "yesno") {
    return (
      <fieldset>
        <legend className="text-sm font-semibold text-blanc/80">
          {q.label}
          {q.required && <span aria-hidden className="text-or"> *</span>}
        </legend>
        <div className="mt-2.5 flex gap-3">
          {(["oui", "non"] as const).map((v) => (
            <label
              key={v}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line bg-noir-soft font-semibold text-blanc/80 capitalize transition-colors has-checked:border-or has-checked:bg-or/10 has-checked:text-or-light"
            >
              <input type="radio" value={v} className="sr-only" {...form.register(name)} />
              {v}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-1.5 px-1 text-sm text-danger-light">
            {error}
          </p>
        )}
      </fieldset>
    );
  }
  return <FloatingField label={q.label} required={q.required} hint={q.hint} error={error} {...form.register(name)} />;
}

type AppointmentSlot = { day: string; time: string };

// TODO: jours et créneaux d'entretien officiels (à valider)
const rdvTimes = ["09h00", "11h00", "14h00", "16h00"];
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/** Étape 4 : choix d'un jour et d'un horaire pour l'entretien d'admission. */
function AppointmentStep({ onDone }: { onDone: (slot: AppointmentSlot) => void }) {
  const days = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d;
      }),
    [],
  );
  const [day, setDay] = useState<Date>();
  const [time, setTime] = useState<string>();

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold tracking-[0.18em] text-or-light uppercase">Jour</legend>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {days.map((d) => {
            const selected = day?.getTime() === d.getTime();
            return (
              <button
                key={d.getTime()}
                type="button"
                aria-pressed={selected}
                onClick={() => setDay(d)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-noir-soft px-3 py-3 transition-all",
                  selected ? "border-or bg-or/10 shadow-gold" : "hover:border-or/40",
                )}
              >
                <span className="text-xs font-semibold tracking-[0.14em] text-blanc/55 uppercase">{dayFmt.format(d)}</span>
                <span className={cn("text-sm font-semibold", selected ? "text-or-light" : "text-blanc")}>
                  {dateFmt.format(d)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold tracking-[0.18em] text-or-light uppercase">Horaire</legend>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {rdvTimes.map((t) => {
            const selected = time === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={selected}
                onClick={() => setTime(t)}
                className={cn(
                  "min-h-12 rounded-2xl border border-line bg-noir-soft font-semibold transition-all",
                  selected ? "border-or bg-or/10 text-or-light shadow-gold" : "text-blanc/80 hover:border-or/40",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* TODO: brancher la réservation côté serveur (pas de champ dédié sur le dossier) */}
      <Button
        size="lg"
        className="w-full"
        disabled={!day || !time}
        onClick={() => day && time && onDone({ day: longDayFmt.format(day), time })}
      >
        Confirmer le rendez-vous <ArrowRight />
      </Button>
    </div>
  );
}

type FeeKind = "registration" | "training";

/** Paiement d'un type de frais (inscription ou formation) : moyen + numéro, puis attente de la confirmation. */
function FeePaymentStep({
  kind,
  slug,
  defaultCountry,
  onDone,
}: {
  kind: FeeKind;
  slug: FormationSlug;
  defaultCountry?: CountryCode;
  onDone: (s: Statuses) => void;
}) {
  const formation = getFormation(slug)!;
  const fee = kind === "registration" ? formation.fees.registration : formation.fees.training;
  const label = kind === "registration" ? "Frais d'inscription" : "Frais de formation";
  const [phase, setPhase] = useState<"form" | "pending">("form");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const form = useForm<z.input<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { country: defaultCountry, phone: "" },
  });
  const country = form.watch("country");
  const method = form.watch("method");

  // Interroge le prestataire jusqu'à confirmation ou échec du paiement.
  useEffect(() => {
    if (phase !== "pending") return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const res = await checkPaymentAction();
      if (cancelled || !res.ok) return;
      const s = res.data!;
      if (s.paymentStatus === "confirmed") {
        clearInterval(timer);
        onDone(s);
      } else if (s.paymentStatus === "failed") {
        clearInterval(timer);
        setError("Le paiement n'a pas abouti. Vous pouvez réessayer avec un autre moyen ou numéro.");
        setPhase("form");
      }
    }, 2500);
    const stop = setTimeout(() => clearInterval(timer), 120_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(undefined);
      const res = await startPaymentAction({ ...values, kind });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPhase("pending");
    }),
  );

  if (phase === "pending")
    return (
      <div className="py-8 text-center" role="status" aria-live="polite">
        <Loader2 aria-hidden className="mx-auto size-12 animate-spin text-or" />
        <p className="mt-6 text-xl font-semibold text-blanc">Confirmation du paiement…</p>
        <p className="mx-auto mt-2 max-w-md text-blanc/65">
          Une demande a été envoyée sur votre téléphone. Validez-la avec votre code secret : cette page se mettra à jour
          automatiquement.
        </p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={error} />
      <div className="rounded-2xl border border-or/30 bg-or/5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-blanc">
            {label} — {formation.name}
          </p>
          <p className="text-2xl font-bold text-or-light">
            {formatAmount(fee)} {fee.isExample && <ExampleBadge className="align-middle" />}
          </p>
        </div>
        <p className="mt-1.5 text-sm text-blanc/60">
          Une demande de confirmation sera envoyée sur votre téléphone.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold tracking-[0.18em] text-or-light uppercase">Moyen de paiement</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {paymentMethods.map((m) => (
            <label
              key={m.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-noir-soft p-3.5 transition-all",
                "has-checked:border-or has-checked:bg-or/10 has-checked:shadow-gold",
              )}
            >
              <input type="radio" value={m.id} className="sr-only" {...form.register("method")} />
              <PaymentLogo method={m} />
              <Check aria-hidden className={cn("ml-auto size-5 text-or transition-opacity", method === m.id ? "opacity-100" : "opacity-0")} />
            </label>
          ))}
        </div>
        {form.formState.errors.method && (
          <p role="alert" className="mt-1.5 px-1 text-sm text-danger-light">
            {form.formState.errors.method.message}
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingSelect
          label="Pays du numéro"
          required
          error={form.formState.errors.country?.message}
          options={countries.map((c) => ({ value: c.code, label: `${c.name} (${c.dial})` }))}
          {...form.register("country")}
        />
        <PhoneField
          label="Numéro à débiter"
          dialCode={getCountry(country)?.dial ?? "+"}
          required
          error={form.formState.errors.phone?.message}
          hint="Le numéro qui recevra la demande de paiement"
          {...form.register("phone")}
        />
      </div>

      <p className="flex items-start gap-2 text-sm text-blanc/60">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-or" />
        Paiement traité par un prestataire agréé : CTF ACADEMY ne voit jamais votre code secret.
      </p>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 aria-hidden className="animate-spin" /> Envoi de la demande…
          </>
        ) : (
          <>Payer {formatAmount(fee)}</>
        )}
      </Button>
    </form>
  );
}

/** Étape 6 : accès confirmés + passage au paiement des cours. */
function DoneStep({ statuses, onNext }: { statuses: Statuses; onNext: () => void }) {
  const wa = siteConfig.whatsappNumber
    ? `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(`Bonjour, je viens de finaliser mon inscription (dossier ${statuses.reference}).`)}`
    : null;
  return (
    <div className="space-y-6 text-center">
      <BadgeCheck aria-hidden className="mx-auto size-14 text-or" />
      <div>
        <p className="text-2xl font-semibold text-blanc">Inscription confirmée</p>
        <p className="mt-2 text-blanc/70">
          Votre dossier <span className="font-mono font-semibold text-or-light">{statuses.reference}</span> est complet.
          Un e-mail de confirmation vous a été envoyé.
        </p>
      </div>
      <ul className="mx-auto flex max-w-sm flex-col gap-2.5 text-left">
        <li className="flex items-center justify-between rounded-2xl border border-line bg-noir-soft px-4 py-3">
          <span className="text-blanc/70">Inscription</span>
          <StatusBadge kind="registration" status={statuses.registrationStatus} />
        </li>
        <li className="flex items-center justify-between rounded-2xl border border-line bg-noir-soft px-4 py-3">
          <span className="text-blanc/70">Paiement</span>
          <StatusBadge kind="payment" status={statuses.paymentStatus} />
        </li>
        <li className="flex items-center justify-between rounded-2xl border border-line bg-noir-soft px-4 py-3">
          <span className="text-blanc/70">Admission</span>
          <StatusBadge kind="admission" status={statuses.admissionStatus} />
        </li>
      </ul>
      <p className="text-sm text-blanc/60">
        Votre espace étudiant s&apos;ouvrira dès l&apos;admission confirmée : vous serez informé par e-mail et WhatsApp.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={onNext}>
          Payer les frais de cours <ArrowRight />
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={routes.application}>Suivre ma candidature</Link>
        </Button>
        {wa && (
          <Button asChild variant="ghost" size="lg">
            <a href={wa} target="_blank" rel="noreferrer">
              Contacter sur WhatsApp
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Assistant d'inscription EDS en 7 étapes : conditions → compte → formulaire → rendez-vous → inscription → accès → paiement des cours. */
export function RegistrationWizard({ user, resume }: Props) {
  const resumeStep = !resume ? 0 : resume.paymentStatus === "confirmed" ? 5 : 3;
  const [step, setStep] = useState(resumeStep);
  // Formation unique : EDS (les autres parcours sont sur sélection ; un dossier repris garde sa formation).
  const slug: FormationSlug = resume?.formation ?? "eds";
  const [acceptedConditions, setAcceptedConditions] = useState(false);
  const [slot, setSlot] = useState<AppointmentSlot | null>(null);
  const [paidCourse, setPaidCourse] = useState(false);
  const [statuses, setStatuses] = useState<Statuses | null>(resume ?? null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const form = useForm<WizardValues>({
    defaultValues: {
      firstName: user?.firstName ?? "",
      email: user?.email ?? "",
      city: "",
      motivation: "",
      consent: false,
      website: "",
      answers: {},
    },
  });
  const formation = getFormation(slug);

  const goTo = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyErrors = (errs: Record<string, string>) => {
    for (const [path, msg] of Object.entries(errs)) {
      form.setError(flatPath(path) as Path<WizardValues>, { message: msg });
    }
  };

  const applyIssues = (error: z.ZodError) => {
    const errs: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".");
      if (key && !errs[key]) errs[key] = issue.message;
    }
    applyErrors(errs);
    return errs;
  };

  const accountValues = () => {
    const v = form.getValues();
    return {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      country: v.country,
      password: v.password,
    };
  };

  const buildPayload = () => {
    const v = form.getValues();
    return {
      formation: slug,
      ...(user ? {} : { account: accountValues() }),
      personal: { city: v.city, motivation: v.motivation, consent: v.consent },
      answers: v.answers,
      website: v.website,
    };
  };

  /** Étape 2 → 3 : le compte doit être valide avant de poursuivre. */
  const nextFromAccount = () => {
    setError(undefined);
    const check = accountSchema.safeParse(accountValues());
    if (!check.success) {
      applyIssues(check.error);
      setError("Vérifiez les champs indiqués.");
      return;
    }
    goTo(2);
  };

  /** Étape 3 → 4 : le formulaire complet doit être valide, puis le dossier part au serveur avant le rendez-vous. */
  const nextFromForm = () => {
    setError(undefined);
    const check = registrationSchema(slug, !user).safeParse(buildPayload());
    if (!check.success) {
      const errs = applyIssues(check.error);
      setError("Vérifiez les champs indiqués.");
      if (Object.keys(errs).some((k) => k.startsWith("account."))) goTo(1);
      return;
    }
    startTransition(async () => {
      const res = await submitApplicationAction(buildPayload());
      if (!res.ok) {
        setError(res.error);
        const errs = res.fieldErrors ?? {};
        applyErrors(errs);
        const keys = Object.keys(errs);
        if (keys.some((k) => k.startsWith("account."))) goTo(1);
        return;
      }
      setStatuses(res.data!);
      goTo(3);
    });
  };

  return (
    <div id="etapes" className="space-y-8">
      <StepPath steps={registrationSteps} current={step} orientation="horizontal" />

      {resume && step !== 3 && (
        <p className="flex items-center gap-2 rounded-2xl border border-or/30 bg-or/5 p-4 text-sm text-blanc/75">
          <RotateCcw aria-hidden className="size-4 shrink-0 text-or" />
          Reprise du dossier <span className="font-mono font-semibold text-or-light">{resume.reference}</span> —{" "}
          {getFormation(resume.formation)?.name}.
        </p>
      )}

      {/* Étape 1 — conditions d'admission (formation unique : EDS) */}
      {step === 0 && formation && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-or-light uppercase">{formation.acronym}</p>
            <h2 className="mt-1 text-xl font-semibold text-blanc">Conditions d&apos;admission</h2>
            <p className="mt-2 text-sm text-blanc/65">
              Avant de commencer votre inscription à {formation.name}, assurez-vous de remplir les conditions ci-dessous.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-or-light uppercase">Propres à la formation</p>
            <CheckList items={formation.conditions} className="mt-3" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-or-light uppercase">Pour toute inscription</p>
            <CheckList items={commonConditions} className="mt-3" />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-noir-soft p-4 text-sm text-blanc/75 has-checked:border-or/60">
            <input
              type="checkbox"
              checked={acceptedConditions}
              onChange={(e) => setAcceptedConditions(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-or"
            />
            <span>J&apos;ai lu et j&apos;accepte les conditions d&apos;admission.</span>
          </label>
          <Button size="lg" className="w-full" disabled={!acceptedConditions} onClick={() => goTo(user ? 2 : 1)}>
            Continuer <ArrowRight />
          </Button>
        </div>
      )}

      {/* Étape 2 — création du compte (ignorée si déjà connecté) */}
      {step === 1 && formation && !user && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-blanc">Créez votre compte</h2>
          <FormError message={error} />
          <AccountFields register={form.register} errors={form.formState.errors} watch={form.watch} setValue={form.setValue} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => goTo(0)}>
              <ArrowLeft /> Retour
            </Button>
            <Button size="lg" className="flex-1" onClick={nextFromAccount}>
              Continuer <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {/* Étape 3 — formulaire du parcours */}
      {step === 2 && formation && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-or-light uppercase">{formation.acronym}</p>
            <h2 className="mt-1 text-xl font-semibold text-blanc">{formation.name}</h2>
          </div>
          <FormError message={error} />
          {user && (
            <p className="rounded-2xl border border-line bg-noir-soft p-4 text-sm text-blanc/70">
              Connecté en tant que <span className="font-semibold text-blanc">{user.firstName}</span> ({user.email}).
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FloatingField
              label="Ville de résidence"
              autoComplete="address-level2"
              required
              error={form.formState.errors.city?.message}
              {...form.register("city")}
            />
            {formation.questions.map((q) => (
              <QuestionField key={q.name} q={q} form={form} />
            ))}
            <FloatingTextarea
              label="Votre motivation (facultatif)"
              hint="Quelques mots sur votre appel et votre attente"
              error={form.formState.errors.motivation?.message}
              className="sm:col-span-2"
              {...form.register("motivation")}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-noir-soft p-4 text-sm text-blanc/75 has-checked:border-or/60">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-or"
              {...form.register("consent")}
            />
            <span>
              Je certifie que les informations fournies sont exactes et j&apos;accepte que mon dossier soit étudié par
              l&apos;équipe des admissions de {siteConfig.church}.
              {form.formState.errors.consent && (
                <span role="alert" className="mt-1 block text-danger-light">
                  {form.formState.errors.consent.message}
                </span>
              )}
            </span>
          </label>

          <div className="relative">
            <HoneypotField {...form.register("website")} />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => goTo(user ? 0 : 1)} disabled={pending}>
              <ArrowLeft /> Retour
            </Button>
            <Button size="lg" className="flex-1" onClick={nextFromForm} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" /> Envoi du dossier…
                </>
              ) : (
                <>
                  Continuer <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Étape 4 — rendez-vous d'entretien */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-blanc">Prenez rendez-vous pour l&apos;entretien</h2>
          {/* TODO: texte officiel */}
          <p className="text-sm text-blanc/65">
            L&apos;admission à l&apos;EDS se conclut par un entretien avec l&apos;équipe des admissions. Choisissez le jour
            et l&apos;horaire qui vous conviennent.
          </p>
          <AppointmentStep
            onDone={(s) => {
              setSlot(s);
              goTo(4);
            }}
          />
        </div>
      )}

      {/* Étape 5 — inscription : règlement des frais d'inscription */}
      {step === 4 && statuses && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-blanc">Réglez les frais d&apos;inscription</h2>
          {slot && (
            <p className="flex items-center gap-2 rounded-2xl border border-line bg-noir-soft p-4 text-sm text-blanc/70">
              <CalendarCheck aria-hidden className="size-4 shrink-0 text-or" />
              Entretien prévu le <span className="font-semibold text-or-light">{slot.day}</span> à{" "}
              <span className="font-semibold text-or-light">{slot.time}</span>.
            </p>
          )}
          <FeePaymentStep
            kind="registration"
            slug={slug}
            defaultCountry={form.getValues("country") ?? guessCountry() ?? undefined}
            onDone={(s) => {
              setStatuses(s);
              goTo(5);
            }}
          />
        </div>
      )}

      {/* Étape 6 — recevoir ses accès */}
      {step === 5 && statuses && <DoneStep statuses={statuses} onNext={() => goTo(6)} />}

      {/* Étape 7 — paiement des cours */}
      {step === 6 && statuses &&
        (paidCourse ? (
          <div className="space-y-6 text-center">
            <BadgeCheck aria-hidden className="mx-auto size-14 text-or" />
            <div>
              <p className="text-2xl font-semibold text-blanc">Paiement des cours confirmé</p>
              <p className="mt-2 text-blanc/70">
                Votre dossier <span className="font-mono font-semibold text-or-light">{statuses.reference}</span> est
                entièrement réglé.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href={routes.studentSpace}>Accéder à mon espace</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={routes.application}>Suivre ma candidature</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-blanc">Paiement des cours</h2>
            <FeePaymentStep
              kind="training"
              slug={slug}
              defaultCountry={form.getValues("country") ?? guessCountry() ?? undefined}
              onDone={(s) => {
                setStatuses(s);
                setPaidCourse(true);
              }}
            />
          </div>
        ))}
    </div>
  );
}
