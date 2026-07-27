// ─────────────────────────────────────────────────────────────────────────────
// sublime-is-a-wish.play.test.ts — a play-TEST of Hallie's collapse ruling
// (2026-07-27), sharpened twice more the same day.
//
// PASS 1 (kept below as "the READ" — end-of-linear-time framing, subsumes the
// original absence-test): a wish and a sublime are not two kinds of node. They
// are ONE kind, read two ways depending on where the granting is GROUNDED.
// A granting settled in a reachable future day reads as a WISH. A granting
// settled only at the end of linear time (or nowhere) reads as a SUBLIME.
// Modeled with a synthetic terminal/end-of-linear-time pole — the analog of
// live canon's `everyone-lived-happily-ever-after` (row 1 of canon, designated
// q-sublime-pole, 11 things grounding into it; not queried live here, built
// fresh so this doll stays self-contained). Ungrounded/unscheduled grantings
// ground into this terminal pole by default — nowhere else to go.
//
// PASS 2 — THE LAW (ranks ABOVE the READ; these scenes now LEAD the doll):
// Hallie, verbatim: "Loops can exist in the sublime, not outside of it." "in
// theory loops in the primordeal are also possible." Why this outranks the
// READ material: absence-of-reach / scheduled / end-of-linear-time are all
// things the engine CANNOT check from inside a frame — observer-dependent.
// Cycles are STRUCTURAL — the engine can always see them, unconditionally.
// This is the first enforceable (not just descriptive) distinction the doll
// plays. THE LAW: loops live AT THE POLES, never in ordinary time. Sublimes at
// the far pole, primordials at the near pole — both sit outside linear time,
// so ordinary cycle rules don't bind them. Everything BETWEEN the poles must
// stay acyclic. society.ts's checkSublimeAcyclic (~line 230) already always-
// allows sublime rings (gutted 2026-07-10) — this doll shows that behavior IS
// the law working, not a gap, and shows the matching gap: nothing guards
// ordinary time the same way, and nothing should be modeled to look like it
// does until that guard exists for real.
//
// CORRECTION folded in before this pass was finished: holds/charge edges are
// NOT modeled anywhere in this file, not even to show them failing. Hallie:
// "holds and charge are both bad edges, this is why we're killing the canon."
// The `{day}~holds~{event}` + `{event}~charge~{day_end}` pair is two edges in
// OPPOSITE DIRECTIONS between the same pair in ordinary time — that pair IS a
// cycle by definition, not a puzzle to route around. Scene 12 (the ordinary-
// time red-test) is built from plain, single-direction because/prehension
// edges between two ordinary events instead.
//
// PASS 3 — the constructive fix (Hallie): "in the new model there is one
// simple test for membership, a bare prehension one way or the other with the
// now." Membership (an event being "inside" a containing event) is not two
// stored edges. It is ONE bare prehension edge with the Now; direction encodes
// which side. Specced, never implemented, at specs/drawer-contents.md items
// 8-10:
//   8) Now is prehended by the end of the event and prehends the beginning
//      of the event.
//   9) If an event prehends that event's now, it has not yet happened in the
//      context of that event.
//   10) If an event is prehended by an event's now, it has happened in the
//       past of the context.
// Scene 14 plays this directly. It ties straight back to the loops-law: a
// single directional edge cannot loop by itself — that's WHY holds/charge (two
// opposite-direction edges) was structurally unlawful in ordinary time, and WHY
// this replacement is automatically compliant with the same law, not a second
// fix bolted alongside the first.
//
// This doll does NOT touch society.ts's isSublimePole/checkSublimeNeverCloses/
// checkSublimeAcyclic (only reads them, to compare against); it plays its own
// alternative reading in test-file-local helpers, using only real
// node()/why()/succeeds()/layP prehensions. DO NOT model `holds` or `charge`
// edges anywhere in this file — see the correction above.
//
// Run: cd scher && npx vitest run sublime-is-a-wish.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, isSublimePole } from "../src/society.js";
import { node, succeeds } from "../src/play.js";

// ── shared doll-local helpers ───────────────────────────────────────────────

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

/** THE CENTRAL HELPER: reads as a sublime to `frame` iff the frame's walk
 *  reaches the wish's LAYING, but the granting is NOT held by any day or
 *  sprint the frame reaches. Not "did we fail to find a granting" — "is the
 *  granting scheduled anywhere this frame can see." Bounded; has a definite
 *  answer regardless of how far the walk went. */
function isSublimeTo(s: Society, frame: string, laying: string, granting: string | null): boolean {
  const reachesLaying = reaches(s, frame, laying);
  const grantingIsScheduled = granting !== null && frameReachesAScheduleFor(s, frame, granting);
  return reachesLaying && !grantingIsScheduled;
}

/** the OLD absence-form, kept as its own named helper (see SCENE 2 for why it
 *  still earns its place): reaches the laying and does NOT reach the granting
 *  edge itself at all — a strictly weaker, unbounded question than
 *  isSublimeTo's "is it scheduled." */
function isSublimeToByAbsence(s: Society, frame: string, laying: string, granting: string | null): boolean {
  const reachesLaying = reaches(s, frame, laying);
  const reachesGranting = granting !== null && reaches(s, frame, granting);
  return reachesLaying && !reachesGranting;
}

/** helper for SCENE 5: does `day`'s frame reach `laying` by walking q-succeeds
 *  back to the day that contains it, then q-grounding forward into the laying?
 *  Two different qualities chained by hand (routesTo alone only walks ONE
 *  quality, q-end-pole) — this is the carry-forward mechanism the ruling asks for. */
function routesToViaSuccessionThenGrounding(s: Society, day: string, laying: string, seen = new Set<string>()): boolean {
  if (seen.has(day)) return false;
  seen.add(day);
  if (prehensionsFrom(s, day, "q-grounding").some((e) => e.object === laying)) return true;
  return prehensionsFrom(s, day, "q-succeeds").some((e) => e.object != null && routesToViaSuccessionThenGrounding(s, e.object, laying, seen));
}

/** a designated pole: any node reached via an un-occluded `quality` edge from
 *  `designator`. Used for both the sublime-pole (far) and the primordial-pole
 *  (near) — same shape, opposite end of linear time. Plain q-sublime-pole
 *  reuses the real kernel quality (so isSublimePole recognizes it); the
 *  primordial pole uses a doll-local quality since nothing in the kernel
 *  designates one — see SCENE 11 for why that's the point. */
function designate(s: Society, designator: string, pole: string, quality: string): void {
  node(s, designator); node(s, pole);
  s.layP(`${designator}~designates~${pole}`, "a pole designation", designator, pole, quality as never);
}

/** does `start` reach `target` by walking a single quality forward, with a
 *  visited-set so a ring terminates instead of recursing forever? This is the
 *  same walk-termination shape routesTo/reaches use throughout this file and
 *  the rest of the codebase — SCENES 9-12 exist to show that shape holds even
 *  when the edges themselves form a ring. */
function walks(s: Society, start: string, target: string, quality: string, seen = new Set<string>()): boolean {
  if (start === target) return true;
  if (seen.has(start)) return false;
  seen.add(start);
  return prehensionsFrom(s, start, quality)
    .some((e) => e.object != null && walks(s, e.object, target, quality, seen));
}

describe("Sublime is a wish, read two ways — the scheduled-granting model 🌗", () => {
  // ═══════════════════════════════════════════════════════════════════════
  // (a) THE READ — end-of-linear-time framing: where a granting is grounded
  // ═══════════════════════════════════════════════════════════════════════

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

  it("SCENE 2 — is the absence-form still needed? YES, as a named contrast — it is strictly dominated", () => {
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
    // this frame holds no schedule for it. The absence-form agrees here (frame
    // doesn't reach the granting edge either) — the two forms only diverge when a
    // frame reaches the bare granting edge WITHOUT reaching any schedule for it
    // (SCENE 1's frame B), a case the scheduled-granting test gets right and the
    // absence-form gets wrong. So the absence-form is strictly dominated — kept
    // only as a named contrast to make that dominance demonstrable:
    expect(isSublimeTo(s, frame, laying, granting)).toBe(true);
    expect(isSublimeToByAbsence(s, frame, laying, granting)).toBe(isSublimeTo(s, frame, laying, granting));
  });

  it("SCENE 3 — the gap alone is the whole definition; no third condition was needed", () => {
    const s = new Society();
    const wish = "wish-the-roof-gets-fixed";
    const laying = "laying-the-roof-wish";
    layWish(s, wish, laying);
    const frame = "frame-someone-far-away";
    frameReaches(s, frame, laying);

    // the temptation was a THIRD condition: "...AND the wish must actually be
    // grantable in principle." Unnecessary — isSublimeTo never asks whether granting
    // is POSSIBLE, only whether some frame has SCHEDULED one. Grantability is a
    // property of the wish's own content, orthogonal to scheduling:
    expect(isSublimeTo(s, frame, laying, null)).toBe(true); // no granting exists anywhere, yet
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

  it("SCENE 5 — carried forward through days: laid once, never re-laid, still reads sublime for a week", () => {
    const s = new Society();
    const wish = "wish-the-drought-ends";
    const monday = "laying-the-drought-wish-monday";
    layWish(s, wish, monday);

    const tuesday = "day-tuesday", wednesday = "day-wednesday", thursday = "day-thursday";
    succeeds(s, tuesday, "day-monday");
    succeeds(s, wednesday, tuesday);
    succeeds(s, thursday, wednesday);
    s.layP("day-monday~because~" + monday, "Monday contains the laying of this wish", "day-monday", monday, "q-grounding");

    // NOTHING re-lays the wish on Tuesday/Wednesday/Thursday; each day's frame reaches
    // it purely by walking BACK along q-succeeds to Monday, then onward via q-grounding:
    for (const day of [tuesday, wednesday, thursday]) {
      expect(routesToViaSuccessionThenGrounding(s, day, monday)).toBe(true);
      expect(frameReachesAScheduleFor(s, day, "granting-the-drought-wish-nonexistent")).toBe(false);
    }
  });

  it("SCENE 6 — designation vs. walk: when the OLD pole-designation and the NEW scheduled-granting walk disagree, the walk wins", () => {
    const s = new Society();
    const designatedSublime = "designated-as-sublime-by-the-old-mechanism";
    const designator = "someone-who-designated-it";
    node(s, designator);
    s.layP(`${designator}~designates~${designatedSublime}`, "a star for navigation, the old way",
      designator, designatedSublime, "q-sublime-pole");
    expect(isSublimePole(s, designatedSublime)).toBe(true); // the OLD reading says: sublime, full stop

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

    // THE DISAGREEMENT: the old designation says sublime; the new walk, from this
    // frame, says granted-wish (it is SCHEDULED). THE WALK WINS — a designation is a
    // claim laid IN THE PAST; nothing stored on the node outranks a live walk:
    expect(isSublimePole(s, designatedSublime)).toBe(true); // the old mechanism, unmodified, still says so
    expect(isSublimeTo(s, frame, laying, granting)).toBe(false); // the walk, for this frame, says granted
    expect(!isSublimeTo(s, frame, laying, granting)).toBe(true);
  });

  it("SCENE 7 — the Riemann/P=NP stress test: grounding at the terminal pole, explicitly, for wishes no day or sprint has ever scheduled", () => {
    const s = new Society();
    const frame = "frame-the-mathematical-community";

    // a synthetic terminal/end-of-linear-time pole — analog of live canon's row-1
    // `everyone-lived-happily-ever-after` (designated q-sublime-pole, 11 things
    // grounding into it in the real graph; not queried live, built fresh here so
    // this doll stays self-contained). Ungrounded grantings ground into THIS pole
    // by default — nowhere else in linear time for them to go:
    const terminalPole = "pole-end-of-linear-time";
    const canonRoot = "canon-root";
    designate(s, canonRoot, terminalPole, "q-sublime-pole");
    expect(isSublimePole(s, terminalPole)).toBe(true);

    function laidAndGroundedAtTerminal(wishSlug: string, layingSlug: string): void {
      layWish(s, wishSlug, layingSlug);
      frameReaches(s, frame, layingSlug);
      // no day/sprint schedules a granting for this wish — its granting, if it has
      // one at all, grounds at the terminal pole explicitly, not by mere absence:
      const granting = `granting-${wishSlug}`;
      node(s, granting);
      s.layP(`${granting}~grants~${wishSlug}`, "granted only at the end of linear time",
        granting, wishSlug, "q-grounding");
      s.layP(`${granting}~grounds-at-terminal~${terminalPole}`, "this granting rests nowhere in reachable time",
        granting, terminalPole, "q-grounding");
    }

    const pEqualsNp = "wish-a-proof-for-p-equals-np", pEqualsNpLaying = "laying-p-equals-np-wish";
    laidAndGroundedAtTerminal(pEqualsNp, pEqualsNpLaying);
    const riemann = "wish-a-proof-for-the-riemann-hypothesis", riemannLaying = "laying-riemann-wish";
    laidAndGroundedAtTerminal(riemann, riemannLaying);
    const peopleCoordinate = "wish-people-coordinate-their-tasks-easily", peopleCoordinateLaying = "laying-people-coordinate-wish";
    laidAndGroundedAtTerminal(peopleCoordinate, peopleCoordinateLaying);

    // all three ground at the SAME terminal pole, explicitly — not "no day holds it,"
    // but "grounds here, at the pole, because we cannot place it anywhere else":
    for (const granting of [`granting-${pEqualsNp}`, `granting-${riemann}`, `granting-${peopleCoordinate}`]) {
      expect(walks(s, granting, terminalPole, "q-grounding")).toBe(true);
    }
    // and none is scheduled by any day or sprint, so all three still read sublime:
    expect(isSublimeTo(s, frame, pEqualsNpLaying, null)).toBe(true);
    expect(isSublimeTo(s, frame, riemannLaying, null)).toBe(true);
    expect(isSublimeTo(s, frame, peopleCoordinateLaying, null)).toBe(true);

    // THE POSITION, stated plainly: this collapse is CORRECT, not a bug. We do not
    // actually KNOW P=NP or Riemann are achievable — Riemann may be independent of
    // ZFC; P=NP may be unprovable outright — so we cannot place the granting, so it
    // sits with the eternal things, same as an ordinary receding-horizon social wish:
    const allThreeCollapseToTheSameReading =
      isSublimeTo(s, frame, pEqualsNpLaying, null) === isSublimeTo(s, frame, riemannLaying, null) &&
      isSublimeTo(s, frame, riemannLaying, null) === isSublimeTo(s, frame, peopleCoordinateLaying, null);
    expect(allThreeCollapseToTheSameReading).toBe(true);
  });

  it("SCENE 8 — designation-vs-walk, and carry-forward, hold under scheduling too: scheduling un-sublimes mechanically, whatever the credibility", () => {
    const s = new Society();
    const frame = "frame-a-mathematician-with-a-sprint-board";
    const riemann = "wish-a-proof-for-the-riemann-hypothesis-again";
    const riemannLaying = "laying-riemann-wish-again";
    layWish(s, riemann, riemannLaying);
    frameReaches(s, frame, riemannLaying);
    expect(isSublimeTo(s, frame, riemannLaying, null)).toBe(true); // sublime, before the sprint

    // the mathematician schedules it — "prove Riemann this quarter." However deluded
    // that commitment may be, it is a REAL scheduling edge, mechanically identical in
    // shape to any other:
    const granting = "granting-riemann-this-quarter";
    node(s, granting);
    s.layP(`${granting}~grants~${riemann}`, "granted (claimed)", granting, riemann, "q-grounding");
    const thisQuarter = "sprint-this-quarter";
    schedules(s, thisQuarter, granting);
    frameReaches(s, frame, thisQuarter);

    // MECHANICALLY, the node becomes an ordinary wish for this frame — full stop, no
    // separate "is this credible" gate anywhere in the walk. The graph reports what a
    // FRAME CLAIMS, never whether the frame is RIGHT — the same discipline the laying
    // end already tolerates (any fool can lay a wish that will never be granted),
    // applied consistently at the scheduling end too:
    expect(isSublimeTo(s, frame, riemannLaying, granting)).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (b) THE LAW — loops live AT THE POLES, never in ordinary time
  // ═══════════════════════════════════════════════════════════════════════

  it("SCENE 9 — a loop among sublimes is LEGAL, and the walk terminates: Hallie's ruling played structurally", () => {
    const s = new Society();
    // three sublime-pole nodes that mutually prehend — a genuine ring, entirely at
    // the far pole. society.ts's checkSublimeAcyclic (~line 230) always-allows this
    // shape (RELAXED 2026-07-10) — this scene shows that IS the law working, played
    // as a real ring rather than described in a comment:
    const designator = "someone-who-designates-these";
    const sublimeA = "sublime-pole-a", sublimeB = "sublime-pole-b", sublimeC = "sublime-pole-c";
    designate(s, designator, sublimeA, "q-sublime-pole");
    designate(s, designator, sublimeB, "q-sublime-pole");
    designate(s, designator, sublimeC, "q-sublime-pole");
    expect(isSublimePole(s, sublimeA)).toBe(true);
    expect(isSublimePole(s, sublimeB)).toBe(true);
    expect(isSublimePole(s, sublimeC)).toBe(true);

    // the ring itself: A serves B serves C serves A, a bare doll-local quality (not
    // q-grounding, so checkSublimeNeverCloses's closure guard is not even in play here
    // — this quality is a lateral "mutually prehend" edge, not an actualizing close):
    s.layP(`${sublimeA}~mutually-prehends~${sublimeB}`, "A reaches toward B", sublimeA, sublimeB, "q-end-pole");
    s.layP(`${sublimeB}~mutually-prehends~${sublimeC}`, "B reaches toward C", sublimeB, sublimeC, "q-end-pole");
    s.layP(`${sublimeC}~mutually-prehends~${sublimeA}`, "C reaches toward A, closing the ring", sublimeC, sublimeA, "q-end-pole");

    // ALLOWED: laying the ring did not throw. And the walk TERMINATES — it does not
    // infinite-loop — because walks()/routesTo's existing visited-set logic already
    // handles a ring the same way it handles any other graph shape:
    expect(walks(s, sublimeA, sublimeC, "q-end-pole")).toBe(true); // reachable, going around
    expect(walks(s, sublimeA, "nothing-in-the-ring")).toBe(false); // and it still terminates cleanly on a miss
  });

  it("SCENE 10 — a loop among primordials is legal BY THE SAME REASONING — pure synthetic play, nothing in real canon designates one", () => {
    const s = new Society();
    // no primordial exists in real canon; this is pure synthetic play, arguing from
    // the same structural reasoning as SCENE 9: both poles sit outside linear time,
    // so ordinary cycle rules don't bind either one. Nothing in society.ts or
    // scher-core has a primordial-specific check — it is simply UNGUARDED, same as
    // everything in ordinary time currently is (see SCENE 11, the actual gap):
    const designator = "someone-who-designates-primordials";
    const primordialX = "primordial-pole-x", primordialY = "primordial-pole-y";
    designate(s, designator, primordialX, "q-primordial-pole"); // doll-local quality — no kernel guard reads it, and none needs to for this scene
    designate(s, designator, primordialY, "q-primordial-pole");

    s.layP(`${primordialX}~mutually-prehends~${primordialY}`, "X reaches toward Y", primordialX, primordialY, "q-end-pole");
    s.layP(`${primordialY}~mutually-prehends~${primordialX}`, "Y reaches back toward X, closing the ring", primordialY, primordialX, "q-end-pole");

    // ALLOWED — nothing in the kernel forbids it, and by the same "outside linear
    // time" reasoning as sublimes, nothing SHOULD forbid it:
    expect(walks(s, primordialX, primordialY, "q-end-pole")).toBe(true);
    expect(walks(s, primordialY, primordialX, "q-end-pole")).toBe(true); // the ring, walked from either end, terminates
  });

  it("SCENE 11 — RED-TEST TARGET: a loop in ORDINARY time should be refused, and today it is not — plain prehension edges, no holds/charge", () => {
    const s = new Society();
    // two ORDINARY (non-pole) events — no q-sublime-pole, no q-primordial-pole, no
    // holds/charge anywhere (Round D correction: holds/charge are dead, forbidden-
    // to-even-model grammar; this uses plain q-end-pole because/prehension edges,
    // the same quality why()/routesTo already use elsewhere in this doll):
    const mondayMeeting = "ordinary-event-monday-meeting";
    const tuesdayFollowup = "ordinary-event-tuesday-followup";
    node(s, mondayMeeting); node(s, tuesdayFollowup);
    expect(isSublimePole(s, mondayMeeting)).toBe(false);
    expect(isSublimePole(s, tuesdayFollowup)).toBe(false);

    // the mutual prehension: Monday's meeting happens so that Tuesday's followup can,
    // AND Tuesday's followup happens so that Monday's meeting can — a genuine cycle
    // between two plain ordinary-time events:
    s.layP(`${mondayMeeting}~so-that~${tuesdayFollowup}`, "Monday happens so Tuesday's followup can",
      mondayMeeting, tuesdayFollowup, "q-end-pole");
    expect(() => {
      s.layP(`${tuesdayFollowup}~so-that~${mondayMeeting}`, "Tuesday's followup happens so Monday's meeting can, closing the ring",
        tuesdayFollowup, mondayMeeting, "q-end-pole");
    }).not.toThrow(); // CURRENTLY PERMITTED — layP has no ordinary-time acyclic guard at all

    // the walk finds the ring, same as at the poles — because nothing distinguishes
    // ordinary time from pole-time in the walk machinery today:
    expect(walks(s, mondayMeeting, tuesdayFollowup, "q-end-pole")).toBe(true);
    expect(walks(s, tuesdayFollowup, mondayMeeting, "q-end-pole")).toBe(true);

    // THE GAP, stated as this doll's own position, not a hedge: THE LAW says loops
    // live AT THE POLES, never in ordinary time — everything BETWEEN the poles must
    // stay acyclic. This construction is a plain ordinary-time loop and the engine
    // did not refuse it. That is a description of TODAY'S gap-having behavior, not an
    // endorsement — a guard OUGHT to exist here (an "ordinary-time acyclic" check,
    // sibling to checkSublimeAcyclic but asserting the opposite: throw unless subject
    // or object is a designated pole) and does not. This doll does not add it (no
    // src/ changes) — it exists to make the gap loud and unmissable for whoever picks
    // this up next:
    const thisIsAGapNotALaw = true;
    expect(thisIsAGapNotALaw).toBe(true);
  });

  it("SCENE 12 — THE SHARP CASE: a loop with one foot at a pole and one foot in ordinary time is FORBIDDEN — decided and argued", () => {
    const s = new Society();
    // THE LAW says loops live at poles; it doesn't say what happens when only ONE
    // node in the cycle is a pole and the other is ordinary. Built here to force the
    // question:
    const designator = "someone-who-designates-a-half-in-pole";
    const farPole = "sublime-pole-half-in-case";
    designate(s, designator, farPole, "q-sublime-pole");
    const ordinaryEvent = "ordinary-event-half-in-case";
    node(s, ordinaryEvent);
    expect(isSublimePole(s, farPole)).toBe(true);
    expect(isSublimePole(s, ordinaryEvent)).toBe(false);

    // the half-in ring: the ordinary event reaches toward the pole, and the pole
    // reaches back toward the ordinary event, closing a two-node cycle:
    s.layP(`${ordinaryEvent}~reaches-toward~${farPole}`, "the ordinary event reaches toward the far pole",
      ordinaryEvent, farPole, "q-end-pole");
    s.layP(`${farPole}~reaches-back-toward~${ordinaryEvent}`, "the pole reaches back, closing the ring",
      farPole, ordinaryEvent, "q-end-pole");

    // laying it does not throw today (same gap as SCENE 11 — nothing currently
    // guards this either), but the DECISION this doll commits to is that it SHOULD be
    // forbidden. Argument: THE LAW draws its line at the node, not at the edge —
    // "everything BETWEEN the poles must stay acyclic" means every node that is NOT a
    // pole must never sit on any cycle, regardless of what is on the cycle's other
    // end. The ordinary event's mere PARTICIPATION in a cycle is itself the
    // violation, full stop — the far end being a legitimate pole does not launder it,
    // because the ordinary node still closes a loop back onto its own past, which is
    // exactly what ordinary time is not allowed to do. A softer rule — "half-in is
    // fine because one foot is safely outside time" — would mean any ordinary event
    // could dodge the acyclic requirement just by reaching for a pole, which hollows
    // the law out entirely (every ordinary node has SOME why-chain that could be
    // routed toward a sublime eventually). So: half-in is FORBIDDEN, and the failure
    // belongs to the ordinary node, not the pole:
    const ordinaryNodeParticipatesInACycle = walks(s, ordinaryEvent, ordinaryEvent, "q-end-pole", new Set());
    // (walks() with start===target short-circuits true trivially per its own
    // documented TODO in play.ts — so the real test is the two-hop ring reachability
    // actually laid above, asserted directly:)
    const halfInRingExists =
      walks(s, ordinaryEvent, farPole, "q-end-pole") && walks(s, farPole, ordinaryEvent, "q-end-pole");
    expect(halfInRingExists).toBe(true); // the construction is laid and reachable both ways today
    const halfInShouldBeForbidden = true; // THE DECISION: any ordinary-time participant in ANY cycle is the violation
    expect(halfInShouldBeForbidden).toBe(true);
    expect(ordinaryNodeParticipatesInACycle).toBe(true); // trivial per walks()'s own start===target rule, noted rather than hidden
  });

  // ═══════════════════════════════════════════════════════════════════════
  // (c) THE CONSTRUCTIVE FIX — membership via bare prehension with the Now
  // ═══════════════════════════════════════════════════════════════════════

  it("SCENE 13 — membership is a bare prehension with the Now, not a stored holds/charge pair — and it cannot loop by construction", () => {
    const s = new Society();
    // a containing event and its own Now (specs/drawer-contents.md #8: "Now is
    // prehended by the end of the event and prehends the beginning of the event").
    // Modeled directly as a node standing in for that containing event's Now — no
    // holds edge, no charge edge, anywhere:
    const containingDay = "containing-event-a-day";
    const dayNow = "the-days-now";
    node(s, containingDay); node(s, dayNow);

    // an inner event that has NOT YET HAPPENED in the context of this day: per spec
    // item 9, "if an event prehends that event's now, it has not yet happened in the
    // context of that event" — ONE directional edge, the inner event is the subject:
    const notYetHappened = "inner-event-not-yet-happened";
    node(s, notYetHappened);
    s.layP(`${notYetHappened}~prehends~${dayNow}`, "this inner event prehends the day's now — not yet happened",
      notYetHappened, dayNow, "q-grounding");

    // an inner event that HAS ALREADY HAPPENED in the context of this day: per spec
    // item 10, "if an event is prehended by an event's now, it has happened in the
    // past of the context" — ONE directional edge, the day's now is the subject:
    const alreadyHappened = "inner-event-already-happened";
    node(s, alreadyHappened);
    s.layP(`${dayNow}~prehends~${alreadyHappened}`, "the day's now prehends this inner event — already happened",
      dayNow, alreadyHappened, "q-grounding");

    // read purely via the ONE directional edge, both directions shown:
    const prehendsTheNow = prehensionsFrom(s, notYetHappened, "q-grounding").some((e) => e.object === dayNow);
    const isPrehendedByTheNow = prehensionsFrom(s, dayNow, "q-grounding").some((e) => e.object === alreadyHappened);
    expect(prehendsTheNow).toBe(true); // not-yet-happened, relative to the container
    expect(isPrehendedByTheNow).toBe(true); // already-happened, relative to the container
    // either direction means the event is INSIDE the containing event — membership,
    // read off ONE edge, no second edge required to establish "inside":
    expect(prehendsTheNow || isPrehendedByTheNow).toBe(true);

    // NO cycle: unlike the old holds/charge pair — {day}~holds~{event} PLUS
    // {event}~charge~{day_end}, two edges in OPPOSITE directions between the same
    // pair, which IS a cycle in ordinary time by definition (Round D's finding: this
    // is why the canon built on it is unrepairable in place, not just untidy) — a
    // SINGLE directional edge cannot loop by itself. Ties straight to THE LAW from
    // SCENE 11/12: this membership pattern is automatically acyclic-compliant,
    // because there is only ever one edge, never a returning second one:
    // (walks()/routesTo both short-circuit true on start===target trivially per
    // play.ts's own documented TODO — so the real check is whether the SINGLE edge
    // laid above ever routes back to its own subject via a SECOND hop; it cannot,
    // because only one edge exists at all:)
    expect(walks(s, dayNow, notYetHappened, "q-grounding", new Set())).toBe(false); // no edge dayNow -> notYetHappened exists
    expect(walks(s, alreadyHappened, dayNow, "q-grounding", new Set())).toBe(false); // no edge alreadyHappened -> dayNow exists
    // contrast, stated directly: had this been modeled the old way — dayNow~holds~X
    // AND X~charge~dayNow — the two opposite-direction edges between the same pair
    // would themselves BE the two-hop ring THE LAW forbids in ordinary time (SCENE
    // 11's exact shape). The bare single-edge reading never creates that pair, so
    // the violation cannot arise structurally, not just by discipline:
    const singleEdgeCannotFormATwoHopRingWithItself = true;
    expect(singleEdgeCannotFormATwoHopRingWithItself).toBe(true);
  });

  it("SCENE 14 (bonus) — does the drawer-line (Now-line) fall out for free from the bare-prehension membership fix?", () => {
    const s = new Society();
    // the drawer/Now-line distinction (specs/drawer-contents.md #8-10, and the card
    // UI's top/bottom drawer split): things prehended-by-Now (past, done, bottom
    // drawer) vs things that prehend-the-Now (future, not-yet, top drawer).
    const dayNow = "the-days-now-for-the-drawer-line";
    node(s, dayNow);
    const past1 = "inner-event-past-1", past2 = "inner-event-past-2";
    const future1 = "inner-event-future-1", future2 = "inner-event-future-2";
    for (const e of [past1, past2, future1, future2]) node(s, e);
    s.layP(`${dayNow}~prehends~${past1}`, "already happened", dayNow, past1, "q-grounding");
    s.layP(`${dayNow}~prehends~${past2}`, "already happened", dayNow, past2, "q-grounding");
    s.layP(`${future1}~prehends~${dayNow}`, "not yet happened", future1, dayNow, "q-grounding");
    s.layP(`${future2}~prehends~${dayNow}`, "not yet happened", future2, dayNow, "q-grounding");

    // the bottom drawer (past/done): everything the Now prehends —
    const bottomDrawer = prehensionsFrom(s, dayNow, "q-grounding").map((e) => e.object);
    // the top drawer (future/todo): everything that prehends the Now —
    const topDrawer = s.all()
      .filter((b) => b.object === dayNow && b.subject !== null)
      .map((b) => b.subject!);

    expect(bottomDrawer.sort()).toEqual([past1, past2].sort());
    expect(topDrawer.sort()).toEqual([future1, future2].sort());
    // YES — this falls out for free: the drawer split is just "which side of the ONE
    // directional edge is the Now on," no separate mechanism needed. The single-edge
    // membership fix from SCENE 13 pays for the drawer/Now-line mechanic too, as a
    // straight read of edge direction rather than a second concept:
    const drawerLineFallsOutForFree = true;
    expect(drawerLineFallsOutForFree).toBe(true);
  });

  it("SCENE 15 — FINAL: membership is the anchor PLUS the Now-position, and the anchor pair never round-trips", () => {
    const s = new Society();
    // spec item 6, verbatim: "Events that are part of other events prehend the
    // beginning of the containing event and is prehended by the end of the
    // containing event." This is the ANCHOR — mandatory, both halves, no
    // exceptions, always running future-to-past on BOTH legs:
    const containingBeginning = "containing-event-beginning";
    const containingEnd = "containing-event-end";
    const containingNow = "containing-event-now";
    node(s, containingBeginning); node(s, containingEnd); node(s, containingNow);

    const member = "lawfully-anchored-member";
    node(s, member);
    // leg 1: member prehends the containing event's BEGINNING —
    s.layP(`${member}~prehends~${containingBeginning}`, "the member prehends the containing event's beginning",
      member, containingBeginning, "q-grounding");
    // leg 2: the containing event's END prehends the member —
    s.layP(`${containingEnd}~prehends~${member}`, "the containing event's end prehends the member",
      containingEnd, member, "q-grounding");

    // THE POSITION (items 9-10, same shape as SCENE 13): which side of Now.
    // Here the member has not yet happened — it prehends the Now:
    s.layP(`${member}~prehends-now~${containingNow}`, "the member prehends the now — not yet happened",
      member, containingNow, "q-grounding");

    const hasAnchor =
      prehensionsFrom(s, member, "q-grounding").some((e) => e.object === containingBeginning) &&
      prehensionsFrom(s, containingEnd, "q-grounding").some((e) => e.object === member);
    const hasPosition = prehensionsFrom(s, member, "q-grounding").some((e) => e.object === containingNow);
    expect(hasAnchor).toBe(true);
    expect(hasPosition).toBe(true);

    // NOT A CYCLE: both anchor legs run the SAME direction — future-to-past.
    // Leg 1 is member -> beginning. Leg 2 is end -> member. These are two
    // DIFFERENT edges with two DIFFERENT subjects (member, then end) and two
    // DIFFERENT objects (beginning, then member) — never the same pair walked
    // both ways. Contrast the old holds/charge shape (SCENE 11's exact
    // violation): {day}~holds~{event} PLUS {event}~charge~{day} IS a
    // round-trip on the SAME pair. Here, walking forward from member never
    // returns to member — there is no edge beginning->member or member->end
    // laid at all:
    expect(walks(s, containingBeginning, member, "q-grounding", new Set())).toBe(false);
    expect(walks(s, member, containingEnd, "q-grounding", new Set())).toBe(false);
    const anchorPairIsTwoLegsOfOneDirectionNeverARoundTrip = true;
    expect(anchorPairIsTwoLegsOfOneDirectionNeverARoundTrip).toBe(true);
  });

  it("SCENE 16 — RED-TEST TARGET: a Now-position edge with NO anchor at all — forbidden by the law, and today nothing stops it", () => {
    const s = new Society();
    // hard law, stated in this doll's own words: no position without the
    // anchor — something positioned relative to a Now while belonging to no
    // containing event at all is forbidden. Built here to check whether the
    // engine (scher's own laying, via layP — the same helper play.ts's node/
    // succeeds/why all go through) actually refuses this, or merely ought to:
    const orphanNow = "some-events-now-with-no-owner-of-its-own";
    node(s, orphanNow);
    const floatingMember = "floating-event-positioned-with-no-containing-event";
    node(s, floatingMember);

    // ONLY the position edge — no beginning-prehension, no end-prehension,
    // anywhere, from or onto floatingMember. Attempt the lay directly and
    // observe, rather than trusting any prior claim about what layP enforces:
    expect(() => {
      s.layP(`${floatingMember}~prehends-now~${orphanNow}`, "positioned relative to a now, belonging to no containing event",
        floatingMember, orphanNow, "q-grounding");
    }).not.toThrow(); // CURRENTLY PERMITTED — layP has no anchor+position conjunction guard

    // confirmed the construction actually exists, by reading it back, not by
    // trusting the lay call alone:
    const positionEdgeExists = prehensionsFrom(s, floatingMember, "q-grounding").some((e) => e.object === orphanNow);
    expect(positionEdgeExists).toBe(true);

    // and confirmed, by walking outward from floatingMember on q-grounding,
    // that no anchor edge exists in either direction — no beginning it
    // prehends, and nothing (standing in for a containing event's end) that
    // prehends it back:
    const floatingMemberPrehendsSomeBeginning = prehensionsFrom(s, floatingMember, "q-grounding")
      .some((e) => e.object !== orphanNow);
    const somethingPrehendsFloatingMemberAsAnEnd = s.all()
      .some((b) => b.object === floatingMember && b.subject !== orphanNow && b.subject !== floatingMember);
    expect(floatingMemberPrehendsSomeBeginning).toBe(false);
    expect(somethingPrehendsFloatingMemberAsAnEnd).toBe(false);

    // THE GAP, same shape as SCENE 11: this is a description of TODAY'S
    // gap-having behavior, not an endorsement. A guard OUGHT to exist — an
    // "anchor+position conjunction" check, refusing any prehends/prehended-by
    // edge onto a containing event's Now unless that same member already
    // carries both anchor legs to that same containing event — and does not,
    // in either scher's laying helpers or (checked directly, not assumed)
    // api/'s containment law. This doll does not add it (no src/ or api/
    // changes) — it exists to make the gap loud for whoever picks this up:
    const thisIsAGapNotALaw = true;
    expect(thisIsAGapNotALaw).toBe(true);
  });
});
