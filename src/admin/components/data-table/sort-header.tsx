"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/src/admin/components/ui/button";
import { useTableUrl } from "@/src/admin/hooks/use-table-url";
import type { SortDir } from "@/src/admin/lib/table-params";

export function SortHeader({
  sortKey,
  label,
  active,
  dir,
}: {
  sortKey: string;
  label: string;
  active: boolean;
  dir: SortDir;
}) {
  const { set } = useTableUrl();
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[active=true]:text-foreground"
      data-active={active}
      onClick={() => set({ sort: sortKey, dir: nextDir })}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <Icon className="size-3.5 text-muted-foreground" />
    </Button>
  );
}
