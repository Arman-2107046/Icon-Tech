"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/src/admin/components/ui/button";
import { Input } from "@/src/admin/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/admin/components/ui/select";
import { useTableUrl } from "@/src/admin/hooks/use-table-url";

export type FilterOption = { value: string; label: string };
export type FilterDef = { key: string; label: string; options: FilterOption[] };

const ALL = "__all__";

/** Search box + filter selects. Everything writes to the URL. */
export function DataTableToolbar({
  searchPlaceholder = "Search…",
  filters = [],
  children,
}: {
  searchPlaceholder?: string;
  filters?: FilterDef[];
  children?: ReactNode;
}) {
  const { searchParams, set } = useTableUrl();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const lastPushed = useRef(urlQuery);

  // Debounce typing into the URL. Skip if the URL already holds this value
  // (e.g. right after back/forward navigation re-syncs the input).
  useEffect(() => {
    if (query === lastPushed.current) return;
    const handle = setTimeout(() => {
      lastPushed.current = query;
      set({ q: query });
    }, 300);
    return () => clearTimeout(handle);
  }, [query, set]);

  const activeFilters = filters.filter((f) => searchParams.get(f.key));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label="Search"
        />
      </div>

      {filters.map((filter) => {
        const current = searchParams.get(filter.key) ?? ALL;
        const items = {
          [ALL]: `All ${filter.label.toLowerCase()}`,
          ...Object.fromEntries(filter.options.map((o) => [o.value, o.label])),
        };
        return (
          <Select
            key={filter.key}
            items={items}
            value={current}
            onValueChange={(value) => set({ [filter.key]: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-[160px]" aria-label={filter.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All {filter.label.toLowerCase()}</SelectItem>
              {filter.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}

      {activeFilters.length > 0 || urlQuery ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            lastPushed.current = "";
            set({ q: null, ...Object.fromEntries(filters.map((f) => [f.key, null])) });
          }}
        >
          <X className="size-4" />
          Clear
        </Button>
      ) : null}

      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </div>
  );
}
