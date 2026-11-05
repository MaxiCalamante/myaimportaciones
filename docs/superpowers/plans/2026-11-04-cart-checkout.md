# Cart and checkout repair

Goal: preserve selected quantities and wholesale prices during refresh, and allow checkout when the server verifies the wholesale minimum.

1. Reproduce wholesale price loss and product removal during refresh with regression tests.
2. Give cart refresh its own public product endpoint including wholesale-only products; keep favorites behavior unchanged. Preserve validated stock limits and existing wholesale offers.
3. Use the successful current server quote to enable checkout; invalidate failed quotes and prevent stale form submission. Test $99,999, $100,000, $100,001 and the alternative five-unit minimum.
4. Run regression tests, full suite, type check, lint, build and browser checks for quantity changes, persistence, minimum and both payment selections.
5. Commit and publish to the existing MyA Vercel production project; verify deployed commit and public checkout. Distinguish simulated payment checks from real charges.
