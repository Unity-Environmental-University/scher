// foldGist.anneal.test.ts — tests proposed by fanned-out cheap agents, nanny-gated.
// Each block here passed `tsc` + `vitest` against current src before being committed.
import { describe, it, expect } from "vitest";
import { Society } from "../src/society.js";
import { foldGist, TALLY, type Monoid } from "../src/stories.js";

describe("foldGist — annealed edge cases", () => {
  // H2: empty interior → fold.empty, for any monoid.
  it("empty interior: foldGist returns monoid.empty as summary for multiple monoids", () => {
    const soc = new Society([
      { slug: "once", content: "once", subject: null, object: null, witnessed: 1 },
      { slug: "end", content: "end", subject: null, object: null, witnessed: 2 },
      { slug: "edge-once-end", content: "once→end", subject: "once", object: "end", witnessed: 2 },
    ]);
    const tallyCold = foldGist(soc, TALLY, "once", "end");
    expect(tallyCold.summary).toEqual({ total: 0, established: 0 });
    expect(tallyCold.interior).toEqual([]);

    const strConcat: Monoid<string> = { empty: "", step: (acc, beat) => acc + beat + " " };
    const strCold = foldGist(soc, strConcat, "once", "end");
    expect(strCold.summary).toBe("");
    expect(strCold.interior).toEqual([]);
  });

  // H4: degenerate once === end must not throw; empty interior.
  it("foldGist with degenerate interval (once === end) returns empty summary", () => {
    const soc = new Society([{ slug: "x", content: "beat x", subject: null, object: null }]);
    const counting: Monoid<number> = { empty: 0, step: (acc) => acc + 1 };
    expect(() => foldGist(soc, counting, "x", "x")).not.toThrow();
    const result = foldGist(soc, counting, "x", "x");
    expect(result.interior).toEqual([]);
    expect(result.summary).toBe(0);
  });

  // H1: a non-commutative (string-concat) monoid folds each interior beat exactly once.
  it("foldGist folds interior beats exactly once with a non-commutative monoid", () => {
    const soc = new Society([{ slug: "once", content: "once", subject: null, object: null, witnessed: 1 }]);
    soc.lay({ slug: "b1", content: "A", subject: null, object: null, witnessed: 2 });
    soc.lay({ slug: "e1", content: "edge", subject: "once", object: "b1", witnessed: 2 });
    soc.lay({ slug: "b2", content: "B", subject: null, object: null, witnessed: 3 });
    soc.lay({ slug: "e2", content: "edge", subject: "b1", object: "b2", witnessed: 3 });
    soc.lay({ slug: "b3", content: "C", subject: null, object: null, witnessed: 4 });
    soc.lay({ slug: "e3", content: "edge", subject: "b2", object: "b3", witnessed: 4 });
    soc.lay({ slug: "end", content: "end", subject: null, object: null, witnessed: 5 });
    soc.lay({ slug: "elast", content: "edge", subject: "b3", object: "end", witnessed: 5 });

    const stringConcat: Monoid<string> = {
      empty: "",
      step: (acc, beat, s) => acc + (s.get(beat)?.content ?? ""),
    };
    const result = foldGist(soc, stringConcat, "once", "end");
    expect(result.summary).toContain("A");
    expect(result.summary).toContain("B");
    expect(result.summary).toContain("C");
    expect(result.summary.length).toBe(3); // one char per interior beat — none dropped/doubled.
    expect(result.interior).toHaveLength(3);
  });
});
