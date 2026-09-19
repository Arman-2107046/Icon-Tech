import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { DataTable, DataTableToolbar, type Column } from "@/src/admin/components/data-table";
import { PageHeader } from "@/src/admin/components/page-header";
import { StatusBadge } from "@/src/admin/components/status-badge";
import { Button } from "@/src/admin/components/ui/button";
import { ImportProductsButton } from "@/src/admin/features/import-export/import-products-button";
import { formatDate, formatPriceRange } from "@/src/admin/lib/format";
import { parseTableParams, skipTake } from "@/src/admin/lib/table-params";
import { requireAdmin } from "@/src/lib/auth/guards";
import { listCollectionsBrief, listProductsForAdmin, type AdminProductRow } from "@/src/modules/catalog";

const SORTABLE = ["title", "updatedAt", "createdAt", "status"] as const;
type SortKey = (typeof SORTABLE)[number];
const STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
type Status = (typeof STATUSES)[number];

const columns: Column<AdminProductRow>[] = [
  {
    key: "product",
    header: "Product",
    sortKey: "title",
    cell: (r) => (
      <span className="flex items-center gap-3">
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, remote host varies
          <img src={r.imageUrl} alt="" width={40} height={50} className="size-10 rounded object-cover" />
        ) : (
          <span className="size-10 rounded bg-muted" />
        )}
        <span className="grid">
          <span className="font-medium">{r.title}</span>
          <span className="text-xs text-muted-foreground">/{r.handle}</span>
        </span>
      </span>
    ),
  },
  { key: "status", header: "Status", sortKey: "status", cell: (r) => <StatusBadge status={r.status} /> },
  { key: "vendor", header: "Vendor", cell: (r) => r.vendor ?? <span className="text-muted-foreground">—</span> },
  { key: "inventory", header: "Inventory", className: "tabular-nums", cell: (r) => `${r.inventory} in stock · ${r.variantCount} variant${r.variantCount === 1 ? "" : "s"}` },
  { key: "price", header: "Price", className: "tabular-nums", cell: (r) => formatPriceRange(r.priceMin, r.priceMax) },
  { key: "updated", header: "Updated", sortKey: "updatedAt", cell: (r) => formatDate(r.updatedAt) },
];

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const params = parseTableParams(await searchParams, {
    defaultSort: "updatedAt",
    sortable: SORTABLE,
    filterKeys: ["status", "collection"],
  });
  const status = (STATUSES as readonly string[]).includes(params.filters.status ?? "") ? (params.filters.status as Status) : undefined;

  const [{ rows, total }, collections] = await Promise.all([
    listProductsForAdmin({
      q: params.q,
      status,
      collectionHandle: params.filters.collection,
      sort: (params.sort ?? "updatedAt") as SortKey,
      dir: params.dir,
      ...skipTake(params),
    }),
    listCollectionsBrief(),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} total`}
        actions={
          <span className="flex items-center gap-2">
            <Button size="sm" variant="outline" nativeButton={false} render={<a href="/api/admin/export/products" download aria-label="Export CSV" />}>
              <Download className="size-4" />
              <span className="hidden md:inline">Export CSV</span>
            </Button>
            <ImportProductsButton />
            <Button size="sm" nativeButton={false} render={<Link href="/admin/products/new" />}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add product</span>
              <span className="sr-only sm:hidden">Add product</span>
            </Button>
          </span>
        }
      />
      <div className="space-y-4 p-6">
        <DataTableToolbar
          searchPlaceholder="Search title, handle, vendor or SKU…"
          filters={[
            { key: "status", label: "Status", options: [{ value: "ACTIVE", label: "Active" }, { value: "DRAFT", label: "Draft" }, { value: "ARCHIVED", label: "Archived" }] },
            { key: "collection", label: "Collection", options: collections.map((c) => ({ value: c.handle, label: c.title })) },
          ]}
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/products/${r.id}`}
          params={params}
          total={total}
          emptyMessage="No products match."
        />
      </div>
    </>
  );
}
