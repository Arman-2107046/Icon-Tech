/**
 * The subset of app/tokens.css needed where CSS variables cannot reach:
 * Open Graph images (Satori) and transactional emails (inline styles).
 * Keep in sync with tokens.css; this is the only TS file allowed to hold
 * literal colours (see eslint.config.mjs and scripts/check-colors.mjs).
 */
export const palette = {
  canvas: "#fafaf8",
  surface: "#ffffff",
  ink: "#0e0d0c",
  inkMuted: "#5b5750",
  inkSubtle: "#a8a49b",
  line: "#e8e6e1",
  neutral200: "#e8e6e1",
} as const;

/** Back-compat alias for the OG image routes. */
export const og = palette;
