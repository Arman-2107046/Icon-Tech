import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/src/lib/db";
import { tags } from "@/src/lib/cache-tags";
import { Container, Section } from "@/src/storefront/components/layout";

async function vendors(): Promise<string[]> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.products);
  const rows = await db.product.findMany({ where: { status: "ACTIVE", vendor: { not: null } }, distinct: ["vendor"], select: { vendor: true }, orderBy: { vendor: "asc" } });
  return rows.flatMap((r) => (r.vendor ? [r.vendor] : []));
}

/** Brands as restrained wordmarks (no logo files needed). */
export async function LogoRowSection() {
  const names = await vendors();
  if (names.length === 0) return null;
  return (
    <Section space="md" className="border-y border-line">
      <Container>
        <p className="label text-center text-ink-subtle">Brands we stock</p>
        <ul className="mt-s3 flex flex-wrap items-center justify-center gap-x-s6 gap-y-s2">
          {names.map((n) => (
            <li key={n} className="display text-t-md text-ink-muted transition-colors hover:text-ink">
              {n}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
