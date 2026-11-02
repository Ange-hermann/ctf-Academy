// Espace étudiant : applique la migration (si besoin), génère les PDF d'exemple, exécute le seed de démonstration
// et dépose les fichiers privés d'exemple (rapport, mémoire) dans le bucket « student-files ».
// Usage : npm.cmd run db:seed-student
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import pg from "pg";

const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DATABASE_URL) {
  console.error("DATABASE_URL manquante (.env.local)");
  process.exit(1);
}

const gold = rgb(0.79, 0.64, 0.15);
const ink = rgb(0.1, 0.1, 0.1);

/** PDF d'une page clairement marqué « Exemple ». */
async function demoPdf(title, lines) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({ x: 0, y: 802, width: 595, height: 40, color: rgb(0.04, 0.04, 0.04) });
  page.drawText("CTF ACADEMY", { x: 40, y: 816, size: 14, font: serif, color: gold });
  page.drawText("EXEMPLE — document de démonstration", { x: 330, y: 818, size: 9, font: sans, color: gold });
  page.drawText(title, { x: 40, y: 740, size: 22, font: serif, color: ink });
  let y = 700;
  for (const line of lines) {
    page.drawText(line, { x: 40, y, size: 11, font: sans, color: ink, maxWidth: 515 });
    y -= 22;
  }
  page.drawText("Document d'exemple : à remplacer par le document officiel.", { x: 40, y: 40, size: 9, font: sans, color: gold });
  return doc.save();
}

const publicFiles = {
  "support-de-cours-exemple.pdf": ["Support de cours", ["Résumé du module et points clés.", "Questions de méditation et de mise en pratique."]],
  "reglement-interieur-exemple.pdf": ["Règlement intérieur", ["Assiduité aux cours et séances en direct.", "Respect, ponctualité et bienveillance."]],
  "calendrier-officiel-exemple.pdf": ["Calendrier officiel", ["Rentrée, sessions, évaluations et cérémonies.", "Dates indicatives, à confirmer."]],
  "contacts-exemple.pdf": ["Contacts utiles", ["Secrétariat, coordination pédagogique, assistance technique."]],
};

mkdirSync("public/demo", { recursive: true });
for (const [name, [title, lines]] of Object.entries(publicFiles)) {
  const path = `public/demo/${name}`;
  if (!existsSync(path)) writeFileSync(path, await demoPdf(`${title} (exemple)`, lines));
}
console.log("PDF d'exemple publics : OK");

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'modules'",
);
if (!rows.length) {
  await client.query(readFileSync("supabase/migrations/20261016000001_student_space.sql", "utf8"));
  console.log("Migration espace étudiant : appliquée");
}
await client.query(readFileSync("supabase/seed-student.sql", "utf8"));
await client.end();
console.log("Seed de démonstration : appliqué");

if (NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const dia = "d0000000-0000-4000-8000-000000000003";
  const privateFiles = {
    [`${dia}/rapport/v1-rapport-de-stage-exemple.pdf`]: ["Rapport de stage — version 1", ["Présentation du lieu de stage.", "Activités réalisées."]],
    [`${dia}/memoire/v1-memoire-exemple.pdf`]: ["Mémoire — version 1", ["Introduction et problématique.", "Plan du mémoire."]],
    [`${dia}/memoire/v2-memoire-exemple.pdf`]: ["Mémoire — version 2", ["Problématique reformulée.", "Chapitres 1 et 2."]],
  };
  for (const [path, [title, lines]] of Object.entries(privateFiles)) {
    const { error } = await admin.storage
      .from("student-files")
      .upload(path, await demoPdf(`${title} (exemple)`, lines), { contentType: "application/pdf", upsert: true });
    if (error) console.error(`Dépôt ${path} :`, error.message);
  }
  console.log("Fichiers privés d'exemple : déposés");
} else {
  console.log("Clé service absente : fichiers privés non déposés");
}
