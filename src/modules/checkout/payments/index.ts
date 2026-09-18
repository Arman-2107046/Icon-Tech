import { codProvider } from "./cod";
import type { PaymentProvider, PaymentProviderId } from "./provider";

const providers: Record<PaymentProviderId, PaymentProvider> = { COD: codProvider };

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  return providers[id];
}

export function listPaymentProviders(): PaymentProvider[] {
  return Object.values(providers);
}

export type { InitiateResult, PaymentProvider, PaymentProviderId, RefundResult, VerifyResult } from "./provider";
