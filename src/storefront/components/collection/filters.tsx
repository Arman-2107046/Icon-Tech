import Link from "next/link";
import type { CollectionFacets } from "@/src/modules/catalog";
import { collectionQueryToParams, hasActiveFilters, type CollectionQuery } from "@/src/modules/catalog/types";
import { formatMoney, money, toMajorUnits } from "@/src/lib/money";
import { Button } from "@/src/storefront/components/ui";
import { inputClasses } from "@/src/storefront/components/ui/input";
import { cx } from "@/src/storefront/lib/cx";

/**
 * Faceted filters as a plain GET form: every control is a named input, so
 * submitting writes the URL and the server re-renders. No client state.
 * On small screens the whole thing collapses into a <details>.
 */
export function CollectionFilters({ basePath, facets, query }: { basePath: string; facets: CollectionFacets; query: CollectionQuery }) {
  const active = hasActiveFilters(query);
  const sortParam = query.sort !== "featured" ? <input type="hidden" name="sort" value={query.sort} /> : null;

  // Rendered twice (desktop aside + mobile disclosure): ids must not collide.
  const form = (prefix: string) => (
    <form method="get" action={basePath} className="space-y-s4" data-testid="collection-filters">
      {sortParam}

      <fieldset>
        <legend className="label mb-s2 text-ink-muted">Price</legend>
        <div className="flex items-center gap-s1">
          <label className="sr-only" htmlFor={`${prefix}-min`}>
            Minimum price
          </label>
          <input id={`${prefix}-min`} name="min" type="number" inputMode="numeric" min={0} placeholder={String(Math.floor(toMajorUnits(money(facets.priceMin))))} defaultValue={query.minPrice ?? ""} className={cx(inputClasses, "h-10 text-t-sm")} />
          <span className="text-ink-subtle">–</span>
          <label className="sr-only" htmlFor={`${prefix}-max`}>
            Maximum price
          </label>
          <input id={`${prefix}-max`} name="max" type="number" inputMode="numeric" min={0} placeholder={String(Math.ceil(toMajorUnits(money(facets.priceMax))))} defaultValue={query.maxPrice ?? ""} className={cx(inputClasses, "h-10 text-t-sm")} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="label mb-s2 text-ink-muted">Availability</legend>
        <Check name="stock" value="in" label="In stock only" checked={query.inStockOnly} />
      </fieldset>

      {facets.options.map((option) => (
        <fieldset key={option.name}>
          <legend className="label mb-s2 text-ink-muted">{option.name}</legend>
          <div className="flex flex-col gap-s0-5">
            {option.values.map((value) => (
              <Check key={value} name={option.name} value={value} label={value} checked={query.options[option.name]?.includes(value) ?? false} />
            ))}
          </div>
        </fieldset>
      ))}

      {facets.tags.length > 1 ? (
        <fieldset>
          <legend className="label mb-s2 text-ink-muted">Tags</legend>
          <div className="flex flex-col gap-s0-5">
            {facets.tags.map((tag) => (
              <Check key={tag} name="tag" value={tag} label={tag} checked={query.tags.includes(tag)} />
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex gap-s1">
        <Button type="submit" variant="secondary" className="flex-1">
          Apply
        </Button>
        {active ? (
          <Button href={query.sort !== "featured" ? `${basePath}?sort=${query.sort}` : basePath} variant="ghost">
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );

  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters">
        {form("desktop")}
      </aside>
      <details className="rounded-sf-lg border border-line bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-s2 py-s1 text-t-sm font-medium [&::-webkit-details-marker]:hidden">
          Filters{active ? ` (${countActive(query)})` : ""}
          <svg className="size-4 text-ink-subtle" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="border-t border-line p-s2">{form("mobile")}</div>
      </details>
    </>
  );
}

function countActive(q: CollectionQuery): number {
  return (q.minPrice !== null || q.maxPrice !== null ? 1 : 0) + (q.inStockOnly ? 1 : 0) + q.tags.length + Object.values(q.options).reduce((n, v) => n + v.length, 0);
}

function Check({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-s1 text-t-sm text-ink">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="size-4 rounded-sf-sm border-line-strong accent-ink" />
      {label}
    </label>
  );
}

/** Removable chips for each active filter, each linking to the URL without it. */
export function ActiveFilters({ basePath, query }: { basePath: string; query: CollectionQuery }) {
  if (!hasActiveFilters(query)) return null;
  const chips: { label: string; without: CollectionQuery }[] = [];
  if (query.minPrice !== null || query.maxPrice !== null) {
    const min = query.minPrice !== null ? formatMoney(money(Math.round(query.minPrice * 100))) : "";
    const max = query.maxPrice !== null ? formatMoney(money(Math.round(query.maxPrice * 100))) : "";
    chips.push({ label: min && max ? `${min} – ${max}` : min ? `From ${min}` : `Up to ${max}`, without: { ...query, minPrice: null, maxPrice: null } });
  }
  if (query.inStockOnly) chips.push({ label: "In stock", without: { ...query, inStockOnly: false } });
  for (const t of query.tags) chips.push({ label: `#${t}`, without: { ...query, tags: query.tags.filter((x) => x !== t) } });
  for (const [name, values] of Object.entries(query.options)) {
    for (const v of values) {
      const rest = values.filter((x) => x !== v);
      const options = { ...query.options };
      if (rest.length) options[name] = rest;
      else delete options[name];
      chips.push({ label: `${name}: ${v}`, without: { ...query, options } });
    }
  }
  return (
    <ul className="flex flex-wrap gap-s1" aria-label="Active filters">
      {chips.map((chip) => {
        const params = collectionQueryToParams({ ...chip.without, page: 1 }).toString();
        return (
          <li key={chip.label}>
            <Link href={params ? `${basePath}?${params}` : basePath} className="inline-flex h-8 items-center gap-1 rounded-sf-full border border-line bg-surface px-s1 text-t-sm hover:border-ink" aria-label={`Remove filter ${chip.label}`}>
              {chip.label}
              <span aria-hidden>×</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
