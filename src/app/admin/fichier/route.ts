import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hasAdminRole } from "@/lib/admin/session";
import { classStudentIds, getClassScope } from "@/lib/admin/classroom";
import { isVoiceAttachment } from "@/lib/messages/voice";
import { getStudentContext } from "@/lib/student/session";
import { MEDIA_URL_TTL, signedReadUrl } from "@/lib/student/storage";

/**
 * Pièces jointes des messages côté équipe : le fil doit appartenir à un étudiant de la classe
 * du formateur (formation + niveau ; admin / pédagogie : tous). Les fils « Administratif » sont
 * ouverts à l'administration et aux admissions — sinon aucune URL signée n'est émise.
 */
export async function GET(request: NextRequest) {
  const ctx = await getStudentContext();
  if (!ctx || !hasAdminRole(ctx, ["admin", "pedagogy", "trainer", "pastor", "admissions"])) return new NextResponse("Non autorisé", { status: 401 });
  const id = z.uuid().safeParse(request.nextUrl.searchParams.get("message"));
  if (!id.success) return new NextResponse("Requête invalide", { status: 400 });
  const db = getDb();
  if (!db) return new NextResponse("Base indisponible", { status: 503 });

  const message = await db.messages.findUnique({
    where: { id: id.data },
    select: { attachment_path: true, attachment_name: true, message_threads: { select: { student_id: true, category: true } } },
  });
  if (!message?.attachment_path) return new NextResponse("Fichier introuvable", { status: 404 });

  // Fils « Administratif » : canal géré par l'administration et les admissions (hors périmètre de classe).
  if (message.message_threads.category === "administrative") {
    if (!hasAdminRole(ctx, ["admin", "admissions"])) return new NextResponse("Non autorisé", { status: 403 });
  } else {
    const scope = await getClassScope(db, ctx);
    if (!scope.all && !(await classStudentIds(db, scope)).includes(message.message_threads.student_id))
      return new NextResponse("Non autorisé", { status: 403 });
  }

  const download = request.nextUrl.searchParams.has("telecharger") ? (message.attachment_name ?? undefined) : undefined;
  const url = await signedReadUrl(message.attachment_path, download, isVoiceAttachment(message.attachment_name) ? MEDIA_URL_TTL : undefined);
  if (!url) return new NextResponse("Stockage indisponible", { status: 503 });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
