import Link from "next/link";
import { notFound } from "next/navigation";
import { FinancialBadge, FulfillmentBadge, OrderStatusBadge } from "@/src/admin/components/order-badges";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/admin/components/ui/table";
import { CustomerNoteForm, MarketingToggle } from "@/src/admin/features/customers/customer-note";
import { formatDateTime } from "@/src/admin/lib/format";
import { requireAdmin } from "@/src/lib/auth/guards";
import { formatMoney, money } from "@/src/lib/money";
import { getCustomerForAdmin } from "@/src/modules/customers";

export default async function CustomerDetailPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const customer = await getCustomerForAdmin(id);
  if (!customer) notFound();
  const name = `${customer.firstName} ${customer.lastName}`.trim() || customer.email;

  return (
    <>
      <PageHeader
        title={name}
        description={`Customer since ${formatDateTime(customer.createdAt)}`}
        actions={
          <span className="flex items-center gap-2">
            {customer.acceptsMarketing ? <Badge variant="secondary">Marketing</Badge> : null}
            <MarketingToggle customerId={customer.id} accepts={customer.acceptsMarketing} />
          </span>
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3" data-testid="customer-stats">
          <Stat label="Orders" value={String(customer.stats.orders)} />
          <Stat label="Lifetime value" value={formatMoney(money(customer.stats.lifetime))} />
          <Stat label="Average order" value={formatMoney(money(customer.stats.average))} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Placed</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Fulfillment</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.orders.map((o) => (
                          <TableRow key={o.id} data-testid="customer-order">
                            <TableCell>
                              <Link href={`/admin/orders/${o.id}`} className="font-medium tabular-nums underline-offset-4 hover:underline">
                                #{o.number}
                              </Link>
                              <span className="ml-2 text-xs text-muted-foreground">{o._count.items} item{o._count.items === 1 ? "" : "s"}</span>
                            </TableCell>
                            <TableCell>{formatDateTime(o.placedAt)}</TableCell>
                            <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                            <TableCell><FinancialBadge status={o.financialStatus} /></TableCell>
                            <TableCell><FulfillmentBadge status={o.fulfillmentStatus} /></TableCell>
                            <TableCell className="text-right tabular-nums">{formatMoney(money(o.total))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved addresses.</p>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {customer.addresses.map((a) => (
                      <li key={a.id} className="rounded-md border p-3 text-sm" data-testid="customer-address">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">
                            {a.firstName} {a.lastName}
                          </span>
                          {a.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {a.company ? <>{a.company}<br /></> : null}
                          {a.line1}
                          {a.line2 ? <><br />{a.line2}</> : null}
                          <br />
                          {[a.city, a.region, a.postalCode].filter(Boolean).join(", ")} · {a.country}
                          {a.phone ? <><br />{a.phone}</> : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {customer.discountRedemptions.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>Discounts used</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {customer.discountRedemptions.map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span>
                          <span className="font-mono">{r.discount.code}</span>
                          <span className="text-muted-foreground"> on order #{r.order.number}</span>
                        </span>
                        <span className="tabular-nums">−{formatMoney(money(r.amount))}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <a href={`mailto:${customer.email}`} className="underline underline-offset-4">
                    {customer.email}
                  </a>
                </p>
                <p className="text-muted-foreground">{customer.phone ?? "No phone on file"}</p>
                <p className="text-muted-foreground">{customer.acceptsMarketing ? "Accepts marketing" : "Not subscribed to marketing"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerNoteForm customerId={customer.id} note={customer.note} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
