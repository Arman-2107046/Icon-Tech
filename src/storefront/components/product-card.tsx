import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/src/modules/catalog";
import { Badge, Price } from "@/src/storefront/components/ui";
import { cx } from "@/src/storefront/lib/cx";

/**
 * Product tile for grids. Fixed 4:5 media box (zero CLS), hover swaps to
 * the second image, sale/sold-out badges, price range for multi-variant.
 */
export function ProductCard({ product, priority = false, className }: { product: ProductCardData; priority?: boolean; className?: string }) {
  const onSale = product.compareAt !== null && product.compareAt > product.priceMin;
  return (
    <article className={cx("group relative flex flex-col gap-s2", className)} data-testid="product-card">
      <Link href={`/products/${product.handle}`} className="relative block aspect-[4/5] overflow-hidden rounded-sf-lg bg-neutral-100" aria-label={product.title}>
        {product.image ? (
          <>
            <Image
              src={product.image.url}
              alt={product.image.alt || product.title}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              priority={priority}
              className={cx("object-cover transition-[transform,opacity] duration-500 ease-out-expo group-hover:scale-[1.03]", product.hoverImage && "group-hover:opacity-0")}
            />
            {product.hoverImage ? (
              <Image src={product.hoverImage.url} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover opacity-0 transition-opacity duration-500 ease-out-expo group-hover:opacity-100" aria-hidden />
            ) : null}
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-t-sm text-ink-subtle">No image</span>
        )}
        <span className="absolute left-s2 top-s2 flex gap-s1">
          {!product.inStock ? <Badge tone="neutral">Sold out</Badge> : onSale ? <Badge tone="danger">Sale</Badge> : null}
        </span>
      </Link>
      <div className="flex flex-col gap-s0-5">
        {product.vendor ? <p className="label text-ink-subtle">{product.vendor}</p> : null}
        <h3 className="text-t-base font-medium leading-snug">
          <Link href={`/products/${product.handle}`} className="after:absolute after:inset-0 after:content-['']">
            {product.title}
          </Link>
        </h3>
        <Price amount={product.priceMin} max={product.priceMax} compareAt={onSale ? product.compareAt : null} size="sm" />
      </div>
    </article>
  );
}
