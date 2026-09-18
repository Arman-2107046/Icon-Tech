/**
 * The subset of app/tokens.css needed by Open Graph image generation.
 * Satori renders outside the browser and cannot read CSS variables, so the
 * values are repeated here. Keep in sync with tokens.css; this is the only
 * TS file allowed to contain literal colours (see eslint.config.mjs).
 */
export const og = {
  canvas: "#fafaf8",
  ink: "#0e0d0c",
  inkMuted: "#5b5750",
  inkSubtle: "#a8a49b",
  neutral200: "#e8e6e1",
} as const;
