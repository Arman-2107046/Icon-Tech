import { ImageResponse } from "next/og";
import { og } from "@/src/lib/inline-palette";
import { getStorefrontProduct } from "@/src/modules/catalog";
import { getCachedSiteSettings } from "@/src/modules/content";
import { absoluteUrl } from "@/src/lib/site";
import { STORE_CURRENCY, formatMoney, money } from "@/src/lib/money";

export const alt = "Product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** OG card: cover image left, title/price/brand right. */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [product, settings] = await Promise.all([getStorefrontProduct(handle), getCachedSiteSettings()]);
  const cover = product?.media[0]?.url;
  const prices = product?.variants.map((v) => v.price) ?? [];
  // Satori's fallback font has no "৳" glyph: use the ISO code instead.
  const price = prices.length ? `${STORE_CURRENCY} ${formatMoney(money(Math.min(...prices), STORE_CURRENCY), { symbol: false })}` : "";
  const isRange = prices.length > 1 && Math.min(...prices) !== Math.max(...prices);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: og.canvas, color: og.ink, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", width: 504, height: "100%", background: og.neutral200, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          {cover ? <img src={cover.startsWith("http") ? cover : absoluteUrl(cover)} alt="" width={504} height={630} style={{ objectFit: "cover", width: 504, height: 630 }} /> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: 56 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 2, textTransform: "uppercase", color: og.inkMuted }}>{product?.vendor ?? settings.store.name}</div>
            <div style={{ marginTop: 20, fontSize: 56, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }}>{product?.title ?? "Product"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 40, fontWeight: 600 }}>{isRange ? `from ${price}` : price}</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{settings.store.name}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
