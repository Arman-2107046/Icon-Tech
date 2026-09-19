import Link from "next/link";
import { requireCustomer } from "@/src/lib/auth/guards";
import { formatMoney, money } from "@/src/lib/money";
import { listCustomerOrders } from "@/src/modules/customers";
import { BoxArt } from "@/src/storefront/components/art";
import { EmptyState } from "@/src/storefront/components/empty-state";
import { Badge } from "@/src/storefront/components/ui";

function statusLabel(o: { status: string; fulfillmentStatus: string }): { text: string; tone: "neutral" | "success" | "danger" } {
  if (o.status === "CANCELLED") return { text: "Cancelled", tone: "danger" };
  if (o.status === "REFUNDED") return { text: "Refunded", tone: "danger" };
  if (o.fulfillmentStatus === "FULFILLED") return { text: "Shipped", tone: "success" };
  if (o.fulfillmentStatus === "PARTIALLY_FULFILLED") return { text: "Partly shipped", tone: "neutral" };
  return { text: "Processing", tone: "neutral" };
}

export default async function AccountOrdersPage() {
  const session = await requireCustomer("/account");
  const orders = await listCustomerOrders(session.customer.id);
  return (
    <>
      <h1 className="display display-2xl">Your orders</h1>
      {orders.length === 0 ? (
        <div className="mt-s5 rounded-sf-lg border border-dashed border-line-strong">
          <EmptyState compact art={BoxArt} title="No orders yet" body="When you place an order it will show up here with its delivery status." action={{ label: "Start shopping", href: "/collections/new-arrivals" }} testId="orders-empty" />
        </div>
      ) : (
        <ul className="mt-s5 divide-y divide-line rounded-sf-lg border border-line bg-surface" data-testid="account-orders">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center gap-s2 px-s3 py-s3 hover:bg-neutral-100">
                <span className="w-24 font-medium tabular-nums">#{o.number}</span>
                <span className="w-32 text-t-sm text-ink-muted">{o.placedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="flex-1 text-t-sm text-ink-muted">
                  {o._count.items} item{o._count.items === 1 ? "" : "s"}
                </span>
                <Badge tone={statusLabel(o).tone}>{statusLabel(o).text}</Badge>
                <span className="w-28 text-right tabular-nums">{formatMoney(money(o.total))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
