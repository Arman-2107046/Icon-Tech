import type { Prisma } from "@/src/generated/prisma/client";
import { DataTable, DataTableToolbar, type Column } from "@/src/admin/components/data-table";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { parseTableParams, skipTake } from "@/src/admin/lib/table-params";
import { requireAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";

type Row = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  acceptsMarketing: boolean;
  createdAt: Date;
  _count: { orders: number };
};

const SORTABLE = ["createdAt", "email", "lastName"] as const;

const columns: Column<Row>[] = [
  { key: "name", header: "Customer", sortKey: "lastName", cell: (r) => <span className="font-medium">{r.firstName} {r.lastName}</span> },
  { key: "email", header: "Email", sortKey: "email", cell: (r) => r.email },
  { key: "orders", header: "Orders", className: "tabular-nums", cell: (r) => r._count.orders },
  { key: "marketing", header: "Marketing", cell: (r) => (r.acceptsMarketing ? <Badge variant="secondary">Subscribed</Badge> : <span className="text-muted-foreground">—</span>) },
  { key: "created", header: "Joined", sortKey: "createdAt", cell: (r) => r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
];

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const params = parseTableParams(await searchParams, {
    defaultSort: "createdAt",
    sortable: SORTABLE,
    filterKeys: ["marketing"],
  });

  const where: Prisma.CustomerWhereInput = {
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q, mode: "insensitive" } },
            { firstName: { contains: params.q, mode: "insensitive" } },
            { lastName: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.filters.marketing ? { acceptsMarketing: params.filters.marketing === "yes" } : {}),
  };

  const [rows, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { [params.sort ?? "createdAt"]: params.dir },
      ...skipTake(params),
      select: { id: true, email: true, firstName: true, lastName: true, acceptsMarketing: true, createdAt: true, _count: { select: { orders: true } } },
    }),
    db.customer.count({ where }),
  ]);

  return (
    <>
      <PageHeader title="Customers" description={`${total} total`} />
      <div className="space-y-4 p-6">
        <DataTableToolbar
          searchPlaceholder="Search name or email…"
          filters={[{ key: "marketing", label: "Marketing", options: [{ value: "yes", label: "Subscribed" }, { value: "no", label: "Not subscribed" }] }]}
        />
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} params={params} total={total} emptyMessage="No customers match." />
      </div>
    </>
  );
}
