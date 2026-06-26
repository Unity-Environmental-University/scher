// ─────────────────────────────────────────────────────────────────────────────
// bounds.guard.test.ts — the two cardinal sins of the Once and the End. 🚧
//
// (2026-06-26, Hallie — found by the hyperbolic view lighting up the mess.) The route runs
// event-0 (the Once, the first occasion) → … → final-event / the final HEA (the End). Two laws
// hold at the bounds, mirror images of each other:
//
//   1. event-0 NEVER PREHENDS. It is the first occasion — there is no prior data to take up.
//      So event-0 as the SUBJECT of any prehension is invalid.
//   2. the final HEA is NEVER PREHENDED. It is the aim / the lurer (via the eternal object); it
//      never perishes into data behind a later occasion. So the final HEA as the OBJECT of any
//      prehension is invalid.
//
// This test DIES if either sin appears. It's a guard for the grammar — and a lamp for Monday-us,
// who inherit a canon with these violations already in it (≈3 event-0 prehensions, and lures laid
// AT the End that should be the End luring outward). The test fails honestly until the canon is
// cleaned; that red is the dig-out work made visible, not hidden. See bounds-dig-out (Monday gift).
//
// Run: cd scher && npx vitest run bounds.guard
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "../src/society.js";

// the prehension qualities — the acts of taking-up prior data. (q-lure is NOT here: luring is the
// eternal object's act, not a prehension. This is the "remove lure from the valid edges" Hallie asked.)
const PREHENSIONS = ["q-grounding", "q-feel", "q-receives", "q-occludes", "q-resolves"] as const;

/** does `beat`, as a SUBJECT, prehend anything? (is it the taking-up end of a real prehension?) */
function prehendsAnything(s: Society, beat: string): boolean {
  return PREHENSIONS.some(q => prehensionsFrom(s, beat, q).some(e => !isOccluded(s, e.slug)));
}
/** is `beat`, as an OBJECT, prehended by anything? (does anything take IT up?) */
function isPrehended(s: Society, beat: string): boolean {
  return PREHENSIONS.some(q => prehensionsOnto(s, beat, q).some(e => !isOccluded(s, e.slug)));
}

// a tiny helper to lay a prehension for the tests.
let n = 0;
function lay(s: Society, slug: string){ if(!s.has(slug)) s.lay({slug,content:slug,subject:null,object:null}); }
function prehend(s: Society, subj: string, obj: string, q: typeof PREHENSIONS[number]){
  lay(s,subj); lay(s,obj); s.layP("p"+(n++), subj+" "+q+" "+obj, subj, obj, q);
}

describe("the bounds: the Once never prehends, the End is never prehended 🚧", () => {
  it("LAW 1 — event-0 (the Once) is a valid SUBJECT of no prehension (it has no past)", () => {
    const s = new Society();
    lay(s, "event-0"); lay(s, "some-prior");
    // a clean canon: event-0 prehends nothing.
    expect(prehendsAnything(s, "event-0")).toBe(false);
    // and if someone lays one (the sin), the guard catches it — this is what DIES in a dirty canon.
    prehend(s, "event-0", "some-prior", "q-grounding");   // the forbidden backward-reach
    expect(prehendsAnything(s, "event-0")).toBe(true);    // ← detected. In the real canon, assert FALSE.
  });

  it("LAW 2 — the final HEA (the End) is a valid OBJECT of no prehension (nothing takes it up)", () => {
    const s = new Society();
    lay(s, "final-event"); lay(s, "some-occasion");
    expect(isPrehended(s, "final-event")).toBe(false);
    // the sin: an occasion prehends the End (treats the aim as prior data behind it).
    prehend(s, "some-occasion", "final-event", "q-grounding");
    expect(isPrehended(s, "final-event")).toBe(true);     // ← detected. In the real canon, assert FALSE.
  });

  it("THE MIRROR — what each bound CAN do (the valid shape)", () => {
    const s = new Society();
    lay(s, "event-0"); lay(s, "final-event"); lay(s, "an-occasion");
    // event-0 is PREHENDED-BY others (later occasions take up the origin) — valid.
    prehend(s, "an-occasion", "event-0", "q-grounding");
    expect(isPrehended(s, "event-0")).toBe(true);          // ✓ the Once is taken up
    expect(prehendsAnything(s, "event-0")).toBe(false);    // ✓ but the Once takes up nothing
    // the End grounds nothing onto itself and prehends nothing; it is reached TOWARD, not from.
    expect(prehendsAnything(s, "final-event")).toBe(false);
    expect(isPrehended(s, "final-event")).toBe(false);
  });
});

// ── THE LIVE GUARD (Monday's lamp) ──────────────────────────────────────────────
// The tests above prove the LAWS on toy societies. The dig-out gift is a check you can run against
// the REAL canon to LIST the violations (not just pass/fail). See scher/dollhouse/bounds-check.mjs —
// it fetches /gen3/canon and prints every event-0-prehends and every final-event-prehended edge,
// so Monday-us can see exactly what to clean. The mess is inherited honestly; here is the map out.
