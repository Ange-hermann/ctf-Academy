import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** État vide chaleureux, toujours avec une action claire. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-3xl border border-dashed border-or/25 bg-noir-soft/40 px-6 py-10 text-center", className)}
    >
      <span className="mx-auto grid size-14 place-items-center rounded-full border border-or/30 bg-or/5 shadow-gold">
        <Icon aria-hidden className="size-6 text-or-light" />
      </span>
      <h2 className="mt-4 font-sans text-lg font-semibold text-blanc">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-blanc/65">{description}</p>
      {action && (
        <Button asChild className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
