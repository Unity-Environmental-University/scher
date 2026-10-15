// ─────────────────────────────────────────────────────────────────────────────
// lay-scaling.test.ts — layP's guards must not scan the whole society.
//
// isDesignatedEndPole and isSublimePole were full soc.all() scans, run on every
// layP (assertNakedPole, assertSublimeNeverCloses), so laying n prehensions cost
// O(n²): the hyperbolic voxel sketch spent 7.7 s building 7285 tiles. Both now
// read soc.edgesOntoObject, mirroring scher-core/src/poles.rs.
//
// The first test counts (deterministic): a layP never calls all(). The second
// times it, with a bound loose enough not to flake — the quadratic version grew
// ~20× from 1k to 5k prehensions, so 30k would be hundreds of times slower.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { Society, unpackPoles } from "../src/society.js";

function chain(soc: Society, from: number, to: number): void {
  for (let i = from; i < to; i++) {
    soc.lay({ slug: `n${i}`, content: "n" });
    if (i > 0) soc.layP(`n${i}~because~n${i - 1}`, "e", `n${i}`, `n${i - 1}`, "q-grounding");
  }
}

describe("layP scales flat", () => {
  it("never scans the whole society, even past poles and sublimes", () => {
    const soc = new Society();
    chain(soc, 0, 50);
    soc.lay({ slug: "story", content: "a story" });
    unpackPoles(soc, "story");
    soc.lay({ slug: "star", content: "a star" });
    soc.layP("aim~sublime", "a sublime", "n0", "star", "q-sublime-pole");
    const all = vi.spyOn(soc, "all");
    chain(soc, 50, 100);
    soc.layP("star~serves~n3", "e", "star", "n3", "q-serves");
    soc.layP("n7~refs~story", "e", "n7", "story", "q-grounding");
    expect(() => soc.layP("star~because~n9", "e", "star", "n9", "q-grounding")).toThrow(/ANTI-Q-LURE/);
    expect(all).not.toHaveBeenCalled();
  });

  it("per-prehension lay time is roughly flat from 1k to 30k", () => {
    const soc = new Society();
    const W = 1000;
    const time = (from: number) => {
      const t = performance.now();
      chain(soc, from, from + W);
      return (performance.now() - t) / W;
    };
    chain(soc, 0, 1000);
    const early = time(1000);
    chain(soc, 2000, 29000);
    const late = time(29000);
    expect(late / early).toBeLessThan(10);
  });
});
