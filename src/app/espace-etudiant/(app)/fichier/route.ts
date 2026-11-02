import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStudentContext, withStudent, type Tx } from "@/lib/student/session";
import { signedReadUrl } from "@/lib/student/storage";

type Lookup = (tx: Tx, id: string) => Promise<{ path: string | null; name: string | null } | null>;

/** Chaque type de fichier est d'abord relu SOUS RLS : sans droit sur l'enregistrement, aucune URL n'est émise. */
const lookups: Record<string, Lookup> = {
  ressource: async (tx, id) => {
    const r = await tx.resources.findUnique({ where: { id } });
    return r && { path: r.storage_path, name: r.title };
  },
  memoire: async (tx, id) => {
    const v = await tx.thesis_versions.findUnique({ where: { id } });
    return v && { path: v.storage_path, name: v.file_name };
  },
  rapport: async (tx, id) => {
    const r = await tx.internship_reports.findUnique({ where: { id } });
    return r && { path: r.storage_path, name: r.file_name };
  },
  soumission: async (tx, id) => {
    const s = await tx.submissions.findUnique({ where: { id } });
    return s && { path: s.storage_path, name: s.file_name };
  },
  mentorat: async (tx, id) => {
    const m = await tx.mentoring_exercises.findUnique({ where: { id } });
    return m && { path: m.storage_path, name: m.file_name };
  },
  leadership: async (tx, id) => {
    const w = await tx.leadership_works.findUnique({ where: { id } });
    return w && { path: w.storage_path, name: w.file_name };
  },
  commentaire: async (tx, id) => {
    const c = await tx.thesis_comments.findUnique({ where: { id } });
    return c && { path: c.attachment_path, name: c.attachment_name };
  },
  message: async (tx, id) => {
    const m = await tx.messages.findUnique({ where: { id } });
    return m && { path: m.attachment_path, name: m.attachment_name };
  },
};

export async function GET(request: NextRequest) {
  const ctx = await getStudentContext();
  if (!ctx?.enrollment) return new NextResponse("Non autorisé", { status: 401 });
  const params = request.nextUrl.searchParams;
  const kind = Object.keys(lookups).find((k) => params.has(k));
  const id = kind ? z.uuid().safeParse(params.get(kind)) : null;
  if (!kind || !id?.success) return new NextResponse("Requête invalide", { status: 400 });

  const file = await withStudent(ctx.userId, (tx) => lookups[kind](tx, id.data));
  if (!file?.path) return new NextResponse("Fichier introuvable", { status: 404 });
  const url = await signedReadUrl(file.path, params.has("telecharger") ? (file.name ?? undefined) : undefined);
  if (!url) return new NextResponse("Stockage indisponible", { status: 503 });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
