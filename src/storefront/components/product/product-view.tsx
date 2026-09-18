"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/src/storefront/cart/cart-context";
import { findVariant, initialSelection, isValueAvailable, stockLabel, type ProductView as ProductViewModel } from "@/src/modules/catalog/types";
import { Badge, Button, Price } from "@/src/storefront/components/ui";
import { cx } from "@/src/storefront/lib/cx";
import { Gallery } from "./gallery";

/**
 * Everything on the product page that reacts to the chosen variant: the
 * gallery, price, stock, option picker, add-to-cart, and the sticky mobile
 * bar. Selection lives in React state and is mirrored to ?variant= with
 * history.replaceState so a shared link opens on the same variant, without
 * any navigation.
 */
export function ProductView({ product, requestedVariantId }: { product: ProductViewModel; requestedVariantId: string | null }) {
  const { addLine } = useCart();
  const [addError, setAddError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const addToCart = async (variantId: string) => {
    setAddError(null);
    const result = await addLine(variantId, 1);
    if (!result.ok) {
      setAddError(result.error ?? "Could not add to cart.");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  };
  const [selection, setSelection] = useState<Record<string, string>>(() => initialSelection(product.variants, requestedVariantId));
  const variant = findVariant(product.variants, selection);
  const media = variant?.media.length ? variant.media : product.media;
  const stock = variant ? stockLabel(variant.sellable) : { text: "Unavailable", tone: "neutral" as const };
  const canBuy = Boolean(variant && variant.sellable > 0);

  // Mirror the variant into the URL without navigating.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (variant && product.variants.length > 1) url.searchParams.set("variant", variant.id);
    else url.searchParams.delete("variant");
    window.history.replaceState(window.history.state, "", url);
  }, [variant, product.variants.length]);

  // Sticky bar appears once the primary button has scrolled out of view.
  const buyRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowBar(Boolean(entry && !entry.isIntersecting && entry.boundingClientRect.top < 0)), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [adding, setAdding] = useState(false);
  const onAdd = async () => {
    if (!variant) return;
    setAdding(true);
    try {
      await addToCart(variant.id);
    } finally {
      setAdding(false);
    }
  };

  const select = (option: string, value: string) => setSelection((s) => ({ ...s, [option]: value }));

  return (
    <>
      <div className="grid gap-s6 lg:grid-cols-12 lg:gap-s8">
        <div className="lg:col-span-7">
          <Gallery media={media} title={product.title} />
        </div>

        <div className="lg:col-span-5">
          {product.vendor ? <p className="label text-ink-muted">{product.vendor}</p> : null}
          <h1 className="display display-2xl mt-s1">{product.title}</h1>
          <div className="mt-s3 flex flex-wrap items-center gap-s2" data-testid="product-price">
            {variant ? <Price amount={variant.price} compareAt={variant.compareAtPrice} size="lg" /> : null}
            <Badge tone={stock.tone} data-testid="stock-status">
              {stock.text}
            </Badge>
          </div>

          {product.options.length > 0 ? (
            <div className="mt-s5 space-y-s4">
              {product.options.map((option) => (
                <fieldset key={option.name} data-testid={`option-${option.name}`}>
                  <legend className="mb-s1 flex items-baseline gap-s1 text-t-sm">
                    <span className="font-medium">{option.name}</span>
                    <span className="text-ink-muted">{selection[option.name]}</span>
                  </legend>
                  <div className="flex flex-wrap gap-s1">
                    {option.values.map((value) => {
                      const selected = selection[option.name] === value;
                      const available = isValueAvailable(product.variants, selection, option.name, value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => select(option.name, value)}
                          aria-pressed={selected}
                          aria-disabled={!available}
                          data-available={available}
                          className={cx(
                            "inline-flex h-11 min-w-11 items-center justify-center rounded-sf-full border px-s2 text-t-sm transition-colors duration-200 ease-out-expo",
                            selected ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink hover:border-ink",
                            !available && "border-dashed text-ink-subtle line-through hover:border-line-strong",
                          )}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}

          <div ref={buyRef} className="mt-s5 flex flex-col gap-s2">
            <Button size="lg" disabled={!canBuy} loading={adding} onClick={onAdd} data-testid="add-to-cart">
              {canBuy ? (added ? "Added to cart ✓" : "Add to cart") : "Sold out"}
            </Button>
            {addError ? (
              <p role="alert" className="text-t-sm text-danger">
                {addError}
              </p>
            ) : null}
            <p className="text-t-sm text-ink-muted">Next-day delivery inside Dhaka · Cash on delivery available · 14-day returns</p>
          </div>

          {variant?.sku ? <p className="mt-s3 text-t-xs text-ink-subtle">SKU {variant.sku}</p> : null}
        </div>
      </div>

      {/* Sticky add-to-cart (mobile) */}
      <div
        className={cx(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-s2 py-s1 backdrop-blur transition-transform duration-300 ease-out-expo lg:hidden",
          showBar ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showBar}
        data-testid="sticky-bar"
      >
        <div className="flex items-center gap-s2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-t-sm font-medium">{product.title}</p>
            {variant ? <Price amount={variant.price} compareAt={variant.compareAtPrice} size="sm" /> : null}
          </div>
          <Button disabled={!canBuy || !showBar} loading={adding} onClick={onAdd} tabIndex={showBar ? 0 : -1}>
            {canBuy ? "Add to cart" : "Sold out"}
          </Button>
        </div>
      </div>
    </>
  );
}
