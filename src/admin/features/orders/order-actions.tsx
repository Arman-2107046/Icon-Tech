"use client";

import { Banknote, CheckCircle2, Printer, RotateCcw, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { DrawerForm, TextField, TextareaField } from "@/src/admin/components/form";
import { Button } from "@/src/admin/components/ui/button";
import { Input } from "@/src/admin/components/ui/input";
import { Label } from "@/src/admin/components/ui/label";
import { formatMoney, money } from "@/src/lib/money";
import { cancelOrder, completeOrder, fulfilOrder, markOrderPaid, refundOrder } from "@/src/modules/orders/actions";
import type { ActionResult } from "@/src/lib/action-result";

type Line = { id: string; title: string; variantTitle: string; quantity: number; remaining: number };

export function OrderActionBar({
  orderId,
  status,
  financialStatus,
  lines,
  refundable,
}: {
  orderId: string;
  status: string;
  financialStatus: string;
  lines: Line[];
  refundable: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = useCallback(() => router.refresh(), [router]);
  const run = (fn: () => Promise<ActionResult<null>>) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) window.alert(result.error);
      router.refresh();
    });
  const closed = status === "CANCELLED" || status === "REFUNDED";
  const shippable = lines.some((l) => l.remaining > 0) && !closed;

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="order-actions">
      {financialStatus === "UNPAID" && !closed ? (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => markOrderPaid(orderId))}>
          <Banknote className="size-4" />
          Mark as paid
        </Button>
      ) : null}

      {shippable ? (
        <DrawerForm trigger={<Button size="sm"><Truck className="size-4" />Fulfil items</Button>} title="Fulfil items" description="Choose how many units of each line are in this shipment." action={fulfilOrder.bind(null, orderId)} submitLabel="Create shipment">
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.variantTitle} · {l.remaining} of {l.quantity} to ship
                  </p>
                </div>
                <Label htmlFor={`qty-${l.id}`} className="sr-only">
                  Quantity for {l.title}
                </Label>
                <Input id={`qty-${l.id}`} name={`qty:${l.id}`} type="number" min={0} max={l.remaining} defaultValue={l.remaining} className="w-20" disabled={l.remaining === 0} />
              </div>
            ))}
          </div>
          <TextField name="carrier" label="Carrier" placeholder="e.g. Pathao Courier" />
          <TextField name="trackingNumber" label="Tracking number" placeholder="Optional" />
          <TextField name="trackingUrl" label="Tracking URL" placeholder="Optional" />
        </DrawerForm>
      ) : null}

      {status === "FULFILLED" ? (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => completeOrder(orderId))}>
          <CheckCircle2 className="size-4" />
          Mark completed
        </Button>
      ) : null}

      {refundable > 0 && !["UNPAID", "VOIDED"].includes(financialStatus) ? (
        <DrawerForm trigger={<Button size="sm" variant="outline"><RotateCcw className="size-4" />Refund</Button>} title="Refund" description={`Up to ${formatMoney(money(refundable))} can be refunded. Cash-on-delivery refunds are returned to the customer offline; this records it.`} action={refundOrder.bind(null, orderId)} submitLabel="Record refund" onSuccess={refresh}>
          <TextField name="amount" label="Amount (BDT)" inputMode="decimal" defaultValue={(refundable / 100).toFixed(2)} />
          <TextareaField name="reason" label="Reason" rows={3} placeholder="Damaged in transit, customer changed mind…" />
        </DrawerForm>
      ) : null}

      {!closed && status !== "COMPLETED" ? (
        <DrawerForm trigger={<Button size="sm" variant="ghost" className="text-destructive"><XCircle className="size-4" />Cancel order</Button>} title="Cancel order" description="Unshipped units return to stock. This cannot be undone." action={cancelOrder.bind(null, orderId)} submitLabel="Cancel order">
          <TextareaField name="reason" label="Reason (internal)" rows={3} />
        </DrawerForm>
      ) : null}

      <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/admin/orders/${orderId}/invoice`} target="_blank" />}>
        <Printer className="size-4" />
        Invoice
      </Button>
    </div>
  );
}
