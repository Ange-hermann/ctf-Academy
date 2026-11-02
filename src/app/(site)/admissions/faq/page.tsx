import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { FaqExplorer } from "@/components/sections/faq-explorer";
import { JsonLd } from "@/components/seo/json-ld";
import { routes } from "@/config/navigation";
import { getFaq } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Questions fréquentes",
  description: "Inscription, paiement, admission, formations : les réponses aux questions fréquentes sur CTF ACADEMY.",
  path: routes.faq,
});

export default async function FaqPage() {
  const items = await getFaq();
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title={
          <>
            Questions <em>fréquentes</em>
          </>
        }
        intro="Trouvez rapidement une réponse. Vous ne la trouvez pas ? Écrivez-nous sur WhatsApp."
        breadcrumb={[
          { label: "Admissions", href: "/admissions" },
          { label: "Questions fréquentes", href: routes.faq },
        ]}
      />
      <section className="px-5 py-16 sm:px-8">
        <FaqExplorer items={items} />
      </section>
      <CtaBlock />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
    </>
  );
}
