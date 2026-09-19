import { ImageResponse } from "next/og";
import { og } from "@/src/lib/inline-palette";
import { getStorefrontCollection } from "@/src/modules/catalog";
import { getCachedSiteSettings } from "@/src/modules/content";

export const alt = "Collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Typographic OG card for collections. */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [collection, settings] = await Promise.all([getStorefrontCollection(handle), getCachedSiteSettings()]);
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: og.ink, color: og.canvas, fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: og.inkSubtle }}>Collection</div>
        <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, maxWidth: 1000 }}>{collection?.title ?? "Collection"}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 }}>
          <span style={{ color: og.inkSubtle }}>{collection?.description?.slice(0, 80) ?? ""}</span>
          <span style={{ fontWeight: 700 }}>{settings.store.name}</span>
        </div>
      </div>
    ),
    size,
  );
}
