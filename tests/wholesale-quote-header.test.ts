import test from "node:test";
import assert from "node:assert/strict";
import { wholesaleQuoteHeader } from "../src/lib/wholesale-quote-header";

test("quote dates use Argentina time and keep a stable display reference", () => {
  const issuedAt = new Date("2026-10-29T01:30:00Z");
  const header = wholesaleQuoteHeader(issuedAt, "b1c2d3e4-0000-0000-0000-000000000000");
  assert.equal(header.issueDate, "28 de octubre de 2026");
  assert.equal(header.expirationDate, "12 de noviembre de 2026");
  assert.equal(header.quoteNumber, "MYA-B2B-B1C2D3E4");
  assert.deepEqual(wholesaleQuoteHeader(issuedAt, "b1c2d3e4-0000-0000-0000-000000000000"), header);
});
