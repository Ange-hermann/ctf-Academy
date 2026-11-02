"use client";

import { useId, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldShellProps = {
  id: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

const controlBase = [
  "peer block w-full rounded-2xl border border-or/15 bg-noir-soft px-4 text-base text-blanc outline-none",
  "transition-[border-color,box-shadow] duration-300 focus:border-or focus:ring-2 focus:ring-or/30 focus:shadow-[0_0_18px_-2px_rgb(229_193_88/0.4)]",
  "aria-[invalid=true]:border-danger/60 aria-[invalid=true]:focus:ring-danger/25",
  "disabled:opacity-60",
];

const floatingLabel = cn(
  "pointer-events-none absolute left-4 top-7 -translate-y-1/2 text-base text-blanc/55 transition-all duration-200",
  "peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-or-light",
  "peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs",
);

function FieldShell({ id, error, hint, className, children }: FieldShellProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-center scale-x-0 bg-gradient-or transition-transform duration-500 ease-out-expo peer-focus:scale-x-100"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 px-1 text-sm text-danger-light">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 px-1 text-sm text-blanc/60">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: string; className?: string };

const a11y = (id: string, error?: string, hint?: string) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

/** Champ texte à label flottant (ligne dorée qui se dessine au focus). */
export function FloatingField({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: Common & Omit<React.ComponentProps<"input">, "placeholder">) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell id={fid} error={error} hint={hint} className={className}>
      <input id={fid} placeholder=" " className={cn(controlBase, "min-h-14 pt-5 pb-1.5")} {...a11y(fid, error, hint)} {...props} />
      <label htmlFor={fid} className={floatingLabel}>
        {label}
        {props.required && <span aria-hidden className="text-or"> *</span>}
      </label>
    </FieldShell>
  );
}

export function FloatingTextarea({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: Common & Omit<React.ComponentProps<"textarea">, "placeholder">) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell id={fid} error={error} hint={hint} className={className}>
      <textarea
        id={fid}
        placeholder=" "
        rows={4}
        className={cn(controlBase, "min-h-32 resize-y pt-7 pb-3")}
        {...a11y(fid, error, hint)}
        {...props}
      />
      <label htmlFor={fid} className={floatingLabel}>
        {label}
        {props.required && <span aria-hidden className="text-or"> *</span>}
      </label>
    </FieldShell>
  );
}

export function FloatingSelect({
  label,
  error,
  hint,
  className,
  id,
  options,
  placeholder = "Choisir…",
  ...props
}: Common & React.ComponentProps<"select"> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell id={fid} error={error} hint={hint} className={className}>
      <select
        id={fid}
        className={cn(controlBase, "min-h-14 appearance-none pt-5 pb-1.5 pr-11")}
        {...a11y(fid, error, hint)}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label htmlFor={fid} className="pointer-events-none absolute top-3.5 left-4 -translate-y-1/2 text-xs text-or-light/90">
        {label}
        {props.required && <span aria-hidden className="text-or"> *</span>}
      </label>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-or" />
    </FieldShell>
  );
}

/** Robustesse d'un mot de passe : 0 (vide) à 4 (fort). */
export function passwordScore(pw: string) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s);
}

const strengthLabels = ["", "Faible", "Moyen", "Bon", "Fort"];

export function PasswordField({
  label,
  error,
  hint,
  className,
  id,
  showStrength = false,
  value,
  ...props
}: Common & Omit<React.ComponentProps<"input">, "type" | "placeholder"> & { showStrength?: boolean }) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const fid = id ?? autoId;
  const score = showStrength ? passwordScore(String(value ?? "")) : 0;
  return (
    <div className={cn("w-full", className)}>
      <FieldShell id={fid} error={error} hint={hint}>
        <input
          id={fid}
          type={visible ? "text" : "password"}
          placeholder=" "
          value={value}
          className={cn(controlBase, "min-h-14 pt-5 pr-14 pb-1.5")}
          {...a11y(fid, error, hint)}
          {...props}
        />
        <label htmlFor={fid} className={floatingLabel}>
          {label}
          {props.required && <span aria-hidden className="text-or"> *</span>}
        </label>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-blanc/60 hover:text-or-light"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </FieldShell>
      {showStrength && score > 0 && (
        <div className="mt-2 px-1" aria-live="polite">
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i <= score ? (score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-gradient-or") : "bg-blanc/10",
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-sm text-blanc/60">Robustesse : {strengthLabels[score]}</p>
        </div>
      )}
    </div>
  );
}

/** Téléphone avec indicatif pays automatique et clavier numérique. */
export function PhoneField({
  label,
  error,
  hint,
  className,
  id,
  dialCode,
  ...props
}: Common & Omit<React.ComponentProps<"input">, "type" | "placeholder"> & { dialCode: string }) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell id={fid} error={error} hint={hint} className={className}>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 z-10 translate-y-[-20%] text-base font-medium text-or-light"
      >
        {dialCode}
      </span>
      <input
        id={fid}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder=" "
        className={cn(controlBase, "min-h-14 pt-5 pb-1.5 pl-[calc(1rem+var(--dial-w))]")}
        style={{ "--dial-w": `${dialCode.length * 0.62 + 0.6}rem` } as React.CSSProperties}
        aria-label={`${label} (indicatif ${dialCode})`}
        {...a11y(fid, error, hint)}
        {...props}
      />
      <label htmlFor={fid} className="pointer-events-none absolute top-3.5 left-4 -translate-y-1/2 text-xs text-or-light/90">
        {label}
        {props.required && <span aria-hidden className="text-or"> *</span>}
      </label>
    </FieldShell>
  );
}
