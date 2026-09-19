import type { ReactNode } from "react";
import { cx } from "@/src/storefront/lib/cx";

/**
 * Empty-state illustrations, one component each so a client bundle only
 * carries the ones it renders. Drawn with ink/brand tokens: they follow the
 * theme and never ship as images.
 */
const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function Frame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 160 160" className={cx("text-ink", className)} aria-hidden>
      {/* Soft backdrop disc + a brand accent that ties the set together. */}
      <circle cx="80" cy="84" r="60" className="fill-neutral-100" />
      {children}
    </svg>
  );
}

export type ArtProps = { className?: string };

export function BagArt({ className }: ArtProps) {
  return (
    <Frame className={className}>

      <path d="M46 62h68l-7 62H53l-7-62z" className="fill-surface" {...stroke} />
      <path d="M62 62V50a18 18 0 0 1 36 0v12" {...stroke} />
      <path d="M66 94c3 6 8 9 14 9s11-3 14-9" {...stroke} />
      <circle cx="68" cy="82" r="2.5" className="fill-ink" />
      <circle cx="92" cy="82" r="2.5" className="fill-ink" />
      <path d="M120 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
      <path d="M36 44l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" className="fill-brand" />

    </Frame>
  );
}

export function SearchArt({ className }: ArtProps) {
  return (
    <Frame className={className}>

      <circle cx="72" cy="76" r="28" className="fill-surface" {...stroke} />
      <path d="M92 96l26 26" {...stroke} strokeWidth={4} />
      <path d="M58 76a14 14 0 0 1 14-14" {...stroke} className="text-ink-subtle" />
      <path d="M126 44l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
      <path d="M40 116l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" className="fill-brand" />

    </Frame>
  );
}

export function BoxArt({ className }: ArtProps) {
  return (
    <Frame className={className}>

      <path d="M40 66l40-18 40 18v46l-40 18-40-18V66z" className="fill-surface" {...stroke} />
      <path d="M40 66l40 18 40-18M80 84v46" {...stroke} />
      <path d="M60 57l40 18" {...stroke} className="text-ink-subtle" />
      <path d="M124 42l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />

    </Frame>
  );
}

export function PinArt({ className }: ArtProps) {
  return (
    <Frame className={className}>

      <path d="M80 130s-32-30-32-56a32 32 0 0 1 64 0c0 26-32 56-32 56z" className="fill-surface" {...stroke} />
      <circle cx="80" cy="74" r="11" {...stroke} />
      <path d="M52 132c8 4 48 4 56 0" {...stroke} className="text-ink-subtle" />
      <path d="M126 46l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />

    </Frame>
  );
}

export function CompassArt({ className }: ArtProps) {
  return (
    <Frame className={className}>

      <circle cx="80" cy="84" r="34" className="fill-surface" {...stroke} />
      <path d="M96 68L86 90l-22 10 10-22 22-10z" className="fill-brand" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      <circle cx="80" cy="84" r="3" className="fill-ink" />
      <path d="M80 44v6M80 118v6M40 84h6M114 84h6" {...stroke} className="text-ink-subtle" />

    </Frame>
  );
}

export function SparkArt({ className }: ArtProps) {
  return (
    <Frame className={className}>

      <path d="M62 48h36l-10 30h22l-42 46 10-34H58l4-42z" className="fill-surface" {...stroke} />
      <path d="M124 44l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" className="fill-brand" />
      <path d="M36 110l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4z" className="fill-brand" />

    </Frame>
  );
}
