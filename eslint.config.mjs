import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["scripts/**/*.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Historical snapshot verifiers inspect dynamic JSON; production TypeScript retains strict rules.
  { files: [
    "scripts/verify-tools-*-2026-10-06.mts",
    "scripts/analyze-drafts.mts",
    "scripts/import-electronics-2026-10-08.mts",
    "scripts/mango-fuerza-2026-10-08.mts",
    "scripts/verify-electronics-routes-2026-10-08.mts",
    "scripts/verify-hand-tools-2026-10-08.mts",
  ], rules: { "@typescript-eslint/no-explicit-any": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "scratch/suppliers-private/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-giveaway-qa/**",
    ".next-email-qa/**",
    ".next-storefront-qa/**",
    ".next-opportunities-qa/**",
    ".next-opportunities-webpack-qa/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
  ]),
]);

export default eslintConfig;
