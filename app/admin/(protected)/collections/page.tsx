import Link from "next/link";
import { Plus } from "lucide-react";
import { DataTable, DataTableToolbar, type Column } from "@/src/admin/components/data-table";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { Button } from "@/src/admin/components/ui/button";
import { formatDate } from "@/src/admin/lib/format";
import { parseTableParams, skipTake } from "@/src/admin/lib/table-params";
import { requireAdmin } from "@/src/lib/auth/guards";
import { listCollectionsForAdmin, type AdminCollectionRow } from "@/src/modules/catalog";

const SORTABLE = ["title", "updatedAt", "type"] as const;
type SortKey = (typeof SORTABLE)[number];

const columns: Column<AdminCollectionRow>[] = [
  {
    key: "title",
    header: "Collection",
    sortKey: "title",
    cell: (r) => (
      <span className="grid">
        <span className="font-medium">{r.title}</span>
        <span className="text-xs text-muted-foreground">/collections/{r.handle}</span>
      </span>
    ),
  },
  { key: "type", header: "Type", sortKey: "type", cell: (r) => <Badge variant="secondary">{r.type === "MANUAL" ? "Manual" : "Automatic"}</Badge> },
  { key: "products", header: "Products", className: "tabular-nums", cell: (r) => (r.type === "MANUAL" ? r._count.products : <span className="text-muted-foreground">by rule</span>) },
  { key: "updated", header: "Updated", sortKey: "updatedAt", cell: (r) => formatDate(r.updatedAt) },
];

export default async function CollectionsPage({ searchParams }: PageProps<"/admin/collections">) {
  await requireAdmin();
  const params = parseTableParams(await searchParams, { defaultSort: "title", defaultDir: "asc", sortable: SORTABLE, filterKeys: ["type"] });
  const type = params.filters.type === "MANUAL" || params.filters.type === "RULE" ? params.filters.type : undefined;
  const { rows, total } = await listCollectionsForAdmin({ q: params.q, type, sort: (params.sort ?? "title") as SortKey, dir: params.dir, ...skipTake(params) });

  return (
    <>
      <PageHeader
        title="Collections"
        description={`${total} total`}
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/admin/collections/new" />}>
            <Plus className="size-4" />
            Add collection
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <DataTableToolbar
          searchPlaceholder="Search title or handle…"
          filters={[{ key: "type", label: "Type", options: [{ value: "MANUAL", label: "Manual" }, { value: "RULE", label: "Automatic" }] }]}
        />
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/collections/${r.id}`} params={params} total={total} emptyMessage="No collections match." />
      </div>
    </>
  );
}
