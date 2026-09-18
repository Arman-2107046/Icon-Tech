import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      // Project rule: no escape hatches from the type system.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      // Server code imports a module through its index.ts. Client components
      // may import only actions.ts and types.ts, which are browser-safe;
      // queries.ts is server-only and must never reach a client bundle.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/src/modules/*/*",
                "!@/src/modules/*/actions",
                "!@/src/modules/*/types",
                "**/modules/*/queries",
                "../*/queries",
              ],
              message:
                "Import from the module's index.ts (e.g. '@/src/modules/catalog'); client components may import '<module>/actions' and '<module>/types' directly.",
            },
          ],
        },
      ],
      // No literal colours in code: everything comes from app/tokens.css.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/]",
          message: "Hardcoded hex colour. Use a token utility (bg-ink, text-brand …) or a CSS variable from app/tokens.css.",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/]",
          message: "Hardcoded hex colour. Use a token utility (bg-ink, text-brand …) or a CSS variable from app/tokens.css.",
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": true,
          "ts-check": false,
        },
      ],
    },
  },
  {
    // Unit tests exercise module internals directly; test fixtures may hold colours.
    files: ["tests/**/*.ts"],
    rules: { "no-restricted-imports": "off", "no-restricted-syntax": "off" },
  },
  {
    // Seed data and scripts are not UI code; og-palette.ts mirrors tokens.css
    // for Satori, which cannot read CSS variables.
    files: ["prisma/**/*.ts", "scripts/**/*.mjs", "src/lib/og-palette.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client
    "src/generated/**",
  ]),
]);

export default eslintConfig;
