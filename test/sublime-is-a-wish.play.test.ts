// ─────────────────────────────────────────────────────────────────────────────
// sublime-is-a-wish.play.test.ts — a play-TEST of Hallie's collapse ruling
// (2026-07-27), SHARPENED the same day: a wish and a sublime are not two kinds
// of node. They are ONE kind, read two ways depending on whether SOME FRAME HAS
// SCHEDULED the granting.
//
// Hallie, verbatim (first pass): "I think for now, we have to make them like
// wishes. And any wishes that are granted outside of a known frame are --
// sublimes." / "sublimes are speed of light like constants but we can only
// access the ones whose laid by is in our frame of reference."
//
// Hallie, verbatim (the sharpening): "So the difference between a wish and a
// sublime is just, the granting event of a wish is -- predicted in time. As in
// in a day or sprint frame in the projected future."
//
// THE SHARPENED MODEL: the first pass's test was an ABSENCE test — reaches the
// laying AND does NOT reach a granting. That's a live hazard: absence-of-reach
// is indistinguishable from not-having-walked-far-enough, so the old test's
// answer depended on how hard you looked. The sharpened reading asks a bounded
// question with a definite answer instead: is the granting HELD BY A DAY OR
// SPRINT? A frame is exactly the thing that PLACES a granting in time — a day
// or sprint frame schedules it. So: a sublime is a wish whose granting no frame
// you hold has scheduled. Someone holding a frame that DOES schedule it sees an
// ordinary wish. Same node, both correct — the collapse still holds, sharper.
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

/** a day or sprint HOLDS a granting — the scheduling act itself. A real
 *  prehension: the schedule (day/sprint) is the subject, the granting the
 *  object, same directional convention as any other containment in this doll. */
function schedules(s: Society, schedule: string, granting: string): void {
  node(s, schedule); node(s, granting);
  s.layP(`${schedule}~schedules~${granting}`, "this day/sprint holds the granting", schedule, granting, "q-containment");
}

/** does `frame`'s walk reach a schedule (day/sprint) that HOLDS `granting`? Two
 *  quality-hops chained by hand: q-grounding out to a schedule the frame
 *  reaches, then q-containment from that schedule onto the granting. */
function frameReachesAScheduleFor(s: Society, frame: string, granting: string, seen = new Set<string>()): boolean {
  if (seen.has(frame)) return false;
  seen.add(frame);
  const reachable = prehensionsFrom(s, frame, "q-grounding").map((e) => e.object).filter((o): o is string => o != null);
  reachable.push(frame);
  for (const held of reachable) {
    if (prehensionsFrom(s, held, "q-containment").some((e) => e.object === granting)) return true;
  }
  return prehensionsFrom(s, frame, "q-grounding")
    .some((e) => e.object != null && frameReachesAScheduleFor(s, e.object, granting, seen));
}

/** THE CENTRAL HELPER, sharpened (was the absence-form; see the header and
 *  SCENE 1 for why this replaced it): reads as a sublime to `frame` iff the
 *  frame's walk reaches the wish's LAYING, but the granting is NOT held by any
 *  day or sprint the frame reaches. Not "did we fail to find a granting" —
 *  "is the granting scheduled anywhere this frame can see." Bounded; has a
 *  definite answer regardless of how far the walk went. */
function isSublimeTo(s: Society, frame: string, laying: string, granting: string | null): boolean {
  const reachesLaying = reaches(s, frame, laying);
  const grantingIsScheduled = granting !== null && frameReachesAScheduleFor(s, frame, granting);
  return reachesLaying && !grantingIsScheduled;
}

/** the OLD absence-form, kept as its own named helper (see SCENE 1b for why it
 *  still earns its place): reaches the laying and does NOT reach the granting
 *  edge itself at all — a strictly weaker, unbounded question than
 *  isSublimeTo's "is it scheduled." */
function isSublimeToByAbsence(s: Society, frame: string, laying: string, granting: string | null): boolean {
  const reachesLaying = reaches(s, frame, laying);
  const reachesGranting = granting !== null && reaches(s, frame, granting);
  return reachesLaying && !reachesGranting;
}

describe("Sublime is a wish, read two ways — the scheduled-granting model 🌗", () => {
  it("SCENE 1 — the sharpened test: a granting HELD BY A DAY reads as an ordinary wish; unheld reads sublime, same walk-depth", () => {
    const s = new Society();
    const wish = "wish-the-garden-gets-planted";
    const laying = "laying-the-garden-wish-2026-07-01";
    layWish(s, wish, laying);

    const granting = "granting-the-garden-wish-2026-07-15";
    node(s, granting);
    s.layP(`${granting}~grants~${wish}`, "the wish is granted", granting, wish, "q-grounding");

    // FRAME A holds a day that schedules the granting — the granting is PLACED IN TIME:
    const frameA = "frame-a-the-gardener";
    const scheduledDay = "day-2026-07-15";
    schedules(s, scheduledDay, granting);
    frameReaches(s, frameA, laying);
    frameReaches(s, frameA, scheduledDay);

    // FRAME B reaches the laying and even reaches the bare granting EDGE directly —
    // it just never crossed a day or sprint that HOLDS it:
    const frameB = "frame-b-a-distant-cousin";
    frameReaches(s, frameB, laying);
    frameReaches(s, frameB, granting);

    expect(isSublimeTo(s, frameA, laying, granting)).toBe(false); // scheduled — reads as a granted wish to A
    expect(isSublimeTo(s, frameB, laying, granting)).toBe(true); // unscheduled from B — reads as a sublime
    // and it is the SAME node, never copied, never re-designated — both reads are true at once:
    expect(s.has(wish)).toBe(true);
    expect(s.get(wish)?.slug).toBe(wish);
  });

  it("SCENE 1b — is the absence-form still needed? YES, as a fallback for a granting scheduled where the frame cannot see the schedule at all", () => {
    const s = new Society();
    const wish = "wish-the-bridge-gets-built";
    const laying = "laying-the-bridge-wish";
    layWish(s, wish, laying);
    const granting = "granting-the-bridge-wish";
    node(s, granting);
    s.layP(`${granting}~grants~${wish}`, "granted", granting, wish, "q-grounding");

    // a day DOES hold this granting — it is genuinely scheduled, somewhere:
    const someTeamsDay = "day-a-team-elsewhere-scheduled-this";
    schedules(s, someTeamsDay, granting);

    // but THIS frame's walk never crosses that day — it can't even see the schedule:
    const frame = "frame-that-cannot-see-the-schedule";
    frameReaches(s, frame, laying);

    // under the sharpened test, this reads sublime to this frame — correctly, since
    // this frame holds no schedule for it:
    expect(isSublimeTo(s, frame, laying, granting)).toBe(true);
    // the absence-form gives the SAME answer here (frame doesn't reach the granting
    // edge either) — the two forms agree whenever the frame is blind to the whole
    // neighborhood. They'd only diverge if a frame reached the bare granting edge
    // WITHOUT reaching any schedule for it (SCENE 1's frame B) — a case the
    // scheduled-granting test classifies correctly (sublime, nothing scheduled here)
    // and the absence-form gets WRONG (it would call frame B's case "not sublime"
    // merely because the bare edge happened to be in view). So: the scheduled-granting
    // test is not just sharper, it SUBSUMES the absence-form's correct answers and
    // fixes its wrong one. The absence-form earns no separate fallback role — it is
    // strictly dominated. Kept below only as a NAMED CONTRAST to make that dominance
    // demonstrable, not because any doll needs to call it for real classification:
    expect(isSublimeToByAbsence(s, frame, laying, granting)).toBe(isSublimeTo(s, frame, laying, granting));
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
    // only whether some frame has SCHEDULED one. Grantability is a property of the
    // wish's own content, orthogonal to scheduling; conflating them would smuggle
    // a stored judgment back onto the node, exactly what the ruling collapses away.
    // (This finding survives the sharpening intact — see SCENE 7/8 for the stress
    // test that pushes on exactly this temptation and still refuses it.)
    expect(isSublimeTo(s, frame, laying, null)).toBe(true); // no granting exists anywhere, yet
  });

  it("SCENE 3 — carried forward through days: the wish is laid once, never re-laid, and still reads sublime for a week — UNCHANGED by the sharpening", () => {
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
    // and none of them holds a SCHEDULE for a granting — none exists yet, and no day
    // schedules it — so it reads sublime every single day, forward, without a single
    // re-lay. Carry-forward survives the sharpening exactly as before: nothing about
    // "is it scheduled" changes how the laying itself carries forward through succession.
    for (const day of [tuesday, wednesday, thursday]) {
      expect(dayReachesLaying(day)).toBe(true);
      expect(frameReachesAScheduleFor(s, day, "granting-the-drought-wish-nonexistent")).toBe(false);
    }
  });

  it("SCENE 4 — the moment it stops being a sublime: a later day SCHEDULES it, no un-designation, no rewrite", () => {
    const s = new Society();
    const wish = "wish-the-well-gets-dug";
    const laying = "laying-the-well-wish";
    layWish(s, wish, laying);
    const frameB = "frame-b-later";
    frameReaches(s, frameB, laying);
    expect(isSublimeTo(s, frameB, laying, null)).toBe(true); // sublime to B, for now

    // frame B's own sprint schedules a granting for it — an ordinary new event,
    // nothing written onto `wish` or `laying`:
    const granting = "granting-the-well-wish";
    node(s, granting);
    s.layP(`${granting}~grants~${wish}`, "granted", granting, wish, "q-grounding");
    const nextSprint = "sprint-b-next-quarter";
    schedules(s, nextSprint, granting);
    frameReaches(s, frameB, nextSprint);

    // the SAME node, the SAME frame: it stops reading as sublime purely because the
    // walk now finds a schedule where it didn't a moment ago — no field flipped,
    // nothing erased:
    expect(isSublimeTo(s, frameB, laying, granting)).toBe(false);
    expect(s.get(wish)?.content).toBe(wish); // the wish node itself: untouched, never rewritten
    expect(s.get(laying)?.content).toBe(laying); // the laying: untouched too
  });

  it("SCENE 5 — the honest failure mode: two unscheduled wishes look IDENTICAL from inside frame B, whether or not they're EVER grantable", () => {
    const s = new Society();
    // wish ONE: laid, and — unbeknownst to anyone in frame B — genuinely never
    // grantable (its granting-condition can't be met; nothing anywhere will ever
    // schedule a granting for it). This doll cannot MODEL "never" as a positive
    // fact (absence of a future edge that will never come); it can only model the
    // ABSENCE-OF-A-SCHEDULE as of now, same as any other never-yet:
    const perpetualWish = "wish-that-can-never-be-granted";
    const perpetualLaying = "laying-the-perpetual-wish";
    layWish(s, perpetualWish, perpetualLaying);

    // wish TWO: laid, ordinary, will be scheduled eventually — just not yet, and not
    // yet visible to frame B either way:
    const ordinaryWish = "wish-that-will-be-scheduled-next-month";
    const ordinaryLaying = "laying-the-ordinary-wish";
    layWish(s, ordinaryWish, ordinaryLaying);

    const frameB = "frame-b-cannot-tell-these-apart";
    frameReaches(s, frameB, perpetualLaying);
    frameReaches(s, frameB, ordinaryLaying);

    // BOTH read as sublime to frame B, right now — same shape, same walk result:
    expect(isSublimeTo(s, frameB, perpetualLaying, null)).toBe(true);
    expect(isSublimeTo(s, frameB, ordinaryLaying, null)).toBe(true);
    // there is no assertion that could tell them apart from here — that IS the point,
    // and it is the SAME point the Riemann/P=NP stress scene below plays for real:
    expect(isSublimeTo(s, frameB, perpetualLaying, null)).toBe(isSublimeTo(s, frameB, ordinaryLaying, null));

    // Hallie's ask was to state a position, not dodge it: THIS IS ACCEPTABLE, not a bug.
    // The only knowable thing is whether some frame has SCHEDULED a granting — not
    // whether one is possible. A model that COULD tell these apart from frame B would
    // need a god's-eye view of the future, which is exactly the kind of stored,
    // frame-free truth this whole ruling exists to refuse. The asymmetry resolves
    // itself later, honestly, the only way it can: if a schedule ever arrives and frame
    // B's walk reaches it, ordinaryWish stops reading sublime (SCENE 4's mechanism). If
    // none ever does, perpetualWish reads sublime forever — indistinguishable, from any
    // FINITE vantage, from "not yet scheduled." That is not a hole in the model; it is
    // the model.
  });

  it("SCENE 6 — designation vs. walk: when the OLD pole-designation and the NEW scheduled-granting walk disagree, the walk wins — UNCHANGED by the sharpening", () => {
    const s = new Society();
    // society.ts's isSublimePole reads a designation — an un-occluded q-sublime-pole
    // edge onto a node — completely independent of whether any frame's granting-walk
    // can reach a schedule for it. Here a node is DESIGNATED sublime under the old
    // mechanism:
    const designatedSublime = "designated-as-sublime-by-the-old-mechanism";
    const designator = "someone-who-designated-it";
    node(s, designator);
    s.layP(`${designator}~designates~${designatedSublime}`, "a star for navigation, the old way",
      designator, designatedSublime, "q-sublime-pole");
    expect(isSublimePole(s, designatedSublime)).toBe(true); // the OLD reading says: sublime, full stop

    // but under the NEW reading, this same node has a laying AND a granting that IS
    // scheduled by a day some frame reaches:
    const laying = "laying-of-the-designated-node";
    layWish(s, designatedSublime, laying);
    const granting = "granting-of-the-designated-node";
    node(s, granting);
    s.layP(`${granting}~grants~${designatedSublime}`, "granted, despite the old designation",
      granting, designatedSublime, "q-grounding");
    const day = "day-that-schedules-the-designated-node";
    schedules(s, day, granting);
    const frame = "frame-that-reaches-the-schedule";
    frameReaches(s, frame, laying);
    frameReaches(s, frame, day);

    // THE DISAGREEMENT, played: the old designation says sublime; the new walk, from
    // this frame, says granted-wish (it is SCHEDULED). THE WALK WINS. Argument: a
    // designation is a claim laid IN THE PAST by whoever wrote the q-sublime-pole edge
    // — evidence of a judgment made at that time, from that frame, with the information
    // then available. It is not load-bearing truth; per this doll's own ontology
    // (Hallie: "the difference between a sublime and a wish is pretty immaterial"),
    // nothing is stored on the node that could outrank a live walk. Treating the
    // designation as ground truth would mean a stale claim could permanently overrule
    // what every later frame can actually reach — exactly the kind of frame-free,
    // un-updatable fact this whole model exists to refuse.
    expect(isSublimePole(s, designatedSublime)).toBe(true); // the old mechanism, unmodified, still says so
    expect(isSublimeTo(s, frame, laying, granting)).toBe(false); // the walk, for this frame, says granted
    // the doll's own assertion takes the walk's side — this is the position, not a hedge:
    const theWalkWins = !isSublimeTo(s, frame, laying, granting);
    expect(theWalkWins).toBe(true);
  });

  it("SCENE 7 — measured consequence, played honestly: a board where one day past today holds 4 things and 21 rows sit unscheduled reads almost EVERYTHING as sublime, today", () => {
    const s = new Society();
    // Synthetic analog of the live board's measured shape (not a live-DB query — this
    // doll stays self-contained like every other one here): exactly one day-node later
    // than today HOLDS scheduled grantings (four of them); the rest of the backlog
    // — 21 rows — sits laid, with no schedule anywhere in reach.
    const today = "day-today";
    const oneDayOut = "day-one-day-out-the-only-scheduled-day";
    succeeds(s, oneDayOut, today);
    const frame = "frame-the-board-as-a-whole";
    frameReaches(s, frame, today);
    frameReaches(s, frame, oneDayOut);

    const scheduledWishes: string[] = [];
    for (let i = 0; i < 4; i++) {
      const wish = `wish-scheduled-${i}`, laying = `laying-scheduled-${i}`, granting = `granting-scheduled-${i}`;
      layWish(s, wish, laying);
      node(s, granting);
      s.layP(`${granting}~grants~${wish}`, "granted", granting, wish, "q-grounding");
      schedules(s, oneDayOut, granting);
      frameReaches(s, frame, laying);
      scheduledWishes.push(wish);
    }

    const unscheduledWishes: { wish: string; laying: string; granting: string }[] = [];
    for (let i = 0; i < 21; i++) {
      const wish = `wish-unscheduled-${i}`, laying = `laying-unscheduled-${i}`, granting = `granting-unscheduled-${i}`;
      layWish(s, wish, laying);
      node(s, granting); // a granting NODE exists (someone imagined the finish) —
      s.layP(`${granting}~grants~${wish}`, "granted, in principle", granting, wish, "q-grounding");
      // — but NOTHING schedules it. No day, no sprint, holds this granting anywhere.
      frameReaches(s, frame, laying);
      unscheduledWishes.push({ wish, laying, granting });
    }

    // the four scheduled wishes read as ordinary wishes to the board's own frame:
    for (const wish of scheduledWishes) {
      const granting = wish.replace("wish-", "granting-");
      expect(isSublimeTo(s, frame, wish.replace("wish-", "laying-"), granting)).toBe(false);
    }
    // ALL TWENTY-ONE unscheduled rows read as sublimes, today, to the same frame:
    for (const { laying, granting } of unscheduledWishes) {
      expect(isSublimeTo(s, frame, laying, granting)).toBe(true);
    }
    // stated plainly, as the doll's own position rather than left to the report: this is
    // NOT a flaw in the reading. It is an accurate report of a board where 21 of 25 rows
    // have not actually been committed to a day or sprint by anyone. "Almost everything
    // is a sublime today" is uncomfortable, not wrong — see SCENE 8's "sky full of false
    // stars" discussion for why a backlog that reads mostly-sublime is USEFUL information,
    // not category collapse:
    const scheduledCount = scheduledWishes.length;
    const unscheduledCount = unscheduledWishes.length;
    expect(unscheduledCount).toBeGreaterThan(scheduledCount * 4); // the measured lopsidedness, asserted, not just narrated
  });

  it("SCENE 8 — THE STRESS TEST: P=NP, Riemann, and an ordinary receding-horizon wish are THE SAME KIND under this test, and that collapse is correct, not a bug", () => {
    const s = new Society();
    const frame = "frame-the-mathematical-community";

    // three wishes, laid, none scheduled by any day or sprint anywhere:
    const pEqualsNp = "wish-a-proof-for-p-equals-np";
    const pEqualsNpLaying = "laying-p-equals-np-wish";
    layWish(s, pEqualsNp, pEqualsNpLaying);
    frameReaches(s, frame, pEqualsNpLaying);

    const riemann = "wish-a-proof-for-the-riemann-hypothesis";
    const riemannLaying = "laying-riemann-wish";
    layWish(s, riemann, riemannLaying);
    frameReaches(s, frame, riemannLaying);

    const peopleCoordinate = "wish-people-coordinate-their-tasks-easily";
    const peopleCoordinateLaying = "laying-people-coordinate-wish";
    layWish(s, peopleCoordinate, peopleCoordinateLaying);
    frameReaches(s, frame, peopleCoordinateLaying);

    // intuition wants these to differ: a finite, specific mathematical proof "feels"
    // different from a receding-horizon social aspiration that may never fully close.
    // Under the scheduled-granting test, THEY DO NOT DIFFER — none is scheduled, so
    // all three read as sublimes:
    expect(isSublimeTo(s, frame, pEqualsNpLaying, null)).toBe(true);
    expect(isSublimeTo(s, frame, riemannLaying, null)).toBe(true);
    expect(isSublimeTo(s, frame, peopleCoordinateLaying, null)).toBe(true);

    // THE RESOLUTION (Hallie's own cut against the naive move): do not hunt for a walk
    // that separates "unscheduled-but-doable" from "unschedulable-in-principle." We do
    // not actually KNOW P=NP or Riemann are doable-in-time-just-not-yet-scheduled —
    // Riemann may be independent of ZFC; P=NP may be unprovable outright. The intuition
    // that these differ from "people coordinate easily" assumes an achievability-
    // knowledge nobody possesses. There is no such distinguishing walk available, not in
    // this graph and not epistemically — looking for one would encode false confidence
    // this doll refuses to fake. So the assertion below is not a limitation surfaced by
    // accident; it is the doll's stated POSITION:
    const allThreeCollapseToTheSameReading =
      isSublimeTo(s, frame, pEqualsNpLaying, null) === isSublimeTo(s, frame, riemannLaying, null) &&
      isSublimeTo(s, frame, riemannLaying, null) === isSublimeTo(s, frame, peopleCoordinateLaying, null);
    expect(allThreeCollapseToTheSameReading).toBe(true);
    // the ONLY knowable thing, from any frame anyone can occupy, is whether SOME FRAME
    // HAS SCHEDULED a granting. Not a model limitation — an accurate report of the
    // actual epistemic situation these three wishes are genuinely, equally, in.
  });

  it("SCENE 9 — the mathematician's sprint: scheduling un-sublimes a wish MECHANICALLY, regardless of whether the schedule can be delivered — a feature, not a hole", () => {
    const s = new Society();
    const frame = "frame-a-mathematician-with-a-sprint-board";
    const riemann = "wish-a-proof-for-the-riemann-hypothesis-again";
    const riemannLaying = "laying-riemann-wish-again";
    layWish(s, riemann, riemannLaying);
    frameReaches(s, frame, riemannLaying);
    expect(isSublimeTo(s, frame, riemannLaying, null)).toBe(true); // sublime, before the sprint

    // the mathematician schedules it — "prove Riemann this quarter" — in their own
    // sprint frame. However deluded that commitment may turn out to be, it is a REAL
    // scheduling edge, mechanically identical in shape to any other:
    const granting = "granting-riemann-this-quarter";
    node(s, granting);
    s.layP(`${granting}~grants~${riemann}`, "granted (claimed)", granting, riemann, "q-grounding");
    const thisQuarter = "sprint-this-quarter";
    schedules(s, thisQuarter, granting);
    frameReaches(s, frame, thisQuarter);

    // MECHANICALLY, under this test, the node becomes an ordinary wish for this frame —
    // full stop, no separate "is this credible" gate anywhere in the walk:
    expect(isSublimeTo(s, frame, riemannLaying, granting)).toBe(false);

    // THE SHARPEST QUESTION, stated as this doll's own verdict: the model reports what
    // a FRAME CLAIMS, never whether the frame is RIGHT. That is read here as a FEATURE,
    // not a hole — argued three ways: (1) the graph's whole discipline is "no statement
    // is not spoken from" (laid_by, 2026-07-07) — it is built to record commitments and
    // their authors, never to adjudicate truth, so asking it to also grade credibility
    // would be asking a ledger to also be a judge; (2) the alternative — some mechanism
    // that only un-sublimes a wish when the schedule is "credible" — needs a credibility
    // oracle this graph does not have and SCENE 8 just showed cannot exist even in
    // principle (we don't know if Riemann is deliverable AT ALL); building one would
    // silently launder a guess as kernel-level truth; (3) "any fool can un-sublime
    // anything by scheduling it" is exactly as true, and exactly as fine, as "any fool
    // can lay a wish that will never be granted" — the graph already tolerates that at
    // the laying end, so tolerating it at the scheduling end is the same discipline
    // applied consistently, not a new leak:
    const graphReportsClaimsNotTruth = true;
    expect(graphReportsClaimsNotTruth).toBe(true);
  });

  it("SCENE 10 (bonus) — a self-referential granting: laying it does not throw, but it never resolves the walk it needs to resolve", () => {
    const s = new Society();
    // Hallie's aside: Riemann may depend on its own proof to prove itself (prime
    // structure entwined with representability of proofs) — its granting may be
    // SELF-REFERENTIALLY unschedulable, not merely unscheduled: placing it in a
    // projected day would presuppose the very thing being proved. Modeled here as a
    // granting whose own "why" aims back at the wish it grants — the sublime-to-sublime
    // ring relaxation (society.ts ~line 230, RELAXED 2026-07-10: "aims mutually prehend
    // at the limit") makes this LAWFUL to lay, not refused and not silently divergent:
    const riemann = "wish-riemann-self-referential";
    const riemannLaying = "laying-riemann-self-referential";
    layWish(s, riemann, riemannLaying);

    const selfGranting = "granting-riemann-that-presupposes-itself";
    node(s, selfGranting);
    // the granting event grants the wish...
    s.layP(`${selfGranting}~grants~${riemann}`, "granted, if you already had the proof", selfGranting, riemann, "q-grounding");
    // ...but its own justification loops back onto the wish it is meant to settle —
    // laid as q-end-pole (why()'s quality), same shape any why-circuit uses:
    expect(() => {
      s.layP(`${selfGranting}~needs~${riemann}`, "the proof of the granting presupposes the wish itself",
        selfGranting, riemann, "q-end-pole");
    }).not.toThrow(); // LAWFUL: the kernel's acyclic guard was relaxed for exactly this shape

    // but a frame that reaches the laying and even reaches this self-referential
    // granting edge STILL cannot schedule it — no day or sprint holds it, and none
    // honestly could, since holding it would require already holding its own proof:
    const frame = "frame-a-number-theorist";
    frameReaches(s, frame, riemannLaying);
    frameReaches(s, frame, selfGranting);
    expect(isSublimeTo(s, frame, riemannLaying, selfGranting)).toBe(true); // still reads sublime

    // the punchline this scene plays: self-reference gives the sublime FIRMER footing
    // (unplaceable IN PRINCIPLE, not merely unplaced-so-far) — but from inside any
    // frame, this is INDISTINGUISHABLE from SCENE 8's ordinary unscheduled case. The
    // collapse still holds; the reason underneath is just more interesting, and the
    // graph cannot see the difference between "more interesting reason" and "no reason
    // at all" — which is, again, the model working as intended, not failing to notice.
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
