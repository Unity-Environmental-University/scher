// ─────────────────────────────────────────────────────────────────────────────
// occlusion.prop.test.ts — the OCCLUSION INVARIANTS, locked (2026-06-26).
//
// Supersession is gone; occlusion replaces it (a member E casts q-occludes over a
// member X it prehends, within a society). These are the checks I kept running BY
// HAND all day — "did occluding hide it? did un-occluding reveal it? did an occluded
// grounding flip establishment? is it society-scoped?" — turned into re-runnable
// regressions + property tests so they never need a manual curl/node-repl again.
//
// The gift (Hallie, 2026-06-26): a manual verification you repeat is a regression
// test you haven't written yet. Run via `npm test` (vitest). Pure, in-memory.
//
// THE FIVE INVARIANTS:
//   1. occlude hides:       a named occluder makes isOccluded(target) true.
//   2. emergent un-occlude: occlude the occluder → target revealed (one level, no recursion).
//   3. flips establishment: occluding a grounding flips the target established→scripted.
//   4. society-scoped:      occlusion lives on the EDGE; a beat in another society is untouched.
//   5. NO self-loops:       a self-loop {subject:X,object:X} is NOT read as occlusion (it's dead).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Society, isOccluded, isEstablished, type EventRow } from "../src/society.js";

// ── helpers: build occlusion the canonical way ──────────────────────────────────
function soc(seed: EventRow[] = []): Society { return new Society(seed); }
function node(s: Society, slug: string) { s.lay({ slug, content: slug, subject: null, object: null }); }
/** a NAMED occluder E casts q-occludes over the member `target` it prehends. */
function occlude(s: Society, slug: string, target: string, occluder = "ev-occ") {
  if (!s.has(occluder)) node(s, occluder);
  s.layP(slug, `occlude ${target}`, occluder, target, "q-occludes");
}
function ground(s: Society, slug: string, target: string, by = "actor") {
  if (!s.has(by)) node(s, by);
  s.layP(slug, `${by} grounds ${target}`, by, target, "q-grounding");
}

describe("occlusion — the five invariants (concrete regressions)", () => {
  it("1. occlude hides: a named occluder makes the target occluded", () => {
    const s = soc(); node(s, "a");
    expect(isOccluded(s, "a")).toBe(false);
    occlude(s, "occ-a", "a");
    expect(isOccluded(s, "a")).toBe(true);
    // and the occluder itself stands in full light (it is NOT a self-loop)
    expect(isOccluded(s, "ev-occ")).toBe(false);
  });

  it("2. emergent un-occlude: occlude the occluder → target revealed (one level)", () => {
    const s = soc(); node(s, "a");
    occlude(s, "occ-a", "a");
    expect(isOccluded(s, "a")).toBe(true);
    occlude(s, "occ-occ", "occ-a", "ev2"); // the occluder is itself occluded
    expect(isOccluded(s, "a")).toBe(false); // its shadow lifts — a revealed
    expect(isOccluded(s, "occ-a")).toBe(true);
  });

  it("3. flips establishment: occluding a grounding makes the target scripted again", () => {
    const s = soc(); node(s, "a");
    ground(s, "g-a", "a");
    expect(isEstablished(s, "a")).toBe(true);
    occlude(s, "occ-g-a", "g-a");           // occlude the GROUNDING edge
    expect(isEstablished(s, "a")).toBe(false);
  });

  it("4. society-scoped: occlusion is on the edge, not the beat — another society is untouched", () => {
    // the SAME content beat slug, two independent societies. Occluded in one, live in the other.
    const s1 = soc(); node(s1, "x"); occlude(s1, "occ-x", "x");
    const s2 = soc(); node(s2, "x"); // s2 never occludes x
    expect(isOccluded(s1, "x")).toBe(true);
    expect(isOccluded(s2, "x")).toBe(false); // the frame IS the society; x stands in full light here
  });

  it("5. a self-loop {subject:X,object:X} is NOT occlusion (the dead grammar is dead)", () => {
    const s = soc(); node(s, "a");
    // lay the OLD self-loop supersede shape directly
    s.lay({ slug: "sup-a", content: "old supersede", subject: "a", object: "a" });
    expect(isOccluded(s, "a")).toBe(false); // ignored — a self-loop reads as nothing now
  });
});

describe("occlusion — property tests over arbitrary histories", () => {
  // PROPERTY A: occlude-then-occlude-the-occluder is the identity (target visible again),
  // for ANY target/occluder names. The emergent-un-occlusion law, exhaustively.
  it("occluding an occluder always reveals the target (one-level emergent un-occlusion)", () => {
    fc.assert(
      fc.property(
        // only the ~q constructor namespace is excluded; a slug SPELLING "q-" is fair game — quality-hood is structural (hasAnyQuality, 2026-07-06)
        fc.string({ minLength: 1, maxLength: 6 }).filter((t) => !t.endsWith("~q")),
        (target) => {
          const s = soc(); node(s, target);
          occlude(s, `o1-${target}`, target, "evA");
          expect(isOccluded(s, target)).toBe(true);
          occlude(s, `o2-${target}`, `o1-${target}`, "evB");
          expect(isOccluded(s, target)).toBe(false);
        },
      ),
    );
  });

  // PROPERTY B: occlusion is order-independent — the read is a pure filter over the log,
  // so laying the same beats in any permutation gives the same isOccluded answer.
  it("isOccluded is permutation-invariant (read is a pure function of the SET of beats)", () => {
    const beats: EventRow[] = [
      { slug: "a", content: "a", subject: null, object: null },
      { slug: "evA", content: "evA", subject: null, object: null },
      { slug: "occ-a", content: "occ a", subject: "evA", object: "a" },
      { slug: "occ-a~q", content: "[q-occludes]", subject: "occ-a", object: "q-occludes" },
    ];
    const answerFor = (order: EventRow[]) => {
      const s = new Society();
      for (const b of order) s.lay(b);
      return isOccluded(s, "a");
    };
    fc.assert(
      fc.property(fc.shuffledSubarray(beats, { minLength: beats.length }), (perm) => {
        // every full permutation must agree (and the answer is: occluded)
        expect(answerFor(perm)).toBe(true);
      }),
    );
  });

  // PROPERTY C: a self-loop NEVER occludes, for any slug. The dead grammar stays dead
  // no matter what you name it.
  it("a self-loop never occludes, for any target name", () => {
    fc.assert(
      fc.property(
        // only the ~q constructor namespace is excluded; a slug SPELLING "q-" is fair game — quality-hood is structural (hasAnyQuality, 2026-07-06)
        fc.string({ minLength: 1, maxLength: 6 }).filter((t) => !t.endsWith("~q")),
        (target) => {
          const s = soc(); node(s, target);
          s.lay({ slug: `sup-${target}`, content: "self-loop", subject: target, object: target });
          expect(isOccluded(s, target)).toBe(false);
        },
      ),
    );
  });
});
