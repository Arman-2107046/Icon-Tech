import type { Metadata } from "next";
import { displayFont, textFont } from "@/src/fonts";
import { SITE_URL } from "@/src/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Icon Tech", template: "%s · Icon Tech" },
  description: "Well-made things for the desk, the bag, and the pocket.",
  openGraph: { type: "website", siteName: "Icon Tech", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${textFont.variable} ${displayFont.variable} h-full antialiased`}
      // The admin theme script may add a `dark` class before hydration.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
