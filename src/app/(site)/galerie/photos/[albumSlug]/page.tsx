import { notFound } from "next/navigation";
import { PhotosGallery } from "@/components/gallery/photos-gallery";
import { PageHero } from "@/components/layout/page-hero";
import { getAlbums, getPhotos } from "@/lib/data/media";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/galerie/photos/[albumSlug]">) {
  const { albumSlug } = await params;
  const { data: albums } = await getAlbums();
  const album = albums.find((a) => a.slug === albumSlug);
  if (!album) return {};
  return pageMetadata({
    title: `Photos — ${album.title}`,
    description: album.description || `L'album photo « ${album.title} » de CTF ACADEMY.`,
    path: `/galerie/photos/${album.slug}`,
  });
}

export default async function AlbumPage({ params }: PageProps<"/galerie/photos/[albumSlug]">) {
  const { albumSlug } = await params;
  const [{ data: albums }, { data: photos }] = await Promise.all([getAlbums(), getPhotos()]);
  const album = albums.find((a) => a.slug === albumSlug);
  if (!album) notFound();

  return (
    <>
      <PageHero
        eyebrow="Médiathèque — Photos"
        title={
          <>
            <em>{album.title}</em>
          </>
        }
        intro={album.description}
        breadcrumb={[
          { label: "Photos", href: "/galerie/photos" },
          { label: album.title, href: `/galerie/photos/${album.slug}` },
        ]}
      />
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <PhotosGallery albums={albums} photos={photos} initialAlbum={album.slug} />
      </section>
    </>
  );
}
