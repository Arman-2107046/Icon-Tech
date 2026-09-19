// One-off: compute blurhashes for media rows that have none (e.g. seeded picsum images).
// Usage: npx tsx --env-file=.env scripts/backfill-blurhash.ts
import { db } from "../src/lib/db";
import { blurhashFromUrl } from "../src/lib/blurhash-from-url";

async function main() {
  const rows = await db.media.findMany({ where: { blurhash: null }, select: { id: true, url: true } });
  console.log(`backfilling ${rows.length} media rows`);
  let done = 0;
  const queue = [...rows];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let row = queue.shift(); row; row = queue.shift()) {
        const blurhash = await blurhashFromUrl(row.url, process.env.NEXT_PUBLIC_SITE_URL);
        if (blurhash) {
          await db.media.update({ where: { id: row.id }, data: { blurhash } });
          done++;
        }
      }
    }),
  );
  console.log(`done: ${done}/${rows.length}`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
