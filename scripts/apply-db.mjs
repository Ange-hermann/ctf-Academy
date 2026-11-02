// Applique la migration SQL et le seed sur la base pointée par DATABASE_URL.
// Usage : node scripts/apply-db.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquante (.env.local)");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
console.log("Connecté à la base.");

const { rows: existing } = await client.query(
  "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'applications'",
);
const files = [];
if (!existing.length) files.push("supabase/migrations/20261015000001_public_site.sql");

const { rows: seeded } = await client.query("select count(*)::int as n from public.formations");
if (!seeded[0].n) files.push("supabase/seed.sql");
else console.log("Seed ignoré : données déjà présentes.");

for (const file of files) {
  await client.query(readFileSync(file, "utf8"));
  console.log("Appliqué :", file);
}

const { rows } = await client.query("select slug, name from public.formations order by sort_order");
console.log("Formations :", rows.map((r) => r.slug).join(", "));
await client.end();
