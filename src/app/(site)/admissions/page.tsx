import { SectionHub } from "@/components/layout/section-hub";
import { findSection } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Admissions",
  description:
    "Conditions d'accès, calendrier des sessions, frais et moyens de paiement, questions fréquentes : préparez votre inscription à CTF ACADEMY.",
  path: "/admissions",
});

export default function AdmissionsPage() {
  return (
    <SectionHub
      section={findSection("/admissions")}
      eyebrow="Admissions"
      intro="Tout ce qu'il faut savoir pour préparer votre candidature sereinement."
    />
  );
}
