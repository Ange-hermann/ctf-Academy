import { rgb } from "pdf-lib";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getDb } from "@/lib/db";
import { formatMoney, formatShortDate } from "@/lib/student/format";
import { brandHeader, footer, newDoc, pdfResponse, rule } from "@/lib/student/pdf";
import { methodLabels, paymentStatusLabels } from "@/lib/student/queries/finance";
import type { PDFFont, PDFPage } from "pdf-lib";

const INK = rgb(0.1, 0.1, 0.1);
const INK_SOFT = rgb(0.35, 0.35, 0.35);
const GOLD = rgb(0.788, 0.635, 0.153);

// Colonnes du tableau (A4 paysage 842 × 595)
const COLS = { date: 48, student: 112, reference: 225, object: 300, amount: 458, method: 530, status: 615, receipt: 695 };

function truncate(font: PDFFont, text: string, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function tableHead(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont }, y: number) {
  const heads: [keyof typeof COLS, string][] = [
    ["date", "DATE"],
    ["student", "ÉTUDIANT"],
    ["reference", "DOSSIER"],
    ["object", "OBJET"],
    ["amount", "MONTANT"],
    ["method", "MOYEN"],
    ["status", "STATUT"],
    ["receipt", "REÇU"],
  ];
  for (const [key, label] of heads) page.drawText(label, { x: COLS[key], y, size: 7, font: fonts.bold, color: INK_SOFT });
  rule(page, y - 6, 48);
  return y - 24;
}

/** Rapport PDF des transactions — toutes les écritures de paiement, avec le numéro de reçu quand il existe. */
export async function GET() {
  const ctx = await requireAdminRoles(["admin", "finance"], adminRoutes.finance);
  const db = getDb();
  if (!db) return new Response("Base de données indisponible", { status: 503 });

  const payments = await db.payments.findMany({
    orderBy: { created_at: "desc" },
    take: 1000,
    include: {
      profiles: { select: { first_name: true, last_name: true } },
      applications: { select: { reference: true } },
      payment_schedules: { select: { label: true } },
      receipts: { select: { number: true } },
    },
  });

  const { doc, regular, bold, italic } = await newDoc();
  const fonts = { regular, bold, italic };
  const pageSize: [number, number] = [842, 595];
  const pages: PDFPage[] = [doc.addPage(pageSize)];

  let page = pages[0];
  let y = await brandHeader(doc, page, fonts, "Rapport des transactions");
  const confirmed = payments.filter((p) => p.status === "confirmed");
  const total = confirmed.reduce((s, p) => s + p.amount, 0);
  page.drawText(`${payments.length} transaction${payments.length > 1 ? "s" : ""} · ${confirmed.length} confirmée${confirmed.length > 1 ? "s" : ""} · Total encaissé : ${formatMoney(total)}`, {
    x: 48,
    y,
    size: 10,
    font: regular,
    color: INK,
  });
  page.drawText(`Édité le ${formatShortDate(new Date().toISOString(), ctx.timezone)}`, { x: 48, y: y - 16, size: 8, font: regular, color: INK_SOFT });
  y = tableHead(page, fonts, y - 36);

  const draw = (x: number, text: string, yy: number, opts?: { bold?: boolean; color?: ReturnType<typeof rgb>; maxWidth?: number }) => {
    const font = opts?.bold ? bold : regular;
    page.drawText(truncate(font, text, 7.5, opts?.maxWidth ?? 110), { x, y: yy, size: 7.5, font, color: opts?.color ?? INK });
  };

  for (const p of payments) {
    if (y < 60) {
      footer(page, fonts, `CTF ACADEMY — rapport des transactions · page ${pages.length}`);
      page = doc.addPage(pageSize);
      pages.push(page);
      y = tableHead(page, fonts, 545);
    }
    const name = `${p.profiles.first_name} ${p.profiles.last_name}`.trim() || "—";
    draw(COLS.date, formatShortDate(p.created_at.toISOString(), ctx.timezone), y, { maxWidth: 58 });
    draw(COLS.student, name, y, { maxWidth: 108 });
    draw(COLS.reference, p.applications.reference, y, { maxWidth: 70 });
    draw(COLS.object, p.payment_schedules?.label ?? "Paiement", y, { maxWidth: 152 });
    draw(COLS.amount, formatMoney(p.amount), y, { bold: true, color: GOLD, maxWidth: 66 });
    draw(COLS.method, methodLabels[p.method] ?? p.method, y, { maxWidth: 80 });
    draw(COLS.status, paymentStatusLabels[p.status], y, { maxWidth: 74 });
    draw(COLS.receipt, p.receipts?.number ?? "—", y, { maxWidth: 100 });
    y -= 18;
  }

  if (!payments.length) {
    page.drawText("Aucune transaction enregistrée.", { x: 48, y, size: 10, font: regular, color: INK_SOFT });
  }
  footer(page, fonts, `CTF ACADEMY — rapport des transactions · page ${pages.length}`);
  return pdfResponse(await doc.save(), `transactions-ctf-${new Date().toISOString().slice(0, 10)}.pdf`);
}
