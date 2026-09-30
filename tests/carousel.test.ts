import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { carouselLink, defaultCarouselSlides, moveCarouselSlide, parseCarouselSlides } from "../src/lib/carousel";

test("carousel validates content and destinations without changing its original slides", () => {
  assert.deepEqual(parseCarouselSlides(defaultCarouselSlides), defaultCarouselSlides);
  assert.equal(carouselLink("/catalogo?category=cosmetica-coreana"), "/catalogo?category=cosmetica-coreana");
  for (const link of ["javascript:alert(1)", "//evil.test", "/%2fexample.test", "/\\evil.test", "http://evil.test", "https://user:pass@evil.test"]) assert.throws(() => carouselLink(link));
  assert.throws(() => parseCarouselSlides([{ ...defaultCarouselSlides[0], image: "" }]), /imagen/);
  assert.throws(() => parseCarouselSlides([{ ...defaultCarouselSlides[0], btnLink: "" }]), /botón/);
  assert.throws(() => parseCarouselSlides([defaultCarouselSlides[0], defaultCarouselSlides[0]]), /duplicadas/);
  assert.throws(() => parseCarouselSlides([{ ...defaultCarouselSlides[0], title: "x".repeat(161) }]));
  assert.doesNotThrow(() => parseCarouselSlides([{ ...defaultCarouselSlides[0], image: "", active: false }]));
  assert.deepEqual(parseCarouselSlides([]), []);
});
test("reordering keeps slide identities and content, with bounded arrow movements", () => {
  const moved = moveCarouselSlide(defaultCarouselSlides, defaultCarouselSlides[0].id, 1);
  assert.deepEqual(moved.map(s => s.id), [defaultCarouselSlides[1].id, defaultCarouselSlides[0].id, defaultCarouselSlides[2].id]);
  assert.equal(moved[1], defaultCarouselSlides[0]);
  assert.deepEqual(moveCarouselSlide(defaultCarouselSlides, defaultCarouselSlides[0].id, -1), defaultCarouselSlides);
});
test("carousel persists atomically, rejects stale saves, and exposes only active ordered content", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create function public.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('test.admin',true),'false')='true' $$;`);
    await db.exec(readFileSync("supabase/migrations/20260930200326_storefront_carousel.sql", "utf8"));
    assert.deepEqual((await db.query<{ slides: unknown }>("select slides from storefront_carousel")).rows[0].slides, defaultCarouselSlides);
    await db.exec("set role anon");
    assert.equal((await db.query<{ slides: unknown[] }>("select public_carousel_slides() slides")).rows[0].slides.length, 3);
    await assert.rejects(db.query("select * from storefront_carousel"), /permission denied/);
    await db.exec("reset role; set role authenticated");
    assert.equal((await db.query("select * from storefront_carousel")).rows.length, 0);
    assert.equal((await db.query("update storefront_carousel set slides='[]' returning id")).rows.length, 0);
    await db.exec("select set_config('test.admin','true',false)");
    const edited = moveCarouselSlide(defaultCarouselSlides, defaultCarouselSlides[2].id, -1).map((s, i) => ({ ...s, title: i === 0 ? "Título editado" : s.title, active: i !== 1 }));
    assert.equal((await db.query("update storefront_carousel set slides=$1::jsonb,revision=1 where id=1 and revision=0 returning revision", [JSON.stringify(edited)])).rows.length, 1);
    assert.equal((await db.query("update storefront_carousel set slides='[]',revision=1 where id=1 and revision=0 returning revision")).rows.length, 0);
    assert.deepEqual((await db.query<{ slides: unknown }>("select slides from storefront_carousel")).rows[0].slides, edited);
    await db.exec("reset role; set role anon");
    assert.deepEqual((await db.query<{ slides: unknown }>("select public_carousel_slides() slides")).rows[0].slides, edited.filter(s => s.active));
    await db.exec("reset role; set role authenticated");
    await db.query("update storefront_carousel set slides='[]',revision=2 where id=1 and revision=1");
    assert.deepEqual((await db.query<{ slides: unknown }>("select public_carousel_slides() slides")).rows[0].slides, []);
    await assert.rejects(db.query("update storefront_carousel set slides='{}'"), /check constraint/);
    await assert.rejects(db.query("delete from storefront_carousel"), /permission denied/);
  } finally { await db.close(); }
});
