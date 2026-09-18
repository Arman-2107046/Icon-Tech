import { Prisma } from "@/src/generated/prisma/client";

/**
 * True for a P2002 unique-constraint error on the given column. With driver
 * adapters `meta.target` is absent; the constraint name (e.g.
 * products_handle_key) appears in the message and in meta.driverAdapterError.
 */
export function isUniqueViolation(error: unknown, column: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const haystack = `${error.message} ${JSON.stringify(error.meta ?? {}, (_k, v) => (v instanceof Error ? { cause: v.cause } : v))}`;
  return new RegExp(`_${column}_key`).test(haystack) || haystack.includes(`"${column}"`);
}

/** True for a P2025 "record not found" error (update/delete on a missing row). */
export function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
