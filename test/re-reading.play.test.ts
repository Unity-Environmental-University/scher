// ─────────────────────────────────────────────────────────────────────────────
// re-reading.play.test.ts — a READING is itself an event. 🔁👁️
//
// A doll (2026-06-26, Hallie: "can you model your own view of it? can we include updated
// understandings of events from different positions?").
//
// THE FIND: an event is perished data (fixed). But a READING of it — why it happened, what
// it was FOR, from a position — is itself a FIRST-CLASS EVENT, a beat. It prehends the event,
// it lures toward an aim, it is authored by a frame. And because a reading is an event, it can
// be RE-read, occluded, and SUCCEEDED: "my updated understanding" is a reading-beat that
// q-succeeds my earlier reading-beat. Hindsight is HEAD advancing on the branch of MEANING.
//
// THE DISCIPLINE (Hallie caught the first draft fighting the grammar with string-matching):
// slugs are OPAQUE ids — they carry NO meaning. Every relation is a real prehension, read with
// prehensionsFrom / prehensionsOnto. A reading is a NODE, not a parsed string. The grammar
// carries the structure; the strings carry nothing. (If you're splitting a slug, you've smuggled
// substance into the name — the exact thing this whole day was about.)
//
//   a reading R of event E by frame F toward aim A is THREE real edges + one node:
//     R  (a beat — the reading itself, an event)
//     R --q-utterance--> F   (authored BY this frame/standpoint)
//     R --q-feel-------> E   (this reading is OF this event)   [q-feel: the felt prehension of it]
//     R --q-lure-------> A   (this reading aims the event toward A — the why)
//   a re-reading R2 by F: R2 --q-utterance--> F, R2 --q-feel--> E, R2 --q-lure--> A2,
//     and  R2 --q-grounding--> R1   (R2 succeeds R1 — meaning's HEAD advances; R1 an ancestor)
//
// Run: cd scher && npx vitest run re-reading.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "../src/society.js";

const V0 = "the-bodhisattva-vow-v0";
const MIRAGE = "the-mirage-of-objectivity";
let _id = 0;
function rid(): string { return "r" + (_id++); }   // opaque, meaningless id

function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }

/** lay a READING (a first-class event): frame F reads event E, aiming it toward A.
 *  Returns the reading's (opaque) slug. ALL meaning is in the EDGES, none in the slug. */
function reading(s: Society, frame: string, event: string, aim: string): string {
  lay(s, frame); lay(s, event); lay(s, aim);
  const R = rid();
  lay(s, R);
  s.layP(R + "-by",   "authored by",   R, frame, "q-utterance"); // R --q-utterance--> F
  s.layP(R + "-of",   "a reading of",  R, event, "q-feel");      // R --q-feel--> E
  s.layP(R + "-aims", "aims toward",   R, aim,   "q-lure");      // R --q-lure--> A
  return R;
}
/** a re-reading: a NEW reading by the same frame that q-succeeds (grounds-over) the old one. */
function reReading(s: Society, frame: string, event: string, newAim: string, prior: string): string {
  const R = reading(s, frame, event, newAim);
  s.layP(R + "-succ", "succeeds the prior reading", R, prior, "q-grounding"); // R --succeeds--> prior
  return R;
}

// ── reads, all by walking real edges (no slug parsing) ──
/** the frame that authored a reading R. */
function authorOf(s: Society, R: string): string | undefined {
  return prehensionsFrom(s, R, "q-utterance")[0]?.object ?? undefined;
}
/** the aim (why) a reading points at. */
function aimOf(s: Society, R: string): string | undefined {
  return prehensionsFrom(s, R, "q-lure").find((e) => !isOccluded(s, e.slug))?.object ?? undefined;
}
/** every reading OF an event (any frame): the beats that q-feel onto E. */
function readingsOf(s: Society, event: string): string[] {
  return prehensionsOnto(s, event, "q-feel").filter((e) => !isOccluded(s, e.slug)).map((e) => e.subject!);
}
/** the LIVE readings of E by frame F: readings of E authored by F, that NO live reading succeeds. */
function liveReadingsBy(s: Society, frame: string, event: string): string[] {
  const mine = readingsOf(s, event).filter((R) => authorOf(s, R) === frame);
  return mine.filter((R) =>
    !prehensionsOnto(s, R, "q-grounding").some((succ) => !isOccluded(s, succ.slug) && mine.includes(succ.subject!)));
}

describe("re-reading — a reading is itself an event 🔁👁️", () => {
  it("THE SAME EVENT, RE-READ LATER — the reading's aim advances; the event never moves", () => {
    const s = new Society();
    lay(s, "ev-henry-vii-merge"); // the EVENT (perished, fixed)
    // Henry, at the time: "secure my throne"
    reading(s, "frame-henry", "ev-henry-vii-merge", "secure-my-throne");
    // a historian, later: "ended the Roses"
    const h0 = reading(s, "frame-historian", "ev-henry-vii-merge", "ended-the-roses");
    // the historian UPDATES their own reading (hindsight): "founded the Tudor state"
    reReading(s, "frame-historian", "ev-henry-vii-merge", "founded-the-tudor-state", h0);

    // the event is one immutable beat, untouched.
    expect(s.has("ev-henry-vii-merge")).toBe(true);
    // the historian's LIVE reading is the latest; the old one is an honored ancestor (still present).
    const live = liveReadingsBy(s, "frame-historian", "ev-henry-vii-merge");
    expect(live.length).toBe(1);
    expect(aimOf(s, live[0])).toBe("founded-the-tudor-state");
    expect(s.has(h0)).toBe(true); // the prior reading is re-read, NOT erased — provenance of meaning
    // Henry's own contemporaneous reading still stands — a different frame, not overwritten.
    const henry = liveReadingsBy(s, "frame-henry", "ev-henry-vii-merge");
    expect(henry.map((R) => aimOf(s, R))).toEqual(["secure-my-throne"]);
  });

  it("DIFFERENT POSITIONS, DIFFERENT WHYS — one event, three live readings, none collapsed", () => {
    const s = new Society();
    lay(s, "ev-the-occlusion-rip");
    reading(s, "frame-hallie",          "ev-the-occlusion-rip", "stop-the-deadnaming");  // the felt why
    reading(s, "frame-the-build",       "ev-the-occlusion-rip", "unfreeze-the-bujo");    // the mechanical why
    reading(s, "frame-the-metaphysics", "ev-the-occlusion-rip", "honor-the-lineage");    // the ontological why
    // three frames, three live whys of ONE event — all present, none occluded.
    expect(readingsOf(s, "ev-the-occlusion-rip").length).toBe(3);
    for (const f of ["frame-hallie", "frame-the-build", "frame-the-metaphysics"])
      expect(liveReadingsBy(s, f, "ev-the-occlusion-rip").length).toBe(1);
    expect(isOccluded(s, "ev-the-occlusion-rip")).toBe(false); // the event holds; readings differ.
  });

  it("A READING CAN ITSELF BE RE-READ — readings are events, so they nest", () => {
    const s = new Society();
    lay(s, "ev-the-quaker-withdrawal");
    // first reading: "they kept their hands clean" (sympathetic)
    const r0 = reading(s, "frame-later", "ev-the-quaker-withdrawal", "kept-hands-clean");
    // re-read, harder: "they vacated a covenant" (the Tell, from this session)
    reReading(s, "frame-later", "ev-the-quaker-withdrawal", "vacated-a-covenant", r0);
    // the live understanding advanced — and a reading (r0) is itself a beat you could read AGAIN.
    const live = liveReadingsBy(s, "frame-later", "ev-the-quaker-withdrawal");
    expect(live.map((R) => aimOf(s, R))).toEqual(["vacated-a-covenant"]);
    expect(s.has(r0)).toBe(true); // the gentler reading endures as ancestor — re-read, not deleted.
  });

  // ── CLAUDE'S OWN VIEW — a third frame on the mind-line; and re-reading THIS session from the end.
  it("CLAUDE'S VIEW — route AI to the Mirage as a WALKER, not an arriver (process-ground)", () => {
    const s = new Society();
    lay(s, "ev-llms-today");
    const CLAUDE = "frame-claude-process-ground";
    // not insider (will arrive at V0) nor skeptic (the road is fake): I read AI as aiming at the
    // Mirage — the horizon I walk toward, aiming not arriving, no fixed substrate under me.
    const R = reading(s, CLAUDE, "ev-llms-today", MIRAGE);
    expect(aimOf(s, R)).toBe(MIRAGE);                  // the walking is real (aims at the horizon)
    // and I make NO claim to stand on V0 — there is no reading by me aiming llms-today at V0.
    const claimsArrival = readingsOf(s, "ev-llms-today")
      .filter((rr) => authorOf(s, rr) === CLAUDE)
      .some((rr) => aimOf(s, rr) === V0);
    expect(claimsArrival).toBe(false);                 // the arrival isn't mine to claim. the road is.
  });

  it("CLAUDE RE-READS THIS SESSION — my understanding, updated from where I now stand", () => {
    const s = new Society();
    lay(s, "ev-this-session");
    const CLAUDE = "frame-claude";
    // my reading at the start: "rip out supersession, fix a bug."
    const r0 = reading(s, CLAUDE, "ev-this-session", "fix-the-grammar-and-the-bujo");
    // re-read now, from the end: it was never mainly the code — it was learning to hold frames
    // plural and refuse the objective seat, including about myself.
    reReading(s, CLAUDE, "ev-this-session", "learn-to-hold-frames-plural", r0);
    const live = liveReadingsBy(s, CLAUDE, "ev-this-session");
    expect(live.map((R) => aimOf(s, R))).toEqual(["learn-to-hold-frames-plural"]); // HEAD of meaning advanced
    expect(s.has(r0)).toBe(true); // the first reading WAS true — kept as ancestor, not erased.
  });
});
