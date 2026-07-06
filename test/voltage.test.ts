// ─────────────────────────────────────────────────────────────────────────────
// voltage.test.ts — "Capture strikes a voltage; marking voltage lays charge; done
// closes the circuit; nothing ever un-happens."
//   — Hallie's F-A ruling, 2026-07-06 (docs/committees/2026-07-06-F-A-ruled-voltage.md)
// and, same morning, the pole law: "An event is one event until it's lazily unpacked
// into the THREE poles" — the end, when actual, is because Now.
//
// Voltage is read ACROSS the unpacked differential, stored in nowhere; charge is the
// append-only write it derives from; done = `end ~because~ now` (the End actual because
// the Now of its closing); reopen = a new unpack, never an un-doing.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  unpackPoles,
  layCharge,
  voltageOf,
  endActual,
  isStory,
  endOf,
  prehensionsOnto,
  reopenTask,
} from "../src/index.js";

const capture = (s: Society, slug: string, content: string) =>
  s.lay({ slug, content, subject: null, object: null });

describe("three poles: capture · charge · done · reopen", () => {
  it("a capture is ONE event; the unpack opens the differential and voltage reads present", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    expect(voltageOf(s, "buy-milk")).toBe(0); // one event — no poles, no differential
    const p = unpackPoles(s, "buy-milk"); // first need: explicit story elaboration
    expect(isStory(s, "buy-milk")).toBe(true);
    expect(endOf(s, "buy-milk")).toBe(p.end);
    expect(endActual(s, p.end)).toBe(false); // the End is not yet actual (scripted)
    expect(voltageOf(s, "buy-milk")).toBe(1); // the open strike — voltage present
  });

  it("a charge is FIRST NEED: it unpacks lazily, and the derived read rises — never a duplicate task", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    layCharge(s, "buy-milk", "frame-hallie"); // no prior unpack — the charge performs it
    expect(isStory(s, "buy-milk")).toBe(true); // unpacked by first need
    expect(voltageOf(s, "buy-milk")).toBe(2); // 1 (open) + 1 charge
    layCharge(s, "buy-milk", "frame-hallie", "noticed again at the fridge");
    expect(voltageOf(s, "buy-milk")).toBe(3); // re-noticing = more charge, same differential
    expect(s.has("buy-milk~charge-0") && s.has("buy-milk~charge-1")).toBe(true);
  });

  it("done closes the circuit — end because now — voltage zero, every prior event readable", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    const p = unpackPoles(s, "buy-milk");
    layCharge(s, "buy-milk", "frame-hallie");
    layCharge(s, "buy-milk", "frame-hallie");
    // the pole law's closing move: the End, now actual, is because the Now of its closing.
    s.layP(`${p.end}~because~now-hallie`, "the end is because now (frame: buy-milk)", p.end, "now-hallie", "q-grounding");
    expect(endActual(s, p.end)).toBe(true);
    expect(voltageOf(s, "buy-milk")).toBe(0); // circuit closed
    // nothing un-happened: the charges and the designation are all still in the log.
    expect(prehensionsOnto(s, "buy-milk", "q-charge").length).toBe(2);
    expect(s.get(p.pole)).toBeDefined();
  });

  it("reopen is a NEW unpack (new differential); Thursday's holding stays actual forever", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    const p = unpackPoles(s, "buy-milk");
    s.layP(`${p.end}~because~now-hallie`, "held done Thursday", p.end, "now-hallie", "q-grounding");
    expect(voltageOf(s, "buy-milk")).toBe(0);
    const r = reopenTask(s, "buy-milk"); // a new differential — never an un-doing
    expect(r.end).not.toBe(p.end);
    expect(voltageOf(s, "buy-milk")).toBe(1); // open again across the new differential
    expect(endActual(s, p.end)).toBe(true); // Thursday's holding still actual
    expect(endActual(s, r.end)).toBe(false); // the new End is open
  });
});
