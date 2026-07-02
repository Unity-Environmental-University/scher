// ─────────────────────────────────────────────────────────────────────────────
// society.asof.test.ts — the time-relative read. THE RED TEST FIRST.
//
// The harness can replay a society as of a past moment (it truncates the log by
// witnessed-stamp). But that makes every CONSUMER rebuild a society to ask "what did
// this read as, then." A process-native library should answer it directly: the reads
// take a moment. So this file asserts modeAt(soc, beat, asOf) on the LIBRARY surface.
//
// It starts red: society.ts has no asOf parameter yet. The test is the spec; we make it
// green by adding the witnessing-axis to the reads. The replay-coherence property
// (asOf(last) ≡ now) is the safety net proving the existing reads are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Society, modeAt, confidence, type EventRow } from "../src/society.js";

const SEED: EventRow[] = [
  { slug: "task", content: "a task", subject: null, object: null, witnessed: 1 },
  { slug: "alice", content: "alice", subject: null, object: null, witnessed: 2 },
];

describe("society — time-relative reads (asOf)", () => {
  it("reads the establishment AS OF a past moment, before the grounding landed", () => {
    const soc = new Society(SEED);
    // grounding lands at a later witnessed moment
    soc.layP("g0", "alice grounds", "alice", "task", "q-grounding"); // witnessed ~3,4

    // now: established
    expect(modeAt(soc, "task")).toBe("established");
    // as of moment 2 (seed only, before the grounding): scripted
    expect(modeAt(soc, "task", 2)).toBe("scripted");
    // as of "now" (no asOf) and asOf(huge) agree — the endpoint
    expect(modeAt(soc, "task", Number.MAX_SAFE_INTEGER)).toBe("established");
  });

  it("confidence asOf an early moment ignores later groundings/exclusions", () => {
    const soc = new Society(SEED);
    soc.layP("g0", "alice grounds", "alice", "task", "q-grounding");
    expect(confidence(soc, "task", 2)).toBe(0); // nothing yet
    expect(confidence(soc, "task")).toBe(1); // now: one grounding, no exclusions
  });

  it("REPLAY COHERENCE: asOf(maxWitnessed) equals the plain now-read, for any history", () => {
    const targets = ["task"];
    const stepArb = fc.record({
      kind: fc.constantFrom("q-grounding" as const, "q-exclusion" as const),
      by: fc.constantFrom("alice", "bob"),
    });
    fc.assert(
      fc.property(fc.array(stepArb, { maxLength: 15 }), (steps) => {
        const soc = new Society(SEED);
        steps.forEach((s, i) => soc.layP(`p${i}`, `${s.by}`, s.by, "task", s.kind));
        const maxW = soc.all().reduce((m, b) => Math.max(m, b.witnessed ?? 0), 0);
        for (const t of targets) {
          expect(modeAt(soc, t, maxW)).toBe(modeAt(soc, t)); // asOf(last) ≡ now
          expect(confidence(soc, t, maxW)).toBeCloseTo(confidence(soc, t), 10);
        }
      }),
    );
  });

  it("MONOTONE WITNESSING: the asOf read is piecewise-constant and only changes at a witnessed step", () => {
    const soc = new Society(SEED);
    soc.layP("g0", "alice grounds", "alice", "task", "q-grounding");
    const maxW = soc.all().reduce((m, b) => Math.max(m, b.witnessed ?? 0), 0);
    // sweep every integer moment; the read changes value at most as often as beats land.
    let changes = 0;
    let prev = modeAt(soc, "task", 0);
    for (let t = 1; t <= maxW; t++) {
      const cur = modeAt(soc, "task", t);
      if (cur !== prev) changes++;
      prev = cur;
    }
    expect(changes).toBeLessThanOrEqual(soc.size); // can't change more than there are beats
    expect(changes).toBeGreaterThanOrEqual(1); // it did go scripted → established
  });
});
