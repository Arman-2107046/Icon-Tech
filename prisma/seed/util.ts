/** Deterministic PRNG (mulberry32) so every seed run produces the same store. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("pick: empty list");
  return item;
}

export function int(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function shuffle<T>(random: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

/** BDT major units -> minor units (poisha). */
export function bdt(amount: number): number {
  return Math.round(amount * 100);
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function daysAgo(days: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Deterministic placeholder image with known dimensions. */
export function imageUrl(seed: string, width = 1200, height = 1500): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export function cartesian<T>(lists: readonly (readonly T[])[]): T[][] {
  return lists.reduce<T[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])),
    [[]],
  );
}
