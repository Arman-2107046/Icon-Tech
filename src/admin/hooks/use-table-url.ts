"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Update table state in the URL. Any change other than paging resets the
 * page to 1, so a new search never lands on an empty page 7.
 */
export function useTableUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (updates: Record<string, string | number | null | undefined>, options: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      if (!options.keepPage && !("page" in updates)) next.delete("page");
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams],
  );

  return { searchParams, set };
}
