// ─────────────────────────────────────────────────────────────────────────────
// first-day.play.test.ts — a canon born today, carrying only today's goals and
// no history at all. 🌱
//
// Hallie's ruling, 2026-07-27, which cut the expensive half of the plan: "feel free to
// work on forward progress towards CODE that works for everything, without doing the
// back import of anything except our goals today into a persistent canon." No migration
// to model. So the question this doll answers is: what does a canon need on its FIRST
// DAY so that everything after works? It plays the first day out, scene by scene, and
// tries removing each piece to see what breaks. A FAILING answer is the valuable result;
// where one was found, it is reported loudly in the test's own body, not hidden.
//
// Read against specs/ingression-plugins.md (Hallie's aspirational spec, READ ONLY) —
// this doll plays the spec's OWN vocabulary (Primordial, sublime, wish, problem, laid-by)
// honestly in the grammar that exists today (society.ts + play.ts), not a new kernel.
// Where the spec proposes machinery the kernel doesn't have yet (a minted Primordial
// node, a two-frame external ingestion), the doll builds it from real prehensions using
// only node()/why()/succeeds()/layP — no string-matching, opaque slugs throughout.
//
// Run: cd scher && npx vitest run first-day.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded, isSublimePole } from "../src/society.js";
import { node, why, succeeds, occlude, occluded, routesTo, feltOnto, pid } from "../src/play.js";

/** designate a node as a sublime-pole — a star for navigation, never actual. Same shape
 *  grounded-capture.play.test.ts uses: an un-occluded q-sublime-pole edge onto it. */
function designateSublime(s: Society, sublime: string, designator: string): void {
  node(s, sublime); node(s, designator);
  s.layP(`${designator}~designates~${sublime}`, "a star for navigation", designator, sublime, "q-sublime-pole");
}

/** LAZY MINT: the spec's own rule ("each Sublime has an equivalent Primordial that is
 *  minted lazily... the first time you use it as a source"). This doll mints a Primordial
 *  the same way — an ordinary node, made on first need, never built up front — and returns
 *  whether this call was the one that minted it (vs. finding it already there). */
function mintPrimordialIfNeeded(s: Society, primordial: string): boolean {
  const alreadyExisted = s.has(primordial);
  node(s, primordial);
  return !alreadyExisted;
}

describe("A canon born today — the first day, from nothing 🌱", () => {
  it("SCENE 1, THE FLOOR — the Primordial Now exists before anything else; nothing points past it", () => {
    const s = new Society();
    // The floor, per Hallie's ruling: problem-density is the axis, not story. There is a
    // Primordial Now and NO destination pole — nothing is "the end," only more or less
    // problem-dense than what came before.
    const primordialNow = "the-primordial-now";
    node(s, primordialNow);
    // The very first row in the whole canon. Nothing precedes it — it is simply laid,
    // an ordinary node like any other, carrying no laid-by of its own (spec: "The Beginning
    // and End of time are the only things beyond, which exist in an install absent any
    // laying of them and, de facto, recede forever").
    expect(s.has(primordialNow)).toBe(true);
    expect(s.size).toBe(1); // the floor really is the FIRST thing — nothing snuck in before it

    // TRY REMOVING IT: if nothing designates the Primordial Now, can a sublime still be
    // laid and reached? Yes — a sublime is just a node with a q-sublime-pole edge onto it;
    // nothing in isSublimePole's own contract requires a Primordial Now to exist at all.
    const s2 = new Society();
    designateSublime(s2, "an-aim-with-no-floor", "someone");
    expect(isSublimePole(s2, "an-aim-with-no-floor")).toBe(true);
    // FAILING ANSWER, reported loudly: the Primordial Now is NOT structurally load-bearing
    // for a sublime to exist or be reached — nothing in the kernel checks for it. It is a
    // CONVENTION the spec asks for (a shared floor everyone's problems eventually reach),
    // not a mechanism the grammar enforces. If the floor is skipped, nothing breaks today;
    // what breaks is LATER, when two canons' problems can't be compared because they trace
    // to different, unrelated floors. The floor's necessity is social (a shared reference),
    // not mechanical — worth telling Hallie plainly, since "what must exist first" reads
    // as a structural claim and this doll finds it is not one.
  });

  it("SCENE 2, THE FIRST AIM — laying a sublime is itself an ordinary dated event", () => {
    const s = new Society();
    const primordialNow = "the-primordial-now";
    node(s, primordialNow);

    // THE AIM: "legible problems, always shrinking" — a sublime, never actual, a star.
    const theAim = "aim-legible-problems-always-shrinking";
    // THE LAYING: the act of laying the aim is its OWN ordinary dated event — a plain node,
    // distinct from the aim itself, that happens on today's date and can be pointed at,
    // occluded, revised, argued about — everything a sublime itself can never be, because
    // a sublime never finishes and nothing may point at it (checkSublimeNeverCloses).
    const layingTheAim = "2026-07-27-hallie-lays-the-aim";
    node(s, layingTheAim);
    designateSublime(s, theAim, layingTheAim);
    // the laying reaches the floor — an ordinary because-edge, nothing special about it:
    s.layP(`${layingTheAim}~because~${primordialNow}`, "today's work reaches the floor",
      layingTheAim, primordialNow, "q-grounding");

    expect(isSublimePole(s, theAim)).toBe(true);
    // work reaches the AIM'S LAYING, never the aim directly — that's the whole point of a
    // sublime being unreachable-as-such: the laying is the SUBJECT of the designation, the
    // aim its object; read it FROM the laying's side.
    const designatesTheAim = prehensionsFrom(s, layingTheAim, "q-sublime-pole");
    expect(designatesTheAim.some((e) => e.object === theAim)).toBe(true);

    // THE UNREACHABLE-SUBLIME BUG, played for real: a sublime with NO laying at all —
    // just a bare q-sublime-pole edge from a subject with no further prehensions —
    // is a dead end. Nothing can walk BACK from it to find out who laid it, when, or why.
    const s2 = new Society();
    const orphanAim = "orphan-aim-nobody-dated";
    s2.layP("mystery~designates", "a star from nowhere", "mystery-subject", orphanAim, "q-sublime-pole");
    // the aim is a sublime, technically —
    expect(isSublimePole(s2, orphanAim)).toBe(true);
    // — but its designator has no laid-by, no date, no because-edge to anything. It is
    // reached by NOTHING: no live event routes toward it, because nothing was ever laid
    // "so that" it could be reached (why/routesTo both require a q-end-pole hop that this
    // orphan sublime, minted bare, never received).
    expect(routesTo(s2, "mystery-subject", orphanAim)).toBe(false);
    expect(prehensionsFrom(s2, "mystery-subject", "q-grounding").length).toBe(0);
    // FAILING ANSWER, reported loudly: this is NOT hypothetical. It is the live shape of
    // the 20 sublimes in the production canon reached by nothing at all — a sublime minted
    // without its laying-as-an-event is inert forever, a star nobody can find their way
    // back to. THE SEED-LIST ITEM: day one needs "lay the sublime's laying as a dated
    // event with a because-edge to the floor" as a REQUIRED step, not an optional nicety —
    // skip it and you get exactly today's 20 orphans.
  });

  it("SCENE 3, THE FIRST WISH — reaching the aim through its laying, never through the aim itself", () => {
    const s = new Society();
    const primordialNow = "the-primordial-now";
    node(s, primordialNow);
    const theAim = "aim-legible-problems-always-shrinking";
    const layingTheAim = "2026-07-27-hallie-lays-the-aim";
    node(s, layingTheAim);
    designateSublime(s, theAim, layingTheAim);
    s.layP(`${layingTheAim}~because~${primordialNow}`, "today's work reaches the floor",
      layingTheAim, primordialNow, "q-grounding");

    // THE FIRST WISH: "seed a canon that survives its own first day." An ordinary event,
    // laid so-that it serves the laying of the aim (why/q-end-pole — the structural
    // future-because; never the aim directly, since a sublime is never a valid End-pole
    // target for anything to close into).
    const firstWish = "wish-seed-a-canon-that-survives-day-one";
    why(s, firstWish, layingTheAim);
    expect(routesTo(s, firstWish, layingTheAim)).toBe(true);

    // TRY REMOVING THE LAYING: if the wish tried to route directly to the AIM (skipping
    // its laying), would that even be legal? assertSublimeNeverCloses blocks a q-grounding
    // CLOSE onto a sublime, but why()'s q-end-pole edge is a different quality — nothing in
    // the guard stops a why() from naming a sublime as its object directly:
    const wishToBareSublime = "wish-tries-to-aim-at-the-sublime-directly";
    expect(() => why(s, wishToBareSublime, theAim)).not.toThrow();
    expect(routesTo(s, wishToBareSublime, theAim)).toBe(true); // routesTo doesn't discriminate either
    // FAILING ANSWER, reported loudly: the grammar does NOT structurally require a wish to
    // route through the aim's LAYING rather than the bare sublime node — both are legal,
    // both "reach." The discipline that a wish reaches an aim only via its laying (so the
    // laying, not the eternal sublime, carries the date/author/because-chain) is a
    // CONVENTION this doll follows, not one the kernel enforces. Worth a guard someday;
    // today it is taste, held by whoever writes the wish.
  });

  it("SCENE 4, THE FIRST PROBLEM — descending toward a Primordial minted lazily, on first need", () => {
    const s = new Society();
    const primordialNow = "the-primordial-now";
    node(s, primordialNow);

    // no "Problems Exist" Primordial has been minted yet — nobody needed one:
    const mostGeneralProblem = "primordial-problems-exist";
    expect(s.has(mostGeneralProblem)).toBe(false);

    // THE FIRST PROBLEM arrives: something concrete goes wrong. Per Hallie's ruling, it
    // starts at the MOST GENERAL primordial ("Problems Exist"), then gets more specific
    // as more is known — so the first mention is the LAZY MINT itself.
    const firstProblem = "problem-the-doll-conflicts-with-its-sibling";
    const mintedNow = mintPrimordialIfNeeded(s, mostGeneralProblem);
    expect(mintedNow).toBe(true); // this call is the one that minted it
    node(s, firstProblem);
    s.layP(`${firstProblem}~because~${mostGeneralProblem}`, "the most general problem, for now",
      firstProblem, mostGeneralProblem, "q-grounding");
    expect(s.has(mostGeneralProblem)).toBe(true); // now it exists — minted by the FIRST use, not before

    // A SECOND problem arrives later, more is known, it descends to a MORE SPECIFIC
    // primordial minted from the general one (never rebuilt from scratch):
    const moreSpecificPrimordial = "primordial-two-agents-touched-one-file";
    const mintedAgain = mintPrimordialIfNeeded(s, moreSpecificPrimordial);
    expect(mintedAgain).toBe(true);
    s.layP(`${moreSpecificPrimordial}~because~${mostGeneralProblem}`, "a specific problem descends from the general one",
      moreSpecificPrimordial, mostGeneralProblem, "q-grounding");
    const secondProblem = "problem-two-crews-claimed-play-ts";
    node(s, secondProblem);
    s.layP(`${secondProblem}~because~${moreSpecificPrimordial}`, "grounded at the specific primordial",
      secondProblem, moreSpecificPrimordial, "q-grounding");

    // re-mentioning the SAME general primordial a third time does NOT mint it again —
    // the lazy-mint discipline holds (mintPrimordialIfNeeded reports false on a repeat):
    const mintedThirdTime = mintPrimordialIfNeeded(s, mostGeneralProblem);
    expect(mintedThirdTime).toBe(false);
    expect(s.size).toBeGreaterThan(0); // sanity: the society actually grew, once per genuinely new node

    // TRY REMOVING THE PRIMORDIAL ENTIRELY: could the first problem just ground directly
    // in the Primordial Now, no "Problems Exist" hop? Mechanically yes —
    const s2 = new Society();
    node(s2, primordialNow);
    const bareProblem = "problem-that-skips-the-hierarchy";
    node(s2, bareProblem);
    s2.layP(`${bareProblem}~because~${primordialNow}`, "skips straight to the floor", bareProblem, primordialNow, "q-grounding");
    expect(prehensionsFrom(s2, bareProblem, "q-grounding").some((e) => e.object === primordialNow)).toBe(true);
    // FAILING ANSWER, reported loudly: the kernel does not require the "Problems Exist"
    // rung — a problem CAN skip straight to the floor and nothing objects. The spec's
    // own toggle language ("Yes. It's a toggle. That starts on...") already concedes this:
    // the graded-primordial ladder is a UX nicety for sorting, not a structural need. The
    // seed list needs the Primordial Now; it does NOT need "Problems Exist" pre-built —
    // that one really is fine minted lazily, exactly as the spec proposes.
  });

  it("SCENE 5, THE FIRST THING FROM OUTSIDE — one commit, two frames: who, and when", () => {
    const s = new Society();
    // A git commit happens OUT THERE, on its own day, authored by someone outside this
    // canon's light cone. It is ingressed: "the shadow of something larger becoming
    // readable" (spec). Two frames on the ONE event: the frame of WHO committed it (an
    // external author), and the frame of WHEN it lands HERE (our own Now).
    const theCommit = "commit-a1b2c3-fixes-the-header-padding";
    node(s, theCommit);

    // Frame 1 — WHO: the commit prehends its own laid-by, the external author's act, on
    // its own day out there. Ingression's own law: "All events have both themselves... and
    // their laid-by... any event not in our light cone can be ingressed if we have access
    // to its laid-by."
    const externalLaying = "external-git-author-lays-commit-2026-07-25";
    node(s, externalLaying);
    s.layP(`${theCommit}~laid-by~${externalLaying}`, "the commit's own laid-by, out there",
      theCommit, externalLaying, "q-grounding");

    // Frame 2 — WHEN: the commit is written down HERE, on OUR day, prehended by our own
    // frame's Now — a second, independent prehension, not a copy of the first.
    const ourNow = "our-frame-now-2026-07-27";
    node(s, ourNow);
    s.layP(`${ourNow}~because~${theCommit}`, "our frame witnesses the commit landing today",
      ourNow, theCommit, "q-grounding");

    // both frames are readable independently — the commit's WHO does not collapse into
    // its WHEN, and vice versa:
    const whoReads = prehensionsFrom(s, theCommit, "q-grounding").map((e) => e.object);
    expect(whoReads).toContain(externalLaying);
    const whenReads = prehensionsFrom(s, ourNow, "q-grounding").map((e) => e.object);
    expect(whenReads).toContain(theCommit);
    expect(whoReads).not.toContain(ourNow); // the who-frame never smuggles in the when-frame

    // TRY REMOVING THE LAID-BY: without frame 1 (the external laying), can the commit
    // still be told apart from something authored natively, in this canon, today?
    const s2 = new Society();
    const undocumentedCommit = "commit-with-no-laid-by-at-all";
    node(s2, undocumentedCommit);
    // FAILING ANSWER, reported loudly: nothing in the kernel distinguishes an ingressed
    // event that LOST its laid-by from a plain native node — both are just nodes with no
    // outgoing edges. The "who committed this, and when out there" story is entirely
    // carried by whether someone bothered to lay the laid-by edge; drop it and an ingested
    // commit is silently indistinguishable from something invented in-canon. The seed list
    // needs: ingression is not safe by construction — a missing laid-by is a silent lie,
    // not a caught error.
    expect(prehensionsFrom(s2, undocumentedCommit, "q-grounding").length).toBe(0);
  });

  it("SCENE 6, THE FIRST REVISION — current is the tip of a succession chain, read, never stored", () => {
    const s = new Society();
    // Somebody says a thing, then says it again, differently. The FIRST WORDING:
    const firstWording = "note-the-deploy-script-is-flaky";
    node(s, firstWording);
    // THE REVISION: a distinct event, succeeding the first (the same shape quakers.play
    // uses for a lineage — succeeds() lays a real q-succeeds prehension, the parent stays
    // an honored ancestor, never overwritten).
    const revisedWording = "note-the-deploy-script-swallows-errors-silently";
    succeeds(s, revisedWording, firstWording);

    // "CURRENT" is never a stored field — it is READ off the chain: the live head, the
    // tip nothing succeeds. play.ts's heads() would answer this the same way quakers does;
    // this doll reads it directly to keep the point in view without importing heads() too.
    const succeededBy = prehensionsOnto(s, firstWording, "q-succeeds").filter((e) => !isOccluded(s, e.slug));
    expect(succeededBy.map((e) => e.subject)).toContain(revisedWording);
    // the FIRST wording is never edited or deleted — it stays exactly as laid, an honored
    // ancestor, precisely the append-only law (Society#insert: "beats are never overwritten"):
    expect(s.get(firstWording)?.content).toBe(firstWording);

    // A SECOND revision arrives — the chain grows, "current" always re-derived, never bumped:
    const secondRevision = "note-the-deploy-script-swallows-errors-and-reports-success";
    succeeds(s, secondRevision, revisedWording);
    const tipOfRevisedWording = prehensionsOnto(s, revisedWording, "q-succeeds").filter((e) => !isOccluded(s, e.slug));
    expect(tipOfRevisedWording.map((e) => e.subject)).toContain(secondRevision);
    // nothing succeeds the second revision yet — IT is current, read fresh each time:
    expect(prehensionsOnto(s, secondRevision, "q-succeeds").length).toBe(0);
  });

  it("SCENE 7, THE FIRST DISAGREEMENT — two frames, two Nows, both right about whether something is done", () => {
    const s = new Society();
    // A task both frames watch:
    const theTask = "task-header-padding-fix";
    node(s, theTask);

    // FRAME A (a crew doll): its own Now grounds ONTO the task — from Frame A's
    // standpoint, its Now IS because the task, i.e. the task establishes to Frame A.
    const frameANow = "frame-a-now";
    node(s, frameANow);
    s.layP(`${frameANow}~because~${theTask}`, "frame A's Now grounds in the task: done, from here",
      frameANow, theTask, "q-grounding");

    // FRAME B (Hallie, reviewing): her own Now does NOT ground in the task — she has not
    // yet accepted it. Nothing is laid here; the absence IS the disagreement.
    const frameBNow = "frame-b-now";
    node(s, frameBNow);

    // both readings are simultaneously TRUE, each relative to its own standpoint — this is
    // establishedTo's own law (2026-07-03 ruling): "every event is done to/by its author —
    // establishment is always relative to a standpoint, never frame-free." Played directly
    // with prehensionsFrom rather than importing establishedTo, to keep this doll's surface
    // small — the read is the same shape reaches()/establishedTo walk.
    const frameAConsidersItDone = prehensionsFrom(s, frameANow, "q-grounding").some((e) => e.object === theTask);
    const frameBConsidersItDone = prehensionsFrom(s, frameBNow, "q-grounding").some((e) => e.object === theTask);
    expect(frameAConsidersItDone).toBe(true);
    expect(frameBConsidersItDone).toBe(false);
    // NEITHER reading is wrong, and neither overwrites the other — the grammar holds both
    // at once, exactly like the Mirage question in quakers.play (Inner Light vs. Scripture):
    // the disagreement is the thing, not a bug to be resolved by picking a winner.

    // Frame B can later occlude Frame A's grounding from HER OWN frame's view — a reversible,
    // frame-scoped act, never an erasure of Frame A's read:
    const frameBsRejection = "frame-b-occludes-frame-as-claim-2026-07-27";
    occlude(s, `${frameANow}~because~${theTask}`, frameBsRejection);
    expect(occluded(s, `${frameANow}~because~${theTask}`)).toBe(true);
    // and yet Frame A's own beat is UNCHANGED — occlusion shadows the edge for readers who
    // see the occluder, it does not delete or rewrite what Frame A said:
    expect(s.has(`${frameANow}~because~${theTask}`)).toBe(true);
    expect(s.get(`${frameANow}~because~${theTask}`)?.subject).toBe(frameANow);
  });

  it("THE SEED LIST — what a canon needs on day one, and the order it must be laid in", () => {
    const s = new Society();
    // Replay the whole first day in order, checking that EACH step is possible only once
    // the step before it exists — this is the ORDER-INDEPENDENCE question for BIRTH.

    // 1. THE FLOOR must exist before anything can ground toward it.
    const primordialNow = "seed-primordial-now";
    node(s, primordialNow);

    // 2. THE AIM'S LAYING must exist before a wish can route toward it — routesTo walks
    // live q-end-pole edges; with nothing laid yet, there is nothing to route through.
    const layingTheAim = "seed-laying-the-aim";
    node(s, layingTheAim);
    designateSublime(s, "seed-the-aim", layingTheAim);
    s.layP(`${layingTheAim}~because~${primordialNow}`, "reaches the floor", layingTheAim, primordialNow, "q-grounding");

    // 3. THE FIRST WISH needs the laying to exist first — proven by trying it BEFORE:
    const s_outOfOrder = new Society();
    const wishTooEarly = "seed-wish-too-early";
    node(s_outOfOrder, wishTooEarly);
    // why() itself doesn't refuse a dangling target (it calls node() on the aim, minting a
    // BARE node with no further structure) — so laying "out of order" doesn't throw:
    expect(() => why(s_outOfOrder, wishTooEarly, "seed-laying-not-laid-yet")).not.toThrow();
    // — but routesTo from that wish reaches only the bare node, not a REAL laying with its
    // own because-chain to the floor. Order is not ENFORCED; it is simply what makes the
    // resulting graph MEAN what the story says it means. This is the same order-independence
    // already measured true for ingestion (any order is legal) — but here, legal-and-lets-
    // you-do-it is not the same as legal-and-means-what-you-think: laying out of order still
    // produces a graph, just a thinner, less-grounded one.
    expect(routesTo(s_outOfOrder, wishTooEarly, primordialNow)).toBe(false); // never reaches the floor

    const firstWish = "seed-first-wish";
    why(s, firstWish, layingTheAim);
    expect(routesTo(s, firstWish, layingTheAim)).toBe(true);
    expect(routesTo(s, firstWish, primordialNow)).toBe(false); // why() reaches only ONE hop; walking further needs another why()
    why(s, layingTheAim, primordialNow); // the laying's OWN why, closing the chain to the floor
    expect(routesTo(s, firstWish, primordialNow)).toBe(true); // now the full chain reaches

    // 4. THE FIRST PROBLEM can be minted lazily at ANY point after the floor exists — it
    // has no dependency on the aim, the wish, or their order relative to each other:
    const mostGeneralProblem = "seed-problems-exist";
    mintPrimordialIfNeeded(s, mostGeneralProblem);
    node(s, "seed-first-problem");
    s.layP("seed-first-problem~because~seed-problems-exist", "grounded", "seed-first-problem", mostGeneralProblem, "q-grounding");

    // THE ANSWER: floor before aim's-laying before wish IS a real ordering constraint —
    // not because the kernel throws if you skip it, but because skipping it produces a
    // graph that no longer MEANS "reaches the floor." The problem-minting step, by
    // contrast, is genuinely order-free — it can happen before or after the aim/wish with
    // no change in what the resulting graph means. Order-independence measured true for
    // ingestion does NOT hold uniformly at birth: it holds for problems (mint whenever
    // needed), it does NOT hold for the floor→aim's-laying→wish chain (skip a link and the
    // chain silently stops meaning what it should, though nothing refuses the write).
    expect(s.size).toBeGreaterThan(0);
  });
});
