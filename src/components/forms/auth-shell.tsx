import { Info } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

export function DemoNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <p className="flex gap-3 rounded-2xl border border-dashed border-or/35 bg-or/5 p-4 text-sm text-blanc/75">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-or" />
      <span>
        <strong className="text-or-light">Mode démonstration.</strong> La base de données n&apos;est pas encore
        connectée : les comptes et candidatures sont simulés sur cet appareil.
      </span>
    </p>
  );
}

/** Habillage des pages « Mon compte » : fond sobre et léger scintillement doré, sans scène 3D. */
export function AuthShell({
  title,
  subtitle,
  breadcrumb,
  children,
  wide = false,
  emblem = true,
  masthead,
}: {
  title?: string;
  subtitle?: string;
  breadcrumb: Crumb[];
  children: React.ReactNode;
  wide?: boolean;
  /** Affiche le médaillon CTF en tête de carte (masqué sur /inscription). */
  emblem?: boolean;
  /** Bandeau-titre libre affiché en tête de la carte (ex. EDS sur /inscription). */
  masthead?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden px-5 pt-8 pb-24 sm:px-8 sm:pt-10">
      <div aria-hidden className="absolute inset-0 animate-[fade-in_2s_ease-out_both] sparkle-bg" />
      <div className={wide ? "relative mx-auto max-w-4xl" : "relative mx-auto max-w-lg"}>
        <Breadcrumb items={breadcrumb} />
        <div className="mt-6 rounded-3xl border border-line bg-gradient-card p-6 shadow-gold sm:p-10">
          {masthead && <div className="-mt-2 mb-8 sm:-mt-4">{masthead}</div>}
          {emblem && <Emblem size={48} className="size-12" />}
          {title && <h1 className={cn("text-3xl tracking-wide text-blanc sm:text-4xl", emblem && "mt-6")}>{title}</h1>}
          {subtitle && <p className="mt-2 text-blanc/70">{subtitle}</p>}
          <div className="mt-8 space-y-6">
            <DemoNotice />
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Champ anti-robot invisible pour les humains (et ignoré par les lecteurs d'écran). */
export function HoneypotField(props: React.ComponentProps<"input">) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Site web
        <input type="text" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-danger-light">
      {message}
    </p>
  );
}
