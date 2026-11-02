import { NextResponse, type NextRequest } from "next/server";
import { getEvents } from "@/lib/student/queries/calendar";
import { getStudentContext, withStudent } from "@/lib/student/session";
import { toIcs } from "@/lib/student/ics";

/** Export iCalendar : un événement (?evenement=<id>) ou tout l'agenda des 6 prochains mois. */
export async function GET(request: NextRequest) {
  const ctx = await getStudentContext();
  if (!ctx?.enrollment) return new NextResponse("Non autorisé", { status: 401 });
  const id = request.nextUrl.searchParams.get("evenement");
  const now = Date.now();
  const events = await withStudent(ctx.userId, (tx) =>
    getEvents(tx, { from: new Date(now - 30 * 86400_000), to: new Date(now + 182 * 86400_000) }),
  );
  const selected = id ? events.filter((e) => e.id === id) : events;
  if (id && !selected.length) return new NextResponse("Événement introuvable", { status: 404 });
  return new NextResponse(toIcs(selected, request.nextUrl.origin), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id ? "ctf-academy-evenement" : "ctf-academy-agenda"}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
