// ─────────────────────────────────────────────────────────────────────────────
// algedonic.test.ts — the two algedonic reads (Beer's channel): floatingCharge (the
// dukkha nobody holds) and overload (the line over rating). Reads only, no writes; raw
// and sorted, never thresholded in the kernel — threshold policy is Hallie's, and the
// don't-plug-the-channel law forbids silent filtering (2026-07-06 second sitting).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  unpackPoles,
  layCharge,
  closePole,
  voltageOf,
  floatingCharge,
  overload,
  storyNow,
} from "../src/index.js";

const capture = (s: Society, slug: string) => s.lay({ slug, content: slug, subject: null, object: null });
const now = (s: Society, slug: string) => s.lay({ slug, content: `the Now of ${slug}`, subject: null, object: null });

describe("floatingCharge — charge whose story no live ground holds", () => {
  it("a charged differential unreachable from every live ground floats; a held one does not", () => {
    const s = new Society();
    capture(s, "held-task");
    capture(s, "orphan-task");
    layCharge(s, "held-task", "frame-vik");
    layCharge(s, "orphan-task", "frame-vik");
    layCharge(s, "orphan-task", "frame-tam"); // louder dukkha
    // one live frame, whose lineage holds held-task's now but not orphan-task's:
    now(s, "now-priya");
    s.layP(`now-priya~because~${storyNow("held-task")}`, "priya holds it", "now-priya", storyNow("held-task"), "q-grounding");

    const floating = floatingCharge(s, ["now-priya"]);
    expect(floating.map((f) => f.story)).toEqual(["orphan-task"]); // held-task is held
    expect(floating[0]!.charges).toBe(2);
  });

  it("an idle open differential is calm, and a closed one is discharging — neither floats", () => {
    const s = new Society();
    capture(s, "idle-task");
    capture(s, "closed-task");
    unpackPoles(s, "idle-task"); // open, zero charge — calm
    layCharge(s, "closed-task", "frame-vik");
    closePole(s, "closed-task"); // actual — discharging normally, not floating
    expect(floatingCharge(s, [])).toEqual([]); // even with NO live grounds at all
  });

  it("loudest first — sorted by charge, never silently filtered", () => {
    const s = new Society();
    capture(s, "quiet");
    capture(s, "loud");
    layCharge(s, "quiet", "frame-a");
    layCharge(s, "loud", "frame-a");
    layCharge(s, "loud", "frame-b");
    layCharge(s, "loud", "frame-c");
    const floating = floatingCharge(s, []);
    expect(floating.map((f) => f.story)).toEqual(["loud", "quiet"]);
  });
});

describe("overload — total voltage grounded through one lineage", () => {
  it("sums every story's grounded voltage and returns raw readings, loudest first", () => {
    const s = new Society();
    capture(s, "task-a");
    capture(s, "task-b");
    layCharge(s, "task-a", "frame-vik"); // v=2 for its own ground
    layCharge(s, "task-b", "frame-vik");
    layCharge(s, "task-b", "frame-tam"); // v=3 for its own ground
    // one lineage grounds BOTH stories (a frame holding two lines):
    now(s, "now-priya");
    for (const t of ["task-a", "task-b"]) {
      s.layP(`now-priya~holds~${t}`, "priya's line", "now-priya", storyNow(t), "q-grounding");
    }
    // priya's ground reaches each story's whole course through its now-lineage:
    const o = overload(s, "now-priya");
    expect(o.readings.map((r) => r.story)).toEqual(["task-b", "task-a"]); // sorted desc
    expect(o.total).toBe(voltageOf(s, "task-a", "now-priya") + voltageOf(s, "task-b", "now-priya"));
    expect(o.total).toBe(5);
  });

  it("a closed line drops out of the load; nothing else is filtered", () => {
    const s = new Society();
    capture(s, "task-a");
    layCharge(s, "task-a", "frame-vik");
    expect(overload(s, storyNow("task-a")).total).toBe(2);
    closePole(s, "task-a");
    expect(overload(s, storyNow("task-a")).total).toBe(0);
  });
});
