import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** La base est accessible via Prisma dès que DATABASE_URL est défini (pooler Supabase conseillé). */
export const isPrismaConfigured = !!process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Client Prisma unique (survit au rechargement à chaud en développement). Null sans DATABASE_URL. */
export function getDb(): PrismaClient | null {
  if (!isPrismaConfigured) return null;
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
  }
  return globalForPrisma.prisma;
}
