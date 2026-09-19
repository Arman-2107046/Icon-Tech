/**
 * Lighthouse CI budget. Runs against `next start` on a seeded database.
 * INP has no lab equivalent, so Total Blocking Time (its lab proxy) is
 * asserted; the client-JS budget is enforced separately by
 * scripts/check-bundle.mjs, which measures gzipped bytes exactly.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start -- -p 3300",
      startServerReadyPattern: "Ready in",
      url: ["http://localhost:3300/", "http://localhost:3300/collections/new-arrivals", "http://localhost:3300/products/porter-tech-backpack"],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        // Storefront is fully server-rendered; skip PWA-style audits that add noise.
        skipAudits: ["uses-http2", "is-on-https", "redirects-http"],
      },
    },
    assert: {
      assertions: {
        "largest-contentful-paint": ["error", { maxNumericValue: 2000, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05, aggregationMethod: "median" }],
        "total-blocking-time": ["error", { maxNumericValue: 200, aggregationMethod: "median" }],
        "interaction-to-next-paint": "off",
        "categories:performance": ["warn", { minScore: 0.9 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
