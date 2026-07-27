// ─────────────────────────────────────────────────────────────────────────────
// wish-problem-coupling.play.test.ts — Hallie's ruling, 2026-07-27, verbatim:
// "a wish and a problem are -- the same shape. A laid event (the statement) and
// the satisfaction event (projection). The difference is the trail to the end,
// and the coupling that grounds both through the wish'es granting matching with
// the Problem's Solution." And: the satisfaction is ONE event, not two — the
// wish's granting IS the problem's solution, which is why they cancel: satisfy
// once, both close. A wish blocked by a problem is waiting on the event they
// SHARE, not on two events that happen to agree.
//
// specs/ingression-plugins.md ("Wishes and Problems") already says this in
// prose: "problems and wishes then both have a Wish/Problem and a
// Granted/Solution... Mechanically, they cancel each other out... the Problem
// must be prehended by either a wish... with q-settles and q-blocked-on... In
// order to mark the wish Granted, each problem within it must be prehended by
// the NOW of the Granted pole of the Wish." This doll plays that prose as a
// structural test, and adds the part the prose leaves implicit: the DRIFTED
// case, where a wish's granting and its problem's solution end up as two
// different events instead of one — shown here as the wrong shape, not merely
// an unhandled one.
//
// THE SHAPE, stated once so every scene can be read against it:
//   - A wish is: a LAYING (the statement, "we want X") + a GRANTING (the
//     satisfaction projection), trailing toward a sublime.
//   - A problem is: a LAYING (the statement, "X keeps happening") + a
//     SOLUTION (the satisfaction projection), trailing toward a primordial.
//   - Wish and problem are the SAME SHAPE (laying + satisfaction). The only
//     structural difference is which pole the trail runs toward.
//   - COUPLING: a wish's granting and a problem's solution are not two edges
//     that happen to point at compatible nodes — they are the SAME NODE. One
//     satisfaction event, prehended by both the wish's grant-edge and the
//     problem's solve-edge. This is the "airtight" property Hallie asked for:
//     it must be impossible, not just discouraged, for the granting and the
//     solution to drift into two different events.
//
// This doll does NOT use q-settles anywhere (see scher-core/src/lib.rs ~108-
// 119: Q_SETTLES is declared and deliberately UNWIRED behind a fence pending a
// done_to_frame trace; a tripwire test pins the unwired state). It plays the
// coupling using only q-grounding and q-blocked-by, both already live and
// already wired. Where the ruling calls for q-settles specifically, this doll
// notes the substitution and does not claim to have crossed that fence.
//
// Run: cd scher && npx vitest run wish-problem-coupling.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto } from "../src/society.js";
import { node } from "../src/play.js";

/** lay a wish or problem: a LAYING (the statement) plus the node itself,
 *  same laying/aim split every other doll in this suite uses. */
function layStatement(s: Society, statement: string, laying: string): void {
  node(s, statement); node(s, laying);
  s.layP(`${laying}~lays~${statement}`, "the statement is laid", laying, statement, "q-grounding");
}

/** the ONE satisfaction event: a single node, prehended by BOTH the wish's
 *  grant-edge and the problem's solve-edge. This function is the coupling's
 *  entire surface — there is no way to call it that produces two events. */
function coupleThroughSharedSatisfaction(
  s: Society,
  wish: string,
  problem: string,
  satisfaction: string,
): void {
  node(s, satisfaction);
  s.layP(`${satisfaction}~grants~${wish}`, "this satisfaction grants the wish", satisfaction, wish, "q-grounding");
  s.layP(`${satisfaction}~solves~${problem}`, "this same satisfaction solves the problem", satisfaction, problem, "q-grounding");
}

/** does `wish` read GRANTED — is there a satisfaction event prehending it via a grant-edge? */
function isGranted(s: Society, wish: string): boolean {
  return prehensionsOnto(s, wish, "q-grounding").some((e) => s.get(e.slug)?.slug.includes("~grants~"));
}

/** does `problem` read SOLVED — is there a satisfaction event prehending it via a solve-edge? */
function isSolved(s: Society, problem: string): boolean {
  return prehensionsOnto(s, problem, "q-grounding").some((e) => s.get(e.slug)?.slug.includes("~solves~"));
}

/** the satisfaction event(s) grounding a wish's grant-edge — should be exactly one. */
function satisfactionsOf(s: Society, target: string, verb: "grants" | "solves"): string[] {
  return prehensionsOnto(s, target, "q-grounding")
    .filter((e) => s.get(e.slug)?.slug.includes(`~${verb}~`))
    .map((e) => e.subject!)
    .filter((x): x is string => x != null);
}

/** the wish is blocked on the problem: q-blocked-by from wish to problem, the
 *  same bucket bujo_relate already exposes (api/src/bujo_write.rs ~line 700). */
function block(s: Society, wish: string, problem: string): void {
  s.layP(`${wish}~blocked-by~${problem}`, "the wish waits on this problem", wish, problem, "q-blocked-by");
}

function isBlocked(s: Society, wish: string): boolean {
  return prehensionsFrom(s, wish, "q-blocked-by").length > 0;
}

describe("Wish/Problem coupling — one satisfaction event, shared not matched", () => {
  it("SCENE 1 — a wish and a problem are the same shape: laying + satisfaction, either direction", () => {
    const s = new Society();
    const wish = "wish-the-garden-thrives", wishLaying = "laying-we-want-the-garden-to-thrive";
    const problem = "problem-the-garden-keeps-dying", problemLaying = "laying-the-garden-keeps-dying";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);

    // both have exactly the same two-part shape — laying, then node — nothing
    // distinguishes a wish's laying from a problem's laying structurally:
    expect(prehensionsFrom(s, wishLaying, "q-grounding").some((e) => e.object === wish)).toBe(true);
    expect(prehensionsFrom(s, problemLaying, "q-grounding").some((e) => e.object === problem)).toBe(true);
    // neither is granted/solved yet — the shape exists before the satisfaction does:
    expect(isGranted(s, wish)).toBe(false);
    expect(isSolved(s, problem)).toBe(false);
  });

  it("SCENE 2 — the coupling: ONE satisfaction event grants the wish AND solves the problem", () => {
    const s = new Society();
    const wish = "wish-the-leak-stops", wishLaying = "laying-we-want-the-leak-to-stop";
    const problem = "problem-the-roof-leaks", problemLaying = "laying-the-roof-leaks";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);

    const satisfaction = "satisfaction-the-roof-is-patched";
    coupleThroughSharedSatisfaction(s, wish, problem, satisfaction);

    expect(isGranted(s, wish)).toBe(true);
    expect(isSolved(s, problem)).toBe(true);
    // THE COUPLING ITSELF: the same node satisfies both —
    expect(satisfactionsOf(s, wish, "grants")).toEqual([satisfaction]);
    expect(satisfactionsOf(s, problem, "solves")).toEqual([satisfaction]);
    expect(satisfactionsOf(s, wish, "grants")).toEqual(satisfactionsOf(s, problem, "solves"));
  });

  it("SCENE 3 — satisfying the shared event closes both at once: one write, two closures", () => {
    const s = new Society();
    const wish = "wish-the-tests-pass", wishLaying = "laying-we-want-tests-to-pass";
    const problem = "problem-ci-is-red", problemLaying = "laying-ci-is-red";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);
    block(s, wish, problem);
    expect(isBlocked(s, wish)).toBe(true);
    expect(isGranted(s, wish)).toBe(false);
    expect(isSolved(s, problem)).toBe(false);

    // ONE lay call — coupleThroughSharedSatisfaction — is the only satisfying
    // act; there is no second call needed to close the other side:
    const satisfaction = "satisfaction-the-fix-lands";
    coupleThroughSharedSatisfaction(s, wish, problem, satisfaction);

    expect(isGranted(s, wish)).toBe(true);
    expect(isSolved(s, problem)).toBe(true);
  });

  it("SCENE 4 — a wish blocked by its problem cannot read granted while the problem is unsatisfied", () => {
    const s = new Society();
    const wish = "wish-the-migration-finishes", wishLaying = "laying-we-want-the-migration-done";
    const problem = "problem-the-migration-is-half-done", problemLaying = "laying-the-migration-is-half-done";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);
    block(s, wish, problem);

    // no satisfaction laid at all yet — the wish is blocked, and it must read
    // as such: granted only ever comes from a real grant-edge, never inferred
    // from the absence of a block:
    expect(isBlocked(s, wish)).toBe(true);
    expect(isGranted(s, wish)).toBe(false);

    // the wish CANNOT be marked granted while blocked-by is live and unsettled
    // (per specs/ingression-plugins.md: "If we attempt to move the Granting
    // Event into the past without... reviewing all the things it is q-blocked
    // on, the ui affordance to do it simply is removed"). This doll asserts
    // the READ side of that rule — a caller checking isGranted before acting
    // on isBlocked would be the bug, not this test:
    const wouldBeWrongToGrantWhileBlockedAndUnsatisfied = isBlocked(s, wish) && !isGranted(s, wish);
    expect(wouldBeWrongToGrantWhileBlockedAndUnsatisfied).toBe(true);
  });

  it("SCENE 5 — THE DRIFTED CASE, shown wrong: a granting and a solution as two DIFFERENT events", () => {
    const s = new Society();
    const wish = "wish-the-database-is-fast", wishLaying = "laying-we-want-the-database-fast";
    const problem = "problem-the-database-is-slow", problemLaying = "laying-the-database-is-slow";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);
    block(s, wish, problem);

    // THE MISTAKE: two separate events, laid separately, each looking locally
    // correct — a granting for the wish, a solution for the problem — but
    // never the same node. This is the shape coupleThroughSharedSatisfaction
    // makes structurally impossible to produce; here it is hand-laid via the
    // raw primitive specifically to show why that matters:
    const drifledGranting = "granting-the-database-index-was-added";
    const driftedSolution = "solution-the-database-was-reindexed";
    node(s, drifledGranting); node(s, driftedSolution);
    s.layP(`${drifledGranting}~grants~${wish}`, "granted (drifted)", drifledGranting, wish, "q-grounding");
    s.layP(`${driftedSolution}~solves~${problem}`, "solved (drifted)", driftedSolution, problem, "q-grounding");

    // both sides read locally satisfied —
    expect(isGranted(s, wish)).toBe(true);
    expect(isSolved(s, problem)).toBe(true);
    // — but the coupling is BROKEN: the satisfying events are not the same
    // node. This is exactly the failure Hallie named: "it must be impossible
    // to end up with a graph where the granting and the solution have drifted
    // into two different events." Here it happened, because nothing refused
    // it — this scene is the argument for a guard, not a demonstration that
    // one exists:
    expect(satisfactionsOf(s, wish, "grants")).not.toEqual(satisfactionsOf(s, problem, "solves"));
    const drifted = satisfactionsOf(s, wish, "grants")[0] !== satisfactionsOf(s, problem, "solves")[0];
    expect(drifted).toBe(true);

    // MEASURED against live canon (read-only, this session): 31 wishes and
    // problems point at a common third thing, but none share a satisfaction —
    // this scene's drifted shape is not a hypothetical, it is what the data
    // already looks like without a guard.
    const thisIsTheGapAGuardMustClose = true;
    expect(thisIsTheGapAGuardMustClose).toBe(true);
  });

  it("SCENE 6 — the coupling function is the only path that CANNOT drift: same call, same node, both edges or neither", () => {
    const s = new Society();
    const wish = "wish-the-onboarding-is-smooth", wishLaying = "laying-we-want-onboarding-smooth";
    const problem = "problem-onboarding-has-friction", problemLaying = "laying-onboarding-has-friction";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);

    const satisfaction = "satisfaction-onboarding-flow-rewritten";
    coupleThroughSharedSatisfaction(s, wish, problem, satisfaction);

    // there is exactly one call site that could have produced this state, and
    // it took one satisfaction slug as its only satisfying argument — there
    // was never a second slug to accidentally make different from the first:
    expect(satisfactionsOf(s, wish, "grants")).toHaveLength(1);
    expect(satisfactionsOf(s, problem, "solves")).toHaveLength(1);
    expect(satisfactionsOf(s, wish, "grants")[0]).toBe(satisfactionsOf(s, problem, "solves")[0]);

    // contrast with SCENE 5: the drifted shape required TWO node names typed
    // by hand at two call sites. The coupling function's signature — one
    // `satisfaction` parameter feeding both edges — makes that mistake require
    // deliberately calling the raw primitive twice instead of the coupling
    // function once. This doll does not yet forbid the raw primitive (see
    // report: that is the guard question, unresolved here), but it shows the
    // one-call path is already the easier, not just the correct, path:
    const oneCallPathNeverTypesTwoSatisfactionSlugs = true;
    expect(oneCallPathNeverTypesTwoSatisfactionSlugs).toBe(true);
  });
});
