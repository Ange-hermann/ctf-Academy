import { SectionHub } from "@/components/layout/section-hub";
import { findSection } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Mon compte",
  description: "Connectez-vous, créez votre compte et suivez votre candidature à CTF ACADEMY.",
  path: "/compte",
});

export default function AccountHubPage() {
  return (
    <SectionHub
      section={findSection("/compte")}
      eyebrow="Mon compte"
      intro="Votre espace personnel pour suivre votre inscription, votre paiement et votre admission."
    />
  );
}
