import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { studentRoutes } from "@/config/student-nav";
import { cn } from "@/lib/utils";

export type StudentCrumb = { label: string; href: string };

export function StudentBreadcrumb({ items }: { items: StudentCrumb[] }) {
  const all = [{ label: "Tableau de bord", href: studentRoutes.dashboard }, ...items];
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-blanc/55">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-or-light">
                  {c.label}
                </span>
              ) : (
                <>
                  <Link href={c.href} className="rounded py-1.5 hover:text-or-light">
                    {c.label}
                  </Link>
                  <ChevronRight aria-hidden className="size-3.5 text-or/60" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** En-tête des pages : fil d'Ariane, titre en Cinzel, description et actions. */
export function StudentPageHeader({
  title,
  description,
  crumbs = [],
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  crumbs?: StudentCrumb[];
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 space-y-3", className)}>
      {crumbs.length > 0 && <StudentBreadcrumb items={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-semibold tracking-[0.22em] text-or-light/80 uppercase">{eyebrow}</p>}
          <h1 className="mt-1 text-3xl tracking-wide text-blanc sm:text-4xl">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-blanc/65">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
