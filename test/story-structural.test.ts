// ─────────────────────────────────────────────────────────────────────────────
// story-structural.test.ts — story-hood is a lured End-pole, never a spelling.
//
// F-A ruling (2026-07-06, docs/committees/2026-07-06-F-A-ruled-voltage.md): a beat is a
// Story iff it q-lures somewhere — the lure edge itself IS the End-pole designation.
// Before this, isStory/endOf ALSO demanded the lure's object spell the letters "end"
// (society.ts's own TODO named the "weekend-plans" false positive). These tests pin the
// structural reading: designation confers story-hood; spelling confers nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, isStory, endOf } from "../src/society.js";

const node = (s: Society, slug: string) => s.lay({ slug, content: slug, subject: null, object: null });

describe("story-hood is structural (lured End-pole, no spelling)", () => {
  it("a q-lure to a slug with no 'end' in it IS a story, and endOf reads the lure's object", () => {
    const s = new Society();
    node(s, "capture-milk");
    node(s, "milk-in-fridge"); // the designated End-pole — no 'end' spelled anywhere
    s.layP("capture-milk~lures~milk-in-fridge", "lures its End", "capture-milk", "milk-in-fridge", "q-lure");
    expect(isStory(s, "capture-milk")).toBe(true);
    expect(endOf(s, "capture-milk")).toBe("milk-in-fridge");
  });

  it("an edge to 'weekend-plans' that is NOT a q-lure designation makes nothing a story", () => {
    const s = new Society();
    node(s, "saturday-thought");
    node(s, "weekend-plans"); // spells 'end' — the old false positive's bait
    // a plain content edge and a lateral quality edge, neither a lure:
    s.lay({ slug: "st-e1", content: "thought → plans", subject: "saturday-thought", object: "weekend-plans" });
    s.layP("st-dep", "waits on plans", "saturday-thought", "weekend-plans", "q-depends-on");
    expect(isStory(s, "saturday-thought")).toBe(false); // spelling confers nothing
    expect(endOf(s, "saturday-thought")).toBeNull();
  });

  it("a q-lure to 'weekend-plans' IS a story — because the lure designates, not because of the letters", () => {
    const s = new Society();
    node(s, "friday-hope");
    node(s, "weekend-plans");
    s.layP("fh~lures~wp", "lures toward the weekend", "friday-hope", "weekend-plans", "q-lure");
    expect(isStory(s, "friday-hope")).toBe(true);
    expect(endOf(s, "friday-hope")).toBe("weekend-plans");
  });
});
