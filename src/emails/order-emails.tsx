import { Heading, Link, Text, EmailLayout, OrderLines, emailStyles } from "./layout";

/** Serialised order data placed in the job payload by queueOrderEmail. */
export type OrderEmailPayload = {
  orderId: string;
  number: number;
  firstName: string;
  email: string;
  currency: string;
  items: { title: string; variantTitle: string; quantity: number; lineTotal: string }[];
  subtotal: string;
  discount: string | null;
  shipping: string;
  tax: string;
  total: string;
  shippingMethod: string;
  paymentMethod: string;
  address: string;
  orderUrl: string;
  /** shipped */
  carrier?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  /** refunded */
  refundAmount?: string;
  refundReason?: string;
};

type Ctx = { storeName: string };

export function OrderConfirmationEmail({ p, storeName }: { p: OrderEmailPayload } & Ctx) {
  return (
    <EmailLayout preview={`Order #${p.number} confirmed`} storeName={storeName}>
      <Heading style={emailStyles.h1}>Thanks, {p.firstName}. Order #{p.number} is confirmed.</Heading>
      <Text style={emailStyles.text}>We are packing it now. Delivery: {p.shippingMethod}. Payment: {p.paymentMethod}.</Text>
      <Text style={emailStyles.muted}>Delivering to: {p.address}</Text>
      <OrderLines items={p.items} currency={p.currency} subtotal={p.subtotal} shipping={p.shipping} tax={p.tax} total={p.total} discount={p.discount} />
      <Text style={{ ...emailStyles.text, marginTop: 24 }}>
        <Link href={p.orderUrl} style={emailStyles.button}>
          View your order
        </Link>
      </Text>
    </EmailLayout>
  );
}

export function PaymentReceivedEmail({ p, storeName }: { p: OrderEmailPayload } & Ctx) {
  return (
    <EmailLayout preview={`Payment received for order #${p.number}`} storeName={storeName}>
      <Heading style={emailStyles.h1}>Payment received for order #{p.number}</Heading>
      <Text style={emailStyles.text}>We have recorded your payment of {p.total} {p.currency}. Thank you, {p.firstName}.</Text>
      <Text style={emailStyles.text}>
        <Link href={p.orderUrl} style={emailStyles.button}>
          View your order
        </Link>
      </Text>
    </EmailLayout>
  );
}

export function ShippedEmail({ p, storeName }: { p: OrderEmailPayload } & Ctx) {
  return (
    <EmailLayout preview={`Order #${p.number} is on its way`} storeName={storeName}>
      <Heading style={emailStyles.h1}>Order #{p.number} is on its way</Heading>
      <Text style={emailStyles.text}>
        {p.carrier ? `Handed to ${p.carrier}.` : "Handed to the courier."}
        {p.trackingNumber ? (
          <>
            {" "}
            Tracking number: {p.trackingUrl ? <Link href={p.trackingUrl}>{p.trackingNumber}</Link> : p.trackingNumber}.
          </>
        ) : null}
      </Text>
      <Text style={emailStyles.muted}>Delivering to: {p.address}</Text>
      <Text style={emailStyles.text}>
        <Link href={p.orderUrl} style={emailStyles.button}>
          Track your order
        </Link>
      </Text>
    </EmailLayout>
  );
}

export function RefundedEmail({ p, storeName }: { p: OrderEmailPayload } & Ctx) {
  return (
    <EmailLayout preview={`Refund for order #${p.number}`} storeName={storeName}>
      <Heading style={emailStyles.h1}>We have refunded {p.refundAmount} on order #{p.number}</Heading>
      <Text style={emailStyles.text}>Reason: {p.refundReason}. For cash-on-delivery orders the refund is returned in cash; otherwise it appears on your statement within a few days.</Text>
      <Text style={emailStyles.text}>
        <Link href={p.orderUrl} style={emailStyles.button}>
          View your order
        </Link>
      </Text>
    </EmailLayout>
  );
}

export function MagicLinkEmail({ link, storeName }: { link: string; storeName: string }) {
  return (
    <EmailLayout preview="Your sign-in link" storeName={storeName}>
      <Heading style={emailStyles.h1}>Sign in to {storeName}</Heading>
      <Text style={emailStyles.text}>Click the button to sign in. The link works once and expires in 15 minutes.</Text>
      <Text style={emailStyles.text}>
        <Link href={link} style={emailStyles.button}>
          Sign in
        </Link>
      </Text>
      <Text style={emailStyles.muted}>If you did not request this, you can ignore this email.</Text>
    </EmailLayout>
  );
}
