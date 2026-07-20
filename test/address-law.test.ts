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
import { Society, unpackPoles, closePole, chargesOn, layCharge, endActual, reaches } from "../src/index.js";

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

  it("charge is a pure address read: bare edges FROM the open End count (the End prehends the capture); the designation never does", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    // a bare edge FROM the open End IS a charge, whoever it's laid toward, no quality word needed
    // (charge-direction ruling, 2026-07-20: "the End prehends the capture"):
    s.lay({ slug: "raw-press", content: "felt need", subject: p.end, object: "frame-vik" });
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
  // This pins the ONTO side directly with a bare edge.
  it("a bare edge (no quality) FROM the open End-pole is a charge, never a guard trip — direction alone reads it (the End prehends the capture)", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    s.lay({ slug: "end~because~now", content: "end ~because~ now", subject: p.end, object: "frame-someone" });
    expect(chargesOn(s, p.end).map((c) => c.slug)).toContain("end~because~now");
  });

  // Pinned 2026-07-15 (bare-closing ruling MECHANIZED — Hallie: "yes its edge direction...
  // schedule it and feel free to act on it"). closePole now closes with a BARE edge, not
  // layP(..., "q-grounding") — this pins the OUT side the comment above once deferred:
  // closePole's own write is now bare, and every closing-recognizing read (endActual,
  // reaches walking "q-grounding", voltageOf) accepts it without a quality-marker.
  it("closePole closes with a BARE edge — no '~q' mode-beat — and every closing-read accepts it", () => {
    const s = new Society();
    capture(s, "task");
    const p = unpackPoles(s, "task");
    expect(endActual(s, p.end)).toBe(false);
    const closing = closePole(s, "task");
    expect(s.has(`${closing}~q`)).toBe(false); // bare — no quality word minted, same as a charge
    expect(endActual(s, p.end)).toBe(true); // endActual accepts the bare closing
    expect(reaches(s, p.end, "task", "q-grounding")).toBe(true); // reaches walks through it too
    // ordinary grammar applies again once actual — a bare edge OUT of the guard's OWN
    // exemption list would still be refused if it weren't for the pole being closed now:
    expect(() => s.layP("late-dep~onto~end", "a dependency on the closed End", p.end, "task", "q-depends-on"))
      .not.toThrow();
  });

  // Pinned 2026-07-15, same wave: a LEGACY q-grounding-quality closing (the migration-era
  // spelling, honored forever per append-only) is STILL read as a closing — the
  // both-spellings law isn't just for q-depends-on/q-blocked-by, it's the same shape here.
  it("a legacy q-grounding-quality closing (pre-rewrite ink) still reads as closed", () => {
    const s = new Society();
    capture(s, "legacy-task");
    const p = unpackPoles(s, "legacy-task");
    s.layP(`${p.end}~because~${p.now}`, "the end is because now (legacy spelling)", p.end, p.now, "q-grounding");
    expect(endActual(s, p.end)).toBe(true);
    expect(reaches(s, p.end, "legacy-task", "q-grounding")).toBe(true);
  });
});
