import { CreditCard, Smartphone } from "lucide-react";
import type { paymentMethods } from "@/content/admissions";
import { cn } from "@/lib/utils";

type Method = (typeof paymentMethods)[number];

/** Pastille de moyen de paiement (logo officiel à intégrer : TODO, placeholder monochrome dans la charte). */
export function PaymentLogo({ method, className }: { method: Method; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-xl border border-or/35 bg-noir-soft font-display text-xs font-bold text-or-light"
      >
        {method.kind === "card" ? <CreditCard className="size-5" /> : method.short}
      </span>
      <span className="flex items-center gap-1.5 font-semibold text-blanc">
        {method.kind === "mobile_money" && <Smartphone aria-hidden className="size-4 text-or/70" />}
        {method.label}
      </span>
    </span>
  );
}
