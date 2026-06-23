// ─────────────────────────────────────────────────────────────────────────────
// foldGist.test.ts — the generalized Gist as a cached-SSR cursor. RED FIRST.
//
// gistOf freezes an interval at at=max(witnessed) and tallies {total,established}.
// foldGist generalizes that tally to a pluggable associative monoid and folds only
// the TAIL past a cache cursor. The whole point is one law:
//
//     fold(all)  ==  fold(cache) ⊕ fold(tail)
//
// If that holds, the warm (incremental, O(tail)) path is provably equal to the cold
// (full re-scan) path — that equality IS the render-cache correctness proof. We assert:
//   1. gistOf ⊂ foldGist  (TALLY reproduces gistOf's summary)
//   2. the verify law      (warm == cold) over a randomly-grown interval
//   3. tail-only           (warm folds ONLY beats past the cursor)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Society } from "../src/society.js";
import { foldGist, gistOf, TALLY, type Monoid } from "../src/stories.js";

// Build a story: once → b1 → b2 → … → bN → end, plain edges chaining them.
// Each beat gets an explicit witnessed-stamp so frames are deterministic.
function chainStory(n: number): { soc: Society; once: string; end: string } {
  const soc = new Society([{ slug: "once", content: "once", subject: null, object: null, witnessed: 1 }]);
  let prev = "once";
  for (let i = 1; i <= n; i++) {
    const slug = `b${i}`;
    soc.lay({ slug, content: `beat ${i}`, subject: null, object: null, witnessed: i + 1 });
    soc.lay({ slug: `e${i}`, content: `edge ${i}`, subject: prev, object: slug, witnessed: i + 1 });
    prev = slug;
  }
  soc.lay({ slug: "end", content: "end", subject: null, object: null, witnessed: n + 2 });
  soc.lay({ slug: "elast", content: "edge last", subject: prev, object: "end", witnessed: n + 2 });
  return { soc, once: "once", end: "end" };
}

const tallyCombine = (a: { total: number; established: number }, b: { total: number; established: number }) =>
  ({ total: a.total + b.total, established: a.established + b.established });

describe("foldGist — the generalized, cached Gist", () => {
  it("gistOf ⊂ foldGist: TALLY reproduces gistOf's summary", () => {
    const { soc, once, end } = chainStory(5);
    const g = gistOf(soc, once, end);
    const fg = foldGist(soc, TALLY, once, end);
    expect(fg.summary).toEqual(g.summary);
    expect(fg.interior.sort()).toEqual(g.interior.sort());
  });

  it("the verify law: warm (cache ⊕ tail) == cold (full re-scan) over any growth", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), fc.integer({ min: 1, max: 8 }), (n0, grow) => {
        // freeze a cache over the first n0 beats…
        const { soc, once, end } = chainStory(n0);
        const cache = foldGist(soc, TALLY, once, end);

        // …then grow the interval by `grow` beats appended before the end.
        let prev = `b${n0}`;
        for (let i = n0 + 1; i <= n0 + grow; i++) {
          soc.lay({ slug: `b${i}`, content: `beat ${i}`, subject: null, object: null, witnessed: i + 1 });
          soc.lay({ slug: `e${i}`, content: `edge ${i}`, subject: prev, object: `b${i}`, witnessed: i + 1 });
          prev = `b${i}`;
        }
        // re-point the end edge so the new beats are interior.
        soc.lay({ slug: `e-relink`, content: "relink", subject: prev, object: "end", witnessed: n0 + grow + 3 });

        const cold = foldGist(soc, TALLY, once, end);
        const warm = foldGist(soc, TALLY, once, end, cache, tallyCombine);
        expect(warm.summary).toEqual(cold.summary);
        expect(warm.cursor).toBe(cold.cursor);
      }),
    );
  });

  it("tail-only: the warm path folds ONLY beats past the cache cursor", () => {
    const { soc, once, end } = chainStory(4);
    const cache = foldGist(soc, TALLY, once, end);

    // a counting monoid that records which beats step() was called on.
    const touched: string[] = [];
    const counting: Monoid<number> = { empty: 0, step: (acc, b) => { touched.push(b); return acc + 1; } };
    // rebuild the cache under the counting monoid so the ⊕ types line up.
    const countCache = foldGist(soc, counting, once, end);
    touched.length = 0; // forget the cold-build touches; only watch the warm fold.

    // grow by two beats.
    soc.lay({ slug: "b5", content: "beat 5", subject: null, object: null, witnessed: 6 });
    soc.lay({ slug: "e5", content: "edge 5", subject: "b4", object: "b5", witnessed: 6 });
    soc.lay({ slug: "e-relink", content: "relink", subject: "b5", object: "end", witnessed: 7 });

    foldGist(soc, counting, once, end, countCache, (a, b) => a + b);
    expect(touched).toEqual(["b5"]); // ONLY the new tail beat, never b1..b4.
    expect(cache.summary.total).toBe(4);
  });
});
