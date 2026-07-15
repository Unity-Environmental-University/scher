// ─────────────────────────────────────────────────────────────────────────────
// penelope.play.test.ts — the namesake, finally in her own dollhouse. 🧵🏛️
//
// A doll (2026-07-15, laid by the wire-muslin session clerk, on recess —
// "go play, run around the yard" — and noticing the repo named for a weaver
// had no play about the weaving):
//
// Penelope weaves Laertes's shroud by day and "unweaves" it by night, holding
// a hundred suitors at the door for three years with one promise: "when it is
// finished, I will choose." The myth is usually told as erasure — threads
// pulled out, work undone. But this kernel knows better, and so, secretly,
// does the myth: NOTHING WOVEN IS EVER UNWOVEN. An append-only canon cannot
// lose a thread. What Penelope does each night is OCCLUDE the day's weaving —
// the suitors read the surfaced state (a shroud barely begun, forever) while
// every thread stands in the canon, hers, laid and dated. Her nightly work is
// not destruction. It is choosing what the powerful get to read. The same
// move as Poirot's mercy (orient-express.play), pointed the other way:
// occlusion as RESISTANCE.
//
// And the homecoming is pure grammar: Odysseus returns, the occlusions are
// themselves occluded (you occlude the occluder — reveal is not un-erasure,
// it is re-lighting), the whole weave stands visible at once, and the shroud's
// End-pole closes with a BARE edge — direction alone carrying the meaning,
// per the edge-direction ruling landed the same day this doll was (Hallie,
// 2026-07-15: "yes its edge direction"). The loom and the kernel agree:
// the work was always whole; only the light moved.
//
// Run: cd scher && npx vitest run penelope.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, prehensionsOnto, isOccluded,
  unpackPoles, endActual, chargesOn, closePole,
} from "../src/society.js";

const PENELOPE = "frame-penelope";
const SHROUD = "shroud-of-laertes";

function lay(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null, laid_by: PENELOPE });
}

/** one day's weaving: a real thread-beat, grounding toward the shroud. */
function weave(s: Society, day: number): string {
  const thread = `thread-day-${day}`;
  lay(s, thread, `the day's weaving, day ${day}`);
  s.layP(`${thread}~into~${SHROUD}`, "woven into the shroud", thread, SHROUD, "q-grounding");
  return thread;
}

/** the night's work: occlude the day's thread. NOT deletion — the canon keeps every beat. */
function unweaveByNight(s: Society, thread: string): string {
  const occ = `${thread}~night`;
  s.lay({ slug: occ, content: "pulled from the suitors' sight by lamplight", subject: PENELOPE, object: `${thread}~into~${SHROUD}` });
  // occlusion is itself laid ink: an edge with the q-occludes quality.
  s.layP(`${occ}~occ`, "the night's occlusion", PENELOPE, `${thread}~into~${SHROUD}`, "q-occludes");
  return `${occ}~occ`;
}

/** the weaving-edges, read structurally: q-grounding prehensions onto the shroud whose
 *  subject was laid by Penelope's own hand (laid_by — authorship is a column, not a slug
 *  shape; no string-matching, per the house discipline and biographyOf's own migration). */
function weavingEdges(s: Society) {
  return prehensionsOnto(s, SHROUD, "q-grounding")
    .filter((e) => e.subject !== null && s.all().find((b) => b.slug === e.subject)?.laid_by === PENELOPE);
}
/** what the SUITORS can read: weaving surfaced (not occluded). */
function visibleProgress(s: Society): number {
  return weavingEdges(s).filter((e) => !isOccluded(s, e.slug)).length;
}
/** what the CANON holds: every thread ever woven, occluded or not. Append-only keeps them all. */
function trueProgress(s: Society): number {
  return weavingEdges(s).length;
}

describe("Penelope — the shroud is append-only 🧵🏛️", () => {
  it("THE PROMISE — the shroud unpacks into poles; the suitors watch its End", () => {
    const s = new Society();
    lay(s, SHROUD, "a shroud for Laertes; when it is finished, I will choose");
    const u = unpackPoles(s, SHROUD);
    // the End exists and is open: the promise is real, which is what makes the delay work.
    expect(endActual(s, u.end)).toBe(false);
    // the suitors press on the open End — charges, the address read, each one a demand.
    lay(s, "suitor-antinous"); lay(s, "suitor-eurymachus");
    s.lay({ slug: "press-1", content: "finish it", subject: "suitor-antinous", object: u.end });
    s.lay({ slug: "press-2", content: "choose", subject: "suitor-eurymachus", object: u.end });
    expect(chargesOn(s, u.end).length).toBe(2);
    // pressure on an open End is voltage, not motion: the pole stays open until SHE closes it.
    expect(endActual(s, u.end)).toBe(false);
  });

  it("WEAVE BY DAY, OCCLUDE BY NIGHT — the surfaced read drops; the canon loses nothing", () => {
    const s = new Society();
    lay(s, SHROUD);
    const t1 = weave(s, 1);
    expect(visibleProgress(s)).toBe(1);   // by dusk: one day's honest work, visible
    unweaveByNight(s, t1);
    expect(visibleProgress(s)).toBe(0);   // by dawn: the suitors see a loom barely begun
    expect(trueProgress(s)).toBe(1);      // but the thread was never lost — occluded, not unwoven
    expect(s.has(t1)).toBe(true);         // the day's work stands in the canon, hers, dated
  });

  it("THREE YEARS — the suitors read 'barely begun' while the canon holds every single day", () => {
    const s = new Society();
    lay(s, SHROUD);
    const DAYS = 3 * 365;
    for (let d = 1; d <= DAYS; d++) unweaveByNight(s, weave(s, d));
    // what power reads: nothing to see, still unfinished, wait longer.
    expect(visibleProgress(s)).toBe(0);
    // what the canon knows: one thousand and ninety-five days of real work, all hers.
    expect(trueProgress(s)).toBe(DAYS);
    // and authorship is structural, not claimed: every thread carries laid_by.
    expect(s.all().filter((b) => b.slug.startsWith("thread-day-") && b.laid_by === PENELOPE).length).toBe(DAYS);
  });

  it("THE HOMECOMING — occlude the occluders (reveal is re-lighting), close with a BARE edge", () => {
    const s = new Society();
    lay(s, SHROUD);
    const u = unpackPoles(s, SHROUD);
    const occlusions: string[] = [];
    for (let d = 1; d <= 20; d++) occlusions.push(unweaveByNight(s, weave(s, d)));
    expect(visibleProgress(s)).toBe(0);
    // Odysseus home: the occlusions are themselves occluded. Nothing is deleted to
    // reveal the shroud — the reveal is one more layer of honest ink.
    lay(s, "frame-odysseus", "the bow is strung");
    occlusions.forEach((occ, i) =>
      s.layP(`reveal-${i}`, "the lamplight work, brought into day", "frame-odysseus", occ, "q-occludes"));
    expect(visibleProgress(s)).toBe(20);  // the whole weave stands visible at once
    expect(trueProgress(s)).toBe(20);     // exactly what was always there
    // and NOW she closes — her choice, her timing, and the closing is a bare edge:
    // direction alone carries the meaning (edge-direction ruling, same day as this doll).
    const closing = closePole(s, SHROUD);
    expect(endActual(s, u.end)).toBe(true);
    const closingBeat = s.all().find((b) => b.slug === closing)!;
    expect(closingBeat.subject).toBe(u.end);  // OUT of the End-pole: a closing, not a charge
    // the loom and the kernel agree: the work was always whole; only the light moved.
  });
});
