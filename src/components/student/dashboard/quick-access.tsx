import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { studentIcons } from "@/components/student/layout/icons";
import { GlassCard3D } from "@/components/ui/glass-card-3d";
import type { StudentNavItem } from "@/config/student-nav";
import { cn } from "@/lib/utils";

export type QuickItem = StudentNavItem & { metric: string; highlight?: boolean };

/** 7 accès rapides : icône or, métrique vivante, tilt 3D avec reflet. */
export function QuickAccess({ items }: { items: QuickItem[] }) {
  return (
    <section aria-labelledby="quick-title">
      <h2 id="quick-title" className="mb-4 font-sans text-sm font-semibold tracking-[0.2em] text-or-light uppercase">
        Accès rapides
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item, i) => {
          const Icon = studentIcons[item.icon];
          return (
            <li
              key={item.href}
              className={cn("cascade", i === items.length - 1 && items.length % 2 === 1 && "col-span-2 lg:col-span-1")}
              style={{ "--i": i } as React.CSSProperties}
            >
              <Link href={item.href} className="block h-full rounded-2xl">
                <GlassCard3D tilt={7} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <span className="grid size-11 place-items-center rounded-xl border border-or/30 bg-or/10 text-or-light shadow-gold">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 text-or/50 transition-transform duration-300 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-or-light"
                    />
                  </div>
                  <p className="mt-4 font-semibold text-blanc">{item.label}</p>
                  <p className={cn("mt-1 text-sm", item.highlight ? "font-semibold text-or-light" : "text-blanc/55")}>
                    {item.metric}
                  </p>
                </GlassCard3D>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
