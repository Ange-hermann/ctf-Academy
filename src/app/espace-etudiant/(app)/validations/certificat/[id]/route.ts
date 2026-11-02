import QRCode from "qrcode";
import { rgb } from "pdf-lib";
import { studentRoutes } from "@/config/student-nav";
import { formatDate } from "@/lib/student/format";
import { exampleWatermark, footer, newDoc, pdfResponse } from "@/lib/student/pdf";
import { requireStudent, withStudent } from "@/lib/student/session";
import { readFile } from "node:fs/promises";
import path from "node:path";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GOLD = rgb(0.788, 0.635, 0.153);
const INK = rgb(0.1, 0.1, 0.1);
const INK_SOFT = rgb(0.35, 0.35, 0.35);
const PAPER = rgb(0.984, 0.98, 0.965);

type TextPage = { getSize(): { width: number }; drawText(t: string, o: object): unknown };
const center = (page: TextPage, font: { widthOfTextAtSize(t: string, s: number): number }, text: string, y: number, size: number, color = INK) => {
  const { width } = page.getSize();
  return page.drawText(text, { x: width / 2 - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
};

/** Certificat PDF : sceau, QR de vérification publique, signataire — accès propriétaire via RLS. */
export async function GET(request: Request, { params }: RouteContext<"/espace-etudiant/validations/certificat/[id]">) {
  const { id } = await params;
  const ctx = await requireStudent(studentRoutes.validations);
  if (!uuid.test(id)) return new Response("Identifiant invalide", { status: 400 });

  const v = await withStudent(ctx.userId, (tx) =>
    tx.validations.findUnique({
      where: { id },
      include: {
        profiles: { select: { first_name: true, last_name: true } },
        formations: { select: { name: true } },
      },
    }),
  );
  if (!v || v.decision !== "granted" || !v.certificate_number) return new Response("Certificat introuvable", { status: 404 });

  const { doc, regular, bold, italic } = await newDoc();
  const page = doc.addPage([842, 595]); // A4 paysage
  const { width, height } = page.getSize();
  const fonts = { regular, bold, italic };

  page.drawRectangle({ x: 0, y: 0, width, height, color: PAPER });
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: GOLD, borderWidth: 2 });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: GOLD, borderWidth: 0.7 });

  try {
    const emblem = await doc.embedPng(await readFile(path.join(process.cwd(), "public", "brand", "emblem.png")));
    page.drawImage(emblem, { x: width / 2 - 30, y: height - 110, width: 60, height: 60 });
  } catch {
    /* emblème indisponible */
  }
  center(page, bold, "CTF ACADEMY", height - 136, 22, GOLD);
  center(page, regular, "CENTRE DE TRANSFORMATION DES FAMILLES", height - 152, 8, INK_SOFT);

  center(page, italic, v.kind === "graduation" ? "Diplôme de graduation" : v.kind === "service" ? "Attestation de service" : "Certificat de validation", height - 200, 15, INK);
  center(page, regular, "est décerné à", height - 236, 11, INK_SOFT);

  const name = `${v.profiles.first_name} ${v.profiles.last_name}`.toUpperCase();
  center(page, bold, name, height - 268, 24, INK);
  const nameW = bold.widthOfTextAtSize(name, 24);
  page.drawLine({ start: { x: width / 2 - nameW / 2 - 30, y: height - 276 }, end: { x: width / 2 + nameW / 2 + 30, y: height - 276 }, thickness: 0.8, color: GOLD });

  center(page, regular, `pour ${v.title}`, height - 306, 13, INK);
  if (v.description) center(page, italic, v.description, height - 326, 10, INK_SOFT);
  center(page, regular, v.formations.name, height - 346, 11, INK_SOFT);
  if (v.decided_at) center(page, regular, `Décision du ${formatDate(v.decided_at.toISOString(), ctx.timezone)}`, height - 364, 10, INK_SOFT);

  // Sceau QR : vérification publique du numéro de certificat.
  const origin = new URL(request.url).origin;
  const qrPng = await doc.embedPng(await QRCode.toBuffer(`${origin}/verifier/${v.certificate_number}`, { errorCorrectionLevel: "M", margin: 0, width: 120 }));
  page.drawImage(qrPng, { x: 64, y: 52, width: 56, height: 56 });
  page.drawText(`N° ${v.certificate_number}`, { x: 64, y: 42, size: 7.5, font: regular, color: INK_SOFT });
  page.drawText("Scannez pour vérifier", { x: 64, y: 32, size: 7.5, font: regular, color: INK_SOFT });

  if (v.signatory) {
    const sigX = width - 260;
    page.drawLine({ start: { x: sigX, y: 100 }, end: { x: sigX + 180, y: 100 }, thickness: 0.7, color: INK });
    page.drawText(v.signatory, { x: sigX + 90 - italic.widthOfTextAtSize(v.signatory, 9) / 2, y: 88, size: 9, font: italic, color: INK });
    page.drawText("Signataire", { x: sigX + 90 - regular.widthOfTextAtSize("Signataire", 8) / 2, y: 76, size: 8, font: regular, color: INK_SOFT });
  }

  if (v.is_example) exampleWatermark(page, fonts);
  footer(page, fonts, "CTF ACADEMY — document officiel vérifiable en ligne");
  return pdfResponse(await doc.save(), `certificat-${v.certificate_number}.pdf`);
}
