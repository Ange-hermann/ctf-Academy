"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Camera, Images } from "lucide-react";
import { Lightbox } from "@/components/gallery/lightbox";
import { ExampleBadge } from "@/components/ui/badge";
import type { MediaAlbum, MediaPhoto } from "@/content/media";
import { cn } from "@/lib/utils";

/**
 * Galerie photo : filtres par album et par année (pastilles dorées), grille
 * maçonnerie à bordure dorée, ouverture de la visionneuse au clic/clavier.
 */
export function PhotosGallery({
  albums,
  photos,
  initialAlbum,
}: {
  albums: MediaAlbum[];
  photos: MediaPhoto[];
  initialAlbum?: string;
}) {
  const [album, setAlbum] = useState<string | null>(initialAlbum ?? null);
  const [year, setYear] = useState<number | null>(null);
  const [index, setIndex] = useState(-1);

  const years = useMemo(() => [...new Set(albums.map((a) => a.year))].sort((a, b) => b - a), [albums]);

  const shown = useMemo(() => {
    const albumYears = new Map(albums.map((a) => [a.slug, a.year]));
    return photos.filter((p) => {
      if (album && p.albumSlug !== album) return false;
      if (year && albumYears.get(p.albumSlug) !== year) return false;
      return true;
    });
  }, [photos, albums, album, year]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 font-sans text-sm font-medium transition-all",
      active
        ? "border-or bg-gradient-or text-noir shadow-gold-sm"
        : "border-or/25 text-or-light/85 hover:border-or/60 hover:bg-or/10",
    );

  return (
    <>
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Filtrer par album">
        <button type="button" className={chip(album === null)} onClick={() => setAlbum(null)}>
          Tous les albums
        </button>
        {albums.map((a) => (
          <button key={a.slug} type="button" className={chip(album === a.slug)} onClick={() => setAlbum(a.slug)}>
            {a.title}
          </button>
        ))}
      </div>
      {years.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5" role="group" aria-label="Filtrer par année">
          <span className="font-sans text-xs tracking-[0.18em] text-blanc/50 uppercase">Année</span>
          <button type="button" className={chip(year === null)} onClick={() => setYear(null)}>
            Toutes
          </button>
          {years.map((y) => (
            <button key={y} type="button" className={chip(year === y)} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Grille maçonnerie */}
      {shown.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-line bg-gradient-card px-6 py-16 text-center">
          <Images aria-hidden className="size-10 text-or/60" />
          <p className="text-blanc/75">Aucune photo pour le moment.</p>
        </div>
      ) : (
        <ul className="mt-8 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>li]:mb-4">
          {shown.map((p, i) => (
            <li key={p.id} className="break-inside-avoid">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Agrandir : ${p.title}`}
                className="group relative block w-full overflow-hidden rounded-2xl border border-or/15 text-left transition-all duration-300 hover:-translate-y-1 hover:border-or hover:shadow-gold focus-visible:outline-2 focus-visible:outline-or-light"
              >
                <Image
                  src={p.src}
                  alt={p.caption || p.title}
                  width={p.width}
                  height={p.height}
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-noir/90 via-noir/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <span className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center gap-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <Camera aria-hidden className="size-4 shrink-0 text-or-light" />
                  <span className="min-w-0 flex-1 truncate text-xs text-blanc/85">{p.caption}</span>
                  {p.isExample && <ExampleBadge className="shrink-0" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox photos={shown} index={index} onIndex={setIndex} onClose={() => setIndex(-1)} />
    </>
  );
}
