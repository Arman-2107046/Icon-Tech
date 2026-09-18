import Link from "next/link";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/admin/components/ui/table";
import { cn } from "@/src/admin/lib/utils";
import type { TableParams } from "@/src/admin/lib/table-params";
import { DataTablePagination } from "./pagination";
import { SortHeader } from "./sort-header";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** When set, the header sorts on this key via ?sort=…&dir=…. */
  sortKey?: string;
  className?: string;
  headerClassName?: string;
};

/**
 * Server-rendered table over a page of rows the page already fetched.
 * Sorting, paging, and filtering are URL state handled by the client
 * subcomponents; the query itself runs in the Server Component.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  params,
  total,
  emptyMessage = "Nothing here yet.",
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  params: TableParams;
  total: number;
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName}>
                  {col.sortKey ? (
                    <SortHeader
                      sortKey={col.sortKey}
                      label={col.header}
                      active={params.sort === col.sortKey}
                      dir={params.dir}
                    />
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const href = rowHref?.(row);
                return (
                  <TableRow key={rowKey(row)} className={href ? "relative cursor-pointer" : undefined}>
                    {columns.map((col, i) => (
                      <TableCell key={col.key} className={col.className}>
                        {href && i === 0 ? (
                          // Stretched link: the whole row navigates, but only
                          // the first cell holds the anchor for screen readers.
                          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
                            {col.cell(row)}
                          </Link>
                        ) : (
                          col.cell(row)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination page={params.page} perPage={params.perPage} total={total} />
    </div>
  );
}
