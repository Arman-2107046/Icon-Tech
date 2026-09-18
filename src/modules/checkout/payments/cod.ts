import type { PaymentProvider } from "./provider";

/**
 * Cash on delivery. No gateway: the order is placed unpaid and marked paid
 * by staff when the courier settles. Refunds are recorded for bookkeeping;
 * cash goes back to the customer offline.
 */
export const codProvider: PaymentProvider = {
  id: "COD",
  label: "Cash on delivery",
  async initiate() {
    return { kind: "none" };
  },
  async verify() {
    return { paid: false };
  },
  async refund() {
    return { ok: true };
  },
  async handleWebhook() {
    return { status: 404, body: "No webhooks for cash on delivery" };
  },
};
