// ─────────────────────────────────────────────────────────────────────────────
// path-to-sublime.test.ts — pathToSublime READ: navigable spine from a now
// toward a sublime-pole. Returns the ordered poles and interval members that
// form a drawable chain from current position to the star.
//
// SHAPE: pathToSublime(soc, fromNow, sublime) walks bearing-edges (because-edges
// to sublime-poles) and constructs a spine: the sequence of poles en route
// to the target, plus the interval members within each segment.
//
// KEY INSIGHT: reaches() walks established reachability via because. A sublime
// is SCRIPTED (never closes), so forward reachability via the bearing DAG finds it.
// The read reports both reachability AND whether the path is established
// (all edges behind readerNow's grounding) vs. scripted (forward-walking).
//
// Run: cd scher && npx vitest run path-to-sublime.test
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, pathToSublime, isSublimePole, bearingsOf, unpackPoles,
} from "../src/society.js";

function node(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}

describe("pathToSublime: spine from now toward a sublime", () => {
  it("returns unreachable: false if the target is not a sublime-pole", () => {
    const s = new Society();
    node(s, "now");
    node(s, "not-a-sublime");

    const path = pathToSublime(s, "now", "not-a-sublime");
    expect(path.reachable).toBe(false);
    expect(path.segments).toHaveLength(0);
    expect(path.established).toBe(false);
  });

  it("returns unreachable: false if the sublime is not reachable from fromNow", () => {
    const s = new Society();
    node(s, "now");
    node(s, "sublime-a");
    node(s, "sublime-b");

    // Designate sublime-a as a sublime-pole
    s.layP("sublime-a~pole", "sublime-a as pole", "sublime-a", "sublime-a", "q-sublime-pole");

    // Designate sublime-b as a different sublime-pole
    s.layP("sublime-b~pole", "sublime-b as pole", "sublime-b", "sublime-b", "q-sublime-pole");

    // Create a bearing FROM now TO sublime-a (but not to sublime-b)
    s.layP("now~bear~a", "now bears sublime-a", "now", "sublime-a", "because");

    const path = pathToSublime(s, "now", "sublime-b");
    expect(path.reachable).toBe(false);
    expect(path.segments).toHaveLength(0);
  });

  it("returns a single-segment path when fromNow bears a sublime directly", () => {
    const s = new Society();
    node(s, "now");
    node(s, "horizon");

    // Designate horizon as a sublime-pole
    s.layP("horizon~pole", "horizon as pole", "horizon", "horizon", "q-sublime-pole");

    // now bears horizon directly
    s.layP("now~bear~horizon", "oriented to horizon", "now", "horizon", "because");

    const path = pathToSublime(s, "now", "horizon");
    expect(path.reachable).toBe(true);
    expect(path.segments).toHaveLength(1);

    const seg = path.segments[0]!;
    expect(seg.from).toBe("now");
    expect(seg.to).toBe("horizon");
    expect(seg.members).toHaveLength(0); // now is not a story, no interval members
  });

  it("returns a multi-segment path when sublimes chain", () => {
    const s = new Society();
    node(s, "now");
    node(s, "sublime-a");
    node(s, "sublime-b");

    // Designate both as sublime-poles
    s.layP("a~pole", "sublime-a as pole", "sublime-a", "sublime-a", "q-sublime-pole");
    s.layP("b~pole", "sublime-b as pole", "sublime-b", "sublime-b", "q-sublime-pole");

    // now bears sublime-a
    s.layP("now~bear~a", "oriented to a", "now", "sublime-a", "because");

    // sublime-a bears sublime-b (chaining)
    s.layP("a~bear~b", "a in service of b", "sublime-a", "sublime-b", "because");

    const path = pathToSublime(s, "now", "sublime-b");
    expect(path.reachable).toBe(true);
    expect(path.segments).toHaveLength(2);

    expect(path.segments[0]!.from).toBe("now");
    expect(path.segments[0]!.to).toBe("sublime-a");

    expect(path.segments[1]!.from).toBe("sublime-a");
    expect(path.segments[1]!.to).toBe("sublime-b");
  });

  it("includes interval members for story segments", () => {
    const s = new Society();
    node(s, "now");
    node(s, "sublime");
    node(s, "task-1");
    node(s, "task-2");

    // Designate sublime as a sublime-pole
    s.layP("sublime~pole", "sublime as pole", "sublime", "sublime", "q-sublime-pole");

    // now is a story with two tasks
    const unpacked = unpackPoles(s, "now");
    const endNow = unpacked.end;

    s.lay({ slug: "now~task-1", subject: "now", object: "task-1" });
    s.lay({ slug: "now~task-2", subject: "task-1", object: "task-2" });
    s.lay({ slug: "task-2~end", subject: "task-2", object: endNow });

    // now bears sublime
    s.layP("now~bear~sublime", "oriented to sublime", "now", "sublime", "because");

    const path = pathToSublime(s, "now", "sublime");
    expect(path.reachable).toBe(true);
    expect(path.segments).toHaveLength(1);

    const seg = path.segments[0]!;
    expect(seg.from).toBe("now");
    expect(seg.to).toBe("sublime");
    // Interval should include the tasks but not the once and end
    expect(seg.members).toContain("task-1");
    expect(seg.members).toContain("task-2");
    expect(seg.members).not.toContain("now");
    expect(seg.members).not.toContain(endNow);
  });

  it("reports established: false when there's no grounding path (sublimes are scripted)", () => {
    const s = new Society();
    node(s, "now");
    node(s, "sublime");

    // Designate sublime as a sublime-pole
    s.layP("sublime~pole", "sublime as pole", "sublime", "sublime", "q-sublime-pole");

    // now bears sublime (but with no grounding, the bearing itself is unestablished)
    s.layP("now~bear~sublime", "oriented to sublime", "now", "sublime", "because");

    const path = pathToSublime(s, "now", "sublime");
    expect(path.reachable).toBe(true);
    // Since bearings are not grounded (they're scripted/forward), established is false
    expect(path.established).toBe(false);
  });

  it("reports established: false when the first edge is NOT behind readerNow grounding", () => {
    const s = new Society();
    node(s, "now");
    node(s, "sublime");

    // Designate sublime as a sublime-pole
    s.layP("sublime~pole", "sublime as pole", "sublime", "sublime", "q-sublime-pole");

    // now bears sublime, but there's no grounding edge
    s.layP("now~bear~sublime", "oriented to sublime", "now", "sublime", "because");

    const path = pathToSublime(s, "now", "sublime");
    expect(path.reachable).toBe(true);
    // Since there's no grounding edge, reaches() will return false
    expect(path.established).toBe(false);
  });

  it("never closes a sublime (respects the never-closes guard)", () => {
    const s = new Society();
    node(s, "now");
    node(s, "sublime");

    // Designate sublime as a sublime-pole
    s.layP("sublime~pole", "sublime as pole", "sublime", "sublime", "q-sublime-pole");

    // Trying to lay a because-edge to sublime should work (it's a bearing)
    s.layP("now~bear~sublime", "oriented to sublime", "now", "sublime", "because");

    // But trying to close it should throw (the guard)
    expect(() => {
      s.layP("close-attempt", "try to close", "sublime", "now", "q-grounding");
    }).toThrowError(/ANTI-Q-LURE GUARANTEE.*close the sublime-pole.*NEVER ACTUAL/);

    // The path should still be reachable, sublime still open
    const path = pathToSublime(s, "now", "sublime");
    expect(path.reachable).toBe(true);
  });

  it("reads a RING in the sublime DAG cycle-safely (rings now legal; the READ tolerates them)", () => {
    // ONTOLOGY CHANGE (Hallie, 2026-07-10): a ring among sublime-poles is no longer refused —
    // sublimes are "mirages on the surface of the sublime's event horizon," and reflections on
    // a horizon can mutually prehend (a ring is a constellation, not an in-time causal paradox).
    // So this test no longer asserts the ring-closing lay THROWS. Instead — and this is the load-
    // bearing property now that rings are legal — it proves the READ side (pathToSublime) stays
    // CYCLE-SAFE: it terminates (no infinite loop over the ring) and reports a finite, reachable
    // spine. The read already carried a seen-set for cycle-safety; this pins that it still holds
    // when a real ring exists rather than being unreachable-by-guard.
    const s = new Society();
    node(s, "now");
    node(s, "sublime-a");
    node(s, "sublime-b");

    // Designate both as sublime-poles
    s.layP("a~pole", "a as pole", "sublime-a", "sublime-a", "q-sublime-pole");
    s.layP("b~pole", "b as pole", "sublime-b", "sublime-b", "q-sublime-pole");

    // Build a real ring: now → a → b → a (the closing edge b → a is now ACCEPTED, not thrown).
    s.layP("now~bear~a", "oriented to a", "now", "sublime-a", "because");
    s.layP("a~bear~b", "a in service of b", "sublime-a", "sublime-b", "because");
    expect(() => {
      s.layP("b~bear~a", "b in service of a (ring — now legal)", "sublime-b", "sublime-a", "because");
    }).not.toThrow();
    expect(s.has("b~bear~a")).toBe(true);

    // THE READ STAYS CYCLE-SAFE: with the ring in place, pathToSublime must terminate and return
    // a finite reachable spine — not loop forever over a → b → a and not blow the stack.
    const path = pathToSublime(s, "now", "sublime-b");
    expect(path.reachable).toBe(true);
    expect(path.segments).toHaveLength(2);
    // And a path to the other pole in the ring is equally finite and reachable.
    const pathA = pathToSublime(s, "now", "sublime-a");
    expect(pathA.reachable).toBe(true);
    expect(pathA.segments.length).toBeGreaterThan(0);
  });
});
