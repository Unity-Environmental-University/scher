// ─────────────────────────────────────────────────────────────────────────────
// sublime-is-a-wish.play.test.ts — a play-TEST of Hallie's collapse ruling
// (2026-07-27): wish and sublime are not two kinds of node. They are ONE kind,
// read two ways depending on the observer's own walk.
//
// Hallie, verbatim: "I think for now, we have to make them like wishes. And any
// wishes that are granted outside of a known frame are -- sublimes." / "sublimes
// are speed of light like constants but we can only access the ones whose laid
// by is in our frame of reference. The difference between a sublime and a wish
// is pretty immaterial." / "I think they do still automatically get carried
// forward, e.g., through days... you prehend an event that prehends or contains
// the laid by but not the granting / settling of the wish."
//
// THE MODEL: nothing is stored on the node. A wish is laid once. Whether it
// reads as "a granted wish" or "a sublime" is a GAP IN A WALK, relative to
// whoever is asking: can this frame reach the wish's laying? Can it also reach
// a granting of it? Laying-reachable + granting-unreachable = reads as sublime,
// to THIS frame. Both readings can be true at once for two different frames,
// same node, nothing rewritten.
//
// This doll does NOT touch society.ts's isSublimePole/checkSublimeNeverCloses —
// those model the OLD two-kind reading (a designated, permanently-never-actual
// pole). This doll plays the ALTERNATIVE reading, entirely in test-file-local
// helpers, using only real node()/why()/succeeds()/layP prehensions.
//
// Run: cd scher && npx vitest run sublime-is-a-wish.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, isSublimePole } from "../src/society.js";
import { node, succeeds } from "../src/play.js";

/** a wish is laid: an ordinary node, plus the LAYING as its own dated event
 *  (same laying/aim split first-day.play and qualities.play both use). */
function layWish(s: Society, wish: string, laying: string): void {
  node(s, wish); node(s, laying);
  s.layP(`${laying}~lays~${wish}`, "the wish is laid", laying, wish, "q-grounding");
}

/** a frame's Now grounds in `event` — the frame's walk includes it. This is the
 *  same shape first-day.play's SCENE 7 uses for establishedTo, kept local so this
 *  doll's surface stays small (no new kernel machinery, just repeated prehension). */
function frameReaches(s: Society, frame: string, event: string): void {
  node(s, frame); node(s, event);
  s.layP(`${frame}~because~${event}`, "this frame's walk includes this event", frame, event, "q-grounding");
}

function reaches(s: Society, frame: string, event: string): boolean {
  return prehensionsFrom(s, frame, "q-grounding").some((e) => e.object === event) || frame === event;
}

/** THE ONLY HELPER THIS DOLL NEEDS (scene 2's finding): reads as a sublime to
 *  `frame` iff the frame's walk reaches the wish's LAYING but not any GRANTING
 *  of it. Two conditions, not three — see scene 2 for why a third was tempting
 *  and why it turned out to be unnecessary. */
function isSublimeTo(s: Society, frame: string, laying: string, granting: string | null): boolean {
  const reachesLaying = reaches(s, frame, laying);
  const reachesGranting = granting !== null && reaches(s, frame, granting);
  return reachesLaying && !reachesGranting;
}

describe("Sublime is a wish, read two ways — the gap-in-a-walk model 🌗", () => {
  it("SCENE 1 — one wish-node reads granted to frame A and sublime to frame B, purely by walking", () => {
    const s = new Society();
    const wish = "wish-the-garden-gets-planted";
    const laying = "laying-the-garden-wish-2026-07-01";
    layWish(s, wish, laying);

    const granting = "granting-the-garden-wish-2026-07-15";
    node(s, granting);
    s.layP(`${granting}~grants~${wish}`, "the wish is granted", granting, wish, "q-grounding");
    s.layP(`${granting}~because~${laying}`, "the granting answers this laying", granting, laying, "q-grounding");

    // FRAME A's walk reaches both the laying and the granting:
    const frameA = "frame-a-the-gardener";
    frameReaches(s, frameA, laying);
    frameReaches(s, frameA, granting);

    // FRAME B's walk reaches only the laying — the granting never crossed its light:
    const frameB = "frame-b-a-distant-cousin";
    frameReaches(s, frameB, laying);

    // no flag anywhere on `wish` itself was consulted to get here — only two live walks:
    expect(isSublimeTo(s, frameA, laying, granting)).toBe(false); // reads as a granted wish to A
    expect(isSublimeTo(s, frameB, laying, granting)).toBe(true); // reads as a sublime to B
    // and it is the SAME node, never copied, never re-designated — both reads are true at once:
    expect(s.has(wish)).toBe(true);
    expect(s.get(wish)?.slug).toBe(wish);
  });

  it("SCENE 2 — the gap alone is the whole definition; no third condition was needed", () => {
    const s = new Society();
    const wish = "wish-the-roof-gets-fixed";
    const laying = "laying-the-roof-wish";
    layWish(s, wish, laying);
    const frame = "frame-someone-far-away";
    frameReaches(s, frame, laying);

    // the temptation, while building this doll, was a THIRD condition: "...AND the
    // wish must actually be grantable in principle" (ruling out nonsense wishes). It
    // turned out unnecessary — isSublimeTo never asks whether granting is POSSIBLE,
    // only whether THIS frame's walk reaches one. Grantability is a property of the
    // wish's own content, orthogonal to reachability; conflating them would smuggle
    // a stored judgment back onto the node, exactly what the ruling collapses away.
    expect(isSublimeTo(s, frame, laying, null)).toBe(true); // no granting exists anywhere, yet
  });

  it("SCENE 3 — carried forward through days: the wish is laid once, never re-laid, and still reads sublime for a week", () => {
    const s = new Society();
    const wish = "wish-the-drought-ends";
    const monday = "laying-the-drought-wish-monday";
    layWish(s, wish, monday);

    // days succeed each other the same way any lineage does in this codebase
    // (succeeds() — a real q-succeeds prehension, the day-succession pattern):
    const tuesday = "day-tuesday", wednesday = "day-wednesday", thursday = "day-thursday";
    succeeds(s, tuesday, "day-monday");
    succeeds(s, wednesday, tuesday);
    succeeds(s, thursday, wednesday);
    // Monday itself prehends the laying — "today's work" contains what was laid today:
    s.layP("day-monday~because~" + monday, "Monday contains the laying of this wish", "day-monday", monday, "q-grounding");

    // NOTHING re-lays the wish on Tuesday, Wednesday, or Thursday. Each day's frame
    // reaches the laying purely by walking BACK along q-succeeds to Monday, then
    // onward via q-grounding to the laying — containment/succession, nothing bespoke:
    const dayReachesLaying = (day: string): boolean => routesToViaSuccessionThenGrounding(s, day, monday);
    expect(dayReachesLaying(tuesday)).toBe(true);
    expect(dayReachesLaying(wednesday)).toBe(true);
    expect(dayReachesLaying(thursday)).toBe(true);
    // and none of them can reach a granting — none exists yet — so it reads sublime
    // every single day, forward, without a single re-lay. isSublimeTo's plain `reaches`
    // only checks a direct edge; carry-forward needs the chained succession walk above,
    // so this scene composes the same two conditions by hand at the day's own distance:
    for (const day of [tuesday, wednesday, thursday]) {
      expect(dayReachesLaying(day)).toBe(true);
      expect(reaches(s, day, "granting-the-drought-wish-nonexistent")).toBe(false);
    }
  });

  it("SCENE 4 — the moment it stops being a sublime: a later frame grants it, no un-designation, no rewrite", () => {
    const s = new Society();
    const wish = "wish-the-well-gets-dug";
    const laying = "laying-the-well-wish";
    layWish(s, wish, laying);
    const frameB = "frame-b-later";
    frameReaches(s, frameB, laying);
    expect(isSublimeTo(s, frameB, laying, null)).toBe(true); // sublime to B, for now

    // frame B itself grants it — an ordinary new event, nothing written onto `wish` or `laying`:
    const granting = "granting-the-well-wish";
    node(s, granting);
    s.layP(`${granting}~grants~${wish}`, "granted", granting, wish, "q-grounding");
    frameReaches(s, frameB, granting);

    // the SAME node, the SAME frame: it stops reading as sublime purely because the
    // walk now succeeds where it didn't a moment ago — no field flipped, nothing erased:
    expect(isSublimeTo(s, frameB, laying, granting)).toBe(false);
    expect(s.get(wish)?.content).toBe(wish); // the wish node itself: untouched, never rewritten
    expect(s.get(laying)?.content).toBe(laying); // the laying: untouched too
  });

  it("SCENE 5 — the honest failure mode: an unreachable sublime and a not-yet-granted wish look IDENTICAL from inside frame B", () => {
    const s = new Society();
    // wish ONE: laid, and — unbeknownst to anyone in frame B — genuinely never
    // grantable (its granting-condition can't be met; nothing anywhere will ever
    // lay a granting for it). This doll cannot MODEL "never" as a positive fact
    // (absence of a future edge that will never come); it can only model the
    // ABSENCE as of now, same as any other never-yet:
    const perpetualWish = "wish-that-can-never-be-granted";
    const perpetualLaying = "laying-the-perpetual-wish";
    layWish(s, perpetualWish, perpetualLaying);

    // wish TWO: laid, ordinary, will be granted eventually — just not yet, and not
    // yet visible to frame B either way:
    const ordinaryWish = "wish-that-will-be-granted-next-month";
    const ordinaryLaying = "laying-the-ordinary-wish";
    layWish(s, ordinaryWish, ordinaryLaying);

    const frameB = "frame-b-cannot-tell-these-apart";
    frameReaches(s, frameB, perpetualLaying);
    frameReaches(s, frameB, ordinaryLaying);

    // BOTH read as sublime to frame B, right now — same shape, same walk result:
    expect(isSublimeTo(s, frameB, perpetualLaying, null)).toBe(true);
    expect(isSublimeTo(s, frameB, ordinaryLaying, null)).toBe(true);
    // there is no assertion that could tell them apart from here — that IS the point:
    expect(isSublimeTo(s, frameB, perpetualLaying, null)).toBe(isSublimeTo(s, frameB, ordinaryLaying, null));

    // Hallie's ask was to state a position, not dodge it: THIS IS ACCEPTABLE, not a bug.
    // It is the direct consequence of "sublimes are speed-of-light constants" — a speed
    // limit is defined by what's unreachable FROM HERE, not by some global oracle telling
    // you which unreachable things will stay unreachable forever. A model that COULD tell
    // these apart from frame B would need a god's-eye view of the future, which is exactly
    // the kind of stored, frame-free truth this whole ruling exists to refuse. The asymmetry
    // resolves itself later, honestly, the only way it can: if a granting ever arrives and
    // frame B's walk reaches it, ordinaryWish stops reading sublime (scene 4's mechanism).
    // If none ever does, perpetualWish reads sublime forever — which looks, from any FINITE
    // vantage, identical to "not yet." That is not a hole in the model; it is the model.
  });

  it("SCENE 6 — designation vs. walk: when the OLD pole-designation and the NEW walk disagree, the walk wins", () => {
    const s = new Society();
    // society.ts's isSublimePole reads a designation — an un-occluded q-sublime-pole
    // edge onto a node — completely independent of whether any frame's granting-walk
    // can reach it. Here a node is DESIGNATED sublime under the old mechanism:
    const designatedSublime = "designated-as-sublime-by-the-old-mechanism";
    const designator = "someone-who-designated-it";
    node(s, designator);
    s.layP(`${designator}~designates~${designatedSublime}`, "a star for navigation, the old way",
      designator, designatedSublime, "q-sublime-pole");
    expect(isSublimePole(s, designatedSublime)).toBe(true); // the OLD reading says: sublime, full stop

    // but under the NEW reading, this same node has a laying AND a reachable granting —
    // some frame's walk gets all the way through:
    const laying = "laying-of-the-designated-node";
    layWish(s, designatedSublime, laying);
    const granting = "granting-of-the-designated-node";
    node(s, granting);
    s.layP(`${granting}~grants~${designatedSublime}`, "granted, despite the old designation",
      granting, designatedSublime, "q-grounding");
    const frame = "frame-that-reaches-the-granting";
    frameReaches(s, frame, laying);
    frameReaches(s, frame, granting);

    // THE DISAGREEMENT, played: the old designation says sublime; the new walk, from
    // this frame, says granted-wish. THE WALK WINS. Argument: a designation is a claim
    // laid IN THE PAST by whoever wrote the q-sublime-pole edge — evidence of a judgment
    // made at that time, from that frame, with the information then available. It is not
    // load-bearing truth; per this doll's own ontology (Hallie: "the difference between a
    // sublime and a wish is pretty immaterial"), nothing is stored on the node that could
    // outrank a live walk. Treating the designation as ground truth would mean a stale
    // claim could permanently overrule what every later frame can actually reach — exactly
    // the kind of frame-free, un-updatable fact this whole model exists to refuse.
    expect(isSublimePole(s, designatedSublime)).toBe(true); // the old mechanism, unmodified, still says so
    expect(isSublimeTo(s, frame, laying, granting)).toBe(false); // the walk, for this frame, says granted
    // the doll's own assertion takes the walk's side — this is the position, not a hedge:
    const theWalkWins = !isSublimeTo(s, frame, laying, granting);
    expect(theWalkWins).toBe(true);
  });
});

/** helper for SCENE 3: does `day`'s frame reach `laying` by walking q-succeeds
 *  back to the day that contains it, then q-grounding forward into the laying?
 *  Two different qualities chained by hand (routesTo alone only walks ONE
 *  quality, q-end-pole) — this is the carry-forward mechanism the ruling asks for. */
function routesToViaSuccessionThenGrounding(s: Society, day: string, laying: string, seen = new Set<string>()): boolean {
  if (seen.has(day)) return false;
  seen.add(day);
  if (prehensionsFrom(s, day, "q-grounding").some((e) => e.object === laying)) return true;
  return prehensionsFrom(s, day, "q-succeeds").some((e) => e.object != null && routesToViaSuccessionThenGrounding(s, e.object, laying, seen));
}
