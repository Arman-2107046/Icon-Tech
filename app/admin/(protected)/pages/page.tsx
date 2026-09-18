import Link from "next/link";
import { Plus } from "lucide-react";
import { DataTable, DataTableToolbar, type Column } from "@/src/admin/components/data-table";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { Button } from "@/src/admin/components/ui/button";
import { formatDate } from "@/src/admin/lib/format";
import { parseTableParams, skipTake } from "@/src/admin/lib/table-params";
import { requireAdmin } from "@/src/lib/auth/guards";
import { listPagesForAdmin, type AdminPageRow } from "@/src/modules/content";

const SORTABLE = ["title", "updatedAt"] as const;

const columns: Column<AdminPageRow>[] = [
  {
    key: "title",
    header: "Page",
    sortKey: "title",
    cell: (r) => (
      <span className="grid">
        <span className="font-medium">{r.title}</span>
        <span className="text-xs text-muted-foreground">/pages/{r.handle}</span>
      </span>
    ),
  },
  { key: "status", header: "Status", cell: (r) => (r.publishedAt ? <Badge variant="secondary">Published</Badge> : <Badge variant="outline">Draft</Badge>) },
  { key: "updated", header: "Updated", sortKey: "updatedAt", cell: (r) => formatDate(r.updatedAt) },
];

export default async function PagesPage({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdmin();
  const params = parseTableParams(await searchParams, { defaultSort: "updatedAt", sortable: SORTABLE });
  const { rows, total } = await listPagesForAdmin({ q: params.q, sort: (params.sort ?? "updatedAt") as "title" | "updatedAt", dir: params.dir, ...skipTake(params) });

  return (
    <>
      <PageHeader
        title="Pages"
        description={`${total} total`}
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/admin/pages/new" />}>
            <Plus className="size-4" />
            Add page
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <DataTableToolbar searchPlaceholder="Search title or handle…" />
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/pages/${r.id}`} params={params} total={total} emptyMessage="No pages match." />
      </div>
    </>
  );
}
