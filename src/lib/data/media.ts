import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  demoAlbums,
  demoEvents,
  demoPhotos,
  demoVideos,
  type ChurchEvent,
  type MediaAlbum,
  type MediaPhoto,
  type MediaVideo,
} from "@/content/media";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Médiathèque et événements — ordre de repli : Prisma (DATABASE_URL) → Supabase
 * (anon, RLS lecture publique des éléments publiés) → contenus « Exemple ».
 */

const client = () => createClient<Database>(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

/** storage_path peut être une URL, un chemin local (/media/…) ou un chemin du bucket « media ». */
const mediaUrl = (storagePath: string) =>
  storagePath.startsWith("/") || storagePath.startsWith("http")
    ? storagePath
    : `${supabaseUrl}/storage/v1/object/public/media/${storagePath}`;

/** Les lignes Prisma exposent `Date` et des enums `string`, celles de Supabase des chaînes ISO. */
type DateLike = Date | string;
const toIso = (d: DateLike | null): string | null => (d === null ? null : d instanceof Date ? d.toISOString() : d);

type AlbumLike = { id: string; slug: string; title: string; description: string; cover: string; year: number; is_example: boolean };
type PhotoLike = {
  id: string;
  album_id: string;
  title: string;
  caption: string;
  storage_path: string;
  width: number;
  height: number;
  taken_at: DateLike | null;
  featured: boolean;
  sort_order: number;
  is_example: boolean;
};
type VideoLike = {
  id: string;
  slug: string;
  title: string;
  description: string;
  source: string;
  url: string;
  poster: string;
  duration_sec: number;
  category: string;
  published_at: DateLike;
  featured: boolean;
  is_example: boolean;
};
type EventLike = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  starts_at: DateLike;
  ends_at: DateLike | null;
  place: string;
  address: string;
  cover: string;
  register_url: string | null;
  featured: boolean;
  status: string;
  is_example: boolean;
};

const mapAlbum = (r: AlbumLike): MediaAlbum => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description,
  cover: mediaUrl(r.cover),
  year: r.year,
  isExample: r.is_example,
});

const mapPhoto = (r: PhotoLike, albumSlug?: string): MediaPhoto => ({
  id: r.id,
  albumSlug: albumSlug ?? r.album_id,
  title: r.title || "Photo (Exemple)",
  caption: r.caption,
  src: mediaUrl(r.storage_path),
  width: r.width,
  height: r.height,
  takenAt: toIso(r.taken_at),
  featured: r.featured,
  order: r.sort_order,
  isExample: r.is_example,
});

const mapVideo = (r: VideoLike): MediaVideo => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description,
  source: r.source as MediaVideo["source"],
  url: r.url,
  poster: mediaUrl(r.poster),
  durationSec: r.duration_sec,
  category: r.category as MediaVideo["category"],
  publishedAt: toIso(r.published_at) ?? "",
  featured: r.featured,
  isExample: r.is_example,
});

const mapEvent = (r: EventLike): ChurchEvent => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description,
  type: r.type as ChurchEvent["type"],
  startsAt: toIso(r.starts_at) ?? "",
  endsAt: toIso(r.ends_at),
  place: r.place,
  address: r.address,
  cover: mediaUrl(r.cover),
  registerUrl: r.register_url,
  featured: r.featured,
  status: r.status as ChurchEvent["status"],
  isExample: r.is_example,
});

export type MediaResult<T> = { data: T; source: "database" | "fallback" };

export async function getAlbums(): Promise<MediaResult<MediaAlbum[]>> {
  const db = getDb();
  if (db) {
    try {
      const rows = await db.media_albums.findMany({ where: { is_published: true }, orderBy: [{ year: "desc" }, { sort_order: "asc" }] });
      if (rows.length) return { data: rows.map(mapAlbum), source: "database" };
    } catch {
      /* repli ci-dessous */
    }
  }
  if (isSupabaseConfigured) {
    const { data, error } = await client().from("media_albums").select("*").eq("is_published", true).order("year", { ascending: false }).order("sort_order");
    if (!error && data?.length) return { data: data.map(mapAlbum), source: "database" };
  }
  return { data: demoAlbums, source: "fallback" };
}

export async function getPhotos(albumSlug?: string): Promise<MediaResult<MediaPhoto[]>> {
  const db = getDb();
  if (db) {
    try {
      const albums = await db.media_albums.findMany({ where: { is_published: true }, select: { id: true, slug: true } });
      const slugById = new Map(albums.map((a) => [a.id, a.slug]));
      const wanted = albumSlug ? albums.find((a) => a.slug === albumSlug)?.id : undefined;
      if (albumSlug && !wanted) return { data: [], source: "database" };
      const rows = await db.media_photos.findMany({
        where: { is_published: true, ...(wanted ? { album_id: wanted } : {}) },
        orderBy: { sort_order: "asc" },
      });
      if (rows.length)
        return { data: rows.map((r) => mapPhoto(r, slugById.get(r.album_id))), source: "database" };
      if (albumSlug) return { data: [], source: "database" };
    } catch {
      /* repli ci-dessous */
    }
  }
  if (isSupabaseConfigured) {
    const [{ data: albums }, { data: photos, error }] = await Promise.all([
      client().from("media_albums").select("id, slug").eq("is_published", true),
      client().from("media_photos").select("*").eq("is_published", true).order("sort_order"),
    ]);
    if (!error && photos?.length && albums) {
      const slugById = new Map(albums.map((a) => [a.id, a.slug]));
      const filtered = albumSlug ? photos.filter((p) => slugById.get(p.album_id) === albumSlug) : photos;
      return { data: filtered.map((r) => mapPhoto(r, slugById.get(r.album_id))), source: "database" };
    }
  }
  return { data: albumSlug ? demoPhotos.filter((p) => p.albumSlug === albumSlug) : demoPhotos, source: "fallback" };
}

export async function getVideos(): Promise<MediaResult<MediaVideo[]>> {
  const db = getDb();
  if (db) {
    try {
      const rows = await db.media_videos.findMany({ where: { is_published: true }, orderBy: { published_at: "desc" } });
      if (rows.length) return { data: rows.map(mapVideo), source: "database" };
    } catch {
      /* repli ci-dessous */
    }
  }
  if (isSupabaseConfigured) {
    const { data, error } = await client().from("media_videos").select("*").eq("is_published", true).order("published_at", { ascending: false });
    if (!error && data?.length) return { data: data.map(mapVideo), source: "database" };
  }
  return { data: demoVideos, source: "fallback" };
}

export async function getEvents(): Promise<MediaResult<ChurchEvent[]>> {
  const db = getDb();
  if (db) {
    try {
      const rows = await db.events.findMany({ where: { status: "publie" }, orderBy: { starts_at: "asc" } });
      if (rows.length) return { data: rows.map(mapEvent), source: "database" };
    } catch {
      /* repli ci-dessous */
    }
  }
  if (isSupabaseConfigured) {
    const { data, error } = await client().from("events").select("*").eq("status", "publie").order("starts_at");
    if (!error && data?.length) return { data: data.map(mapEvent), source: "database" };
  }
  return { data: demoEvents, source: "fallback" };
}

export async function getEventBySlug(slug: string): Promise<ChurchEvent | null> {
  const { data } = await getEvents();
  return data.find((e) => e.slug === slug) ?? null;
}

/** Contenus de la scène d'accueil : photos à la une, vidéo à la une, prochains événements. */
export async function getHomeMedia(): Promise<{
  photos: MediaPhoto[];
  video: MediaVideo | null;
  events: ChurchEvent[];
}> {
  const [photos, videos, events] = await Promise.all([getPhotos(), getVideos(), getEvents()]);
  const featured = photos.data.filter((p) => p.featured).slice(0, 8);
  return {
    photos: (featured.length ? featured : photos.data).slice(0, 8),
    video: videos.data.find((v) => v.featured) ?? videos.data[0] ?? null,
    events: events.data.filter((e) => new Date(e.startsAt).getTime() > Date.now()).slice(0, 5),
  };
}
