import { HomeStage } from "@/components/home/home-stage";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { churchName } from "@/content/identity";
import { pageMetadata } from "@/lib/seo";

export const metadata = {
  ...pageMetadata({
    title: `${churchName} — Église de familles et d'adorateurs`,
    description:
      "Le Centre de Transformation des Familles : une Église de familles et d'adorateurs qui forme des disciples pour la transformation et la guérison des familles. Cultes, événements, médias et CTF ACADEMY.",
    path: "/",
  }),
  title: { absolute: `CTF CHURCH — ${churchName}` },
};

export default function HomePage() {
  return (
    <>
      <HomeStage viewer="church" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Church",
          name: churchName,
          alternateName: "CTF CHURCH",
          url: siteConfig.url,
          description:
            "Église chrétienne de familles et d'adorateurs : cultes, formation des disciples et accompagnement des foyers.",
        }}
      />
    </>
  );
}
