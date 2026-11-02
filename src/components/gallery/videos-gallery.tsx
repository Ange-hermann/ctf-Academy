"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Play, Video } from "lucide-react";
import { VideoModal } from "@/components/gallery/video-modal";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { formatDuration, videoCategoryLabels, type MediaVideo } from "@/content/media";
import { cn } from "@/lib/utils";

/**
 * Médiathèque vidéo : filtres par catégorie, cartes affiche + bouton lecture
 * doré, lecteur en fenêtre modale (iframe chargée uniquement au clic).
 */
export function VideosGallery({ videos }: { videos: MediaVideo[] }) {
  const [category, setCategory] = useState<MediaVideo["category"] | null>(null);
  const [current, setCurrent] = useState<MediaVideo | null>(null);

  const categories = useMemo(() => [...new Set(videos.map((v) => v.category))], [videos]);
  const shown = useMemo(() => (category ? videos.filter((v) => v.category === category) : videos), [videos, category]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 font-sans text-sm font-medium transition-all",
      active
        ? "border-or bg-gradient-or text-noir shadow-gold-sm"
        : "border-or/25 text-or-light/85 hover:border-or/60 hover:bg-or/10",
    );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Filtrer par catégorie">
        <button type="button" className={chip(category === null)} onClick={() => setCategory(null)}>
          Toutes
        </button>
        {categories.map((c) => (
          <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
            {videoCategoryLabels[c]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-line bg-gradient-card px-6 py-16 text-center">
          <Video aria-hidden className="size-10 text-or/60" />
          <p className="text-blanc/75">Aucune vidéo pour le moment.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setCurrent(v)}
                aria-label={`Lire la vidéo : ${v.title}`}
                className="group relative block w-full overflow-hidden rounded-2xl border border-or/15 text-left transition-all duration-300 hover:-translate-y-1 hover:border-or hover:shadow-gold focus-visible:outline-2 focus-visible:outline-or-light"
              >
                <span className="relative block aspect-video overflow-hidden">
                  <Image
                    src={v.poster || "/media/videos/culte.png"}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span aria-hidden className="absolute inset-0 bg-linear-to-t from-noir/85 via-noir/25 to-transparent" />
                  {/* Bouton lecture doré */}
                  <span
                    aria-hidden
                    className="absolute inset-0 grid place-items-center transition-transform duration-300 group-hover:scale-110"
                  >
                    <span className="grid size-16 place-items-center rounded-full border-2 border-or bg-noir/55 text-or-light shadow-gold backdrop-blur-sm transition-colors group-hover:bg-or group-hover:text-noir">
                      <Play className="size-7 translate-x-0.5 fill-current" />
                    </span>
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-noir/80 px-2 py-0.5 font-sans text-xs text-blanc/85 tabular">
                    {formatDuration(v.durationSec)}
                  </span>
                </span>
                <span className="block p-4">
                  <span className="flex items-center gap-2">
                    <Badge tone="gold">{videoCategoryLabels[v.category]}</Badge>
                    {v.isExample && <ExampleBadge />}
                  </span>
                  <span className="mt-2.5 block font-sans text-base font-semibold text-blanc">{v.title}</span>
                  <span className="mt-1 line-clamp-2 block text-sm text-blanc/60">{v.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <VideoModal video={current} open={current !== null} onClose={() => setCurrent(null)} emptyHint="Vidéo d'exemple : aucune source n'est encore associée." />
    </>
  );
}
