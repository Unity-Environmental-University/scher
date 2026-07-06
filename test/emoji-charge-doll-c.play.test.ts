// ─────────────────────────────────────────────────────────────────────────────
// emoji-charge-doll-c.play.test.ts — DOLL C: "emoji AS flavored charge."
// Committee charter's third shape: 🔥 on an OPEN task isn't a reaction on a closed beat —
// it's a CHARGE-PREHENSION onto the task's open End that also carries the glyph, so
// voltage could read as a spectrum by emoji ("this task's pressure is 3×🔥 1×😱").
//
// PREMISE CHECK FIRST, against the address law (society.ts:139-153, assertNakedPole):
// "an open End-pole receives ONLY charge-prehensions onto it and, eventually, the ONE
// closing q-grounding out of it." A charge-prehension is a BARE edge — no quality, per
// chargesOn's own definition (`!hasAnyQuality(soc, b.slug, asOf)`). So "a charge that
// also carries the glyph" cannot mean a q-feel-flavored charge (q-feel IS a quality —
// laying it onto an open End throws, per address-law.test.ts:18-25, tested again below
// to confirm live). The ONLY honest slot for the flavor is exactly what the charter's own
// closing line already guesses: the CONTENT of the bare charge edge itself — `content`
// is a plain string field on every EventRow (society.ts:19), charge or not, and chargesOn
// never inspects it. No new quality gets minted; the glyph rides in the one field every
// charge already has for free.
//
// Persons: Ivo who triages (presses charges with a glyph in the content), Naz who reads
// the spectrum at standup.
//
// Run: cd scher && npx vitest run emoji-charge-doll-c.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, layCharge, chargesOn, unpackPoles, voltageOf, endActual } from "../src/society.js";

function node(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}

describe("DOLL C — emoji as flavored charge: the glyph rides in a bare charge's content", () => {
  it("layCharge already accepts free-text content — the glyph rides there, no new quality, no kernel branch", () => {
    const s = new Society();
    node(s, "task", "fix the login bug");
    unpackPoles(s, "task");
    layCharge(s, "task", "ivo", "🔥 this is on fire in prod");
    layCharge(s, "task", "ivo", "🔥 again, still on fire");
    layCharge(s, "task", "naz", "😱 customers are noticing");

    const end = unpackPoles(s, "task").end;
    const charges = chargesOn(s, end);
    expect(charges.map((c) => c.content)).toEqual([
      "🔥 this is on fire in prod",
      "🔥 again, still on fire",
      "😱 customers are noticing",
    ]);
  });

  it("a spectrum read: 'this task's pressure is 3×🔥 1×😱' is a derived tally over chargesOn's content, exactly like Doll A's reactionsOn tally — same shape, one layer down (charges instead of reactions)", () => {
    const s = new Society();
    node(s, "task", "fix the login bug");
    unpackPoles(s, "task");
    for (const glyph of ["🔥", "🔥", "🔥", "😱"]) layCharge(s, "task", "someone", `${glyph} felt need`);

    const end = unpackPoles(s, "task").end;
    const tally = new Map<string, number>();
    for (const c of chargesOn(s, end)) {
      const glyph = [...c.content][0]; // first Unicode code point — an honest read of content, never the slug
      tally.set(glyph, (tally.get(glyph) ?? 0) + 1);
    }
    expect(Object.fromEntries(tally)).toEqual({ "🔥": 3, "😱": 1 });
    // note: voltageOf itself stays a scalar (society.ts:768-804) — this spectrum is a
    // read ALONGSIDE voltage, not a replacement for it; voltage answers "is there
    // pressure," the spectrum answers "what flavor." Two different questions, two reads,
    // no conflict.
  });

  it("BREAK IT against the address law: a q-feel-FLAVORED charge (a quality-carrying edge) onto the open End throws — confirms the charter's own hedge that a 'flavored charge' can only mean content, never a quality, on a naked pole", () => {
    const s = new Society();
    node(s, "task", "fix the login bug");
    const u = unpackPoles(s, "task");
    expect(() => s.layP("bad-flavor", "🔥", "ivo", u.end, "q-feel")).toThrowError(/ADDRESS LAW.*ONTO the open End-pole/s);
    // the bare charge (layCharge, tested above) is the ONLY route the address law leaves
    // open for putting an emoji anywhere near an open End. This is not a workaround; it's
    // the law's whole point — chargesOn reads bare edges precisely so nothing else can be
    // parked on the pole to muddy the count, glyph or not.
  });

  it("BREAK IT (does voltage change SHAPE once glyphs are in content?): no — voltageOf never inspects content (society.ts:768-804, chargesOn likewise), so flavoring charges is purely additive: voltage is exactly what it was, the spectrum is a new read riding the same ink, for free", () => {
    const s = new Society();
    node(s, "task", "fix the login bug");
    node(s, "task-plain", "a task with no glyphs at all");
    unpackPoles(s, "task");
    unpackPoles(s, "task-plain");
    layCharge(s, "task", "ivo", "🔥 on fire");
    layCharge(s, "task-plain", "ivo", "plain charge, no glyph");
    // same voltage shape for a flavored vs. unflavored task — 1 (bare strike) + 1 (charge
    // grounds the story's own now) = 2, per voltageOf's own accounting; glyph presence in
    // content changes nothing about the number:
    expect(voltageOf(s, "task")).toBe(voltageOf(s, "task-plain"));
    expect(endActual(s, unpackPoles(s, "task").end)).toBe(false); // still open — flavoring a charge doesn't close anything
  });

  it.todo("does a flavored-charge spectrum need its own read function (spectrumOn?) once more than one doll wants it, or does 'fold chargesOn, take the first code point' stay a one-off per caller? — a FENCED question, not decided here: making it a shared function is new structure and needs the meta-law's one-sentence-law-and-guard, not assumed by this doll");
  it.todo("mixed content charges — some glyph-first, some plain-English with no leading emoji — how should a spectrum read fold non-glyph charges? (silently drop, bucket as 'unflavored'?) no read exists to test against yet");
});
