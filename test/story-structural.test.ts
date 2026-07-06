// ─────────────────────────────────────────────────────────────────────────────
// story-structural.test.ts — story-hood is an unpacked End-pole, never a spelling.
//
// F-A ruling + pole law (2026-07-06, docs/committees/2026-07-06-F-A-ruled-voltage.md):
// an event is ONE event until lazily unpacked into its three poles; the unpack lays the
// structural q-end-pole designation, and a beat is a Story iff that designation exists.
// Before this, isStory/endOf demanded a q-lure toward a slug spelling "end" — the lure
// is killed with fire (see lure-is-dead.test.ts) and the "weekend-plans" false positive
// (society.ts's own old TODO named it) is impossible by construction: no spelling is read.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, isStory, endOf, unpackPoles } from "../src/society.js";

const node = (s: Society, slug: string) => s.lay({ slug, content: slug, subject: null, object: null });

describe("story-hood is structural (unpacked End-pole, no spelling)", () => {
  it("an unpack to a slug with no 'end' in it IS a story, and endOf reads the designation", () => {
    const s = new Society();
    node(s, "capture-milk");
    const p = unpackPoles(s, "capture-milk", "milk-in-fridge"); // no 'end' spelled anywhere
    expect(isStory(s, "capture-milk")).toBe(true);
    expect(endOf(s, "capture-milk")).toBe(p.end);
  });

  it("edges to 'weekend-plans' that are NOT an End-pole designation make nothing a story", () => {
    const s = new Society();
    node(s, "saturday-thought");
    node(s, "weekend-plans"); // spells 'end' — the old false positive's bait
    // a plain content edge and a lateral quality edge, neither a pole designation:
    s.lay({ slug: "st-e1", content: "thought → plans", subject: "saturday-thought", object: "weekend-plans" });
    s.layP("st-dep", "waits on plans", "saturday-thought", "weekend-plans", "q-depends-on");
    expect(isStory(s, "saturday-thought")).toBe(false); // spelling confers nothing
    expect(endOf(s, "saturday-thought")).toBeNull();
  });

  it("a captured event is ONE event until first need — no poles, no story apparatus", () => {
    const s = new Society();
    node(s, "captured-and-abandoned");
    expect(isStory(s, "captured-and-abandoned")).toBe(false);
    expect(endOf(s, "captured-and-abandoned")).toBeNull();
    // first need (explicit elaboration) unpacks it — and only then:
    unpackPoles(s, "captured-and-abandoned");
    expect(isStory(s, "captured-and-abandoned")).toBe(true);
  });
});
