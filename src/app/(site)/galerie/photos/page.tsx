import { PageHero } from "@/components/layout/page-hero";
import { PhotosGallery } from "@/components/gallery/photos-gallery";
import { getAlbums, getPhotos } from "@/lib/data/media";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Photos",
  description: "Les albums photo de CTF ACADEMY : le campus, les cultes et les événements de l'Église.",
  path: "/galerie/photos",
});

export const revalidate = 300;

export default async function PhotosPage() {
  const [{ data: albums }, { data: photos }] = await Promise.all([getAlbums(), getPhotos()]);

  return (
    <>
      <PageHero
        eyebrow="Médiathèque"
        title={
          <>
            <em>Photos</em>
          </>
        }
        intro="Les moments forts de l'Église et de l'Académie en images."
        breadcrumb={[{ label: "Photos", href: "/galerie/photos" }]}
      />
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <PhotosGallery albums={albums} photos={photos} />
      </section>
    </>
  );
}
