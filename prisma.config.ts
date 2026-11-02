import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Le projet utilise .env.local (convention Next.js) plutôt que .env.
dotenv.config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Requis uniquement pour les commandes migrate/db (generate fonctionne sans).
  datasource: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
});
