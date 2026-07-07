// ─────────────────────────────────────────────────────────────────────────────
// grounded-capture.play.test.ts — no floating events. 🪝
//
// Hallie's ruling, 2026-07-07: POST /bujo/capture MUST ground every event in a sublime
// (a star, never actual, pulled-toward forever) or a trub (a miss, answered, established).
// "A lure is still a because": ONE edge shape carries both — `event~because~ground`,
// q-grounding, subject=event, object=ground — never a separate ~lures~ edge, never inverted.
// An ungrounded capture is refused at the door: 400, nothing laid.
//
// The real enforcement lives in Rust (gen4-policy::capture_into_day + the Ground enum,
// gen4-policy/src/lib.rs; the door validation in api/src/main.rs's bujo_capture). As of
// this write BOTH are shipped and green (gen4-policy/tests/capture_must_ground.rs passes,
// `cargo check -p gen4-api` is clean). These dolls play the SAME rule in the grammar's own
// terms — scher's Society + prehensions — the way biography.play.test.ts plays Rust-side
// authorship in pure TS. The dolls are not redundant with the Rust tests: they are the
// argument, in the idiom the committee reads, for what the rule FEELS like in use — and
// they surface a real orientation chafe the Rust tests don't dramatize (see doll 5).
//
// Opaque slugs, real prehensions; the discipline holds here too.
//
// Run: cd scher && npx vitest run grounded-capture.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  prehensionsFrom,
  prehensionsOnto,
  isOccluded,
  isSublimePole,
  groundedBy,
} from "../src/society.js";

let _id = 0;
const rid = () => "gc" + (_id++);
function lay(s: Society, slug: string) {
  if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null });
}

/** designate a node as a sublime-pole — a star for navigation, never actual, per
 *  isSublimePole's contract: an un-occluded q-sublime-pole edge onto it. */
function designateSublime(s: Society, sublime: string, designator: string) {
  lay(s, sublime); lay(s, designator);
  s.layP(`${designator}~designates~${sublime}`, "a star for navigation", designator, sublime, "q-sublime-pole");
}

/** name a trub — a miss, a raw thing gone wrong, laid as a plain node (no pole apparatus). */
function nameTrub(s: Society, trub: string, content: string) {
  s.lay({ slug: trub, content, subject: null, object: null });
}

/** THE CAPTURE RECIPE, played in the grammar's own terms — mirrors gen4-policy's
 *  capture_into_day: mint the event, then lay event~because~ground (q-grounding),
 *  subject=event, object=ground. This is the ONE move the whole doll turns on.
 *  Refuses (throws) when ground is null/empty — the "no floating events" gate,
 *  played here instead of a 400 (no HTTP layer under these dolls; see header). */
function capture(s: Society, event: string, text: string, ground: string | null): void {
  if (!ground) {
    throw new Error("capture requires ground: a sublime-pole or a trub — no floating captures");
  }
  s.lay({ slug: event, content: text, subject: null, object: null });
  s.layP(`${event}~because~${ground}`, "grounded", event, ground, "q-grounding");
}

/** authorship, per biography.play.test.ts's own idiom — laid_by, for "whose note is this". */
function layAuthorship(s: Society, author: string, event: string): void {
  const authNode = `laid-${event}-by-${author}`;
  lay(s, author);
  s.lay({ slug: authNode, content: `${author} laid ${event}`, subject: null, object: null });
  s.layP(`${authNode}~lays~${event}`, "authorship", authNode, event, "q-authorship");
}

describe("grounded capture — no floating events (Hallie's ruling, 2026-07-07) 🪝", () => {
  it("THE NOTE THAT SERVED NOTHING — a doll tries to lay a thought with no star and no miss; refused", () => {
    const s = new Society();
    // a doll — call her Nell — opens the rapid-log and types a thought with nothing behind it:
    // not an answer to a miss, not a step toward a star. Just... a note.
    const nellsFloatingThought = "gc-nells-idle-thought";
    // she has NO ground to offer — no sublime, no trub. The capture recipe must refuse her,
    // not silently accept a homeless event that nothing ever prehends onto.
    expect(() => capture(s, nellsFloatingThought, "just thinking out loud", null)).toThrowError(
      /requires ground/,
    );
    // the refusal IS the point — nothing was laid. no orphan beat sits in the canon waiting
    // for a because that will never come.
    expect(s.has(nellsFloatingThought)).toBe(false);
    // this is the 400, told as story: the door does not compromise and lay it anyway "to be
    // nice." a homeless event is a debt nobody signed up to pay off later.
  });

  it("A MISS BECOMES A TASK — a doll names a trub, then grounds a capture in it; the event is spoken-from its miss", () => {
    const s = new Society();
    // a doll — call him Theo — hits a real snag: the deploy script silently swallowed an error.
    const theosTrub = "gc-deploy-swallowed-the-error";
    nameTrub(s, theosTrub, "the deploy script ate a stack trace and reported success anyway");
    // Theo captures a task grounded in that trub — the SAME edge shape a sublime would use.
    const theosCapture = "gc-add-error-surfacing-to-deploy";
    capture(s, theosCapture, "surface deploy errors instead of swallowing them", theosTrub);
    // walk the because-edge: the event is spoken FROM its miss, not floating free of it.
    const grounds = prehensionsFrom(s, theosCapture, "q-grounding").map((e) => e.object);
    expect(grounds).toContain(theosTrub);
    // and from the trub's side: who grounded themselves in me? groundedBy walks q-grounding
    // ONTO the trub — the event shows up as the grounding subject.
    expect(groundedBy(s, theosTrub)).toContain(theosCapture);
    // the miss did not vanish once answered — it stays in the ink, the reason the task exists.
    expect(s.has(theosTrub)).toBe(true);
  });

  it("THE STAR THAT PULLS THE WORK — a doll grounds a capture in a sublime; the star stays never-actual", () => {
    const s = new Society();
    // a doll — call her Wren — is not answering a miss. She's reaching toward a star: legible
    // cards, a standing aim nobody expects to ever "complete."
    const legibleCards = "gc-sublime-legible-cards";
    designateSublime(s, legibleCards, "gc-committee-that-named-the-star");
    expect(isSublimePole(s, legibleCards)).toBe(true);
    // Wren captures a concrete step toward it — SAME edge shape as Theo's trub-grounding above:
    // "a lure is still a because." No ~lures~ edge, no inversion, no special case for stars.
    const wrensCapture = "gc-wrap-long-titles-in-cards";
    capture(s, wrensCapture, "truncate card titles past two lines", legibleCards);
    const grounds = prehensionsFrom(s, wrensCapture, "q-grounding").map((e) => e.object);
    expect(grounds).toContain(legibleCards);
    // the anti-q-lure guarantee: being grounded-TOWARD does not make the sublime actual.
    // it is still, and forever, a pole other events reach for — never a beat someone finishes.
    expect(isSublimePole(s, legibleCards)).toBe(true); // still a star, not consumed by being served
    // and nothing here ever marks the sublime itself as an achieved/closed thing — there is no
    // such edge to lay. Wren's capture serves the star; the star does not thereby close.
    const anyoneClosedIt = prehensionsOnto(s, legibleCards, "q-end-pole");
    expect(anyoneClosedIt.length).toBe(0); // no End-pole apparatus was ever minted for a sublime
  });

  it("WHOSE NOTE IS THIS — a crew doll and the human doll each ground a capture; the board tells them apart", () => {
    const s = new Society();
    // a shared trub: the onboarding doc is stale. Both a crew agent and Hallie herself
    // respond to the SAME miss, independently, each laying their own grounded capture.
    const staleDocs = "gc-onboarding-doc-is-stale";
    nameTrub(s, staleDocs, "the onboarding doc still references the old auth flow");

    const crewsCapture = "gc-crew-updates-auth-section";
    capture(s, crewsCapture, "rewrite the auth section", staleDocs);
    layAuthorship(s, "frame-crew-dollmaker", crewsCapture);

    const halliesCapture = "gc-hallie-adds-a-screenshot";
    capture(s, halliesCapture, "add a screenshot of the new login screen", staleDocs);
    layAuthorship(s, "frame-hallie", halliesCapture);

    // BOTH are grounded — the rule does not discriminate by author. Groundedness is not a
    // privilege extended to human notes and withheld from crew notes.
    expect(prehensionsFrom(s, crewsCapture, "q-grounding").some((e) => e.object === staleDocs)).toBe(true);
    expect(prehensionsFrom(s, halliesCapture, "q-grounding").some((e) => e.object === staleDocs)).toBe(true);

    // AND the board can still tell them apart — by authorship, a wholly separate prehension.
    const crewAuthor = prehensionsOnto(s, crewsCapture, "q-authorship")[0]?.subject;
    const humanAuthor = prehensionsOnto(s, halliesCapture, "q-authorship")[0]?.subject;
    expect(crewAuthor).toBe(`laid-${crewsCapture}-by-frame-crew-dollmaker`);
    expect(humanAuthor).toBe(`laid-${halliesCapture}-by-frame-hallie`);
    // groundedness and authorship are ORTHOGONAL reads: every note answers to the same miss,
    // and every note still carries whose hand wrote it. Neither collapses into the other.
    expect(crewAuthor).not.toBe(humanAuthor);
  });

  it("THE OVER-MINT — a client that auto-lays a NEW trub from each capture's own text, many near-identical misses pile up", () => {
    const s = new Society();
    // the STOPGAP shape, played honestly: when a doll offers no existing ground, the client
    // auto-mints a trub FROM THE CAPTURE'S OWN TEXT (api/static/app/src/main.ts's ground:
    // {kind:'trub', new_trub: text} — the frontend's current answer to "what if I have nothing
    // to ground in"). It satisfies the rule. It is not obviously TASTEFUL.
    const dollsCaptures = [
      "note: fix the header padding",
      "note: fix header padding, it's off by 2px",
      "note: the header padding is still wrong",
    ];
    const mintedTrubSlugs: string[] = [];
    dollsCaptures.forEach((text, i) => {
      const trub = `gc-auto-trub-${i}`;      // client mints ONE trub PER capture, from its own text
      nameTrub(s, trub, text);
      mintedTrubSlugs.push(trub);
      const event = `gc-auto-event-${i}`;
      capture(s, event, text, trub);          // grounded! the rule is satisfied.
    });
    // every capture IS grounded — the 400 never fires, the letter of the rule holds.
    for (let i = 0; i < 3; i++) {
      expect(prehensionsFrom(s, `gc-auto-event-${i}`, "q-grounding").length).toBe(1);
    }
    // but look what it bought: THREE trubs, for what is transparently ONE miss (the header
    // padding), because nothing deduplicated the auto-mint against near-identical prior text.
    expect(mintedTrubSlugs.length).toBe(3); // over-minted — should likely have been ONE trub
    // this is the picture the taste-deferral needs: satisfying "must ground" via unchecked
    // auto-minting is honest (no floating events) but CHEAP — it launders "I didn't want to
    // pick a ground" into "I named a miss," three times, for one miss. The rule caught the
    // absence of a ground; it did not, and structurally cannot by itself, catch the absence
    // of THOUGHT about which ground. A doll worth building later: does the client offer
    // "ground in an EXISTING trub" as the first-class path, with new-trub as the fallback,
    // not the default reflex?
  });

  it("THE INVERTED READ — event~because~ground does NOT make isEstablished(event) true; a chafe worth naming", () => {
    const s = new Society();
    // this doll is the argument, not just the demo. capture_into_day lays
    // event~because~ground_slug — subject=EVENT, object=GROUND (gen4-policy/src/lib.rs's
    // own comment: "5. THE GROUND... event~because~ground_slug"). But biography.play's
    // idiom (and isEstablished's own doc) reads groundedness the OTHER way round:
    // `frame~because~event` — subject=GROUND/frame, object=the thing being established.
    const trub = "gc-a-real-miss";
    nameTrub(s, trub, "the real miss");
    const event = "gc-the-grounded-capture";
    capture(s, event, "a note answering the miss", trub);

    // the event DOES carry a because-edge (capture's own guarantee) —
    expect(prehensionsFrom(s, event, "q-grounding").some((e) => e.object === trub)).toBe(true);
    // — but isEstablished/groundedForAnyFrame read prehensions ONTO the beat, i.e. they ask
    // "does something ground ITSELF in me" (frame~because~me), not "do I ground in something."
    // A freshly-captured, correctly-grounded event is therefore NOT "established" by that read:
    const groundedOntoEvent = prehensionsOnto(s, event, "q-grounding");
    expect(groundedOntoEvent.length).toBe(0); // nothing grounds ITSELF in this event (yet)
    // this is not a bug — it matches the F-A ruling (2026-07-06, cited in main.rs's bujo_capture
    // doc comment): "a fresh capture is NOT established — done is a separate, later verb." The
    // grounding-toward-a-trub/sublime is a DIFFERENT relation than "this task is done," even
    // though both are laid with the identical q-grounding quality, just in opposite orientations
    // depending on which side of the "is this a because-of-a-miss or a because-something-later-
    // grounds-in-me" question you're asking. Two questions, one quality, two directions — a
    // doll worth flagging to the committee: `groundedBy`/`isEstablished`'s doc comments talk
    // about "grounding" in the establishment sense; capture's `~because~` is a DIFFERENT use of
    // the same edge shape, and nothing in the read layer currently distinguishes "grounded-
    // toward" (capture's meaning) from "grounded-by" (establishment's meaning) except which way
    // you walk the edge. Worth a doll now, worth a named distinction later.
  });
});
