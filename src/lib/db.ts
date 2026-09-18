import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";
import { env } from "@/src/lib/env";

/**
 * Single PrismaClient for the process. In development Next.js re-evaluates
 * modules on hot reload, which would otherwise open a new pool each time;
 * the instance is parked on globalThis to survive reloads.
 */

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as typeof globalThis & {
  __prisma?: PrismaClient;
};

export const db: PrismaClient = globalForPrisma.__prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = db;
}
