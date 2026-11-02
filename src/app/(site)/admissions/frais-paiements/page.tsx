import Link from "next/link";
import { Lock } from "lucide-react";
import { PaymentLogo } from "@/components/brand/payment-logo";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { ExampleBadge } from "@/components/ui/badge";
import { CheckList } from "@/components/ui/check-list";
import { SectionTitle } from "@/components/ui/section-title";
import { routes } from "@/config/navigation";
import { paymentMethods, paymentProcess, paymentReassurance } from "@/content/admissions";
import { formatAmount, formations, totalFees } from "@/content/formations";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Frais et paiements",
  description:
    "Frais d'inscription et de formation de CTF ACADEMY, moyens de paiement Mobile Money (Orange Money, MTN MoMo, Wave, Moov) et carte bancaire.",
  path: "/admissions/frais-paiements",
});

export default function FeesPage() {
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title={
          <>
            Frais et <em>paiements</em>
          </>
        }
        intro="Des frais clairs, payables depuis votre téléphone. Les montants marqués « Exemple » seront confirmés par l'Église."
        breadcrumb={[
          { label: "Admissions", href: "/admissions" },
          { label: "Frais et paiements", href: "/admissions/frais-paiements" },
        ]}
      />

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl overflow-x-auto rounded-3xl border border-line bg-gradient-card">
          <table className="w-full min-w-[36rem] text-left">
            <caption className="sr-only">Frais par formation</caption>
            <thead>
              <tr className="border-b border-line text-sm text-blanc/60">
                <th scope="col" className="p-5 font-semibold">Formation</th>
                <th scope="col" className="p-5 font-semibold">Inscription</th>
                <th scope="col" className="p-5 font-semibold">Formation</th>
                <th scope="col" className="p-5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {formations.map((f) => (
                <tr key={f.slug} className="border-b border-line transition-colors last:border-0 hover:bg-or/[0.05]">
                  <th scope="row" className="p-5 font-semibold text-blanc">
                    <Link href={`/formations/${f.slug}`} className="hover:text-or-light">
                      {f.name}
                    </Link>
                  </th>
                  <td className="p-5 text-blanc/80">{formatAmount(f.fees.registration)}</td>
                  <td className="p-5 text-blanc/80">{formatAmount(f.fees.training)}</td>
                  <td className="p-5">
                    <span className="inline-flex flex-wrap items-center gap-2 font-semibold text-or-light">
                      {formatAmount(totalFees(f))} {totalFees(f).isExample && <ExampleBadge />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-4 max-w-5xl text-sm text-blanc/60">
          Détail par formation sur la page{" "}
          <Link href={routes.pricing} className="text-or-light underline-offset-4 hover:underline">
            Durées, objectifs et tarifs
          </Link>
          .
        </p>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <SectionTitle eyebrow="Moyens de paiement" title={<>Payez comme vous <em>en avez l&apos;habitude</em></>} />
        <ul className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {paymentMethods.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-gradient-card p-5 transition-shadow hover:shadow-gold">
              <PaymentLogo method={m} className="flex-col items-start lg:flex-col" />
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle align="left" eyebrow="Comment ça marche" title="Le paiement en 4 étapes" />
            <ol className="mt-8 space-y-4">
              {paymentProcess.map((p, i) => (
                <li key={p.title} className="flex gap-4 rounded-2xl border border-line bg-gradient-card p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-or font-bold text-noir">{i + 1}</span>
                  <span>
                    <span className="block font-semibold text-blanc">{p.title}</span>
                    <span className="mt-1 block text-blanc/65">{p.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-3xl border border-or/25 bg-or/[0.04] p-8">
            <Lock aria-hidden className="size-8 text-or" />
            <h2 className="mt-4 text-2xl tracking-wide">Paiement sécurisé</h2>
            <CheckList items={paymentReassurance} className="mt-6" />
            <p className="mt-6 text-sm text-blanc/60">
              Le paiement confirme votre inscription, mais l&apos;admission reste une décision distincte pour les
              formations sur sélection.
            </p>
          </div>
        </div>
      </section>

      <CtaBlock />
    </>
  );
}
