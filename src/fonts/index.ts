import localFont from "next/font/local";

/**
 * Self-hosted, latin-subset, variable woff2 files (SIL OFL). Two faces:
 * Space Grotesk for display headings, Geist for everything else. Both are
 * loaded with font-display: swap and exposed as CSS variables consumed by
 * tokens.css / typography.css.
 */
export const displayFont = localFont({
  src: "./space-grotesk-latin.woff2",
  weight: "300 700",
  display: "swap",
  variable: "--font-display",
  preload: true,
});

export const textFont = localFont({
  src: "./geist-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-text",
  preload: true,
});
