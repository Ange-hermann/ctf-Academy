"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { FormationIcon } from "@/components/brand/formation-icon";
import { ExampleBadge, ObjectivePill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { registerFor } from "@/config/navigation";
import { formatAmount, formations, journeyLabel, totalFees, type Formation } from "@/content/formations";
import { getObjective } from "@/content/identity";
import { cn } from "@/lib/utils";

type Row = { label: string; render: (f: Formation) => React.ReactNode };

const rows: Row[] = [
  {
    label: "Durée",
    render: (f) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        {f.duration.label} {f.duration.isExample && <ExampleBadge />}
      </span>
    ),
  },
  { label: "Niveaux / étapes", render: (f) => journeyLabel(f) },
  {
    label: "Objectifs",
    render: (f) => (
      <ul className="space-y-1 text-sm text-blanc/75">
        {f.goals.slice(0, 3).map((g) => (
          <li key={g}>• {g}</li>
        ))}
      </ul>
    ),
  },
  {
    label: "Objectifs de l'Église",
    render: (f) => (
      <span className="flex flex-wrap gap-1.5">
        {f.objectives.map((n) => (
          <ObjectivePill key={n} objective={getObjective(n)} />
        ))}
      </span>
    ),
  },
  {
    label: "Frais d'inscription",
    render: (f) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        {formatAmount(f.fees.registration)} {f.fees.registration.isExample && <ExampleBadge />}
      </span>
    ),
  },
  {
    label: "Frais de formation",
    render: (f) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        {formatAmount(f.fees.training)} {f.fees.training.isExample && <ExampleBadge />}
      </span>
    ),
  },
  { label: "Total", render: (f) => <strong className="text-or-light">{formatAmount(totalFees(f))}</strong> },
  {
    label: "Admission sur sélection",
    render: (f) =>
      f.requiresSelection ? (
        <span className="inline-flex items-center gap-1.5 text-or-light">
          <Check className="size-4" aria-hidden /> Oui
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-blanc/70">
          <Minus className="size-4" aria-hidden /> Non
        </span>
      ),
  },
];

/** Tableau comparatif : colonnes qui s'illuminent au survol ; cartes empilées sur mobile. */
export function ComparisonTable() {
  const [col, setCol] = useState<number | null>(null);
  const cell = (i: number) =>
    cn("p-5 align-top transition-colors duration-300", col === i && "bg-or/[0.06]");

  return (
    <>
      <div className="mx-auto hidden max-w-6xl overflow-hidden rounded-3xl border border-line bg-gradient-card lg:block">
        <table className="w-full border-collapse text-left" onPointerLeave={() => setCol(null)}>
          <caption className="sr-only">Comparatif des formations : durée, niveaux, objectifs, frais et admission</caption>
          <thead>
            <tr className="border-b border-line">
              <td className="w-56 p-5" />
              {formations.map((f, i) => (
                <th
                  key={f.slug}
                  scope="col"
                  onPointerEnter={() => setCol(i)}
                  className={cn(
                    "group/card p-6 align-top font-normal transition-[background-color,box-shadow] duration-300",
                    col === i && "bg-or/[0.08] shadow-[inset_0_2px_0_var(--color-or)]",
                  )}
                >
                  <FormationIcon icon={f.icon} className="size-12" />
                  <span className="mt-4 block text-sm font-semibold tracking-[0.25em] text-or-light">{f.acronym}</span>
                  <span className="mt-1 block font-display text-xl tracking-wide text-blanc">{f.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line last:border-0">
                <th scope="row" className="p-5 align-top text-sm font-semibold text-blanc/60">
                  {row.label}
                </th>
                {formations.map((f, i) => (
                  <td key={f.slug} className={cell(i)} onPointerEnter={() => setCol(i)}>
                    {row.render(f)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {formations.map((f, i) => (
                <td key={f.slug} className={cell(i)} onPointerEnter={() => setCol(i)}>
                  <div className="flex flex-col gap-2">
                    <Button asChild size="sm">
                      <Link href={registerFor(f.slug)}>S&apos;inscrire</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/formations/${f.slug}`}>En savoir plus</Link>
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <ul className="space-y-6 lg:hidden">
        {formations.map((f) => (
          <li key={f.slug} className="group/card rounded-3xl border border-line bg-gradient-card p-6">
            <div className="flex items-center gap-4">
              <FormationIcon icon={f.icon} className="size-12" />
              <div>
                <p className="text-sm font-semibold tracking-[0.25em] text-or-light">{f.acronym}</p>
                <h2 className="text-xl tracking-wide">{f.name}</h2>
              </div>
            </div>
            <dl className="mt-6 divide-y divide-line">
              {rows.map((row) => (
                <div key={row.label} className="py-3">
                  <dt className="text-sm text-blanc/55">{row.label}</dt>
                  <dd className="mt-1 text-blanc">{row.render(f)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 grid gap-2">
              <Button asChild>
                <Link href={registerFor(f.slug)}>S&apos;inscrire</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/formations/${f.slug}`}>En savoir plus</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
