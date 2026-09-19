import Link from "next/link";
import { PageHeader } from "@/src/admin/components/page-header";
import { Badge } from "@/src/admin/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { RevenueChart } from "@/src/admin/features/dashboard/revenue-chart";
import { requireAdmin } from "@/src/lib/auth/guards";
import { formatMoney, money } from "@/src/lib/money";
import { LOW_STOCK_THRESHOLD, lowStockCount, lowStockVariants } from "@/src/modules/catalog";
import { getDashboardMetrics } from "@/src/modules/orders";

export default async function AdminHomePage() {
  await requireAdmin();
  const [m, lowCount, low] = await Promise.all([getDashboardMetrics(30), lowStockCount(), lowStockVariants(8)]);

  return (
    <>
      <PageHeader title="Dashboard" description="Last 30 days. Cancelled and refunded orders are excluded." />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" data-testid="dashboard-stats">
          <Stat label="Revenue" value={formatMoney(money(m.revenue))} />
          <Stat label="Orders" value={String(m.orders)} />
          <Stat label="Average order" value={formatMoney(money(m.averageOrder))} />
          <Stat label="Awaiting action" value={String(m.awaiting.unpaid + m.awaiting.unfulfilled)} hint={`${m.awaiting.unpaid} unpaid · ${m.awaiting.unfulfilled} to ship`} href="/admin/orders?fulfillment=UNFULFILLED" />
          <Stat label="Low stock" value={String(lowCount)} hint={`${LOW_STOCK_THRESHOLD} or fewer left`} href="/admin/products" tone={lowCount ? "warn" : undefined} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Per day, order totals including shipping and tax.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart series={m.series} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top products</CardTitle>
              <CardDescription>By units sold.</CardDescription>
            </CardHeader>
            <CardContent>
              {m.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales in this period yet.</p>
              ) : (
                <ol className="divide-y text-sm" data-testid="top-products">
                  {m.topProducts.map((p, i) => (
                    <li key={`${p.productId}-${p.title}`} className="flex items-center gap-3 py-2">
                      <span className="w-5 text-muted-foreground tabular-nums">{i + 1}.</span>
                      {p.productId ? (
                        <Link href={`/admin/products/${p.productId}`} className="flex-1 truncate font-medium underline-offset-4 hover:underline">
                          {p.title}
                        </Link>
                      ) : (
                        <span className="flex-1 truncate font-medium">{p.title}</span>
                      )}
                      <span className="text-muted-foreground tabular-nums">{p.quantity} sold</span>
                      <span className="w-28 text-right tabular-nums">{formatMoney(money(p.revenue))}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low stock</CardTitle>
              <CardDescription>Active products with {LOW_STOCK_THRESHOLD} or fewer units available.</CardDescription>
            </CardHeader>
            <CardContent>
              {low.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everything is comfortably in stock.</p>
              ) : (
                <ul className="divide-y text-sm" data-testid="low-stock">
                  {low.map((v) => (
                    <li key={v.variantId} className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <Link href={`/admin/products/${v.productId}`} className="block truncate font-medium underline-offset-4 hover:underline">
                          {v.product}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          {v.variant !== "Default" ? `${v.variant} · ` : ""}
                          {v.sku}
                        </span>
                      </span>
                      <Badge variant={v.available <= 0 ? "destructive" : "secondary"}>{v.available <= 0 ? "Sold out" : `${v.available} left`}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint, href, tone }: { label: string; value: string; hint?: string; href?: string; tone?: "warn" }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 min-w-0 break-words text-xl font-semibold tabular-nums xl:text-2xl ${tone === "warn" ? "text-destructive" : ""}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const cls = "block min-w-0 rounded-lg border bg-card p-4";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:bg-muted/50`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
