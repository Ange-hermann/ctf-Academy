import { PageHero } from "@/components/layout/page-hero";
import { VideosGallery } from "@/components/gallery/videos-gallery";
import { getVideos } from "@/lib/data/media";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Vidéo",
  description: "Cultes, enseignements, témoignages et événements de CTF ACADEMY en vidéo.",
  path: "/galerie/videos",
});

export const revalidate = 300;

export default async function VideosPage() {
  const { data: videos } = await getVideos();

  return (
    <>
      <PageHero
        eyebrow="Médiathèque"
        title={
          <>
            <em>Vidéo</em>
          </>
        }
        intro="Revivez les cultes, enseignements et témoignages de l'Église."
        breadcrumb={[{ label: "Vidéo", href: "/galerie/videos" }]}
      />
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <VideosGallery videos={videos} />
      </section>
    </>
  );
}
