import { SectionHub } from "@/components/layout/section-hub";
import { findSection } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Découvrir CTF",
  description:
    "Découvrez CTF ACADEMY et le Centre de Transformation des Familles : notre identité, notre Vision, nos valeurs et notre Église.",
  path: "/decouvrir",
});

export default function DiscoverPage() {
  return (
    <SectionHub
      section={findSection("/decouvrir")}
      eyebrow="Découvrir CTF"
      intro="Qui nous sommes, ce qui nous anime et la Vision qui guide chacune de nos formations."
    />
  );
}
