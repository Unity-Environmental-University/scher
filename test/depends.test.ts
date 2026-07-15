// ─────────────────────────────────────────────────────────────────────────────
// depends.test.ts — the dependency/strain reads. One edge (q-depends-on), many
// readings. The CLAIMS: depends-on is read both ways (dependsOn / dependentsOf);
// "blocked" is a READING of depends-on against establishment, not a stored flag —
// it flips the instant a dependency establishes, with no write; supersede unblocks.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
} from "../src/society.js";
import {
  dependsOn,
  dependentsOf,
  blockedOnNow,
  isBlocked,
  parallelizable,
  whoWaitsOn,
  stressOf,
} from "../src/strain.js";

/** three content beats a,b,c with a→depends-on→b. */
function deps() {
  const soc = new Society([
    { slug: "a", content: "task a", subject: null, object: null },
    { slug: "b", content: "task b", subject: null, object: null },
    { slug: "c", content: "task c", subject: null, object: null },
    { slug: "fr", content: "a frame", subject: null, object: null },
  ]);
  soc.layP("a-dep-b", "a depends on b", "a", "b", "q-depends-on");
  return soc;
}

describe("dependency reads — one edge, read both ways", () => {
  it("dependsOn / dependentsOf are the two sides of the same edge", () => {
    const soc = deps();
    expect(dependsOn(soc, "a")).toEqual(["b"]);     // a waits on b
    expect(dependentsOf(soc, "b")).toEqual(["a"]);  // b is waited on by a
    expect(whoWaitsOn(soc, "b")).toEqual(["a"]);    // the same question, in views' words
    expect(dependsOn(soc, "b")).toEqual([]);        // b waits on nobody
  });

  it("blocked is a READING: a flips unblocked the instant b establishes — no write to a", () => {
    const soc = deps();
    expect(isBlocked(soc, "a")).toBe(true);
    expect(blockedOnNow(soc, "a")).toEqual(["b"]);
    expect(parallelizable(soc, "a")).toBe(false);   // blocked → not pickup-able
    expect(parallelizable(soc, "b")).toBe(true);    // b is free + unestablished

    // ground b — no write touches a, yet a re-reads as unblocked.
    soc.layP("g-b", "fr grounds b", "fr", "b", "q-grounding");
    expect(isBlocked(soc, "a")).toBe(false);
    expect(blockedOnNow(soc, "a")).toEqual([]);
    expect(parallelizable(soc, "a")).toBe(true);    // now pickup-able
  });

  it("occlude unblocks: occluding the depends-on edge drops the dependency", () => {
    const soc = deps();
    expect(dependsOn(soc, "a")).toEqual(["b"]);
    soc.layP("occ-a-dep-b", "drop the dep", "fr", "a-dep-b", "q-occludes");
    expect(dependsOn(soc, "a")).toEqual([]);
    expect(isBlocked(soc, "a")).toBe(false);
    expect(dependentsOf(soc, "b")).toEqual([]);
  });

  it("stressOf weights dependents by their commitment (established > blocked > scripted)", () => {
    const soc = deps();
    // a (scripted, blocked-on-b) waits on b → weight 2 (blocked).
    expect(stressOf(soc, "b")).toEqual({ count: 1, weight: 2, dependents: ["a"] });
    // ground b: a is now unblocked+scripted → weight 1.
    soc.layP("g-b", "fr grounds b", "fr", "b", "q-grounding");
    expect(stressOf(soc, "b").weight).toBe(1);
    // ground a too: an established dependent weighs 3.
    soc.layP("g-a", "fr grounds a", "fr", "a", "q-grounding");
    expect(stressOf(soc, "b").weight).toBe(3);
  });
});
