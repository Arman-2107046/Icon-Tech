import { notFound } from "next/navigation";
import { requireAdmin } from "@/src/lib/auth/guards";
import { formatMoney, money } from "@/src/lib/money";
import { getCachedSiteSettings } from "@/src/modules/content";
import { getOrderForAdmin } from "@/src/modules/orders";
import { PrintButton } from "./print-button";

type Address = { firstName: string; lastName: string; company?: string | null; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; country: string; phone: string | null };

/** Printable A4 invoice. Uses only print-safe styling; see the @media print block below. */
export default async function InvoicePage({ params }: PageProps<"/admin/orders/[id]/invoice">) {
  await requireAdmin();
  const { id } = await params;
  const [order, settings] = await Promise.all([getOrderForAdmin(id), getCachedSiteSettings()]);
  if (!order) notFound();
  const ship = order.shippingAddress as Address;
  const bill = order.billingAddress as Address;
  const date = order.placedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-[800px] bg-background p-8 text-foreground print:p-0" data-testid="invoice">
      <style>{`@media print { @page { size: A4; margin: 18mm; } .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b pb-6">
        <div>
          <p className="text-2xl font-semibold">{settings.store.name}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{settings.store.address}</p>
          <p className="text-sm text-muted-foreground">{[settings.store.email, settings.store.phone].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
          <p className="text-xl font-semibold tabular-nums">#{order.number}</p>
          <p className="mt-1 text-sm text-muted-foreground">{date}</p>
          <p className="text-sm text-muted-foreground">{order.financialStatus === "PAID" ? "Paid" : order.payments[0]?.provider === "COD" ? "Cash on delivery" : order.financialStatus.toLowerCase()}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-8 py-6 text-sm">
        <div>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Bill to</h2>
          <p className="mt-1">{bill.firstName} {bill.lastName}{bill.company ? `, ${bill.company}` : ""}<br />{bill.line1}{bill.line2 ? <><br />{bill.line2}</> : null}<br />{[bill.city, bill.region, bill.postalCode].filter(Boolean).join(", ")} · {bill.country}</p>
        </div>
        <div>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Ship to</h2>
          <p className="mt-1">{ship.firstName} {ship.lastName}<br />{ship.line1}{ship.line2 ? <><br />{ship.line2}</> : null}<br />{[ship.city, ship.region, ship.postalCode].filter(Boolean).join(", ")} · {ship.country}{ship.phone ? <><br />{ship.phone}</> : null}</p>
          <p className="mt-2 text-muted-foreground">{order.email}</p>
        </div>
      </section>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium">SKU</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Unit</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="py-2">{item.title}{item.variantTitle !== "Default" ? <span className="text-muted-foreground"> · {item.variantTitle}</span> : null}</td>
              <td className="py-2 font-mono text-xs">{item.sku ?? "—"}</td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(money(item.unitPrice))}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(money(item.lineTotal))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatMoney(money(order.subtotal))}</dd></div>
        {order.discountTotal ? <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="tabular-nums">−{formatMoney(money(order.discountTotal))}</dd></div> : null}
        <div className="flex justify-between"><dt className="text-muted-foreground">Shipping ({order.shippingMethod})</dt><dd className="tabular-nums">{formatMoney(money(order.shippingTotal))}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">VAT</dt><dd className="tabular-nums">{formatMoney(money(order.taxTotal))}</dd></div>
        <div className="flex justify-between border-t pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(money(order.total))}</dd></div>
      </dl>

      <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">Thank you for your order. Returns accepted within 14 days of delivery; see {settings.store.email || "our website"} for details.</footer>
    </div>
  );
}
