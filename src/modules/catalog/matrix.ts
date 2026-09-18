// Pure variant-matrix logic. No I/O, so it is unit-tested directly.

export type OptionDraft = { id?: string; name: string; values: { id?: string; value: string }[] };

export type ExistingVariant<T> = {
  /** Selected option values keyed by option name, e.g. { Size: "M", Colour: "Red" }. */
  selection: Record<string, string>;
  data: T;
};

export type VariantPlan<T> = {
  /** Variants that survive, with their new title/position and selection. */
  keep: { data: T; title: string; position: number; selection: Record<string, string> }[];
  /** Combinations with no existing variant. */
  create: { title: string; position: number; selection: Record<string, string> }[];
  /** Existing variants whose combination no longer exists. */
  remove: T[];
};

/** Stable key for a selection regardless of option order. */
export function selectionKey(selection: Record<string, string>): string {
  return Object.keys(selection)
    .sort()
    .map((k) => `${k}=${selection[k]}`)
    .join("|");
}

export function variantTitle(options: OptionDraft[], selection: Record<string, string>): string {
  return options.map((o) => selection[o.name] ?? "").join(" / ");
}

/** Every combination of option values, in option order. */
export function combinations(options: OptionDraft[]): Record<string, string>[] {
  const withValues = options.filter((o) => o.values.length > 0);
  if (withValues.length === 0) return [{}];
  return withValues.reduce<Record<string, string>[]>(
    (acc, option) => acc.flatMap((partial) => option.values.map((v) => ({ ...partial, [option.name]: v.value }))),
    [{}],
  );
}

/**
 * Decide what to keep, create and remove when the option set changes.
 * Matching is by option-name/value selection, so renaming an option or
 * value is treated as a new axis; reordering options only retitles.
 */
export function planVariants<T>(options: OptionDraft[], existing: ExistingVariant<T>[]): VariantPlan<T> {
  const byKey = new Map(existing.map((v) => [selectionKey(v.selection), v]));
  const plan: VariantPlan<T> = { keep: [], create: [], remove: [] };
  const seen = new Set<string>();

  combinations(options).forEach((selection, position) => {
    const key = selectionKey(selection);
    seen.add(key);
    const title = variantTitle(options, selection) || "Default";
    const match = byKey.get(key);
    if (match) plan.keep.push({ data: match.data, title, position, selection });
    else plan.create.push({ title, position, selection });
  });

  for (const v of existing) {
    if (!seen.has(selectionKey(v.selection))) plan.remove.push(v.data);
  }
  return plan;
}

/** Normalise user input: trim, drop blanks, dedupe values case-insensitively. */
export function cleanOptions(options: OptionDraft[]): OptionDraft[] {
  const seenNames = new Set<string>();
  const out: OptionDraft[] = [];
  for (const option of options) {
    const name = option.name.trim();
    if (!name || seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());
    const seenValues = new Set<string>();
    const values = option.values.flatMap((v) => {
      const value = v.value.trim();
      if (!value || seenValues.has(value.toLowerCase())) return [];
      seenValues.add(value.toLowerCase());
      return [{ ...v, value }];
    });
    if (values.length === 0) continue;
    out.push({ ...option, name, values });
  }
  return out;
}
