// Exécute une requête SQL ponctuelle sur DATABASE_URL (diagnostic).
// Usage : node --env-file=.env.local scripts/db-query.mjs "select 1"
import pg from "pg";

const sql = process.argv[2];
if (!process.env.DATABASE_URL || !sql) {
  console.error("Usage : node --env-file=.env.local scripts/db-query.mjs \"<sql>\"");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const res = await client.query(sql);
  for (const r of Array.isArray(res) ? res : [res]) console.table(r.rows);
} finally {
  await client.end();
}
