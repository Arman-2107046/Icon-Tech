import { cx as cn } from "@/src/storefront/lib/cx";
import type { ComponentProps } from "react";
import { formatMoney, money, type Currency } from "@/src/lib/money";

/**
 * Renders minor-unit amounts. With `compareAt` above `amount` it shows the
 * strike-through original and a sale tone. A range shows "from ৳X".
 */
export function Price({
  amount,
  compareAt,
  max,
  currency,
  size = "md",
  className,
  ...rest
}: {
  amount: number;
  compareAt?: number | null;
  /** Upper bound for a range; renders "from" when it differs from amount. */
  max?: number;
  currency?: Currency;
  size?: "sm" | "md" | "lg";
  className?: string;
} & Omit<ComponentProps<"span">, "className" | "children">) {
  const sizeClass = size === "sm" ? "text-t-sm" : size === "lg" ? "text-t-lg" : "text-t-base";
  const onSale = compareAt !== null && compareAt !== undefined && compareAt > amount;
  const isRange = max !== undefined && max > amount;
  return (
    <span className={cn("inline-flex items-baseline gap-s1 tabular-nums", sizeClass, className)} {...rest}>
      {isRange ? <span className="text-ink-muted">from</span> : null}
      <span className={cn("font-medium", onSale ? "text-danger" : "text-ink")}>{formatMoney(money(amount, currency))}</span>
      {onSale ? (
        <s className="text-ink-subtle" aria-label="Original price">
          {formatMoney(money(compareAt, currency))}
        </s>
      ) : null}
    </span>
  );
}
