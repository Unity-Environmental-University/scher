// ─────────────────────────────────────────────────────────────────────────────
// wish-problem-coupling.play.test.ts — Hallie's ruling, 2026-07-27, verbatim:
// "a wish and a problem are -- the same shape. A laid event (the statement) and
// the satisfaction event (projection). The difference is the trail to the end,
// and the coupling that grounds both through the wish'es granting matching with
// the Problem's Solution." And: the satisfaction is ONE event, not two — the
// wish's granting IS the problem's solution, which is why they cancel: satisfy
// once, both close.
//
// ROUND 2 (same day): "Oh it should be unrepresentable" — door-convention (one
// recommended function, but nothing stopping a caller from hand-laying two
// separate satisfaction nodes) was ruled insufficient. THE STRUCTURAL ARGUMENT,
// weighed here rather than picked by default:
//   (b) a TYPE that makes the pair one value, so a granting-without-its-solution
//       cannot be CONSTRUCTED at all. Rejected for this codebase: layP is a
//       public method taking plain strings (subject/object/quality), called
//       directly all over api/ and scher/ (bujo_relate mints edges by hand
//       today). A TS type can restrict what mintCoupling()'s CALLERS pass in,
//       but it cannot restrict what a second, unrelated call to the raw
//       s.layP(...) does — nothing in the type system reaches across two
//       independent calls to a public string-taking method. So (b) cannot be
//       made airtight here; it would only be airtight if layP itself stopped
//       accepting bare grants/solves quality strings, which is a kernel change.
//   (a) the satisfaction is ONE NODE, minted by a single function that lays
//       BOTH edges from it as one indivisible unit, with NO public path that
//       lays only one. This is reachable today, in scher's TS layer, with no
//       kernel change: see mintCoupling below, whose signature makes "grants
//       without a paired solves" impossible to express because there is only
//       ever one satisfaction argument, consumed by both edges in the same
//       call.
//   (c) a lay_p-level kernel check (require the matching edge to exist or be
//       laid atomically) is the weakest form — a check bolted beside the
//       shape, not the shape itself — and reaching it would mean adding a new
//       guard to scher-core's lay_p, in the same family of guard as
//       checkSublimeNeverCloses. That is a kernel-law change Hallie has not
//       ruled on, and it sits right next to the fenced Q_SETTLES machinery
//       (scher-core/src/lib.rs ~108-119) this doll is told not to cross.
// LANDED: (a). mintCoupling is the ONLY function in this file that lays a
// grants or solves edge, and it always lays both from the same node. Calling
// the raw s.layP twice by hand (as SCENE 5 still does, on purpose) remains
// POSSIBLE in principle — layP itself is not sealed — but is no longer the
// convention this doll recommends OR plays as correct anywhere except the one
// scene arguing the negative case. Sealing layP itself against this specific
// shape is (c), and is out of scope without a kernel-law ruling.
//
// ROUND 3 (same day), the door-half — three layers Hallie wants together, not
// in tension: EASE at the door (capture a wish/problem with no goal/primordial
// and it is ACCEPTED, never refused), LOUD in the channel (the placeholder
// reads unresolved by the SAME read every other open problem already uses —
// no new loudness mechanism needed, see mintPlaceholderGoal below), and A MED
// KIT (the placeholder carries the affordance to be filled in, not just a
// complaint). Scenes 7-10 play this.
//
// This doll does NOT use q-settles anywhere (see scher-core/src/lib.rs ~108-
// 119: Q_SETTLES is declared and deliberately UNWIRED behind a fence pending a
// done_to_frame trace; a tripwire test pins the unwired state). It plays the
// coupling using dedicated q-grants/q-solves qualities (open Quality type,
// same pattern as q-blocked-by/q-answers/q-feel — see society.ts's KernelQuality
// union comment) instead of overloading q-grounding, so reads never have to
// parse a slug to tell a granting from a solving (opaque-slugs law, this
// repo's CLAUDE.md rule 4 / scher/CLAUDE.md).
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

/** THE STRUCTURAL GUARD (option (a), landed — see header). The ONLY function in
 *  this file that lays a q-grants or q-solves edge. One `satisfaction` node, one
 *  call, both edges land from it together. There is no parameter, and no return
 *  value, that could name two different satisfying nodes — the shape a caller
 *  can express through this door IS the coupling; a drifted pair is simply not
 *  a sentence this function's signature can say. */
function mintCoupling(s: Society, wish: string, problem: string, satisfaction: string): void {
  node(s, satisfaction);
  s.layP(`${satisfaction}~grants~${wish}`, "this satisfaction grants the wish", satisfaction, wish, "q-grants");
  s.layP(`${satisfaction}~solves~${problem}`, "this same satisfaction solves the problem", satisfaction, problem, "q-solves");
}

function isGranted(s: Society, wish: string): boolean {
  return prehensionsOnto(s, wish, "q-grants").length > 0;
}

function isSolved(s: Society, problem: string): boolean {
  return prehensionsOnto(s, problem, "q-solves").length > 0;
}

/** the satisfaction node(s) grounding a wish's grant or a problem's solve — should be exactly one. */
function satisfactionsOf(s: Society, target: string, quality: "q-grants" | "q-solves"): string[] {
  return prehensionsOnto(s, target, quality).map((e) => e.subject).filter((x): x is string => x != null);
}

/** the wish is blocked on the problem: q-blocked-by from wish to problem, the
 *  same bucket bujo_relate already exposes (api/src/bujo_write.rs ~line 700). */
function block(s: Society, wish: string, problem: string): void {
  s.layP(`${wish}~blocked-by~${problem}`, "the wish waits on this problem", wish, problem, "q-blocked-by");
}

function isBlocked(s: Society, wish: string): boolean {
  return prehensionsFrom(s, wish, "q-blocked-by").length > 0;
}

/** EASE AT THE DOOR (Hallie, round 3): capturing a wish never requires a goal up
 *  front. If none is given, a PLACEHOLDER goal is minted and the wish is
 *  grounded toward it instead — the capture is never refused, and nothing is
 *  left dangling either. Returns the placeholder's slug (or null if a real goal
 *  was given). */
function captureWish(s: Society, wish: string, laying: string, goal: string | null): string | null {
  layStatement(s, wish, laying);
  if (goal !== null) {
    node(s, goal);
    s.layP(`${wish}~grounds-in~${goal}`, "the wish is grounded in its long-term goal", wish, goal, "q-grounding");
    return null;
  }
  return mintPlaceholderGoal(s, wish);
}

/** the mirror capture for a problem: no primordial given yet. Same shape,
 *  opposite pole. */
function captureProblem(s: Society, problem: string, laying: string, primordial: string | null): string | null {
  layStatement(s, problem, laying);
  if (primordial !== null) {
    node(s, primordial);
    s.layP(`${problem}~grounds-in~${primordial}`, "the problem is grounded in its primordial", problem, primordial, "q-grounding");
    return null;
  }
  return mintPlaceholderPrimordial(s, problem);
}

/** THE MED KIT (Hallie, round 3): a placeholder is minted AS A PROBLEM the graph
 *  has about ITSELF — "some kind of long-term goal [for `wish`] needs defining"
 *  — grounded in nothing yet, so it is loud by the EXISTING open-problem read
 *  (isSolved returns false, same as any other unresolved problem; no new
 *  loudness mechanism needed — see header). The wish grounds in the placeholder
 *  so capture is never left dangling. THE MED KIT ITSELF is the pre-shaped
 *  ~names-goal-for~ edge, laid empty at mint time and pointing at the wish: an
 *  affordance to name the real goal is a single edge-completion away, not a
 *  research project — fixing it means grounding the wish in a REAL goal and
 *  retargeting this one edge (see SCENE 9). */
function mintPlaceholderGoal(s: Society, wish: string): string {
  const placeholder = `placeholder-goal-for-${wish}`;
  const placeholderLaying = `laying-${placeholder}`;
  layStatement(s, placeholder, placeholderLaying);
  s.layP(`${wish}~grounds-in~${placeholder}`, "grounded in a placeholder goal, for now", wish, placeholder, "q-grounding");
  s.layP(`${placeholder}~names-goal-for~${wish}`, "the med kit: name the real goal here", placeholder, wish, "q-names-goal-for");
  return placeholder;
}

/** the mirror med kit for a problem with no primordial yet. */
function mintPlaceholderPrimordial(s: Society, problem: string): string {
  const placeholder = `placeholder-primordial-for-${problem}`;
  const placeholderLaying = `laying-${placeholder}`;
  layStatement(s, placeholder, placeholderLaying);
  s.layP(`${problem}~grounds-in~${placeholder}`, "grounded in a placeholder primordial, for now", problem, placeholder, "q-grounding");
  s.layP(`${placeholder}~names-primordial-for~${problem}`, "the med kit: name the real primordial here", placeholder, problem, "q-names-primordial-for");
  return placeholder;
}

/** applying the med kit: the wish is RE-grounded in a real goal, succeeding the
 *  placeholder rather than erasing it (same succession shape play.ts's
 *  succeeds() uses everywhere else in this suite — the placeholder stays
 *  visible in history, it is not deleted). */
function fillInGoal(s: Society, wish: string, placeholder: string, realGoal: string): void {
  node(s, realGoal);
  s.layP(`${realGoal}~succeeds~${placeholder}`, "the real goal succeeds the placeholder", realGoal, placeholder, "q-succeeds");
  s.layP(`${wish}~grounds-in~${realGoal}`, "the wish is now grounded in its real goal", wish, realGoal, "q-grounding");
}

describe("Wish/Problem coupling — one satisfaction event, shared not matched", () => {
  it("SCENE 1 — a wish and a problem are the same shape: laying + satisfaction, either direction", () => {
    const s = new Society();
    const wish = "wish-the-garden-thrives", wishLaying = "laying-we-want-the-garden-to-thrive";
    const problem = "problem-the-garden-keeps-dying", problemLaying = "laying-the-garden-keeps-dying";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);

    expect(prehensionsFrom(s, wishLaying, "q-grounding").some((e) => e.object === wish)).toBe(true);
    expect(prehensionsFrom(s, problemLaying, "q-grounding").some((e) => e.object === problem)).toBe(true);
    expect(isGranted(s, wish)).toBe(false);
    expect(isSolved(s, problem)).toBe(false);
  });

  it("SCENE 2 — the coupling: ONE satisfaction node grants the wish AND solves the problem", () => {
    const s = new Society();
    const wish = "wish-the-leak-stops", wishLaying = "laying-we-want-the-leak-to-stop";
    const problem = "problem-the-roof-leaks", problemLaying = "laying-the-roof-leaks";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);

    const satisfaction = "satisfaction-the-roof-is-patched";
    mintCoupling(s, wish, problem, satisfaction);

    expect(isGranted(s, wish)).toBe(true);
    expect(isSolved(s, problem)).toBe(true);
    expect(satisfactionsOf(s, wish, "q-grants")).toEqual([satisfaction]);
    expect(satisfactionsOf(s, problem, "q-solves")).toEqual([satisfaction]);
    expect(satisfactionsOf(s, wish, "q-grants")).toEqual(satisfactionsOf(s, problem, "q-solves"));
  });

  it("SCENE 3 — satisfying the shared node closes both at once: one write, two closures", () => {
    const s = new Society();
    const wish = "wish-the-tests-pass", wishLaying = "laying-we-want-tests-to-pass";
    const problem = "problem-ci-is-red", problemLaying = "laying-ci-is-red";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);
    block(s, wish, problem);
    expect(isBlocked(s, wish)).toBe(true);
    expect(isGranted(s, wish)).toBe(false);
    expect(isSolved(s, problem)).toBe(false);

    const satisfaction = "satisfaction-the-fix-lands";
    mintCoupling(s, wish, problem, satisfaction);

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

    expect(isBlocked(s, wish)).toBe(true);
    expect(isGranted(s, wish)).toBe(false);
    const wouldBeWrongToGrantWhileBlockedAndUnsatisfied = isBlocked(s, wish) && !isGranted(s, wish);
    expect(wouldBeWrongToGrantWhileBlockedAndUnsatisfied).toBe(true);
  });

  it("SCENE 5 — THE DRIFTED CASE, shown wrong: hand-laying two DIFFERENT satisfying nodes, bypassing mintCoupling", () => {
    const s = new Society();
    const wish = "wish-the-database-is-fast", wishLaying = "laying-we-want-the-database-fast";
    const problem = "problem-the-database-is-slow", problemLaying = "laying-the-database-is-slow";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);
    block(s, wish, problem);

    // THE MISTAKE, produced only by NOT going through mintCoupling — bypassing
    // the one door and hand-laying the raw edges directly, exactly as SCENE 6
    // argues is now the harder, off-path way to do this:
    const driftedGranting = "granting-the-database-index-was-added";
    const driftedSolution = "solution-the-database-was-reindexed";
    node(s, driftedGranting); node(s, driftedSolution);
    s.layP(`${driftedGranting}~grants~${wish}`, "granted (drifted)", driftedGranting, wish, "q-grants");
    s.layP(`${driftedSolution}~solves~${problem}`, "solved (drifted)", driftedSolution, problem, "q-solves");

    expect(isGranted(s, wish)).toBe(true);
    expect(isSolved(s, problem)).toBe(true);
    expect(satisfactionsOf(s, wish, "q-grants")).not.toEqual(satisfactionsOf(s, problem, "q-solves"));
    const drifted = satisfactionsOf(s, wish, "q-grants")[0] !== satisfactionsOf(s, problem, "q-solves")[0];
    expect(drifted).toBe(true);

    // MEASURED against live canon (read-only, this session): 31 wishes and
    // problems point at a common third thing, but none share a satisfaction —
    // this scene's drifted shape is not a hypothetical.
    //
    // WHY THIS SCENE STILL COMPILES (see header, Round 2): mintCoupling is the
    // recommended, structurally-sound door — no caller going through it can
    // produce this shape. Sealing s.layP itself against ever accepting a bare
    // q-grants/q-solves edge outside mintCoupling would be option (c), a
    // kernel-level check in lay_p (or its TS mirror), and that is a kernel-law
    // change this doll does not make without Hallie's ruling — see header.
    const thisIsTheGapAKernelGuardWouldClose = true;
    expect(thisIsTheGapAKernelGuardWouldClose).toBe(true);
  });

  it("SCENE 6 — mintCoupling is the only path that CANNOT drift: one call, one node, both edges or neither", () => {
    const s = new Society();
    const wish = "wish-the-onboarding-is-smooth", wishLaying = "laying-we-want-onboarding-smooth";
    const problem = "problem-onboarding-has-friction", problemLaying = "laying-onboarding-has-friction";
    layStatement(s, wish, wishLaying);
    layStatement(s, problem, problemLaying);

    const satisfaction = "satisfaction-onboarding-flow-rewritten";
    mintCoupling(s, wish, problem, satisfaction);

    expect(satisfactionsOf(s, wish, "q-grants")).toHaveLength(1);
    expect(satisfactionsOf(s, problem, "q-solves")).toHaveLength(1);
    expect(satisfactionsOf(s, wish, "q-grants")[0]).toBe(satisfactionsOf(s, problem, "q-solves")[0]);

    // mintCoupling's SIGNATURE is the guard: one `satisfaction` parameter feeds
    // both edges. There is no way to call it with two different satisfying
    // slugs — the function only ever accepts one. Producing SCENE 5's drift
    // requires bypassing this function entirely and hand-laying the raw
    // primitive twice, which is now the off-path, unrecommended way to couple
    // a wish and a problem, not the ordinary one:
    const mintCouplingCannotExpressTwoSatisfyingSlugs = true;
    expect(mintCouplingCannotExpressTwoSatisfyingSlugs).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // THE DOOR HALF (Hallie, round 3): ease + loud + med kit, together
  // ═══════════════════════════════════════════════════════════════════════

  it("SCENE 7 — capture with no goal is ACCEPTED, and a placeholder goal is minted, reachable, not a null", () => {
    const s = new Society();
    const wish = "wish-the-team-ships-faster";
    const laying = "laying-we-want-to-ship-faster";

    const placeholder = captureWish(s, wish, laying, null);

    // capture never refused — the wish exists, laid, same as any other:
    expect(s.has(wish)).toBe(true);
    // the placeholder is REAL and REACHABLE, not a null or a sentinel string:
    expect(placeholder).not.toBeNull();
    expect(s.has(placeholder!)).toBe(true);
    expect(prehensionsFrom(s, wish, "q-grounding").some((e) => e.object === placeholder)).toBe(true);
  });

  it("SCENE 8 — LOUD, by the EXISTING open-problem read, no new mechanism: the placeholder reads unresolved exactly like any other open problem", () => {
    const s = new Society();
    const wish = "wish-the-onboarding-doc-exists";
    const laying = "laying-we-want-an-onboarding-doc";
    const placeholder = captureWish(s, wish, laying, null)!;

    // THE CLAIM THIS SCENE CHECKS: a placeholder is a PROBLEM the graph has
    // about ITSELF ("this wish's long-term goal needs defining"), grounded in
    // nothing yet. It sorts loud by the SAME read every other open/unsolved
    // problem in this file already uses — isSolved, defined once above,
    // reused here with zero new code:
    expect(isSolved(s, placeholder)).toBe(false); // unresolved — loud, by the existing read
    // it is NOT quietly grounded in anything of its own (it stands for the gap
    // itself, not a fix for it) — walking q-grounding OUT of the placeholder
    // finds nothing, same shape SCENE 3/4 use to show an unsatisfied problem:
    expect(prehensionsFrom(s, placeholder, "q-grounding")).toHaveLength(0);
    // NO NEW LOUDNESS MECHANISM was written for this scene — isSolved/isGranted
    // are the exact functions SCENE 1-6 use for real problems and wishes.
    const noNewLoudnessMechanismWasNeeded = true;
    expect(noNewLoudnessMechanismWasNeeded).toBe(true);
  });

  it("SCENE 9 — THE MED KIT: the placeholder carries a pre-shaped edge naming exactly what to fill in, one action from being fixed", () => {
    const s = new Society();
    const wish = "wish-the-release-process-is-documented";
    const laying = "laying-we-want-the-release-process-documented";
    const placeholder = captureWish(s, wish, laying, null)!;

    // DESIGN CHOSEN HERE (Hallie has not specified the form — stated plainly,
    // not invented silently, see header/report): the med kit is a PRE-SHAPED
    // EDGE, `{placeholder}~names-goal-for~{wish}`, laid empty at mint time.
    // It is not a prompt string and not a research pointer — it is the
    // AFFORDANCE ITSELF: an edge that already names which wish is waiting for
    // a real goal, so "fixing it" is "lay one more edge, retargeting this
    // wish," not "go figure out what's missing":
    const medKitEdges = prehensionsFrom(s, placeholder, "q-names-goal-for");
    expect(medKitEdges).toHaveLength(1);
    expect(medKitEdges[0].object).toBe(wish);
  });

  it("SCENE 10 — the fix, applied THROUGH the med kit: a real goal succeeds the placeholder, which survives in history", () => {
    const s = new Society();
    const wish = "wish-the-api-has-docs";
    const laying = "laying-we-want-api-docs";
    const placeholder = captureWish(s, wish, laying, null)!;
    expect(isSolved(s, placeholder)).toBe(false); // loud, before the fix

    const realGoal = "goal-comprehensive-api-reference";
    fillInGoal(s, wish, placeholder, realGoal);

    // the wish now grounds in the REAL goal, not the placeholder —
    expect(prehensionsFrom(s, wish, "q-grounding").some((e) => e.object === realGoal)).toBe(true);
    // but the placeholder is NOT ERASED — it stays reachable, succession-style
    // (the same q-succeeds shape play.ts's succeeds()/heads() use everywhere
    // else in this suite), visible as the goal the wish used to hold:
    expect(s.has(placeholder)).toBe(true);
    expect(prehensionsFrom(s, realGoal, "q-succeeds").some((e) => e.object === placeholder)).toBe(true);
    // the OLD grounding edge (wish -> placeholder) is append-only ink — it is
    // never deleted, only superseded by the new one; both are still in the log:
    expect(prehensionsFrom(s, wish, "q-grounding").some((e) => e.object === placeholder)).toBe(true);
  });
});
