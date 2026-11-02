import { HomeStage } from "@/components/home/home-stage";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { formations } from "@/content/formations";
import { pageMetadata } from "@/lib/seo";

export const metadata = {
  ...pageMetadata({
    title: "Formation des disciples — Centre de Transformation des Familles",
    description: siteConfig.description,
    path: "/ctf-academy",
  }),
  title: { absolute: `${siteConfig.name} — ${siteConfig.church}` },
};

export default function AcademyPage() {
  return (
    <>
      <HomeStage />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: formations.map((f, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Course",
              name: f.name,
              description: f.description,
              url: new URL(`/formations/${f.slug}`, siteConfig.url).toString(),
              provider: { "@type": "Organization", name: siteConfig.church },
            },
          })),
        }}
      />
    </>
  );
}
