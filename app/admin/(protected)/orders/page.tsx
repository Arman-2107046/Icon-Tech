import { DataTable, DataTableToolbar, type Column } from "@/src/admin/components/data-table";
import { FinancialBadge, FulfillmentBadge, OrderStatusBadge } from "@/src/admin/components/order-badges";
import { Download } from "lucide-react";
import { PageHeader } from "@/src/admin/components/page-header";
import { Button } from "@/src/admin/components/ui/button";
import { formatDateTime } from "@/src/admin/lib/format";
import { parseTableParams, skipTake } from "@/src/admin/lib/table-params";
import { requireAdmin } from "@/src/lib/auth/guards";
import { formatMoney, money } from "@/src/lib/money";
import { listOrdersForAdmin, type AdminOrderRow } from "@/src/modules/orders";

const SORTABLE = ["placedAt", "total", "number"] as const;
const STATUSES = ["PENDING", "PAID", "FULFILLED", "COMPLETED", "CANCELLED", "REFUNDED"] as const;
const FINANCIAL = ["UNPAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED"] as const;
const FULFILLMENT = ["UNFULFILLED", "PARTIALLY_FULFILLED", "FULFILLED"] as const;
const pick = <T extends string>(list: readonly T[], v: string | undefined): T | undefined => (list as readonly string[]).includes(v ?? "") ? (v as T) : undefined;
const opt = (v: string) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") });

const columns: Column<AdminOrderRow>[] = [
  { key: "number", header: "Order", sortKey: "number", cell: (r) => <span className="font-medium tabular-nums">#{r.number}</span> },
  { key: "placed", header: "Placed", sortKey: "placedAt", cell: (r) => formatDateTime(r.placedAt) },
  { key: "customer", header: "Customer", cell: (r) => (
      <span className="grid">
        <span>{r.customerName}</span>
        <span className="text-xs text-muted-foreground">{r.email}</span>
      </span>
    ) },
  { key: "status", header: "Status", cell: (r) => <OrderStatusBadge status={r.status} /> },
  { key: "payment", header: "Payment", cell: (r) => <FinancialBadge status={r.financialStatus} /> },
  { key: "fulfillment", header: "Fulfillment", cell: (r) => <FulfillmentBadge status={r.fulfillmentStatus} /> },
  { key: "items", header: "Items", className: "tabular-nums", cell: (r) => r._count.items },
  { key: "total", header: "Total", sortKey: "total", className: "text-right tabular-nums", headerClassName: "text-right", cell: (r) => formatMoney(money(r.total)) },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const params = parseTableParams(await searchParams, { defaultSort: "placedAt", sortable: SORTABLE, filterKeys: ["status", "financial", "fulfillment"] });
  const { rows, total } = await listOrdersForAdmin({
    q: params.q,
    status: pick(STATUSES, params.filters.status),
    financial: pick(FINANCIAL, params.filters.financial),
    fulfillment: pick(FULFILLMENT, params.filters.fulfillment),
    sort: (params.sort ?? "placedAt") as "placedAt" | "total" | "number",
    dir: params.dir,
    ...skipTake(params),
  });
  return (
    <>
      <PageHeader
        title="Orders"
        description={`${total} total`}
        actions={
          <Button size="sm" variant="outline" nativeButton={false} render={<a href="/api/admin/export/orders" download aria-label="Export CSV" />}>
            <Download className="size-4" />
            <span className="hidden md:inline">Export CSV</span>
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <DataTableToolbar
          searchPlaceholder="Search #number, name or email…"
          filters={[
            { key: "status", label: "Status", options: STATUSES.map(opt) },
            { key: "financial", label: "Payment", options: FINANCIAL.map(opt) },
            { key: "fulfillment", label: "Fulfillment", options: FULFILLMENT.map(opt) },
          ]}
        />
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/orders/${r.id}`} params={params} total={total} emptyMessage="No orders match." />
      </div>
    </>
  );
}
