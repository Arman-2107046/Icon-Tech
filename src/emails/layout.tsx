import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { palette } from "@/src/lib/inline-palette";

/**
 * Base layout for transactional emails. Inline-safe styles only: email
 * clients ignore stylesheets, so colours come from inline-palette.ts.
 */
export const emailStyles = {
  body: { backgroundColor: palette.canvas, fontFamily: "Helvetica, Arial, sans-serif", color: palette.ink, margin: 0, padding: "24px 0" },
  container: { backgroundColor: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 12, padding: "32px", maxWidth: 560 },
  brand: { fontSize: 20, fontWeight: 700, margin: "0 0 24px" },
  h1: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 12px" },
  text: { fontSize: 15, lineHeight: 1.6, margin: "0 0 12px" },
  muted: { fontSize: 13, lineHeight: 1.6, color: palette.inkMuted, margin: "0 0 8px" },
  hr: { borderColor: palette.line, margin: "24px 0" },
  row: { fontSize: 14, lineHeight: 1.5, margin: 0 },
  total: { fontSize: 16, fontWeight: 700, margin: "8px 0 0" },
  button: { backgroundColor: palette.ink, color: palette.canvas, borderRadius: 999, padding: "12px 20px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" },
} as const;

export function EmailLayout({ preview, storeName, children }: { preview: string; storeName: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Text style={emailStyles.brand}>{storeName}</Text>
          {children}
          <Hr style={emailStyles.hr} />
          <Text style={emailStyles.muted}>You are receiving this because you placed an order with {storeName}.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function OrderLines({ items, currency, subtotal, shipping, tax, total, discount }: { items: { title: string; variantTitle: string; quantity: number; lineTotal: string }[]; currency: string; subtotal: string; shipping: string; tax: string; total: string; discount?: string | null }) {
  return (
    <Section>
      {items.map((item, i) => (
        <Text key={i} style={emailStyles.row}>
          {item.quantity} × {item.title}
          {item.variantTitle && item.variantTitle !== "Default" ? ` (${item.variantTitle})` : ""} — {item.lineTotal}
        </Text>
      ))}
      <Hr style={emailStyles.hr} />
      <Text style={emailStyles.row}>Subtotal: {subtotal}</Text>
      {discount ? <Text style={emailStyles.row}>Discount: −{discount}</Text> : null}
      <Text style={emailStyles.row}>Shipping: {shipping}</Text>
      <Text style={emailStyles.row}>Tax: {tax}</Text>
      <Text style={emailStyles.total}>
        Total: {total} {currency}
      </Text>
    </Section>
  );
}

export { Heading, Link, Section, Text };
