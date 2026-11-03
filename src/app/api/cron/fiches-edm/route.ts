import { dispatchFicheReminders } from "@/lib/edm-reminders";

/**
 * Déclencheur planifié des rappels de fiche EDM (un ping toutes les 10–15 min suffit).
 * Protégé par Authorization: Bearer <CRON_SECRET> quand la variable est définie.
 * Le paramètre ?at=<ISO> permet un déclenchement manuel à une heure simulée (tests).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }
  const at = new URL(request.url).searchParams.get("at");
  const now = at ? new Date(at) : new Date();
  if (Number.isNaN(now.getTime())) return Response.json({ error: "Paramètre at invalide." }, { status: 400 });
  const result = await dispatchFicheReminders(now);
  return Response.json(result);
}
