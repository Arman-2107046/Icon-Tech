import type { ReactNode } from "react";
import { Button } from "@/src/storefront/components/ui";
import { cx } from "@/src/storefront/lib/cx";

/**
 * One empty/error state for the whole storefront: illustration, a short
 * heading, one line of help, and a primary (optionally secondary) action.
 * Illustrations are inline SVG drawn with the ink/brand tokens so they
 * follow the theme and never ship as images.
 */
export type Illustration = "bag" | "search" | "box" | "pin" | "compass" | "spark";

export function EmptyState({
  art,
  title,
  body,
  action,
  secondary,
  compact = false,
  className,
  children,
  testId,
}: {
  art: Illustration;
  title: string;
  body?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href: string };
  compact?: boolean;
  className?: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center text-center", compact ? "px-s3 py-s6" : "px-s3 py-s10", className)} data-testid={testId}>
      <Art kind={art} className={compact ? "size-28" : "size-40"} />
      <p className={cx("display mt-s4", compact ? "display-md" : "display-xl")}>{title}</p>
      {body ? <p className={cx("body mt-s1 max-w-sm text-ink-muted", compact && "body-sm")}>{body}</p> : null}
      {children}
      {action || secondary ? (
        <div className="mt-s4 flex flex-wrap justify-center gap-s2">
          {action ? (
            action.href ? (
              <Button href={action.href} onClick={action.onClick} variant={compact ? "secondary" : "primary"}>
                {action.label}
              </Button>
            ) : (
              <Button type="button" onClick={action.onClick} variant={compact ? "secondary" : "primary"}>
                {action.label}
              </Button>
            )
          ) : null}
          {secondary ? (
            <Button href={secondary.href} variant="ghost">
              {secondary.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

export function Art({ kind, className }: { kind: Illustration; className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={cx("text-ink", className)} aria-hidden>
      {/* Soft backdrop disc + a brand accent that ties the set together. */}
      <circle cx="80" cy="84" r="60" className="fill-neutral-100" />
      {ART[kind]}
    </svg>
  );
}

const ART: Record<Illustration, ReactNode> = {
  bag: (
    <>
      <path d="M46 62h68l-7 62H53l-7-62z" className="fill-surface" {...stroke} />
      <path d="M62 62V50a18 18 0 0 1 36 0v12" {...stroke} />
      <path d="M66 94c3 6 8 9 14 9s11-3 14-9" {...stroke} />
      <circle cx="68" cy="82" r="2.5" className="fill-ink" />
      <circle cx="92" cy="82" r="2.5" className="fill-ink" />
      <path d="M120 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
      <path d="M36 44l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" className="fill-brand" />
    </>
  ),
  search: (
    <>
      <circle cx="72" cy="76" r="28" className="fill-surface" {...stroke} />
      <path d="M92 96l26 26" {...stroke} strokeWidth={4} />
      <path d="M58 76a14 14 0 0 1 14-14" {...stroke} className="text-ink-subtle" />
      <path d="M126 44l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
      <path d="M40 116l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" className="fill-brand" />
    </>
  ),
  box: (
    <>
      <path d="M40 66l40-18 40 18v46l-40 18-40-18V66z" className="fill-surface" {...stroke} />
      <path d="M40 66l40 18 40-18M80 84v46" {...stroke} />
      <path d="M60 57l40 18" {...stroke} className="text-ink-subtle" />
      <path d="M124 42l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
    </>
  ),
  pin: (
    <>
      <path d="M80 130s-32-30-32-56a32 32 0 0 1 64 0c0 26-32 56-32 56z" className="fill-surface" {...stroke} />
      <circle cx="80" cy="74" r="11" {...stroke} />
      <path d="M52 132c8 4 48 4 56 0" {...stroke} className="text-ink-subtle" />
      <path d="M126 46l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
    </>
  ),
  compass: (
    <>
      <circle cx="80" cy="84" r="34" className="fill-surface" {...stroke} />
      <path d="M96 68L86 90l-22 10 10-22 22-10z" className="fill-brand" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      <circle cx="80" cy="84" r="3" className="fill-ink" />
      <path d="M80 44v6M80 118v6M40 84h6M114 84h6" {...stroke} className="text-ink-subtle" />
    </>
  ),
  spark: (
    <>
      <path d="M62 48h36l-10 30h22l-42 46 10-34H58l4-42z" className="fill-surface" {...stroke} />
      <path d="M124 44l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
      <path d="M36 110l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" className="fill-brand" />
    </>
  ),
};
