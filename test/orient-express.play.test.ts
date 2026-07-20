// ─────────────────────────────────────────────────────────────────────────────
// orient-express.play.test.ts — detection IS re-reading. The dolls' final exam. 🚂🔪
//
// A doll (2026-06-26, Hallie — the last play before grounding back in the work):
// "Murder on the Orient Express — the events that are Hercule Poirot's understanding of the
// eternal-objects 'the killer' and 'the motive' update over time; each person modelled as events."
//
// A detective story is the re-reading mechanism AS PLOT. "The killer" and "the motive" are
// eternal-objects — Poirot treats them as fixed truths to DISCOVER. But they are really his
// READINGS, re-occasioned as clues (events) arrive: each clue makes him q-succeeds his prior
// reading. Every suspect is an event (a person-occasion in the society of the train), carrying
// Poirot's reading of them (innocent / guilty), which updates.
//
// And the famous twist is the grammar's graduation: the answer is NOT one killer — it is TWELVE.
// "The killer" as a SINGLE eternal-object collapses into a SOCIETY. (Spoilers, obviously, for an
// 89-year-old book.) Then the final move is pure grammar: Poirot KNOWS the true reading and CHOOSES
// to occlude it — lets the official "lone stranger" story stand. Knowing one reading, surfacing another.
//
// Built on re-reading.play's honest model: a reading is a NODE, every relation a real prehension,
// slugs are opaque ids. (No string-matching — Hallie: "i suspect string matches aren't gonna do it.")
//
// Run: cd scher && npx vitest run orient-express.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "../src/society.js";

let _id = 0;
const rid = () => "r" + (_id++);  // opaque, meaningless id
function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }

const POIROT = "frame-poirot";

/** Poirot lays a READING of a target (a suspect, or the eternal-object "the killer"): a beat that
 *  the target q-feels (gathers as its datum) and designates a verdict/aim as its End-pole
 *  (q-end-pole). A reading is a node; meaning is in the edges. DIRECTION FLIPPED (Hallie,
 *  2026-07-20, "story-flip-q-feel-direction"): the EVENT prehends the emoji — the abiding
 *  target is the subject, the reading-occasion the object. */
function reads(s: Society, target: string, verdict: string): string {
  lay(s, POIROT); lay(s, target); lay(s, verdict);
  const R = rid(); lay(s, R);
  s.layP(R + "-by", "by Poirot",   R, POIROT,  "q-utterance");
  s.layP(R + "-of", "a reading of", target, R,  "q-feel");
  s.layP(R + "-as", "reads as",     R, verdict, "q-end-pole");
  return R;
}
/** a clue lands → Poirot re-reads `target`: a new reading that q-succeeds the prior one. */
function reReads(s: Society, target: string, newVerdict: string, prior: string): string {
  const R = reads(s, target, newVerdict);
  s.layP(R + "-succ", "succeeds prior reading", R, prior, "q-grounding");
  return R;
}
const verdictOf = (s: Society, R: string) => prehensionsFrom(s, R, "q-end-pole").find((e) => !isOccluded(s, e.slug))?.object;
/** Poirot's LIVE reading of a target = his reading that no live reading succeeds (HEAD of his belief). */
function liveReadingOf(s: Society, target: string): string | undefined {
  const mine = prehensionsFrom(s, target, "q-feel")
    .filter((e) => !isOccluded(s, e.slug))
    .map((e) => e.object!)
    .filter((R) => prehensionsFrom(s, R, "q-utterance")[0]?.object === POIROT);
  return mine.find((R) => !prehensionsOnto(s, R, "q-grounding")
    .some((succ) => !isOccluded(s, succ.slug) && mine.includes(succ.subject!)));
}

describe("Murder on the Orient Express — detection is re-reading 🚂🔪", () => {
  it("THE EVOLVING VERDICT — Poirot's reading of a suspect updates as clues land; the suspect is fixed", () => {
    const s = new Society();
    lay(s, "ev-suspect-countess"); // the person, an event-occasion (fixed)
    // first impression: innocent (a frightened aristocrat)
    const r0 = reads(s, "ev-suspect-countess", "innocent");
    // a clue (the grease spot, the changed name) → re-read: connected to the Armstrong household
    const r1 = reReads(s, "ev-suspect-countess", "armstrong-connection", r0);
    // the final clue → guilty (one of the twelve)
    reReads(s, "ev-suspect-countess", "one-of-the-twelve", r1);
    // his LIVE verdict is the latest; the earlier readings are honored ancestors (still present).
    expect(verdictOf(s, liveReadingOf(s, "ev-suspect-countess")!)).toBe("one-of-the-twelve");
    expect(s.has(r0)).toBe(true); // "innocent" endures as ancestor — re-read, not erased. (it WAS his honest read.)
    expect(s.has("ev-suspect-countess")).toBe(true); // the person never changed; only his reading did.
  });

  it("TWELVE SUSPECTS, EACH AN EVENT — each carries Poirot's live reading; all modelled", () => {
    const s = new Society();
    // the society of the train: the twelve (a few named, the rest as the jury they are).
    const twelve = ["countess-andrenyi", "princess-dragomiroff", "col-arbuthnot", "mary-debenham",
                    "hector-macqueen", "the-conductor-michel", "hildegarde-schmidt", "greta-ohlsson",
                    "antonio-foscarelli", "cyrus-hardman", "edward-masterman", "mrs-hubbard"];
    for (const who of twelve) reads(s, "ev-" + who, "under-suspicion");
    // every suspect is an event with a live reading — twelve, all present, none collapsed.
    expect(twelve.every((who) => liveReadingOf(s, "ev-" + who) !== undefined)).toBe(true);
    expect(twelve.length).toBe(12);
  });

  it("THE ETERNAL-OBJECT 'THE KILLER' — re-read from a lone stranger to a SOCIETY of twelve", () => {
    const s = new Society();
    lay(s, "the-killer"); // the eternal-object Poirot treats as a fixed truth to discover
    // the conventional reading: a single outside intruder (the "lone stranger" who fled at Vincovci).
    const r0 = reads(s, "the-killer", "a-lone-stranger");
    // the great re-reading: "the killer" is not ONE — it is the society of all twelve, each a stab.
    reReads(s, "the-killer", "the-society-of-twelve", r0);
    // Poirot's live reading of the eternal-object is now the COLLECTIVE — the single killer dissolved.
    expect(verdictOf(s, liveReadingOf(s, "the-killer")!)).toBe("the-society-of-twelve");
    // the lone-stranger reading is an honored ancestor — it was the surface, and it stays in the record.
    expect(s.has(r0)).toBe(true);
  });

  it("THE MOTIVE — re-read from twelve private griefs into ONE shared motive (a merge of whys)", () => {
    const s = new Society();
    lay(s, "the-motive");
    // early: each suspect seems to have their own unrelated reason (or none).
    const r0 = reads(s, "the-motive", "twelve-unrelated-reasons");
    // the re-reading: all twelve griefs MERGE into one — every one of them loved a victim of the
    // Armstrong kidnapping. Twelve private motives were one shared motive all along.
    reReads(s, "the-motive", "one-grief-the-armstrong-child", r0);
    expect(verdictOf(s, liveReadingOf(s, "the-motive")!)).toBe("one-grief-the-armstrong-child");
  });

  it("THE FINAL CHOICE — Poirot KNOWS the true reading and OCCLUDES it (surfaces the official lie)", () => {
    const s = new Society();
    lay(s, "the-killer");
    // he reaches the true reading: the society of twelve.
    const rTrue = reads(s, "the-killer", "the-society-of-twelve");
    // and ALSO offers the official solution: a lone stranger boarded and fled (justice already served
    // on the Armstrong murderer; let the grieving go). The MORAL choice is a grammar move:
    const rOfficial = reads(s, "the-killer", "the-lone-stranger-who-fled");
    // he OCCLUDES his own true reading — knowing it, choosing not to surface it. (Not deleted: occluded.
    // He never un-knows the truth; he declines to make it the public HEAD. Society-scoped: from the
    // POLICE'S frame, the lone-stranger reads as the answer; in Poirot's own, the truth stands, occluded.)
    s.layP(rTrue + "-occ", "Poirot lets the truth rest", POIROT, rTrue, "q-occludes");
    // from the surfaced (public) read, the true reading is occluded; the official one stands.
    expect(isOccluded(s, rTrue)).toBe(true);                 // the truth: known, held, not surfaced
    expect(isOccluded(s, rOfficial)).toBe(false);            // the official lie: surfaced
    expect(verdictOf(s, rOfficial)).toBe("the-lone-stranger-who-fled");
    // BUT the true reading is NOT banished — it remains in the canon, occluded, recoverable. Poirot
    // did not destroy the truth; he chose which reading to light. Occlusion (mercy), not banishment (erasure).
    expect(s.has(rTrue)).toBe(true);
  });
});
