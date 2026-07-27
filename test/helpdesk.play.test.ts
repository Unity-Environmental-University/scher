// ─────────────────────────────────────────────────────────────────────────────
// helpdesk.play.test.ts — a university IT helpdesk, modeled and TESTED. 🎫
//
// Not a demo of the problem/wish grammar — a play-test OF it, per Hallie's brief
// (2026-07-27): "seriously the most valuable thing you could be doing is looking at our
// problem and wish model and seeing if simulated work places and stories fit into it."
//
// The shop: a small university helpdesk. A wish (single sign-on for the whole campus)
// answers real problems (the login-storm ticket flood). A fix creates a NEW problem
// (SSO breaks the ancient grade-book integration). Two staff disagree, honestly, about
// whether a ticket is done. And the doll goes looking, on purpose, for what has NO
// place in the model at all — a deadline, a workload, an unowned duty, a standing
// meeting — because Hallie asked for that finding leading the report, not buried in it.
//
// Built on play.ts's helpers (unpackPoles / closePole / establishedTo / groundedBy /
// isSublimePole) — real prehensions, opaque slugs throughout. No slug is ever split
// for meaning; every read below walks prehensionsFrom/prehensionsOnto or the named
// helper, never a string test.
//
// Run: cd scher && npx vitest run helpdesk.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  prehensionsFrom,
  prehensionsOnto,
  isSublimePole,
  establishedTo,
  unpackPoles,
  closePole,
  endActual,
} from "../src/society.js";
import { groundedBy } from "../src/strain.js";
import { node, occlude, occluded } from "../src/play.js";

/** designate a sublime — a star the helpdesk reaches FOR, never lands on (per
 *  isSublimePole's contract: an un-occluded q-sublime-pole edge onto it). */
function designateSublime(s: Society, sublime: string, designator: string): void {
  node(s, sublime); node(s, designator);
  s.layP(`${designator}~designates~${sublime}`, "a star for navigation", designator, sublime, "q-sublime-pole");
}

/** name a problem/primordial the way grounded-capture.play does a trub — a plain node,
 *  no pole apparatus. A problem is a past event that still hurts; naming it costs nothing,
 *  answering it does. */
function nameProblem(s: Society, slug: string, content: string): void {
  s.lay({ slug, content, subject: null, object: null });
}

/** a wish is BLOCKED BY a problem's fix (q-blocked-by, per ingression-plugins.md: "making
 *  the wish q-blocked on each problem's resolution"). Direction: wish is the subject, the
 *  problem-fix is the object — the wish cannot close while the edge is live and unresolved. */
function blockedBy(s: Society, wish: string, problemFix: string): void {
  node(s, wish); node(s, problemFix);
  s.layP(`${wish}~blocked-by~${problemFix}`, "cannot grant while this is open", wish, problemFix, "q-blocked-by");
}

/** a fix event settles (grounds toward) the problem it answers — the SAME edge shape
 *  grounded-capture.play uses for "a miss becomes a task": fix~because~problem. */
function settles(s: Society, fix: string, problem: string): void {
  node(s, fix); node(s, problem);
  s.layP(`${fix}~because~${problem}`, "answers the problem", fix, problem, "q-grounding");
}

describe("the campus helpdesk 🎫 — a play-test of problem/wish, not a demo of it", () => {
  it("Q1 — a real ticket fits 'a past event plus something still open': the login storm", () => {
    const s = new Society();
    // Monday, 8:58am: two hundred students hit the portal at once and the auth service
    // falls over. That's the past event. What's still open: nobody can log in.
    nameProblem(s, "hd-login-storm-monday-8am", "auth service fell over under the 8:58am login rush");
    // the shape holds cleanly here — SOFTWARE incidents really are "a moment, plus an
    // ongoing hurt." naming the problem costs nothing; it just SITS there as a node until
    // something settles it.
    expect(s.has("hd-login-storm-monday-8am")).toBe(true);
    expect(groundedBy(s, "hd-login-storm-monday-8am")).toEqual([]); // nothing answers it yet — still open
  });

  it("Q1, STRAINED — a problem that is really a PATTERN across many past moments, not one", () => {
    const s = new Society();
    // "students keep forgetting their passwords" is not one past event — it is a rate, a
    // recurring shape over months of tickets. The grammar has no primitive for a pattern;
    // the doll's honest move is to name the PATTERN as its own problem-node and let each
    // Tuesday's ticket settle-toward it individually — a workaround, not a native fit.
    nameProblem(s, "hd-pattern-forgotten-passwords", "a recurring pattern across many tickets, not one moment");
    const ticket1 = "hd-ticket-forgot-pw-week1";
    const ticket2 = "hd-ticket-forgot-pw-week3";
    nameProblem(s, ticket1, "student forgot password, week 1");
    nameProblem(s, ticket2, "student forgot password, week 3");
    settles(s, "hd-add-password-reset-flow", ticket1);
    // the pattern-node itself is never a "past event" in any honest sense — it is an
    // inference OVER events. The model can represent it (as a node many things point at)
    // but the fit is loose: nothing distinguishes "a problem" from "a bucket someone
    // decided to name," and the grammar can't tell you whether the bucketing was sound.
    expect(prehensionsFrom(s, "hd-add-password-reset-flow", "q-grounding").map((e) => e.object)).toContain(ticket1);
    expect(s.has("hd-pattern-forgotten-passwords")).toBe(true); // representable...
    expect(groundedBy(s, "hd-pattern-forgotten-passwords")).toEqual([]); // ...but nothing ever settles a PATTERN itself, only its instances
  });

  it("Q2 — the wish for campus-wide SSO is honestly BLOCKED by the login-storm problem, and unblocks when it's fixed", () => {
    const s = new Society();
    designateSublime(s, "hd-sublime-frictionless-access", "hd-it-leadership");
    const wish = "hd-wish-single-sign-on";
    node(s, wish);
    // the wish reaches toward the sublime the way grounded-capture's Wren does:
    s.layP(`${wish}~because~hd-sublime-frictionless-access`, "reaches for", wish, "hd-sublime-frictionless-access", "q-grounding");

    const loginStorm = "hd-login-storm-monday-8am";
    nameProblem(s, loginStorm, "auth service fell over under the 8:58am rush");
    const stormFix = "hd-fix-add-rate-limiting";
    settles(s, stormFix, loginStorm);
    blockedBy(s, wish, stormFix);

    // BEFORE the fix closes: the wish is blocked. endActual asks "has this fix's own
    // End-pole been closed because a Now" — the honest, structural read of "is it done."
    const fixPoles = unpackPoles(s, stormFix);
    expect(endActual(s, fixPoles.end)).toBe(false);

    // the on-call engineer closes the fix — rate limiting ships, the storm can't recur:
    closePole(s, stormFix);

    // AFTER: the fix's End-pole is actual — honestly unblocked, not just marked done by fiat.
    expect(endActual(s, fixPoles.end)).toBe(true);
    // and the block edge itself is still there in the ink — cancelling-out reads as
    // "the blocker resolved," not "the edge vanished." History isn't rewritten to unblock.
    expect(prehensionsFrom(s, wish, "q-blocked-by").map((e) => e.object)).toContain(stormFix);
  });

  it("Q3 — THE CASE THAT MATTERS MOST: fixing the login storm CREATES a new problem — SSO breaks the grade-book", () => {
    const s = new Society();
    const wish = "hd-wish-single-sign-on";
    node(s, wish);
    const ssoRollout = "hd-fix-roll-out-campus-sso";
    settles(s, ssoRollout, "hd-login-storm-monday-8am");
    nameProblem(s, "hd-login-storm-monday-8am", "auth service fell over under the 8:58am rush");
    const ssoPoles = unpackPoles(s, ssoRollout);
    closePole(s, ssoRollout); // SSO ships. the storm problem is answered.
    expect(endActual(s, ssoPoles.end)).toBe(true);

    // Wednesday: the registrar's ancient grade-book integration used the OLD auth tokens
    // directly and SSO doesn't mint those anymore. A brand new problem, born FROM the fix
    // that solved the first one. The grammar holds this cleanly: the new problem's own
    // laid-by prehends the fix event that caused it — a because-edge in the other direction.
    const gradebookBroke = "hd-problem-gradebook-lost-auth";
    nameProblem(s, gradebookBroke, "the grade-book integration can no longer authenticate students");
    s.layP(`${gradebookBroke}~caused-by~${ssoRollout}`, "the fix that broke it", gradebookBroke, ssoRollout, "q-because");

    // the ORIGINAL problem stayed fixed — closing one doesn't get silently undone by the
    // new one appearing. Both facts hold at once, which is exactly the case worth testing:
    expect(endActual(s, ssoPoles.end)).toBe(true); // the storm-fix is STILL closed
    expect(prehensionsFrom(s, gradebookBroke, "q-because").map((e) => e.object)).toContain(ssoRollout);
    expect(groundedBy(s, gradebookBroke)).toEqual([]); // the new problem is itself unanswered — still open
    // the model HOLDS this (a fix and its fallout coexist as two honest nodes, one edge
    // naming the causal debt between them) — but it holds it only because the doll bothered
    // to lay the caused-by edge by hand. Nothing in the grammar AUTOMATICALLY surfaces "a
    // problem you just closed may have sired the thing you're looking at now" — that
    // vigilance is still a human's (or a crew's) job, not a structural guarantee.
    blockedBy(s, wish, gradebookBroke);
    const gradebookPoles = unpackPoles(s, gradebookBroke);
    expect(endActual(s, gradebookPoles.end)).toBe(false); // and the wish is blocked AGAIN, by the fallout of its own fix
  });

  it("Q4 — two staff disagree about whether the SSO ticket is DONE, both right from where they stand", () => {
    const s = new Society();
    const ssoRollout = "hd-fix-roll-out-campus-sso";
    node(s, ssoRollout);
    const u = unpackPoles(s, ssoRollout);

    // the on-call engineer, Priya, closes it Tuesday night the moment auth stops erroring:
    closePole(s, ssoRollout);

    // the registrar, Devon, reads the SAME ticket from HIS OWN frame — and in his frame the
    // grade-book breakage (discovered Wednesday) is reason enough that it isn't done. He
    // never closed it in his frame; establishedTo is frame-relative on purpose (2026-07-03
    // ruling cited in society.ts) — a beat is done TO a reader, never done absolutely.
    const devonsNow = "hd-devons-now-wednesday";
    node(s, devonsNow);
    // Devon's frame has NOT laid any grounding edge reaching the fix — he has no path to it.
    expect(establishedTo(s, devonsNow, ssoRollout)).toBe(false);
    // Priya's own frame DOES reach it — she closed it in the story's own frame (unpackPoles's
    // storyNow), and establishedTo from that same now sees the closing:
    expect(establishedTo(s, u.now, ssoRollout)).toBe(true);
    // both readings are correct, simultaneously, because "done" was never asked frame-free —
    // the grammar refuses to grant either of them the objective seat (isEstablished/
    // groundedForAnyFrame is explicitly marked deprecated for exactly this reason).
  });

  it("Q5 — the storm-fix reaches its sublime through the MOMENT IT WAS WISHED FOR, not the star itself", () => {
    const s = new Society();
    designateSublime(s, "hd-sublime-frictionless-access", "hd-it-leadership");
    // the sublime never closes (isSublimePole is inert by the kernel's own sublime guard) —
    // work reaches instead the ordinary PAST EVENT where wanting it was first written down:
    const momentWished = "hd-moment-leadership-asked-for-sso-2024-fall-retreat";
    nameProblem(s, momentWished, "IT leadership asked, at the fall retreat, for one login across campus");
    s.layP(`${momentWished}~because~hd-sublime-frictionless-access`, "the wish traces to the star", momentWished, "hd-sublime-frictionless-access", "q-grounding");

    const ssoRollout = "hd-fix-roll-out-campus-sso";
    settles(s, ssoRollout, momentWished);
    closePole(s, ssoRollout);

    // the star itself never closes — checked structurally, not by convention:
    expect(isSublimePole(s, "hd-sublime-frictionless-access")).toBe(true);
    expect(prehensionsOnto(s, "hd-sublime-frictionless-access", "q-end-pole").length).toBe(0);
    // but the ORDINARY PAST MOMENT the fix answers is a ground-able, closeable thing —
    // establishedTo reads it as reached from the fix's own frame:
    const fixPoles = unpackPoles(s, ssoRollout);
    expect(establishedTo(s, fixPoles.now, momentWished)).toBe(true);
    // reads NATURALLY as a story, not a trick: "we finally did the thing IT leadership
    // asked for at that retreat" is exactly how people actually talk about closing a
    // years-old ask. The trick would be claiming "frictionless access is DONE" — nobody
    // says that, and the grammar structurally can't either.
  });

  it("Q6 — WHAT HAS NO PLACE HERE: a recurring stand-up meeting is neither a wish nor a problem", () => {
    const s = new Society();
    // Every Monday at 9am the helpdesk holds a stand-up. It never resolves, it isn't
    // reached-for, nobody wants it "granted," and it isn't a hurt to be fixed — it just
    // RECURS. Forcing it into the model means picking a lie:
    const standup = "hd-monday-standup";
    node(s, standup);

    // lie #1: model it as a wish. Then it needs a sublime it "reaches for" — but nobody
    // is reaching for the meeting; the meeting is the reaching-FOR-other-things container.
    // lie #2: model it as a problem. Then it needs a past hurt — but the meeting isn't a
    // hurt, and "fixing" it (cancelling it) is the opposite of what anyone wants.
    // The doll's honest finding: there is no because-edge to lay that doesn't misdescribe
    // it. A recurring commitment with no open/closed state and no aim of its own has no
    // native slot — every event in this grammar is fundamentally a MOMENT with something
    // still open (Once/End/Now); a recurring, never-closing, never-answering-anything
    // ROUTINE is a different shape of thing entirely (a periodic container, not a moment).
    expect(s.has(standup)).toBe(true); // you CAN lay the node...
    expect(groundedBy(s, standup)).toEqual([]); // ...but nothing sensibly grounds in or from it
    expect(prehensionsFrom(s, standup, "q-blocked-by").length).toBe(0); // it blocks nothing
    // WORKLOAD is the same finding from a different door: "Priya is at capacity this
    // sprint" is neither a problem (no single past moment) nor a wish (nobody wants
    // capacity as an end in itself) — it's a STANDING CONSTRAINT on who can settle what,
    // and the grammar has no node-shape for a constraint that modulates capacity rather
    // than describing a moment. Both findings point the same direction: the model is
    // built for MOMENTS-WITH-SOMETHING-OPEN; recurring routines and standing constraints
    // are a different kind of thing it was never asked to hold, and straining it to fit
    // them (a "problem" that's really a rate, a "wish" that's really a meeting) is where
    // the shape shows its edge.
  });
});
