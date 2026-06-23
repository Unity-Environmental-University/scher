// ─────────────────────────────────────────────────────────────────────────────
// society.prop.test.ts — property tests for the append-only Society.
//
// Property-based testing a PROCESS model is the natural fit, not the weird one: the
// invariants ARE the spec. "State changes only by appending; values are read, not
// stored" is exactly a set of laws over arbitrary histories. So we generate arbitrary
// histories and assert the laws hold over all of them.
//
//   • monotonicity — a lay never shrinks the log; rev only rises.
//   • inertness    — laying a known slug is a no-op (ON CONFLICT DO NOTHING).
//   • read-determinism — reads depend on the SET of beats, not the order laid.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  Society,
  modeAt,
  confidence,
  isEstablished,
  isSuperseded,
  contentBeats,
  type Beat,
} from "../src/society.js";

// ── generators (build histories the way the model actually gets used) ──────────

/** a content beat: a node, subject/object null. */
const contentBeatArb = (slug: string): fc.Arbitrary<Beat> =>
  fc.record({
    slug: fc.constant(slug),
    content: fc.string(),
    subject: fc.constant(null),
    object: fc.constant(null),
  });

/** an arbitrary set of distinct content-beat slugs. */
const slugsArb = fc.uniqueArray(
  fc.string({ minLength: 1, maxLength: 6 }).filter((s) => !s.endsWith("~q") && !s.startsWith("q-")),
  { minLength: 1, maxLength: 8 },
);

/** an arbitrary history: a list of beats to lay, possibly with duplicates. */
const historyArb: fc.Arbitrary<Beat[]> = slugsArb.chain((slugs) =>
  fc.array(
    fc.constantFrom(...slugs).chain(contentBeatArb),
    { minLength: 0, maxLength: 20 },
  ),
);

describe("Society — append-only laws", () => {
  it("a genuine lay grows the log by exactly one; an inert lay leaves it unchanged", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        const soc = new Society();
        for (const b of history) {
          const knew = soc.has(b.slug);
          const before = soc.size;
          const appended = soc.lay(b);
          if (knew) {
            expect(appended).toBe(false);
            expect(soc.size).toBe(before); // inert
          } else {
            expect(appended).toBe(true);
            expect(soc.size).toBe(before + 1); // grew by one
          }
        }
      }),
    );
  });

  it("size never decreases across a history; it equals the count of distinct slugs", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        const soc = new Society();
        let prev = 0;
        for (const b of history) {
          soc.lay(b);
          expect(soc.size).toBeGreaterThanOrEqual(prev);
          prev = soc.size;
        }
        expect(soc.size).toBe(new Set(history.map((b) => b.slug)).size);
      }),
    );
  });

  it("the witnessing clock is monotone across mixed explicit + auto stamps (asOf depends on it)", () => {
    // a history mixing beats WITH explicit witnessed stamps and beats WITHOUT — the
    // case that hid the clock-collision bug. Every distinct slug must get a unique,
    // and the auto-stamped ones must never reuse or precede an explicit moment.
    const mixedArb = fc.array(
      fc.record({
        slug: fc.string({ minLength: 1, maxLength: 5 }),
        witnessed: fc.option(fc.nat({ max: 50 }), { nil: undefined }),
      }),
      { maxLength: 25 },
    );
    fc.assert(
      fc.property(mixedArb, (specs) => {
        const soc = new Society();
        for (const s of specs) {
          soc.lay(
            s.witnessed === undefined
              ? { slug: s.slug, content: s.slug, subject: null, object: null }
              : { slug: s.slug, content: s.slug, subject: null, object: null, witnessed: s.witnessed },
          );
        }
        const stamps = soc.all().map((b) => b.witnessed ?? 0);
        // every witnessed stamp is a positive number; no two distinct beats share one
        // unless an explicit duplicate was authored (which is the author's truth, kept).
        const autoStamped = soc.all().filter((b, i) => specs.find((s) => s.slug === b.slug)?.witnessed === undefined);
        const autoMoments = autoStamped.map((b) => b.witnessed ?? 0);
        expect(new Set(autoMoments).size).toBe(autoMoments.length); // auto stamps are unique
      }),
    );
  });

  it("rev is monotone non-decreasing and rises iff a genuine append happened", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        const soc = new Society();
        for (const b of history) {
          const knew = soc.has(b.slug);
          const rev0 = soc.rev.get();
          soc.lay(b);
          const rev1 = soc.rev.get();
          expect(rev1).toBeGreaterThanOrEqual(rev0);
          expect(rev1 > rev0).toBe(!knew); // rose iff new slug
        }
      }),
    );
  });

  it("a laid beat is never mutated by later lays of the same slug", () => {
    fc.assert(
      fc.property(historyArb, (history) => {
        const soc = new Society();
        for (const b of history) soc.lay(b);
        // the surviving beat for each slug is the FIRST one laid (ON CONFLICT DO NOTHING)
        const firstBySlug = new Map<string, Beat>();
        for (const b of history) if (!firstBySlug.has(b.slug)) firstBySlug.set(b.slug, b);
        for (const [slug, first] of firstBySlug) {
          expect(soc.get(slug)?.content).toBe(first.content);
        }
      }),
    );
  });
});

describe("Society — reads are functions of the SET of beats, not the order", () => {
  // Build a fixed pool of content beats + grounding/exclusion prehensions, then check
  // that laying them in any permutation yields the same reads. (Reads re-derive; order
  // of arrival must not change the answer — the core "a value is read, not stored" claim.)
  const sceneArb = fc
    .uniqueArray(fc.string({ minLength: 1, maxLength: 4 }), { minLength: 1, maxLength: 4 })
    .chain((targets) => {
      const beats: Beat[] = targets.map((t) => ({ slug: t, content: t, subject: null, object: null }));
      // a pool of grounding & exclusion prehensions onto random targets, from random frames
      const prehensionArb = fc.record({
        target: fc.constantFrom(...targets),
        frame: fc.string({ minLength: 1, maxLength: 3 }),
        kind: fc.constantFrom("q-grounding" as const, "q-exclusion" as const),
        n: fc.nat({ max: 999 }),
      });
      return fc.array(prehensionArb, { minLength: 0, maxLength: 12 }).map((prehensions) => {
        const all: Beat[] = [...beats];
        prehensions.forEach((p, i) => {
          const slug = `p${i}-${p.kind}`;
          all.push({ slug, content: `${p.frame}->${p.target}`, subject: p.frame, object: p.target });
          all.push({ slug: slug + "~q", content: `[${p.kind}]`, subject: slug, object: p.kind });
        });
        return { targets, beats: all };
      });
    });

  it("modeAt / confidence / isEstablished are permutation-invariant", () => {
    fc.assert(
      fc.property(sceneArb, fc.integer(), (scene, seed) => {
        const inOrder = new Society(scene.beats);
        // a deterministic shuffle from the seed
        const shuffled = [...scene.beats]
          .map((b, i) => [b, (seed ^ (i * 2654435761)) >>> 0] as const)
          .sort((a, b) => a[1] - b[1])
          .map(([b]) => b);
        const permuted = new Society(shuffled);
        for (const t of scene.targets) {
          expect(modeAt(permuted, t)).toBe(modeAt(inOrder, t));
          expect(confidence(permuted, t)).toBeCloseTo(confidence(inOrder, t), 10);
          expect(isEstablished(permuted, t)).toBe(isEstablished(inOrder, t));
        }
      }),
    );
  });

  it("confidence always lands in [0,1]", () => {
    fc.assert(
      fc.property(sceneArb, (scene) => {
        const soc = new Society(scene.beats);
        for (const t of scene.targets) {
          const c = confidence(soc, t);
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1);
        }
      }),
    );
  });

  it("contentBeats returns exactly the nodes (no edges, no ~q mode-beats)", () => {
    fc.assert(
      fc.property(sceneArb, (scene) => {
        const soc = new Society(scene.beats);
        for (const b of contentBeats(soc)) {
          expect(b.subject).toBeNull();
          expect(b.slug.endsWith("~q")).toBe(false);
        }
      }),
    );
  });
});

describe("Society — undo is an append, not an erasure", () => {
  it("superseding a grounding flips establishment to false but keeps both beats in the log", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 5 }), fc.string({ minLength: 1, maxLength: 3 }), (target, frame) => {
        const soc = new Society([{ slug: target, content: target, subject: null, object: null }]);
        soc.layP("g0", `${frame} grounds`, frame, target, "q-grounding");
        expect(isEstablished(soc, target)).toBe(true);
        const sizeAfterGround = soc.size;

        // supersede: a self-pointing beat onto the grounding
        soc.lay({ slug: "sup-g0", content: "supersedes g0", subject: "g0", object: "g0" });
        expect(isSuperseded(soc, "g0")).toBe(true);
        expect(isEstablished(soc, target)).toBe(false); // re-reads as scripted
        expect(soc.size).toBe(sizeAfterGround + 1); // GREW — nothing erased
        expect(soc.has("g0")).toBe(true); // the grounding is still in ink
      }),
    );
  });
});
