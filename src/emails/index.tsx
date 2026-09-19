import type { ReactElement } from "react";
import { OrderConfirmationEmail, PaymentReceivedEmail, RefundedEmail, ShippedEmail, type OrderEmailPayload } from "./order-emails";

/** Map a queued job's kind + payload to a React Email element. */
export function renderEmail(kind: string, payload: unknown, ctx: { storeName: string }): ReactElement | null {
  const p = payload as OrderEmailPayload;
  switch (kind) {
    case "order_confirmation":
      return <OrderConfirmationEmail p={p} storeName={ctx.storeName} />;
    case "payment_received":
      return <PaymentReceivedEmail p={p} storeName={ctx.storeName} />;
    case "shipped":
      return <ShippedEmail p={p} storeName={ctx.storeName} />;
    case "refunded":
      return <RefundedEmail p={p} storeName={ctx.storeName} />;
    default:
      return null;
  }
}

export type { OrderEmailPayload };
