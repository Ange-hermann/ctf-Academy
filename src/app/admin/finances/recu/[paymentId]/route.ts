import { rgb } from "pdf-lib";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getDb } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/student/format";
import { exampleWatermark, field, footer, brandHeader, newDoc, pdfResponse, rule } from "@/lib/student/pdf";
import { methodLabels, paymentStatusLabels } from "@/lib/student/queries/finance";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reçu PDF d'un paiement confirmé — consultation par l'équipe (admin / finance), hors RLS propriétaire. */
export async function GET(request: Request, { params }: RouteContext<"/admin/finances/recu/[paymentId]">) {
  const ctx = await requireAdminRoles(["admin", "finance"], adminRoutes.finance);
  const { paymentId } = await params;
  if (!uuid.test(paymentId)) return new Response("Identifiant invalide", { status: 400 });
  const db = getDb();
  if (!db) return new Response("Base de données indisponible", { status: 503 });

  const data = await db.payments.findUnique({
    where: { id: paymentId },
    include: {
      receipts: { select: { number: true, issued_at: true } },
      payment_schedules: { select: { label: true, is_example: true } },
      profiles: { select: { first_name: true, last_name: true } },
      applications: { select: { reference: true, formations: { select: { name: true } } } },
    },
  });
  if (!data || !data.receipts || data.status !== "confirmed") return new Response("Reçu introuvable", { status: 404 });

  const ink = rgb(0.1, 0.1, 0.1);
  const { doc, regular, bold, italic } = await newDoc();
  const fonts = { regular, bold, italic };
  const page = doc.addPage([595, 842]);
  let y = await brandHeader(doc, page, fonts, "Reçu officiel de paiement");

  const name = `${data.profiles.first_name} ${data.profiles.last_name}`;
  page.drawText(`Reçu n° ${data.receipts.number}`, { x: 64, y, size: 16, font: bold, color: ink });
  y -= 14;
  rule(page, y);
  y -= 30;

  y = field(page, fonts, y, "Élève", name);
  y = field(page, fonts, y, "Formation", data.applications.formations.name);
  y = field(page, fonts, y, "Dossier", data.applications.reference);
  y = field(page, fonts, y, "Objet", data.payment_schedules?.label ?? "Paiement");

  rule(page, y + 16);
  y -= 16;
  page.drawText("MONTANT REÇU", { x: 64, y: y - 10, size: 8, font: regular, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(formatMoney(data.amount), { x: 64, y: y - 46, size: 28, font: bold, color: rgb(0.545, 0.435, 0.106) });
  y -= 82;

  y = field(page, fonts, y, "Moyen de paiement", methodLabels[data.method] ?? data.method);
  if (data.provider_reference) y = field(page, fonts, y, "Référence", data.provider_reference);
  y = field(page, fonts, y, "Statut", paymentStatusLabels[data.status]);
  y = field(page, fonts, y, "Confirmé le", data.confirmed_at ? formatDateTime(data.confirmed_at.toISOString(), ctx.timezone) : "—");
  field(page, fonts, y, "Émis le", formatDateTime(data.receipts.issued_at.toISOString(), ctx.timezone));

  if (data.payment_schedules?.is_example) exampleWatermark(page, fonts);
  footer(page, fonts, "CTF ACADEMY · Centre de Transformation des Familles — reçu consulté depuis l'espace d'administration");
  return pdfResponse(await doc.save(), `recu-${data.receipts.number}.pdf`);
}
