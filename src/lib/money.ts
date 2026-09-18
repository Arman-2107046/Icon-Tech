import { env } from "@/src/lib/env";

/**
 * Money is always an integer amount of minor units (poisha, cents) tagged
 * with its currency. Never a float, never a bare number. All arithmetic goes
 * through the helpers below, which refuse to mix currencies.
 */

export const CURRENCIES = ["BDT", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Money = Readonly<{
  amount: number;
  currency: Currency;
}>;

/** The store's configured currency. USD is opt-in via STORE_CURRENCY. */
export const STORE_CURRENCY: Currency = env.STORE_CURRENCY;

const MINOR_UNITS: Record<Currency, number> = {
  BDT: 100,
  USD: 100,
};

const LOCALE: Record<Currency, string> = {
  BDT: "en-BD",
  USD: "en-US",
};

function assertInteger(amount: number): void {
  if (!Number.isSafeInteger(amount)) {
    throw new TypeError(`Money amount must be a safe integer, got ${amount}`);
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(
      `Cannot combine ${a.currency} with ${b.currency}`,
    );
  }
}

export function money(amount: number, currency: Currency = STORE_CURRENCY): Money {
  assertInteger(amount);
  return { amount, currency };
}

export function zero(currency: Currency = STORE_CURRENCY): Money {
  return money(0, currency);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

/** Multiply by an integer quantity. */
export function multiply(m: Money, quantity: number): Money {
  assertInteger(quantity);
  return money(m.amount * quantity, m.currency);
}

/**
 * Apply a percentage expressed in basis points (10000 = 100%), rounding
 * half away from zero so discounts and tax never gain a unit from banker's
 * rounding.
 */
export function percentage(m: Money, basisPoints: number): Money {
  assertInteger(basisPoints);
  const raw = (m.amount * basisPoints) / 10000;
  const rounded = Math.sign(raw) * Math.round(Math.abs(raw));
  return money(rounded, m.currency);
}

export function sum(items: readonly Money[], currency: Currency = STORE_CURRENCY): Money {
  return items.reduce<Money>((acc, m) => add(acc, m), zero(currency));
}

export function isZero(m: Money): boolean {
  return m.amount === 0;
}

export function isNegative(m: Money): boolean {
  return m.amount < 0;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amount < b.amount) return -1;
  if (a.amount > b.amount) return 1;
  return 0;
}

export function max(a: Money, b: Money): Money {
  return compare(a, b) >= 0 ? a : b;
}

/** Clamp at zero: totals never go negative after discounts. */
export function nonNegative(m: Money): Money {
  return m.amount < 0 ? zero(m.currency) : m;
}

/** Convert to a decimal number of major units. Display only — never store. */
export function toMajorUnits(m: Money): number {
  return m.amount / MINOR_UNITS[m.currency];
}

/** Parse a user-entered decimal string ("1,299.50") into Money. */
export function fromMajorUnits(input: string | number, currency: Currency = STORE_CURRENCY): Money {
  const text = String(input).replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new TypeError(`Invalid money input: ${String(input)}`);
  }
  const value = Number(text) * MINOR_UNITS[currency];
  return money(Math.round(value), currency);
}

/** Format for display, e.g. "৳1,299.00" or "$12.50". */
export function formatMoney(m: Money, options: { symbol?: boolean } = {}): string {
  const { symbol = true } = options;
  const formatter = new Intl.NumberFormat(LOCALE[m.currency], {
    style: symbol ? "currency" : "decimal",
    currency: m.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(toMajorUnits(m));
}
