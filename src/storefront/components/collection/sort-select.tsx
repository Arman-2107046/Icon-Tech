"use client";

import { useRouter } from "next/navigation";
import { COLLECTION_SORTS, SORT_LABELS, type CollectionSort } from "@/src/modules/catalog/types";
import { inputClasses } from "@/src/storefront/components/ui/input";
import { cx } from "@/src/storefront/lib/cx";

/** Changes ?sort= in place, keeping every other filter and resetting the page. */
export function SortSelect({ basePath, current, params }: { basePath: string; current: CollectionSort; params: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-s1 text-t-sm text-ink-muted">
      Sort
      <select
        value={current}
        aria-label="Sort products"
        className={cx(inputClasses, "h-10 w-auto pr-s3 text-t-sm")}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.delete("page");
          if (e.target.value === "featured") next.delete("sort");
          else next.set("sort", e.target.value);
          const qs = next.toString();
          router.push(qs ? `${basePath}?${qs}` : basePath);
        }}
      >
        {COLLECTION_SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
