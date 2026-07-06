// ─────────────────────────────────────────────────────────────────────────────
// voltage.test.ts — "Capture strikes a voltage; marking voltage lays charge; done
// closes the circuit; nothing ever un-happens."
//   — Hallie's F-A ruling, 2026-07-06 (docs/committees/2026-07-06-F-A-ruled-voltage.md)
//
// A task IS a story whose End-pole is not yet actual. Voltage is read ACROSS the poles,
// stored in neither; charge is the append-only write it derives from; done = a
// holding-done event grounds the End; reopen = a new lure, never an un-doing.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  captureTask,
  layCharge,
  voltageOf,
  isStory,
  endOf,
  groundedForAnyFrame,
  prehensionsOnto,
  reopenTask,
} from "../src/index.js";

describe("task-as-story: capture · charge · done · reopen", () => {
  it("capture strikes a voltage: the task is a story with an open differential", () => {
    const s = new Society();
    const t = captureTask(s, "buy-milk", "buy milk");
    expect(isStory(s, "buy-milk")).toBe(true); // one mechanism, two former problems
    expect(endOf(s, "buy-milk")).toBe(t.end);
    expect(groundedForAnyFrame(s, t.end)).toBe(false); // the End is not yet actual
    expect(voltageOf(s, "buy-milk")).toBe(1); // the strike itself — open, present
  });

  it("marking voltage lays charge; the derived read rises; no duplicate task is minted", () => {
    const s = new Society();
    captureTask(s, "buy-milk", "buy milk");
    layCharge(s, "buy-milk", "frame-hallie");
    expect(voltageOf(s, "buy-milk")).toBe(2);
    layCharge(s, "buy-milk", "frame-hallie", "noticed again at the fridge");
    expect(voltageOf(s, "buy-milk")).toBe(3); // re-noticing = more charge, same differential
    expect(s.has("buy-milk~charge-0") && s.has("buy-milk~charge-1")).toBe(true);
  });

  it("done closes the circuit: voltage reads zero, every prior event stays readable", () => {
    const s = new Society();
    const t = captureTask(s, "buy-milk", "buy milk");
    layCharge(s, "buy-milk", "frame-hallie");
    layCharge(s, "buy-milk", "frame-hallie");
    // the holding-done event lands as/grounds the End-pole (a q-grounding onto the End):
    s.layP(`now-hallie~holds-done~${t.end}`, "held done (frame: buy-milk)", "now-hallie", t.end, "q-grounding");
    expect(groundedForAnyFrame(s, t.end)).toBe(true);
    expect(voltageOf(s, "buy-milk")).toBe(0); // circuit closed
    // nothing un-happened: the charges and the lure are all still in the log, readable.
    expect(prehensionsOnto(s, "buy-milk", "q-charge").length).toBe(2);
    expect(s.get(t.lure)).toBeDefined();
  });

  it("reopen strikes a NEW differential; Thursday's holding stays actual forever", () => {
    const s = new Society();
    const t = captureTask(s, "buy-milk", "buy milk");
    s.layP(`now-hallie~holds-done~${t.end}`, "held done Thursday", "now-hallie", t.end, "q-grounding");
    expect(voltageOf(s, "buy-milk")).toBe(0);
    const r = reopenTask(s, "buy-milk"); // a new lure — never an un-doing
    expect(r.end).not.toBe(t.end);
    expect(voltageOf(s, "buy-milk")).toBe(1); // open again across the new differential
    expect(groundedForAnyFrame(s, t.end)).toBe(true); // Thursday's holding still actual
    expect(endOf(s, "buy-milk")).toBeDefined(); // still a story, both lures readable
  });
});
