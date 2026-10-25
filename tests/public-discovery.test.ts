import test from "node:test";
import assert from "node:assert/strict";
import robots from "../src/app/robots";
import { GET } from "../src/app/llms.txt/route";
import { WHOLESALE_PATHS } from "../src/lib/wholesale-content";
import { WHOLESALE_MINIMUM_DETAILS } from "../src/lib/wholesale-policy";

test("public crawl rules cover search assistants and preserve administrative exclusions", () => {
  const rules = robots().rules;
  assert.ok(Array.isArray(rules));
  const universal = rules.find(rule => rule.userAgent === "*")!;
  assert.ok(universal.allow?.includes("/"));
  assert.deepEqual(universal.disallow, ["/admin", "/auth/", "/api/"]);
  assert.equal(robots().sitemap, "https://myaimportaciones.com/sitemap.xml");
  // Specific search-bot groups must not override the shared private-route exclusions.
  assert.equal(rules.length, 1);
});

test("public text directory shares real commercial terms, all wholesale pages and only public contacts", async () => {
  const response = GET();
  assert.match(response.headers.get("Content-Type")!, /text\/plain/);
  const text = await response.text();
  assert.ok(text.includes(WHOLESALE_MINIMUM_DETAILS));
  for (const path of WHOLESALE_PATHS) assert.ok(text.includes(`https://myaimportaciones.com${path}`));
  for (const contact of ["Máximo", "Agustina", "5492494638919", "5492494251541"]) assert.ok(text.includes(contact));
  assert.match(text, /minoristas en pesos/);
  assert.match(text, /todas las provincias de Argentina/);
  assert.doesNotMatch(text, /purchase_price|landed_cost|supplier_|wholesale_price|cvu|cbu|service_role|customer_phone|customer_email|private_notes/i);
});
