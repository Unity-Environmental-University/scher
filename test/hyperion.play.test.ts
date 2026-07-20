// ─────────────────────────────────────────────────────────────────────────────
// hyperion.play.test.ts — the Shrike walks into an append-only canon. 🌵⏳
//
// A doll (2026-07-16, the afternoon's clerk, on recess — Hallie: "wanna do —
// Dan Simmons Hyperion? ::evil grin::"). The grin is earned: Hyperion is the
// adversarial fixture — anti-time, backward aging, a monster whose causation
// runs against the arrow. The book that walks up to a future-prehends-past
// kernel and dares it.
//
// PRIOR ART, honored: kalpa/hyperion/ (2026-06-30) already stress-tested the
// grammar on this book and won two laws — the holds-sealed interval, and
// NEGATIVE-CAPABILITY.md's finding that the engine "needs grace toward the
// not-yet-concresced": the Templar's unfinished tale is Becoming, not
// malformed. That finding PREDICTED the 2026-07-06 three-pole ruling (scripted
// Ends). This doll attests the prophecy landed. The design docs never got a
// doll; this is it.
//
//   THE PILGRIMAGE   — six tellings, one road: readings are frames' own beats;
//                      none privileged (mind-line's law, six-fold).
//   THE TEMPLAR      — negative capability in the type system: an End held
//                      open BY RIGHT. Alive, unfinished, no guard smacks.
//   MERLIN'S SICKNESS— Rachel ages backward: her HEAD knows ever less, but the
//                      canon is append-only — the graph holds what she loses.
//                      Sol's grief is a succession chain read in full.
//   THE TIME TOMBS   — anti-entropic, honestly: witnessed order runs AGAINST
//                      insertion order (explicit backdating is legal). Laid
//                      forward, they open backward. Append-only survives.
//   THE SHRIKE       — the future already prehends you: a scripted event whose
//                      End never actualizes, whose edges already grip the
//                      present. Grammatical. That is the horror.
//   THE CYBRID       — Keats rebuilt from the archive: continuity is edges
//                      onto the records, never identity. A read, not a stored
//                      fact — negative capability applied to selfhood.
//
// Run: cd scher && npx vitest run hyperion.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, prehensionsFrom, prehensionsOnto, visibleAt,
  unpackPoles, endActual, closePole,
} from "../src/society.js";

const lay = (s: Society, slug: string, content = slug) => {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
};
const grounds = (s: Society, later: string, earlier: string) => {
  lay(s, later); lay(s, earlier);
  s.layP(`${later}~because~${earlier}`, "grounds in", later, earlier, "q-grounding");
};
/** a pilgrim tells: a reading-beat, theirs (laid_by), of the road. DIRECTION (Hallie,
 *  2026-07-20, "story-flip-q-feel-direction", first sitting): the abiding thing (the
 *  road, read again and again) is the subject; each telling is the object of its own
 *  reading-edge. DETERMINATION (2026-07-20, final "story-emoji-as-node" ruling): this
 *  is a metaphorical/lateral q-feel use — object is an arbitrary gathered occasion (a
 *  telling), never an emoji reaction — unaffected by the emoji-node/authorship-row
 *  shape; unchanged. */
const tells = (s: Society, pilgrim: string, tale: string, of: string) => {
  lay(s, of);
  if (!s.has(tale)) s.lay({ slug: tale, content: tale, subject: null, object: null, laid_by: pilgrim });
  s.layP(`${tale}~of~${of}`, "a reading of", of, tale, "q-feel");
};

describe("Hyperion — the Shrike walks into an append-only canon 🌵⏳", () => {
  it("THE PILGRIMAGE — six tellings of one road, none privileged", () => {
    const s = new Society();
    lay(s, "the-road-to-the-tombs");
    const pilgrims = ["hoyt", "kassad", "silenus", "weintraub", "lamia", "consul"];
    for (const p of pilgrims) tells(s, `frame-${p}`, `tale-of-${p}`, "the-road-to-the-tombs");
    const readings = prehensionsFrom(s, "the-road-to-the-tombs", "q-feel");
    expect(readings.length).toBe(6);
    // each telling belongs to its teller; the road stores no verdict of its own
    const tellers = new Set(readings.map((r) => s.get(r.object!)?.laid_by));
    expect(tellers.size).toBe(6);
  });

  it("THE TEMPLAR — an End held open BY RIGHT: Becoming, not malformed", () => {
    const s = new Society();
    lay(s, "het-masteens-tale", "the tale never finished; the Templar vanished");
    const poles = unpackPoles(s, "het-masteens-tale");
    grounds(s, "het-masteens-tale", "the-erg-binding"); // it has a source, a Time…
    // …and an End NOT-YET-REACHED. The 6/30 finding demanded the engine hold
    // this without irritable reaching after a resolution. The scripted End is
    // exactly that grace: it exists, unclosed, and nothing smacks.
    expect(s.has(poles.end)).toBe(true);
    expect(endActual(s, poles.end)).toBe(false);
    // negative capability: still Becoming after more canon arrives around it
    lay(s, "windwagon-sails-on");
    grounds(s, "windwagon-sails-on", "het-masteens-tale");
    expect(endActual(s, poles.end)).toBe(false);
  });

  it("MERLIN'S SICKNESS — Rachel's head knows less; the canon holds what she loses", () => {
    const s = new Society();
    // her versions succeed each other as she ages BACKWARD — each head smaller
    s.lay({ slug: "rachel-27", content: "the Sphinx; the dig; Amelio; all of it", subject: null, object: null });
    s.lay({ slug: "rachel-24", content: "the dig; Amelio", subject: null, object: null });
    s.layP("rachel-24~succeeds~rachel-27", "the sickness takes three years", "rachel-24", "rachel-27", "q-succeeds");
    s.lay({ slug: "rachel-5", content: "her father's face", subject: null, object: null });
    s.layP("rachel-5~succeeds~rachel-24", "the sickness takes the rest", "rachel-5", "rachel-24", "q-succeeds");
    // an edge laid onto the 27-year-old — her published dig findings — SURVIVES:
    grounds(s, "the-dig-findings", "rachel-27");
    // append-only: nothing she forgets is unwoven. The relation to her earliest
    // version still stands in the record even when the head is an infant.
    expect(prehensionsOnto(s, "rachel-27", "q-grounding").length).toBe(1);
    // Sol's read is the whole chain — grief is a succession traversed in full:
    const chain = [
      ...prehensionsFrom(s, "rachel-5", "q-succeeds").map((e) => e.object),
      ...prehensionsFrom(s, "rachel-24", "q-succeeds").map((e) => e.object),
    ];
    expect(chain).toEqual(["rachel-24", "rachel-27"]); // he can walk her back to everything
  });

  it("THE TIME TOMBS — laid forward, they open backward (witnessed against insertion)", () => {
    const s = new Society();
    lay(s, "the-valley");
    // The Tombs are laid in FORWARD insertion order with BACKWARD witnesses —
    // explicit backdating is legal; the clock ratchets on max; nothing is ever
    // rewritten. Anti-time without breaking append-only. Each tomb's presence
    // in the valley is an edge + its ~q mode beat, both carrying the backdate
    // (raw rows, the conformance corpus's own idiom):
    const entomb = (tomb: string, w: number) => {
      s.lay({ slug: tomb, content: tomb, subject: null, object: null, witnessed: w });
      s.lay({ slug: `${tomb}~in~the-valley`, content: "stands in the valley", subject: tomb, object: "the-valley", witnessed: w });
      s.lay({ slug: `${tomb}~in~the-valley~q`, content: "q", subject: null, object: "q-grounding", witnessed: w });
    };
    entomb("tomb-sphinx", 90);           // laid first, opens LAST
    entomb("tomb-obelisk", 80);
    entomb("tomb-crystal-monolith", 70); // laid last, ALREADY open earliest
    const open = (asOf: number) =>
      prehensionsOnto(s, "the-valley", "q-grounding", asOf).map((e) => e.subject);
    // deep past: only the LAST-LAID tomb is there
    expect(open(75)).toEqual(["tomb-crystal-monolith"]);
    // moving forward in witnessed time, they open in REVERSE insertion order
    expect(open(85)).toEqual(["tomb-obelisk", "tomb-crystal-monolith"]);
    expect(open(95)).toEqual(["tomb-sphinx", "tomb-obelisk", "tomb-crystal-monolith"]);
  });

  it("THE SHRIKE — a scripted future that already prehends you", () => {
    const s = new Society();
    lay(s, "the-shrike", "it belongs to the tombs; it moves against the tide");
    const shrike = unpackPoles(s, "the-shrike");
    for (const p of ["hoyt", "kassad", "silenus", "weintraub", "lamia", "consul"]) {
      lay(s, `pilgrim-${p}`);
      grounds(s, "the-shrike", `pilgrim-${p}`); // the future's grip on the present: LEGAL
    }
    // its End never actualizes — it is always still coming —
    expect(endActual(s, shrike.end)).toBe(false);
    // — and yet it already holds all six in its grounds. The grammar permits
    // this shape (a scripted story prehends its capture the same way, ruled
    // this very afternoon). The horror was never illegal. It was future perfect.
    expect(prehensionsFrom(s, "the-shrike", "q-grounding").length).toBe(6);
  });

  it("THE CYBRID — Keats rebuilt from the archive: continuity is a read, never identity", () => {
    const s = new Society();
    // the poet perished, whole and closed, 1821
    lay(s, "john-keats", "here lies one whose name was writ in water");
    unpackPoles(s, "john-keats");
    closePole(s, "john-keats");
    lay(s, "the-letters", "negative capability, the vale of soul-making");
    grounds(s, "the-letters", "john-keats");
    // the cybrid is a NEW event, laid by another hand, grounded in the records
    s.lay({ slug: "cybrid-keats", content: "an identity held without irritable reaching after 'is it really him'", subject: null, object: null, laid_by: "frame-technocore" });
    grounds(s, "cybrid-keats", "the-letters");
    // distinct beats; the claim of continuity is EDGES onto the archive:
    expect(s.get("cybrid-keats")!.laid_by).toBe("frame-technocore");
    expect(prehensionsFrom(s, "cybrid-keats", "q-grounding").some((e) => e.object === "the-letters")).toBe(true);
    // and the poet's own closing is untouched by the succession claim —
    // nothing is resurrected, something new grounds in what remains.
    expect(prehensionsFrom(s, "cybrid-keats", "q-grounding").some((e) => e.object === "john-keats")).toBe(false);
  });
});
