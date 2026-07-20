// ─────────────────────────────────────────────────────────────────────────────
// voltage.test.ts — "Capture strikes a voltage; marking voltage lays charge; done
// closes the circuit; nothing ever un-happens."
//   — Hallie's F-A ruling, 2026-07-06 (docs/committees/2026-07-06-F-A-ruled-voltage.md)
// plus the same-morning pole rulings: an event is ONE event until lazily unpacked into
// the THREE poles; voltage takes a GROUND (the reading frame's now-lineage head — default
// the story's own frame under SOFD); discharge PROPAGATES by ordinary reachability, never
// a global zero; the closed circuit is a literal because-path End → Now-lineage → Once.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  unpackPoles,
  storyNow,
  layCharge,
  closePole,
  chargesOn,
  voltageOf,
  endActual,
  isStory,
  endOf,
  reaches,
  reopenTask,
} from "../src/index.js";

const capture = (s: Society, slug: string, content: string) =>
  s.lay({ slug, content, subject: null, object: null });

describe("three poles: capture · charge · done · reopen (default ground)", () => {
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

  it("the unpack lays the story's own Now, because its Once (Now is because events)", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    const p = unpackPoles(s, "buy-milk");
    expect(p.now).toBe(storyNow("buy-milk"));
    expect(s.has(p.now)).toBe(true);
    expect(reaches(s, p.now, "buy-milk", "q-grounding")).toBe(true); // Now ~because~ Once
  });

  it("a charge is FIRST NEED: a bare edge FROM the open End (pure address, no quality word — the End prehends the capture)", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    const c0 = layCharge(s, "buy-milk", "frame-hallie"); // no prior unpack — the charge performs it
    expect(isStory(s, "buy-milk")).toBe(true); // unpacked by first need
    expect(voltageOf(s, "buy-milk")).toBe(2); // 1 (open) + 1 charge
    layCharge(s, "buy-milk", "frame-hallie", "noticed again at the fridge");
    expect(voltageOf(s, "buy-milk")).toBe(3); // re-noticing = more charge, same differential
    const end = endOf(s, "buy-milk")!;
    expect(chargesOn(s, end).map((c) => c.slug)).toContain(c0);
    expect(chargesOn(s, end).length).toBe(2);
    expect(s.get(c0)!.subject).toBe(end); // the charge is a property of the EDGE — the End prehends the capture
    expect(s.has(`${c0}~q`)).toBe(false); // bare — no quality word minted
  });

  it("done closes the circuit — a literal because-path End → Now-lineage → Once", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    const p = unpackPoles(s, "buy-milk");
    // open story: NO because-path from the End
    expect(reaches(s, p.end, "buy-milk", "q-grounding")).toBe(false);
    layCharge(s, "buy-milk", "frame-hallie");
    layCharge(s, "buy-milk", "frame-hallie");
    closePole(s, "buy-milk"); // end ~because~ storyNow — the Now of its closing
    expect(endActual(s, p.end)).toBe(true);
    expect(voltageOf(s, "buy-milk")).toBe(0); // circuit closed for its own frame
    // the closed circuit IS a closed path: End → Now → Once, all because-edges
    expect(reaches(s, p.end, "buy-milk", "q-grounding")).toBe(true);
    // nothing un-happened: the charges and the designation are all still in the log.
    expect(chargesOn(s, p.end).length).toBe(2);
    expect(s.get(p.pole)).toBeDefined();
  });

  it("reopen is a NEW unpack (new differential); Thursday's holding stays actual forever", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    const p = unpackPoles(s, "buy-milk");
    closePole(s, "buy-milk");
    expect(voltageOf(s, "buy-milk")).toBe(0);
    const r = reopenTask(s, "buy-milk"); // a new differential — never an un-doing
    expect(r.end).not.toBe(p.end);
    expect(voltageOf(s, "buy-milk")).toBe(1); // open again across the new differential
    expect(endActual(s, p.end)).toBe(true); // Thursday's holding still actual
    expect(endActual(s, r.end)).toBe(false); // the new End is open
  });
});

describe("voltage takes a ground; discharge propagates (rulings 1+2, 2026-07-06)", () => {
  it("a frame that never witnessed the story reads zero — voltage is always relative", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    layCharge(s, "buy-milk", "frame-hallie");
    s.lay({ slug: "now-bob", content: "Bob's Now", subject: null, object: null });
    expect(voltageOf(s, "buy-milk")).toBe(2); // the story's own ground
    expect(voltageOf(s, "buy-milk", "now-bob")).toBe(0); // nothing established to Bob
  });

  it("two frames, one closing, staggered establishment — 'done, still discharging', no global zero", () => {
    const s = new Society();
    capture(s, "buy-milk", "buy milk");
    unpackPoles(s, "buy-milk");
    const c0 = layCharge(s, "buy-milk", "frame-hallie");
    // Bob's lineage witnesses the story and its charge (established_to his ground):
    s.lay({ slug: "now-bob", content: "Bob's Now", subject: null, object: null });
    s.layP("now-bob~because~buy-milk", "bob witnessed the story", "now-bob", "buy-milk", "q-grounding");
    s.layP(`now-bob~because~${c0}`, "bob witnessed the charge", "now-bob", c0, "q-grounding");
    expect(voltageOf(s, "buy-milk", "now-bob")).toBe(2);

    // the story's frame closes the circuit —
    const closing = closePole(s, "buy-milk");
    expect(voltageOf(s, "buy-milk")).toBe(0); // closed where it closed
    // — but the closing has NOT established to Bob yet: residual voltage, honestly read.
    expect(voltageOf(s, "buy-milk", "now-bob")).toBe(2); // done, still discharging

    // the closing establishes to Bob by ordinary reachability (no special-case zeroing):
    s.layP(`now-bob~because~${closing}`, "the closing reached bob", "now-bob", closing, "q-grounding");
    expect(voltageOf(s, "buy-milk", "now-bob")).toBe(0); // discharged to Bob too
  });
});
