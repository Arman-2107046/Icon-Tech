/**
 * Class joiner for the storefront. Deliberately NOT tailwind-merge: that
 * library cannot classify our namespaced utilities (text-t-sm vs
 * text-canvas both look like colours to it) and silently drops classes.
 * Callers are responsible for not passing conflicting utilities.
 */
export type ClassValue = string | number | null | false | undefined | ClassValue[] | Record<string, boolean | null | undefined>;

export function cx(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (typeof v === "string" || typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) {
      const nested = cx(...v);
      if (nested) out.push(nested);
    } else for (const [k, on] of Object.entries(v)) if (on) out.push(k);
  }
  return out.join(" ");
}
