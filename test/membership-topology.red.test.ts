// ─────────────────────────────────────────────────────────────────────────────
// membership-topology.red.test.ts — RED FENCE, failing by design. 🔴
//
// Hallie's ruling, 2026-07-16 16:57–16:59 (GROOMING-2026-07-17.md item 0):
// "holds shouldn't be a thing... It needs to not be." Containment is never laid
// ink. Membership is DERIVED — determined topologically by an event's relation
// to E's Now and BOTH of its poles ("please stand up a test that membership is
// determined topologically by relationship to an events now and both of its
// poles" / "A failing test obvs :-)").
//
// This file is the guard landed before the heal. It is RED until the kernel
// exports `membersOf(soc, event, asOf?)`. Do not skip it, do not it.fails it —
// the red IS the spoken proof that the law is not yet built. When you build
// membersOf, these assertions are its acceptance; flip nothing, just make them
// pass.
//
// THE LAW (the reference semantics, in prose):
//   m is a member of E  iff
//     (1) m reaches E's Once through grounding      — m began inside E's course
//         (m ~…because…~> once(E)); and
//     (2) E's gathering edge reaches m:
//           closed E → end(E) reaches m             — the End gathered it;
//           open   E → now(E) reaches m             — the moving Now has it so far.
//   Corollaries, each pinned below:
//   - A never-closing event (a SUBLIME: End never actual, Now self-grounding
//     only) has EMPTY membership forever — nothing can be inside what never
//     happens. The metaphysics refuses; no door-guard needed.
//   - `~holds~` ink, if any survives in a canon, is DEAD to this read — laid
//     containment is never consulted.
//   - Membership is asOf-honest like every other read (occlusion respected via
//     the same walks).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import * as S from "../src/society.js";
import { Society, unpackPoles, closePole } from "../src/society.js";

// the read this fence demands. Red today: society.ts does not export it yet.
const membersOf: (soc: Society, event: string, asOf?: number) => string[] =
  (S as Record<string, never>)["membersOf"];

const lay = (s: Society, slug: string, content = slug) => {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
};
const grounds = (s: Society, later: string, earlier: string) => {
  lay(s, later); lay(s, earlier);
  s.layP(`${later}~because~${earlier}`, "grounds in", later, earlier, "q-grounding");
};

/** a day with two todos lived inside it, one bystander outside it. */
function aDay(s: Society) {
  lay(s, "the-day");
  const day = unpackPoles(s, "the-day");
  // todos born inside the day's course: they ground in its Once…
  grounds(s, "todo-a", "the-day");
  grounds(s, "todo-b", "the-day");
  // …and the day's Now has gathered them (now advanced through them):
  grounds(s, day.now, "todo-a");
  grounds(s, day.now, "todo-b");
  // a bystander that PREHENDS the day but was never gathered by its Now/End —
  // related, adjacent, NOT inside:
  grounds(s, "bystander", "the-day");
  return day;
}

describe("membership is topological — Now and both poles, never laid ink 🔴", () => {
  it("the kernel exports the derived read (RED until built)", () => {
    expect(typeof membersOf).toBe("function");
  });

  it("OPEN event: members are what grounds in Once AND is reached by Now", () => {
    const s = new Society();
    aDay(s);
    expect(membersOf(s, "the-day").sort()).toEqual(["todo-a", "todo-b"]);
    // the bystander prehends the day but the Now never gathered it: outside.
    expect(membersOf(s, "the-day")).not.toContain("bystander");
  });

  it("CLOSED event: the End freezes membership — the gather is the End's cone", () => {
    const s = new Society();
    const day = aDay(s);
    grounds(s, day.end, day.now);   // the End gathers everything the Now held…
    closePole(s, "the-day");
    expect(membersOf(s, "the-day").sort()).toEqual(["todo-a", "todo-b"]);
    // a latecomer grounding in Once AFTER the close is NOT swept in by the End:
    grounds(s, "latecomer", "the-day");
    expect(membersOf(s, "the-day")).not.toContain("latecomer");
  });

  it("SUBLIME: a never-closing event has EMPTY membership — nothing is inside what never happens", () => {
    const s = new Society();
    lay(s, "the-sublime", "a receding horizon, not a destination");
    unpackPoles(s, "the-sublime");
    // stories ground in it (steering pull is legal)…
    grounds(s, "story-x", "the-sublime");
    grounds(s, "story-y", "the-sublime");
    // …but its Now never gathers, its End never actualizes: interior empty.
    expect(membersOf(s, "the-sublime")).toEqual([]);
  });

  it("~holds~ ink is DEAD to this read — laid containment is never consulted", () => {
    const s = new Society();
    aDay(s);
    // a forged containment edge, the exact ink Hallie killed:
    lay(s, "smuggled");
    s.lay({ slug: "the-day~holds~smuggled", content: "containment as ink (dead)", subject: "the-day", object: "smuggled" });
    expect(membersOf(s, "the-day")).not.toContain("smuggled");
  });
});
