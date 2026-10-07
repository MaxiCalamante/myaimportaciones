import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["scripts/**/*.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Historical snapshot verifiers inspect dynamic JSON; production TypeScript retains strict rules.
  { files: ["scripts/verify-tools-*-2026-10-06.mts"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
  ]),
]);

export default eslintConfig;
