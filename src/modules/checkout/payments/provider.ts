// Payment provider contract. Cash on delivery is the only implementation
// for now; gateways plug in here without touching checkout or orders.

export type PaymentProviderId = "COD";

export type InitiateResult =
  /** Nothing more to do; the order is placed and awaits payment offline. */
  | { kind: "none" }
  /** Send the customer to the gateway. */
  | { kind: "redirect"; url: string }
  /** Render a client-side payment element with this secret. */
  | { kind: "client"; clientSecret: string };

export type VerifyResult = { paid: boolean; providerTxnId?: string; raw?: unknown };

export type RefundResult = { ok: true; providerTxnId?: string; raw?: unknown } | { ok: false; error: string };

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly label: string;
  /** Start payment for an order. Called inside order creation, after the order row exists. */
  initiate(order: { id: string; number: number; total: number; currency: string; email: string }): Promise<InitiateResult>;
  /** Confirm a payment's state with the provider (returns, IPNs). */
  verify(order: { id: string }, params: Record<string, string>): Promise<VerifyResult>;
  /** Refund part or all of a captured payment. */
  refund(payment: { id: string; providerTxnId: string | null; amount: number; currency: string }, amount: number, reason: string): Promise<RefundResult>;
  /** Handle an inbound webhook. Must be idempotent. */
  handleWebhook(request: Request): Promise<{ status: number; body?: string }>;
}
