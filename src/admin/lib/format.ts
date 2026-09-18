import { formatMoney, money, type Currency } from "@/src/lib/money";

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "৳1,299.00" or "৳950.00 – ৳1,600.00". */
export function formatPriceRange(min: number, max: number, currency?: Currency): string {
  if (min === max) return formatMoney(money(min, currency));
  return `${formatMoney(money(min, currency))} – ${formatMoney(money(max, currency))}`;
}
