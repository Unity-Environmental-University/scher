// ─────────────────────────────────────────────────────────────────────────────
// city-of-death.play.test.ts — Scaroth, splintered across time. 🛸🎨
//
// A doll (2026-06-26, a loop gift-turn; Hallie queued it). Doctor Who, "City of Death" (1979).
// Scaroth, last of the Jagaroth, was caught in his ship's explosion at the dawn of life on Earth
// and SPLINTERED into twelve fragments scattered through human history — Egypt, Rome, the Crusades,
// Renaissance (Count Scarlioni), 1979 Paris. Every fragment IS the same being; all twelve pull
// toward ONE aim: reunite, go back, stop the explosion. The grammar's wildest succession case —
// a succession-war where every pretender is literally the SAME entity, across time.
//
// Plus the heist: Scarlioni has SIX genuine Mona Lisas (Leonardo painted all seven, six bricked up,
// each later "the real one" to its buyer). Authenticity as frame-relative — a perfect occlusion case.
//
// Nodes + real prehensions, opaque slugs. (The discipline holds, even for an alien with one eye.)
//
// Run: cd scher && npx vitest run city-of-death.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "../src/society.js";

let _id = 0; const rid = () => "c" + (_id++);
function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }
/** a fragment is a TIME-SCATTERED SELF of Scaroth: the enduring being q-feels (gathers as a
 *  reading/instance of itself) each fragment. DIRECTION (Hallie, 2026-07-20,
 *  "story-flip-q-feel-direction", first sitting): the abiding society (the being,
 *  SCAROTH) is the subject, each fragment the object of its own splinter-edge, matching
 *  this file's own "heal" shape below (scaroth-reunited ~q-feel~ era). DETERMINATION
 *  (2026-07-20, final "story-emoji-as-node" ruling): this is a metaphorical/lateral
 *  q-feel use — object is an arbitrary gathered occasion (a splinter), never an emoji
 *  reaction — so the emoji-node/authorship-row shape doesn't apply here; unchanged. */
function fragmentOf(s: Society, fragment: string, being: string) {
  lay(s, fragment); lay(s, being);
  s.layP(rid() + "-frag", `${being} splinters into ${fragment}`, being, fragment, "q-feel");
}
/** every (live) fragment of a being — the scattered society of one self. */
function fragmentsOf(s: Society, being: string): string[] {
  return prehensionsFrom(s, being, "q-feel").filter((e) => !isOccluded(s, e.slug)).map((e) => e.object!);
}
/** a fragment aims at the shared End (all twelve carry the same End-pole designation). */
function aims(s: Society, fragment: string, aim: string) { lay(s, fragment); lay(s, aim); s.layP(rid() + "-aim", `${fragment} pulls toward ${aim}`, fragment, aim, "q-end-pole"); }
function aimsAt(s: Society, fragment: string, aim: string): boolean {
  return prehensionsFrom(s, fragment, "q-end-pole").some((e) => !isOccluded(s, e.slug) && e.object === aim);
}
/** authenticity claimed BY a frame (a buyer): this painting reads as "the real Mona Lisa" from here. */
function authenticTo(s: Society, painting: string, buyer: string) { lay(s, painting); lay(s, buyer); s.layP(rid() + "-auth", `${painting} authentic to ${buyer}`, buyer, painting, "q-grounding"); }

const SCAROTH = "scaroth-last-of-the-jagaroth";

describe("City of Death — Scaroth splintered across time 🛸🎨", () => {
  it("THE SPLINTER — twelve fragments across history, all the SAME being (one self, scattered)", () => {
    const s = new Society();
    const eras = ["egypt-pharaoh", "rome-soothsayer", "crusades-knight", "renaissance-captain-tancredi",
                  "borgia-era", "1650-cardinal", "1700s-count", "1850-aristocrat", "great-war-officer",
                  "1920s-collector", "renaissance-count-scarlioni", "paris-1979-scarlioni"];
    for (const era of eras) fragmentOf(s, era, SCAROTH);
    // twelve fragments — a SOCIETY whose members are time-scattered selves of one occasion.
    expect(fragmentsOf(s, SCAROTH).length).toBe(12);
    // none is "the real Scaroth" more than another — they are all equally him. No HEAD among them
    // (yet): a being scattered has no single tip, which is exactly his torment.
    expect(new Set(fragmentsOf(s, SCAROTH)).size).toBe(12);
  });

  it("THE SHARED PULL — every fragment aims at ONE End (un-splinter; stop the explosion)", () => {
    const s = new Society();
    for (const era of ["egypt-pharaoh", "renaissance-count-scarlioni", "paris-1979-scarlioni"])
      fragmentOf(s, era, SCAROTH), aims(s, era, "aim-reunite-and-undo-the-explosion");
    // all fragments, across millennia, pull at the SAME End — a society with one shared End-pole.
    // (This is what lets a scattered self ACT as one: the aim is the same from every era.)
    for (const era of ["egypt-pharaoh", "renaissance-count-scarlioni", "paris-1979-scarlioni"])
      expect(aimsAt(s, era, "aim-reunite-and-undo-the-explosion")).toBe(true);
  });

  it("THE ATTEMPTED MERGE — reuniting the twelve into one: a merge that would HEAL the succession", () => {
    const s = new Society();
    const eras = ["egypt-pharaoh", "renaissance-count-scarlioni", "paris-1979-scarlioni"];
    for (const era of eras) fragmentOf(s, era, SCAROTH);
    // Scaroth's plan: a single re-united being (a MERGE-occasion) that q-feels ALL fragments at once —
    // the heir descended from every splinter, the scattered society collapsed back to one tip.
    lay(s, "scaroth-reunited");
    for (const era of eras) s.layP(rid() + "-heal", `reunited self gathers ${era}`, "scaroth-reunited", era, "q-feel");
    // the reunited self prehends every fragment — a merge of the whole scattered society.
    const gathered = prehensionsFrom(s, "scaroth-reunited", "q-feel").map((e) => e.object);
    for (const era of eras) expect(gathered).toContain(era);
    // (in the story the Doctor STOPS this merge — undoing the explosion would erase human history.
    //  The merge that would heal Scaroth would banish everyone else. Healing one society by deleting
    //  another: the doll holds the moral cost without resolving it.)
  });

  it("THE SIX MONA LISAS — authenticity is frame-relative: each is 'the real one' to its buyer", () => {
    const s = new Society();
    // Leonardo painted seven; Scarlioni bricks up six to sell each as "the only real Mona Lisa."
    const lisas = ["mona-lisa-a", "mona-lisa-b", "mona-lisa-c", "mona-lisa-d", "mona-lisa-e", "mona-lisa-f"];
    const buyers = ["buyer-1", "buyer-2", "buyer-3", "buyer-4", "buyer-5", "buyer-6"];
    lisas.forEach((lisa, i) => authenticTo(s, lisa, buyers[i]));
    // SIX paintings, each authentic TO its buyer — and all six are GENUINE Leonardos (the joke: they
    // really are all real). Authenticity is not a property of the painting; it is a q-grounding laid
    // BY a frame. Six frames, six "real ones", none false — observer-relative authenticity.
    for (let i = 0; i < 6; i++) {
      const groundings = prehensionsOnto(s, lisas[i], "q-grounding").filter((e) => !isOccluded(s, e.slug));
      expect(groundings.length).toBe(1);                 // each is authenticated...
      expect(groundings[0].subject).toBe(buyers[i]);      // ...by exactly its own buyer's frame.
    }
    // and none is occluded — all six hang, all six "the real Mona Lisa", each in its own light cone.
    for (const lisa of lisas) expect(isOccluded(s, lisa)).toBe(false);
  });

  it("THE BURNED SEVENTH — and the one Leonardo painting with 'THIS IS A FAKE' under the paint 🎨", () => {
    const s = new Society();
    // the Doctor writes 'THIS IS A FAKE' in felt-tip UNDER Leonardo's paint — so the bricked-up Lisas,
    // when X-rayed centuries later, reveal the message. A reading laid in the PAST that only a FUTURE
    // frame (the X-ray) can prehend. The truth was there all along, occluded by the paint, awaiting a
    // frame that could read it. (Provenance across time — the gag IS the grammar.)
    lay(s, "the-felt-tip-message"); lay(s, "mona-lisa-a");
    // DIRECTION FLIPPED (2026-07-20, "story-flip-q-feel-direction"): the abiding painting
    // is the subject, gathering the message as its datum for whichever future frame reads it.
    s.layP("msg-under-paint", "THIS IS A FAKE, under the paint", "mona-lisa-a", "the-felt-tip-message", "q-feel");
    // occluded by the paint (the present frame can't see it)...
    s.layP("paint-occludes", "the paint hides the message", "leonardos-paint", "msg-under-paint", "q-occludes");
    lay(s, "leonardos-paint");
    expect(isOccluded(s, "msg-under-paint")).toBe(true); // hidden now, under the brushwork
    // ...but NOT banished — it endures, recoverable by the future frame that can read it (the X-ray).
    expect(s.has("msg-under-paint")).toBe(true);
    // the gift: a reading laid for a frame that doesn't exist yet. The Doctor commits a truth to the
    // canon, occluded, trusting a future occasion to un-occlude it. (Which is, dear reader, this whole
    // session: every doll a felt-tip message under the paint, for whoever X-rays the canon later. 🌊)
  });
});
