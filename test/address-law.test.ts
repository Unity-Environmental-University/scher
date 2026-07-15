// ─────────────────────────────────────────────────────────────────────────────
// address-law.test.ts — nothing touches a naked pole.
//
// THE LAW (2026-07-06, born with its guard per the same morning's meta-law: no
// quality/structure without its one-sentence law and blocking guard in the same commit):
// an open End-pole receives ONLY charge-prehensions onto it and, eventually, the ONE
// closing q-grounding out of it. Comments/references prehend the STORY, never its End.
// Charge is thereby a pure address read: "charges on this differential" = the bare
// prehensions onto its open End — a property of the EDGE, never node-contents (Hallie).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, unpackPoles, closePole, chargesOn, layCharge } from "../src/index.js";

const capture = (s: Society, slug: string) => s.lay({ slug, content: slug, subject: null, object: null });

describe("the naked-pole address law — the guard BLOCKS", () => {
  it("a quality prehension ONTO an open End-pole is refused, with the why and the fix", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    expect(() => s.layP("cmt~feels~end", "a comment parked on the pole", "commenter", p.end, "q-feel"))
      .toThrowError(/ADDRESS LAW.*ONTO the open End-pole.*prehend the STORY/s);
    expect(s.has("cmt~feels~end")).toBe(false); // fail-closed
  });

  it("a non-grounding prehension OUT of an open End-pole is refused — only the closing leaves", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    expect(() => s.layP("end~dep~x", "the pole depending on things", p.end, "task", "q-depends-on"))
      .toThrowError(/ADDRESS LAW.*OUT of the open End-pole.*ONE closing/s);
  });

  it("the closing q-grounding out of the pole is the one legal exit; a closed pole is no longer naked", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    expect(() => closePole(s, "task")).not.toThrow(); // the ONE closing grounding: legal
    // actual now — ordinary grammar applies again:
    expect(() => s.layP("late-note~onto~end", "a reference to the closed End", "someone", p.end, "q-feel"))
      .not.toThrow();
  });

  it("charge is a pure address read: bare edges onto the open End count; the designation never does", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    // a bare edge onto the open End IS a charge, whoever lays it, no quality word needed:
    s.lay({ slug: "raw-press", content: "felt need", subject: "frame-vik", object: p.end });
    layCharge(s, "task", "frame-tam");
    const charges = chargesOn(s, p.end).map((c) => c.slug);
    expect(charges).toContain("raw-press");
    expect(charges.length).toBe(2);
    expect(charges).not.toContain(p.pole); // the quality-carrying designation classifies out
  });

  it("nested stories stay legal: a pole may itself be designated onward (q-end-pole is exempt structure)", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    // the pole is itself a story whose End lies further in (why-chains do exactly this):
    expect(() => s.layP(`${p.end}~end-pole~further`, "onward", p.end, "further", "q-end-pole")).not.toThrow();
  });

  // Pinned 2026-07-15 (whole-codebase review sitting, tension 1: edge-direction-
  // unimplemented). Hallie's migration answer says edge DIRECTION alone settles closing
  // vs. charge once quality-markers are gone — no guard-code change was needed to make
  // this true (assertNakedPole is reachable only through layP, which requires a Quality,
  // so a genuinely bare edge never reaches the guard at all; see the guard's own comment).
  // This pins the ONTO side directly with a bare edge (the OUT side has no bare writer to
  // call yet — closePole still closes via layP(..., "q-grounding"), honestly still true
  // per the KernelQuality HONESTY CLAUSE).
  it("a bare edge (no quality) onto the open End-pole is a charge, never a guard trip — direction alone reads it", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    s.lay({ slug: "end~because~now", content: "end ~because~ now", subject: "frame-someone", object: p.end });
    expect(chargesOn(s, p.end).map((c) => c.slug)).toContain("end~because~now");
  });
});
