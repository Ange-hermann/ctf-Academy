import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { degrees, PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";

const GOLD = rgb(0.788, 0.635, 0.153); // #C9A227
const GOLD_LIGHT = rgb(0.898, 0.757, 0.345); // #E5C158
const INK = rgb(0.1, 0.1, 0.1);
const INK_SOFT = rgb(0.35, 0.35, 0.35);
const PAPER = rgb(0.984, 0.98, 0.965);
const LINE = rgb(0.82, 0.78, 0.62);

export type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };
export type Doc = Fonts & { doc: PDFDocument };

export async function newDoc(): Promise<Doc> {
  const doc = await PDFDocument.create();
  const [regular, bold, italic] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.HelveticaOblique),
  ]);
  doc.setTitle("CTF ACADEMY");
  doc.setProducer("CTF ACADEMY — espace étudiant");
  return { doc, regular, bold, italic };
}

let emblemCache: Promise<Uint8Array> | null = null;
const emblemPng = () => (emblemCache ??= readFile(path.join(process.cwd(), "public", "brand", "emblem.png")));

/** En-tête de marque : emblème + nom + sous-titre centrés, filet or. Retourne le y courant. */
export async function brandHeader(doc: PDFDocument, page: PDFPage, fonts: Fonts, subtitle: string): Promise<number> {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: PAPER });
  try {
    const png = await doc.embedPng(await emblemPng());
    const s = 52;
    page.drawImage(png, { x: width / 2 - s / 2, y: height - 40 - s, width: s, height: s });
  } catch {
    /* emblème indisponible : l'en-tête reste sans logo */
  }
  page.drawText("CTF ACADEMY", { x: width / 2 - fonts.bold.widthOfTextAtSize("CTF ACADEMY", 22) / 2, y: height - 120, size: 22, font: fonts.bold, color: GOLD });
  const sub = subtitle.toUpperCase();
  page.drawText(sub, { x: width / 2 - fonts.regular.widthOfTextAtSize(sub, 8.5) / 2, y: height - 136, size: 8.5, font: fonts.regular, color: INK_SOFT });
  page.drawLine({ start: { x: 48, y: height - 152 }, end: { x: width - 48, y: height - 152 }, thickness: 1, color: GOLD });
  return height - 178;
}

/** Pied de page sobre. */
export function footer(page: PDFPage, fonts: Fonts, text: string) {
  const { width } = page.getSize();
  page.drawText(text, { x: width / 2 - fonts.italic.widthOfTextAtSize(text, 8) / 2, y: 34, size: 8, font: fonts.italic, color: INK_SOFT });
}

/** Filigrane diagonal « EXEMPLE » pour les documents de démonstration. */
export function exampleWatermark(page: PDFPage, fonts: Fonts) {
  const { width, height } = page.getSize();
  const text = "EXEMPLE — DOCUMENT DE DÉMONSTRATION";
  const size = 30;
  page.drawText(text, {
    x: width / 2 - fonts.bold.widthOfTextAtSize(text, size) / 2,
    y: height / 2,
    size,
    font: fonts.bold,
    color: GOLD_LIGHT,
    opacity: 0.14,
    rotate: degrees(-32),
  });
}

/** Ligne label : valeur pour les fiches. */
export function field(page: PDFPage, fonts: Fonts, y: number, label: string, value: string, x = 64) {
  page.drawText(label.toUpperCase(), { x, y, size: 8, font: fonts.regular, color: INK_SOFT });
  page.drawText(value, { x, y: y - 16, size: 12, font: fonts.bold, color: INK });
  return y - 40;
}

export function rule(page: PDFPage, y: number, x = 64, w?: number) {
  const { width } = page.getSize();
  page.drawLine({ start: { x, y }, end: { x: w ?? width - 64, y }, thickness: 0.6, color: LINE });
}

export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(new Uint8Array(bytes).buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
