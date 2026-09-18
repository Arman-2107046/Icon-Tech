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
