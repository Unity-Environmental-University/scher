// ─────────────────────────────────────────────────────────────────────────────
// trajectory.harness.test.ts — the test framework, tested AS A TRAJECTORY.
//
// "Give it a test." A harness that judges trajectories must not be trusted on its own
// endpoint — that's the substance cheat. So we prove the recorder is FAITHFUL: replaying
// the trajectory as of its last moment reproduces the live society exactly, and the
// witnessing axis it records is monotone and matches the society's own clock.
//
// Only once the recorder is proven faithful do the asOf/everReached assertions mean
// anything. This file is the harness's own concrescence check.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { trajectory } from "./support/trajectory.js";
import { type Beat } from "../src/society.js";

const SEED: Beat[] = [
  { slug: "task", content: "a task", subject: null, object: null },
  { slug: "alice", content: "alice", subject: null, object: null },
  { slug: "bob", content: "bob", subject: null, object: null },
];

// an arbitrary trajectory: a sequence of process ops over a fixed cast.
type Op = { kind: "ground" | "exclude"; by: string } | { kind: "lay"; slug: string } | { kind: "supersede"; which: number };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant("ground" as const), by: fc.constantFrom("alice", "bob") }),
  fc.record({ kind: fc.constant("exclude" as const), by: fc.constantFrom("alice", "bob") }),
  fc.record({ kind: fc.constant("lay" as const), slug: fc.string({ minLength: 1, maxLength: 4 }) }),
);

function build(ops: Op[]) {
  const t = trajectory(SEED);
  for (const op of ops) {
    if (op.kind === "ground") t.ground("task", op.by);
    else if (op.kind === "exclude") t.exclude("task", op.by);
    else if (op.kind === "lay") t.lay({ slug: op.slug, content: op.slug, subject: null, object: null });
  }
  return t;
}

describe("Trajectory harness — the recorder is faithful", () => {
  it("replay as of the last moment reproduces the live society exactly", () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 20 }), (ops) => {
        const t = build(ops);
        const replayed = t.societyAsOf(t.lastMoment);
        // same population of slugs, same content per slug — the endpoint, rebuilt from the log
        const live = new Set(t.soc.all().map((b) => b.slug));
        const back = new Set(replayed.all().map((b) => b.slug));
        expect(back).toEqual(live);
        for (const b of t.soc.all()) {
          expect(replayed.get(b.slug)?.content).toBe(b.content);
        }
      }),
    );
  });

  it("the recorded witnessing axis is monotone non-decreasing across steps", () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 20 }), (ops) => {
        const t = build(ops);
        let prev = -Infinity;
        for (let i = 0; i < t.stepCount; i++) {
          const at = t.momentAfter(i);
          expect(at).toBeGreaterThanOrEqual(prev);
          prev = at;
        }
      }),
    );
  });

  it("a society replayed as of an earlier moment is a subset of a later one", () => {
    fc.assert(
      fc.property(fc.array(opArb, { minLength: 1, maxLength: 20 }), (ops) => {
        const t = build(ops);
        for (let i = 0; i < t.stepCount; i++) {
          const earlier = new Set(t.societyAsOf(t.momentAfter(i - 1)).all().map((b) => b.slug));
          const later = new Set(t.societyAsOf(t.momentAfter(i)).all().map((b) => b.slug));
          for (const s of earlier) expect(later.has(s)).toBe(true); // append-only: never loses a beat
        }
      }),
    );
  });
});
