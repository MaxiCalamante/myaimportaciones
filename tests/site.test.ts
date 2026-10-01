import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function configuredOrigin(value?: string) {
  const env = { ...process.env };
  if (value === undefined) delete env.NEXT_PUBLIC_SITE_URL;
  else env.NEXT_PUBLIC_SITE_URL = value;
  return execFileSync(process.execPath, ["--import", "tsx", "-e",
    "const { siteConfig } = require('./src/lib/site.ts'); process.stdout.write(siteConfig.appUrl);",
  ], { env, encoding: "utf8" });
}

test("product links replace the retired MYA deployment origin", () => {
  assert.equal(configuredOrigin("https://tienda-mayorista-minorista.vercel.app/"), "https://myaimportaciones.vercel.app");
});

test("missing site configuration uses the public MYA store", () => {
  assert.equal(configuredOrigin(), "https://myaimportaciones.vercel.app");
});

test("a configured custom domain is preserved without a doubled path slash", () => {
  assert.equal(configuredOrigin("https://example.com/"), "https://example.com");
});

test("an explicitly configured local origin remains local", () => {
  assert.equal(configuredOrigin("http://localhost:3000"), "http://localhost:3000");
});
