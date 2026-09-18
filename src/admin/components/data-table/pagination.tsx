"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/src/admin/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/admin/components/ui/select";
import { useTableUrl } from "@/src/admin/hooks/use-table-url";
import { PER_PAGE_OPTIONS } from "@/src/admin/lib/table-params";

export function DataTablePagination({
  page,
  perPage,
  total,
}: {
  page: number;
  perPage: number;
  total: number;
}) {
  const { set } = useTableUrl();
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {total === 0 ? "No results" : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <Select
          items={Object.fromEntries(PER_PAGE_OPTIONS.map((n) => [String(n), `${n} / page`]))}
          value={String(perPage)}
          onValueChange={(v) => set({ per: v })}
        >
          <SelectTrigger className="w-[110px]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="tabular-nums">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => set({ page: page - 1 }, { keepPage: true })}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => set({ page: page + 1 }, { keepPage: true })}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
