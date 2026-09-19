import { cx } from "@/src/storefront/lib/cx";

/** Same box model as ProductCard: 4:5 image, two text lines, price. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx("flex flex-col gap-s2", className)} aria-hidden>
      <div className="aspect-[4/5] w-full animate-pulse rounded-sf-lg bg-neutral-200" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
    </div>
  );
}

/** Same columns/gaps as CardGrid dense. */
export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cx("grid grid-cols-2 gap-x-s2 gap-y-s5 md:grid-cols-3 md:gap-x-s3 md:gap-y-s8 lg:grid-cols-4", className)} aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
