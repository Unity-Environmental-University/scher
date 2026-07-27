// ─────────────────────────────────────────────────────────────────────────────
// routines.play.test.ts — a play-TEST of Hallie's ruling, 2026-07-27, closing the
// helpdesk doll's leading gap with NO new machinery:
//
//   "A routine is a sublime that we prehend new instances of. Days work this way,
//   sprints work this way." And then: "automations will work this way too."
//
// The gap this closes (found by helpdesk.play.test.ts, Q6): a recurring stand-up and
// a person's standing workload had no slot in a grammar where every event is a
// moment-with-something-still-open. Forcing either into wish-or-problem shape meant
// picking a lie.
//
// The ruling's mechanism was already running, unnamed, in production: day nodes
// ground into `once-upon-a-time`, a q-sublime-pole target — isSublimePole's own
// contract (an un-occluded q-sublime-pole edge onto it, checked structurally, never
// by convention) says that target never closes. Days have always been instances of
// a routine; nobody had named the pattern, so nothing else could reuse it.
//
// This doll plays six scenes, in the order Hallie's brief asks for. A FAILING
// answer is the valuable result where one is found, and it is reported loudly in
// the scene's own body, not buried. Built on play.ts's real helpers — node / why /
// succeeds / occlude / occluded / routesTo / pid — opaque slugs throughout, no
// string-matching, structure read only via prehensionsFrom/prehensionsOnto.
//
// Run: cd scher && npx vitest run routines.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isSublimePole, unpackPoles, closePole, endActual } from "../src/society.js";
import { groundedBy } from "../src/strain.js";
import { node } from "../src/play.js";

/** designate a node as a sublime-pole (a routine, never actual) — the SAME shape
 *  helpdesk.play and first-day.play both use for a star: an un-occluded q-sublime-pole
 *  edge onto it, laid by a designator. A routine IS a sublime under this ruling — no
 *  new quality, no new pole kind. */
function designateRoutine(s: Society, routine: string, designator: string): void {
  node(s, routine); node(s, designator);
  s.layP(`${designator}~designates~${routine}`, "a routine, never closed, only instanced", designator, routine, "q-sublime-pole");
}

/** an instance PREHENDS the routine it belongs to — an ordinary q-grounding edge, the
 *  same edge shape a wish uses to reach toward its sublime (helpdesk's `blockedBy`/
 *  `settles` pattern, first-day's designateSublime chain). The instance is a real,
 *  closeable event; the routine it points at never is. */
function instances(s: Society, instance: string, routine: string): void {
  node(s, instance); node(s, routine);
  s.layP(`${instance}~because~${routine}`, "an instance of the routine", instance, routine, "q-grounding");
}

describe("routines, per Hallie's ruling (2026-07-27) — a sublime we prehend new instances of", () => {
  it("SCENE 1, THE STAND-UP — the meeting the helpdesk doll could not hold, now a sublime instanced weekly", () => {
    const s = new Society();
    designateRoutine(s, "hd-routine-monday-standup", "hd-helpdesk-team");

    // three weeks' worth of stand-ups, each its OWN closeable event, each an instance:
    const week1 = "hd-standup-2026-07-06";
    const week2 = "hd-standup-2026-07-13";
    const week3 = "hd-standup-2026-07-20";
    instances(s, week1, "hd-routine-monday-standup");
    instances(s, week2, "hd-routine-monday-standup");
    instances(s, week3, "hd-routine-monday-standup");

    // the routine itself is a sublime — checked structurally, never by convention:
    expect(isSublimePole(s, "hd-routine-monday-standup")).toBe(true);
    // and it NEVER closes: nothing sensibly grounds FROM it toward anything further
    // (helpdesk Q6's own check on the bare stand-up node, now honestly answered rather
    // than left as a hole — the routine has instances grounding ONTO it, but never
    // itself grounds FROM, i.e. it never settles or closes toward a further target):
    expect(prehensionsFrom(s, "hd-routine-monday-standup", "q-grounding")).toEqual([]);

    // each INSTANCE, though, is an ordinary event that CAN close — week1's stand-up
    // happened and is over, told apart from the routine by the direction of the read:
    const whoInstances = prehensionsOnto(s, "hd-routine-monday-standup", "q-grounding").map((e) => e.subject);
    expect(whoInstances).toContain(week1);
    expect(whoInstances).toContain(week2);
    expect(whoInstances).toContain(week3);
    expect(whoInstances.length).toBe(3);

    // READS HONESTLY: "the stand-up" (routine) never resolves; "Monday's stand-up"
    // (instance) is a specific past moment, exactly how people actually talk about it.
    // The routine correctly never closes while each instance, individually, does —
    // this is the shape Q6 said had no slot, now filled with the SAME machinery a
    // wish already used to reach its sublime, not a new pole kind.
  });

  it("SCENE 2, THE DAY — already working this way; the SAME shape as the stand-up, not a coincidence", () => {
    const s = new Society();
    // `once-upon-a-time` is the production canon's never-closing pole (verified live,
    // 2026-07-27, read-only against penelope_canon: 20 `day-YYYY-MM-DD` nodes exist,
    // 10 of them ground onto `once-upon-a-time` via a bare q-grounding-shaped edge).
    // This doll re-derives that exact shape, structurally, rather than trusting the
    // psql count as anything more than a spot-check:
    designateRoutine(s, "once-upon-a-time", "penelope-canon-itself");

    const day1 = "day-2026-07-24";
    const day2 = "day-2026-07-27";
    instances(s, day1, "once-upon-a-time");
    instances(s, day2, "once-upon-a-time");

    expect(isSublimePole(s, "once-upon-a-time")).toBe(true);
    expect(prehensionsFrom(s, "once-upon-a-time", "q-grounding")).toEqual([]); // the routine "a day" never closes

    // SAME SHAPE CHECK: the read that told the stand-up's routine apart from its
    // instances is IDENTICAL in form to the read here — same designateRoutine, same
    // instances(), same isSublimePole/groundedBy pair. Nothing bespoke to "day" at all:
    const dayInstances = prehensionsOnto(s, "once-upon-a-time", "q-grounding").map((e) => e.subject);
    expect(dayInstances).toContain(day1);
    expect(dayInstances).toContain(day2);
    // this is the whole finding: a day was ALREADY an instance of a routine, running
    // unnamed. The ruling doesn't add a mechanism — it names one already load-bearing.
  });

  it("SCENE 3, A SPRINT — an instance with a beginning AND an end, unlike a day; does the shape still hold?", () => {
    const s = new Society();
    designateRoutine(s, "routine-two-week-sprint", "the-team");

    // a sprint instance is not a single moment — it CONTAINS other work (tickets,
    // stand-ups) across its own span. Give it real interior structure:
    const sprint14 = "sprint-2026-07-13-to-2026-07-24";
    instances(s, sprint14, "routine-two-week-sprint");

    // interior work: two stand-ups happen INSIDE this sprint, each itself an instance
    // of the OTHER routine from Scene 1 — a sprint containing stand-ups is not a
    // conflict, it's two routines' instances coexisting, one nested in the other:
    designateRoutine(s, "routine-monday-standup", "the-team");
    const standupInSprint = "standup-2026-07-13-inside-sprint-14";
    instances(s, standupInSprint, "routine-monday-standup");
    s.layP(`${standupInSprint}~because~${sprint14}`, "happened during this sprint", standupInSprint, sprint14, "q-grounding");

    // the sprint routine itself never closes — same as the day, same as the stand-up:
    expect(isSublimePole(s, "routine-two-week-sprint")).toBe(true);
    expect(prehensionsFrom(s, "routine-two-week-sprint", "q-grounding")).toEqual([]);

    // but THIS sprint instance, unlike a day, has a real beginning-to-end span that can
    // be unpacked into its own poles and CLOSED when the sprint ends — the shape holds
    // even though the instance is long and has interior structure, because closing an
    // instance was never about its duration, only about whether something because's a
    // Now. Use the kernel's own pole machinery directly on the instance:
    const u = unpackPoles(s, sprint14);
    expect(endActual(s, u.end)).toBe(false); // sprint 14 is still open
    closePole(s, sprint14); // the sprint ends, 2026-07-24
    expect(endActual(s, u.end)).toBe(true); // NOW it's closed — an ordinary instance, despite its length

    // and the routine is STILL never-closing, unaffected by any one instance closing:
    expect(isSublimePole(s, "routine-two-week-sprint")).toBe(true);
    expect(prehensionsFrom(s, "routine-two-week-sprint", "q-grounding")).toEqual([]);
    // FINDING: the shape holds for a long, structured instance exactly as well as for a
    // bare day. "Instance" never meant "atomic moment" — it meant "a closeable event
    // that grounds toward a never-closing routine," and duration/interior content are
    // orthogonal to that.
  });

  it("SCENE 4, AN AUTOMATION — Her words: 'automations will work this way too.' Does a FAILED run still read as an instance? Is a MISSED run visible?", () => {
    const s = new Society();
    designateRoutine(s, "routine-nightly-backup-job", "ops-team");

    // a run that SUCCEEDS: an ordinary instance, closes clean.
    const runMonday = "backup-run-2026-07-20";
    instances(s, runMonday, "routine-nightly-backup-job");
    const uMon = unpackPoles(s, runMonday);
    closePole(s, runMonday);
    expect(endActual(s, uMon.end)).toBe(true);

    // a run that FAILS: STILL an ordinary instance — it happened, it grounds toward the
    // routine exactly the same way, and closing it does NOT mean "it succeeded," only
    // "something is now because a Now." Failure is content on the instance, not a
    // different shape of edge — the same distinction helpdesk's Q3 drew between a fix
    // event happening and what it actually accomplished:
    const runTuesdayFailed = "backup-run-2026-07-21-disk-full";
    instances(s, runTuesdayFailed, "routine-nightly-backup-job");
    const uTue = unpackPoles(s, runTuesdayFailed);
    closePole(s, runTuesdayFailed); // the RUN is over — it ran, and it ran into a wall
    expect(endActual(s, uTue.end)).toBe(true); // closed: "it happened" is true even though it failed
    // a separate problem-node carries the hurt, same shape as helpdesk's login-storm —
    // the run's failure SIRES a problem, it doesn't retroactively un-happen the run:
    const backupFailure = "problem-backup-2026-07-21-disk-full";
    node(s, backupFailure);
    s.layP(`${backupFailure}~caused-by~${runTuesdayFailed}`, "the run that failed", backupFailure, runTuesdayFailed, "q-because");
    expect(prehensionsFrom(s, backupFailure, "q-because").map((e) => e.object)).toContain(runTuesdayFailed);
    expect(groundedBy(s, backupFailure)).toEqual([]); // the failure itself is still unanswered

    // a run that NEVER HAPPENED (the job's cron didn't fire Wednesday at all): is the
    // gap VISIBLE, or silently absent? Play it honestly — no instance was ever laid:
    const wednesdayInstances = prehensionsOnto(s, "routine-nightly-backup-job", "q-grounding")
      .map((e) => e.subject);
    expect(wednesdayInstances).not.toContain("backup-run-2026-07-22");
    // FAILING ANSWER, reported loudly: a missed instance is INVISIBLE by default. There
    // is no node for "the run that should have happened Wednesday and didn't" unless
    // something bothers to lay one — an absence of an edge reads identically to "nobody
    // ever looked," which is the SAME shape gap `first-day.play`'s Scene 5 found for a
    // dropped laid-by (an ingressed event that lost its laid-by is silently
    // indistinguishable from something invented in-canon). The model's OTHER answer for
    // absence — an unsettled laying, something expected that never arrived — requires
    // an expectation to have been laid FIRST (a scheduled-run node minted ahead of time,
    // open, that Wednesday's silence would leave un-closed and therefore visibly
    // scripted-forever). Compare directly:
    const expectedWednesday = "backup-run-2026-07-22-expected";
    node(s, expectedWednesday); // laid AHEAD OF TIME, before Wednesday, as an expectation
    s.layP(`${expectedWednesday}~because~routine-nightly-backup-job`, "expected instance, not yet run",
      expectedWednesday, "routine-nightly-backup-job", "q-grounding");
    const uWed = unpackPoles(s, expectedWednesday);
    // Wednesday passes. Nobody closes it. It just sits there, open, forever, unless
    // someone unpacks and checks — the SAME "unsettled laying" shape, played for real:
    expect(endActual(s, uWed.end)).toBe(false); // still open — a missed run READS as "never closed"
    // this IS visible — but only because the doll pre-minted the expectation. Without
    // that pre-mint (the far more common case: nobody wrote down that Wednesday SHOULD
    // have run before it didn't), a missed instance and "nothing was scheduled here at
    // all" are indistinguishable. The ruling closes "is a run an instance" cleanly; it
    // does NOT, by itself, give automations a schedule to be silently absent FROM —
    // that's a second piece of machinery (a minted expectation per tick) the ruling's
    // words don't promise and this doll should not pretend it does.
  });

  it("SCENE 5, THE STANDING WORKLOAD — tried honestly as a routine, and it does not fit", () => {
    const s = new Society();
    // Try the routine shape on capacity, in good faith, the way the ruling's words invite:
    designateRoutine(s, "routine-priyas-workload", "priya");
    const week1Load = "priya-load-2026-07-06-at-80-percent";
    instances(s, week1Load, "routine-priyas-workload");

    // MECHANICALLY this typechecks — isSublimePole is true, an "instance" node can be
    // laid pointing at it. But read what each side is claiming:
    expect(isSublimePole(s, "routine-priyas-workload")).toBe(true);

    // a stand-up's instance is a MOMENT: it happens Monday at 9am and is over by 9:15.
    // "Priya's workload this week" is not a moment that happens and ends — it is a
    // CONTINUOUS reading, true or false at every instant across the week, not an event
    // that occurs once and closes. Forcing weekly snapshots into "instances" smuggles a
    // false discreteness onto something that is actually a constraint holding steadily,
    // not recurring — the same STRAINED finding helpdesk's Q1 named for a pattern-node:
    // representable, but the fit is loose, and nothing distinguishes an honest instance
    // from an arbitrary snapshot someone decided to cut a continuous quantity into.
    const week2Load = "priya-load-2026-07-13-at-95-percent";
    instances(s, week2Load, "routine-priyas-workload");
    // NOTHING in the grammar can tell you whether "weekly" is the right slice for
    // capacity, or whether Tuesday afternoon (when she was actually buried) deserved
    // its own instance too — a stand-up's cadence is chosen BY the routine (every
    // Monday, by definition); a workload's "cadence" is an arbitrary sampling rate
    // imposed FROM OUTSIDE onto something that was never discrete to begin with.
    expect(prehensionsFrom(s, "routine-priyas-workload", "q-grounding")).toEqual([]);

    // HONEST VERDICT: this ruling covers RECURRING MOMENTS (meetings, days, sprints,
    // scheduled runs) — things that happen, discretely, again and again. It does NOT
    // cover a STANDING CONSTRAINT that modulates what's possible continuously, the way
    // helpdesk's Q6 already flagged from the other door. A routine's instances are
    // discrete happenings; a workload is a rate/capacity that has no natural instant to
    // BE an instance of. The ruling closes two of the helpdesk doll's three gaps
    // cleanly (the stand-up, and — new here — the automation); it does not close this
    // one, and forcing it to would repeat exactly the "picking a lie" mistake the
    // ruling was written to end. Said plainly, not softened: capacity is a different
    // shape of thing, still homeless, and that is the honest result of this scene.
  });

  it("SCENE 6, THE PATTERN ACROSS TICKETS — 'forgotten passwords, again' — a routine, or something else?", () => {
    const s = new Society();
    // Try it as a routine first, in good faith: does "students forget their passwords"
    // recur the way a stand-up recurs?
    designateRoutine(s, "routine-forgotten-password-tickets", "helpdesk-pattern-watcher");
    const ticketWeek1 = "hd-ticket-forgot-pw-week1";
    const ticketWeek3 = "hd-ticket-forgot-pw-week3";
    instances(s, ticketWeek1, "routine-forgotten-password-tickets");
    instances(s, ticketWeek3, "routine-forgotten-password-tickets");

    // where it DIFFERS from the stand-up, sharply: a stand-up's routine is DESIGNED —
    // someone decided "every Monday" and the instances follow a schedule that exists
    // independent of any single instance. The password-ticket "routine" has no such
    // designer and no such schedule — nobody convened it, nothing says a ticket MUST
    // arrive week 5. It is a description discovered AFTER THE FACT by noticing several
    // unrelated tickets share a shape, not a container anyone set up in advance:
    expect(isSublimePole(s, "routine-forgotten-password-tickets")).toBe(true); // mechanically fits...
    expect(prehensionsFrom(s, "routine-forgotten-password-tickets", "q-grounding")).toEqual([]); // ...never closes, same as any routine

    // THE TELL: a stand-up MISSING one Monday is itself a fact worth noting (Scene 4's
    // missed-instance question makes sense to even ASK). A forgotten-password ticket
    // NOT arriving some week is not an absence anyone would notice or care about — there
    // was never a slot it was expected to fill. Play that directly: unlike Scene 4's
    // pre-minted expectation, there is no honest "expected instance" node to write for
    // week 2 here, because nothing was ever schedule-bound about it:
    const noExpectationExists = prehensionsOnto(s, "routine-forgotten-password-tickets", "q-grounding")
      .map((e) => e.subject);
    expect(noExpectationExists).not.toContain("hd-ticket-forgot-pw-week2"); // and nobody would ever mint one — there's nothing to expect

    // VERDICT: this is closer to Q1's STRAINED pattern-node than to a true routine. A
    // routine is a sublime whose instances are SCHEDULED occurrences of a designed
    // recurrence; the ticket pattern is an INFERENCE drawn over independent past
    // moments that merely resemble each other. The grammar can represent both with the
    // identical q-sublime-pole/q-grounding shape (that's WHY the mechanical check above
    // passes) — but passing the mechanical check is not the same as fitting honestly.
    // The pattern is better read as helpdesk's own STRAINED problem-node (an inference
    // OVER events, not a moment recurring) than as this ruling's routine (a designed
    // container whose instances are scheduled in advance). Judged plainly: it is NOT a
    // routine, even though nothing in the kernel stops you from laying it as one.
  });
});
