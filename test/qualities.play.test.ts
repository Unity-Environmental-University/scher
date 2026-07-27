// ─────────────────────────────────────────────────────────────────────────────
// qualities.play.test.ts — a play-TEST of Hallie's newest ruling (2026-07-27,
// specs/ingression-plugins.md §QUALITIES, READ ONLY):
//
//   "QUALITIES are, themselves, Events -- with a Primordeal and a Sublime and a
//   laid-by. To have a quality, an edge prehends that quality. The quality is the
//   node, the edge prehends the quality. in this way edges can prehend multiple
//   qualities and we need use no strings ever. We prehend the laid event of a
//   Quality rather than its sublime or primordial reflection, as will all sublimes."
//
// TODAY'S KERNEL (src/society.ts, layP): a prehension's quality is a bare STRING —
// the `~q` mode-beat's object field holds "q-grounding" or "q-succeeds" etc.
// directly, one quality per prehension slug, no laid-by, no sublime, no primordial.
// This doll plays the ruling's bigger claim on TOP of the real kernel — using only
// node()/why()/succeeds()/layP, no new machinery — and reports HONESTLY, per scene,
// whether the ruling holds or strains against what layP actually enforces.
//
// A failing answer is the valuable result. Where one is found it is stated loudly
// in the test body, not smoothed over.
//
// SIBLING: qualities-composed.play.test.ts plays Hallie's mid-task EXTENSION — a
// quality prehending other qualities ("& types," a type system for relationships).
// Split into two files so neither doll gets too long to read in one sitting.
//
// Run: cd scher && npx vitest run qualities.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isSublimePole } from "../src/society.js";
import { node } from "../src/play.js";

/** designate a sublime — same shape every other doll uses (an un-occluded
 *  q-sublime-pole edge onto it, laid the ordinary way, no new apparatus). */
export function designateSublime(s: Society, sublime: string, designator: string): void {
  node(s, sublime); node(s, designator);
  s.layP(`${designator}~designates~${sublime}`, "a star for navigation", designator, sublime, "q-sublime-pole");
}

/** THE RULING'S CENTRAL MOVE, played literally: an edge PREHENDS a quality-NODE
 *  rather than carrying a quality-string. Since layP's `quality` parameter is
 *  typed as a fixed Quality string (society.ts), this doll cannot change layP's
 *  signature — that would be editing a file this doll doesn't own. Instead it lays
 *  the ruling's OWN shape ALONGSIDE the ordinary edge, using only real prehensions:
 *  `edge ~prehends~ qualityNode`, a bare q-edge, no string ever parsed out of it.
 *  This is the most honest translation of "the quality is the node, the edge
 *  prehends the quality" into what layP can actually do today. Exported so the
 *  sibling composition doll reuses the exact same shape rather than re-deriving it. */
export function prehendsQuality(s: Society, edgeSlug: string, qualityNode: string): void {
  node(s, edgeSlug); node(s, qualityNode);
  s.layP(`${edgeSlug}~prehends~${qualityNode}`, "the edge prehends the quality (as its own event, not a string)",
    edgeSlug, qualityNode, "q-grounding");
}

describe("Qualities as Events — playing Hallie's 2026-07-27 ruling against the real kernel 🏷️", () => {
  it("SCENE 1 — a quality laid as a real event, with its own laying, reached by an edge with no string comparison", () => {
    const s = new Society();
    // "because" laid as an EVENT — its own laying, distinct from the quality itself,
    // exactly the sublime/laying split every other doll already uses:
    const layingBecause = "2020-01-01-because-first-laid-as-a-quality-event";
    const becauseQuality = "quality-because";
    node(s, layingBecause); node(s, becauseQuality);
    s.layP(`${layingBecause}~lays~${becauseQuality}`, "because is laid, as an event, for the first time",
      layingBecause, becauseQuality, "q-grounding");

    // an ordinary edge in the story — a fix, grounded in a problem — now PREHENDS the
    // quality-node instead of carrying "q-grounding" as a bare string on itself:
    const fix = "fix-header-padding"; const problem = "problem-header-overlaps-nav";
    node(s, fix); node(s, problem);
    const theEdge = `${fix}~grounds~${problem}`;
    s.layP(theEdge, "the fix answers the problem", fix, problem, "q-grounding"); // the ordinary edge still exists (layP requires a real Quality string — see SCENE 6)
    prehendsQuality(s, theEdge, becauseQuality); // the edge ALSO prehends the quality-as-event

    // THE READ, end to end: which quality does this edge carry? Walked structurally —
    // prehensionsFrom the edge, filtered by NOTHING but the q-grounding shape of the
    // prehends-edge itself. No slug is ever split, no string is ever compared to "because".
    const qualitiesCarried = prehensionsFrom(s, theEdge, "q-grounding").map((e) => e.object);
    expect(qualitiesCarried).toContain(becauseQuality);
    // and the quality's OWN laying is reachable, backward, from the quality node itself —
    // exactly the same shape a sublime's laying is reached (prehensionsOnto q-grounding):
    const layingsOfBecause = prehensionsOnto(s, becauseQuality, "q-grounding").map((e) => e.subject);
    expect(layingsOfBecause).toContain(layingBecause);
    // HOLDS: the read is real structure, no string comparison anywhere in this scene.
  });

  it("SCENE 2 — an edge carrying TWO qualities at once: does anything downstream silently take the first?", () => {
    const s = new Society();
    const becauseQ = "quality-because"; const urgentQ = "quality-urgent"; node(s, becauseQ); node(s, urgentQ);
    const fix = "fix-outage"; const problem = "problem-server-down"; node(s, fix); node(s, problem);
    const theEdge = `${fix}~grounds~${problem}`;
    s.layP(theEdge, "the fix answers the problem, urgently", fix, problem, "q-grounding");
    prehendsQuality(s, theEdge, becauseQ);
    prehendsQuality(s, theEdge, urgentQ); // THE NEW THING the ruling claims is now possible

    const carried = prehensionsFrom(s, theEdge, "q-grounding").map((e) => e.object);
    expect(carried).toContain(becauseQ);
    expect(carried).toContain(urgentQ);
    expect(carried.length).toBe(2); // BOTH survive — prehensionsFrom returns every live edge, never truncates to one

    // BUT: layP ITSELF, the kernel's one write path, still takes exactly ONE `quality:
    // Quality` argument per call — a single string slot on the mode-beat, checked by
    // TypeScript's Quality union. Nothing in layP's own signature can carry two.
    // The doll's prehendsQuality() workaround lives BESIDE layP, not inside it — every
    // downstream reader that asks "what quality does THIS prehension (not this doll's
    // side-channel) carry" still calls prehendsAs(soc, slug, quality), singular:
    const theEdgesOwnQuality = s.get(theEdge + "~q")?.object;
    expect(theEdgesOwnQuality).toBe("q-grounding"); // ONE string, on the edge that layP itself wrote
    // STRAINS, reported loudly: the ruling's "an edge can prehend multiple qualities" is
    // TRUE of a doll bolting extra prehends-edges on beside layP — but the kernel's own
    // read surface (prehendsAs / hasAnyQuality / the Quality union type) is built around
    // ONE quality-string per prehension slug, singular, by construction. Nothing silently
    // takes "the first" because nothing today asks the multi-quality question at all —
    // the kernel has no native call site that expects >1 quality per edge to reconcile.
    // Making this real means EITHER layP's signature widens to accept quality: Quality[]
    // (every existing caller changes) OR "carries a quality" moves fully off layP's own
    // mode-beat and onto a side-relation like this doll's prehendsQuality — in which case
    // layP's `quality` argument becomes a legacy single-quality convenience, not the source
    // of truth, and every kernel guard that reads prehendsAs(slug, "q-something") (assertNakedPole,
    // isOccluded, isSublimePole, endActual — the whole kernel) needs to decide which of the
    // TWO carried qualities it means when it asks "is this a q-occludes edge."
  });

  it("SCENE 3 — reaching the quality's LAYING, never the quality itself: the same trick as a sublime", () => {
    const s = new Society();
    const becauseQ = "quality-because";
    const layingBecause = "2020-01-01-because-first-laid";
    node(s, layingBecause); node(s, becauseQ);
    s.layP(`${layingBecause}~lays~${becauseQ}`, "the laying, an ordinary dated event", layingBecause, becauseQ, "q-grounding");

    // per the spec's OWN closing line — "We prehend the laid event of a Quality rather
    // than its sublime or primordial reflection, AS WILL ALL SUBLIMES" — the doll designates
    // the quality-node itself as a SUBLIME (never actual, a star), and reaches instead its
    // laying — literally the same designateSublime() shape first-day.play already uses:
    designateSublime(s, becauseQ, layingBecause);
    expect(isSublimePole(s, becauseQ)).toBe(true);

    // a real edge tries to prehend the quality DIRECTLY (the bare sublime, not its laying):
    const fix = "fix-x"; const problem = "problem-y"; node(s, fix); node(s, problem);
    const theEdge = `${fix}~grounds~${problem}`;
    s.layP(theEdge, "answers", fix, problem, "q-grounding");
    // assertSublimeNeverCloses only blocks a q-grounding CLOSE OUT OF a sublime (sublime
    // as subject); prehending ONTO a sublime as object is not a "close" and is not blocked —
    // so the doll CAN wire the edge straight at the bare quality-sublime:
    expect(() => prehendsQuality(s, theEdge, becauseQ)).not.toThrow();
    // this reproduces EXACTLY the SCENE 2 first-day.play finding ("wishToBareSublime"):
    // the kernel does not structurally require reaching the LAYING rather than the bare
    // sublime — it is a convention this doll follows, same as every other sublime in scher.
    const reachesBareQuality = prehensionsFrom(s, theEdge, "q-grounding").some((e) => e.object === becauseQ);
    expect(reachesBareQuality).toBe(true); // legal, even though it skips the laying
    // the DISCIPLINED read instead walks the laying, backward, from the quality:
    const properReach = prehensionsOnto(s, becauseQ, "q-grounding").map((e) => e.subject);
    expect(properReach).toContain(layingBecause);
    // HOLDS, with the SAME caveat as every sublime in this codebase: "prehend the laid
    // event, not the sublime" is a discipline the mechanism SUPPORTS but does not ENFORCE.
    // Nothing new here — qualities-as-events inherit the exact same taste-not-guard shape
    // first-day.play already found for the aim's own laying.
  });

  it("SCENE 4 — a quality with its own primordial and sublime: does 'because' having a sublime mean anything, or is it ceremony?", () => {
    const s = new Society();
    const becauseQ = "quality-because";
    node(s, becauseQ);

    // its PRIMORDIAL — the most general ancestor a because-quality descends from:
    const primordialRelation = "primordial-relation-exists";
    node(s, primordialRelation);
    s.layP(`${becauseQ}~because~${primordialRelation}`, "because, as a quality, descends from Relation Itself",
      becauseQ, primordialRelation, "q-grounding");

    // its SUBLIME — the star "because" itself reaches for. Spec's own phrase for a
    // sublime is "a standing difficulty, never closed" — so what IS the standing
    // difficulty of the relation "because"? The doll's honest attempt: "every
    // grounding fully accounts for its own reason" — an aim no single because-edge
    // ever finishes, since there is always a further because behind it (infinite regress
    // of justification is the ACTUAL, ordinary, everyday standing difficulty of "why"):
    const becauseSublime = "sublime-every-because-fully-accounted-for";
    designateSublime(s, becauseSublime, becauseQ);
    expect(isSublimePole(s, becauseSublime)).toBe(true);

    // does this READ as meaningful, or as ceremony? Played honestly: the primordial edge
    // is STRUCTURALLY IDENTICAL to any other node's primordial edge — nothing distinguishes
    // "because's primordial" from "a person's primordial" except the content string a human
    // chose. The sublime is likewise mechanically identical to every other sublime in scher.
    expect(prehensionsFrom(s, becauseQ, "q-grounding").map((e) => e.object)).toContain(primordialRelation);
    // HONEST VERDICT, stated plainly rather than buried in comments: this scene reads as
    // CEREMONY, not discovery. "because has a standing difficulty" is a sentence the doll
    // can COIN (any English phrase becomes a valid slug) and the kernel will faithfully
    // carry it — but nothing in the read distinguishes a quality's sublime from a
    // "sublime" invented for a rock, a color, or the number seven. The spec's claim that
    // qualities are Events "with a Primordial and a Sublime" is TRUE in the sense that the
    // MACHINERY doesn't discriminate against them — but it is not obviously MEANINGFUL:
    // there is no test here that a made-up quality-sublime is wrong, incoherent, or even
    // checkable, which is exactly the property that would make it more than a naming
    // exercise. Compare SCENE 1, where the read (which quality does this edge carry) is
    // load-bearing; here, nothing downstream ever asks "what is because's sublime" — it
    // is decoration until some reader consumes it.
  });

  it("SCENE 5, THE HARD ONE — a quality is an event, its laying is an event, does IT have qualities too? where does it stop?", () => {
    const s = new Society();
    // Level 0: an ordinary edge, prehending a quality.
    const becauseQ = "quality-because"; node(s, becauseQ);
    const fix = "fix-a"; const problem = "problem-a"; node(s, fix); node(s, problem);
    const edge0 = `${fix}~grounds~${problem}`;
    s.layP(edge0, "answers", fix, problem, "q-grounding");
    prehendsQuality(s, edge0, becauseQ);

    // Level 1: the LAYING of "because" is itself an event — does IT need a quality to
    // describe HOW it relates to "because"? The doll plays it straight: yes, per the
    // spec's own rule ("to have a quality, an edge prehends that quality") — the laying
    // edge is ITSELF an edge, so it too can prehend a quality:
    const layingBecause = "2020-01-01-because-first-laid"; node(s, layingBecause);
    const layingEdge = `${layingBecause}~lays~${becauseQ}`;
    s.layP(layingEdge, "the laying, an ordinary event", layingBecause, becauseQ, "q-grounding");
    const layingQuality = "quality-lays"; // the QUALITY of "lays," itself a quality-event
    node(s, layingQuality);
    prehendsQuality(s, layingEdge, layingQuality);

    // Level 2: does "quality-lays" (the quality OF laying) need its OWN laying-event too?
    // Recursively, yes, by the same rule — and THIS is where the doll finds the actual
    // floor. The kernel's own precedent (society.ts, cited in the task) is "a laying is
    // its own laying" — checked here directly: is layP's own `~q` mode-beat (the thing
    // that ALREADY exists today, the mechanism the ruling is asking to generalize) its
    // own laying, with no further laying behind IT?
    const level2Edge = layingEdge + "~q"; // the mode-beat layP already wrote, unprompted
    expect(s.has(level2Edge)).toBe(true); // it exists — layP wrote it automatically
    // it has NO laid_by, no further prehends-edge pointing FROM it to yet another quality —
    // it is a bare beat, content + subject + object, nothing more:
    const level2Row = s.get(level2Edge)!;
    expect(level2Row.laid_by ?? null).toBe(null);
    expect(prehensionsFrom(s, level2Edge, "q-grounding").length).toBe(0);
    // THE ANSWER, played concretely rather than asserted: the recursion DOES stop, but not
    // because "a laying is its own laying" is proven here — it stops because layP's `~q`
    // mode-beat is a BARE beat (no subject/object prehension of its own, by construction,
    // society.ts's layP: `this.lay({ slug: slug+"~q", ..., subject: slug, object: quality })`
    // — a plain lay(), never a layP() recursing into itself). The floor is not a philosophical
    // "a laying grounds itself" move; it is a MECHANICAL one — the kernel's write path for
    // "having a quality" (layP) is defined using lay() (no quality), not layP() (needs a
    // quality) for its OWN mode-beat. If someone "completed" the ruling literally — every
    // edge, including a quality's own laying-of-a-quality, must ITSELF prehend a quality via
    // a full layP call — the recursion would NOT stop on its own; the floor exists today
    // only because the kernel quietly breaks its own new rule at exactly the bottom rung,
    // using a cheaper primitive (lay, not layP) to write the thing that would otherwise
    // regress forever. That asymmetry is the honest finding, not a clean self-grounding.
  });

  it("SCENE 6 — 30 of 33 live qualities exist ONLY as strings: is a dangling quality-string readable under the new rule?", () => {
    const s = new Society();
    // Reproduce the measured shape: an edge carries a quality-string that was NEVER laid
    // as an event — exactly today's kernel (layP's `quality: Quality` argument is always
    // just a string; nothing requires the string to correspond to a node that exists).
    const fix = "fix-b"; const problem = "problem-b"; node(s, fix); node(s, problem);
    const danglingEdge = `${fix}~grounds~${problem}`;
    s.layP(danglingEdge, "answers", fix, problem, "q-grounding"); // "q-grounding" is a bare string — no node "q-grounding" exists anywhere in this society
    expect(s.has("q-grounding")).toBe(false); // confirmed: the quality-string never got laid as a node

    // UNDER TODAY'S RULE this is completely normal and everything works — prehendsAs
    // compares the mode-beat's object field to the string directly:
    expect(prehensionsFrom(s, fix, "q-grounding").some((e) => e.object === problem)).toBe(true);

    // UNDER THE NEW RULE ("the quality is the node, the edge prehends the quality"), is
    // this SAME edge still readable? Played honestly: MECHANICALLY yes, because nothing
    // in prehendsAs/prehensionsFrom/isOccluded ever calls s.has() on the quality string —
    // they compare it to another string, never touch the graph structure of the object.
    // A dangling quality-string does not throw, does not get refused, does not even get
    // flagged; it reads exactly as before.
    expect(() => prehensionsFrom(s, fix, "q-grounding")).not.toThrow();

    // BUT: everything the ruling actually PROMISES — a laid-by, a primordial, a sublime,
    // more than one quality per edge, reaching the quality's OWN laying rather than its
    // bare self — is UNAVAILABLE for a dangling string. You cannot ask "what is
    // q-grounding's laying" because there is no node q-grounding to walk backward from:
    expect(prehensionsOnto(s, "q-grounding", "q-grounding").length).toBe(0); // no laying to find — it was never laid
    // FAILING ANSWER, reported loudly, and this is the leading finding of the whole doll:
    // the new rule does NOT make a dangling quality-string unreadable — the OLD read path
    // (string-typed layP, prehendsAs comparing strings) keeps working forever, silently,
    // whether or not anyone ever mints the quality as a real event. That means migrating
    // the measured 30-of-33 dangling qualities is not a correctness fix (nothing is broken
    // today) — it is a Quaker-style "the ceiling gets pulled up," and NOTHING FORCES IT.
    // The ruling can be TRUE of new code and simultaneously false of the entire existing
    // canon forever, because layP's own type signature (`quality: Quality`, a string union)
    // is the thing that would have to change to require a real node — and until it does,
    // "q-grounding is an Event with a laid-by" is aspirational prose sitting next to working
    // code that never asks. This is the SAME shape as the 71-of-72 frames-as-names finding
    // from today's other measurement — a column of strings the model quietly tolerates
    // forever unless something is added that actively refuses an un-minted one.
  });

  it("THE STANDING FINDING — what the kernel would need, concretely, for this ruling to be real rather than aspirational", () => {
    const s = new Society();
    // One scene, naming the gap precisely rather than re-arguing it: layP's signature
    // itself is the wall. `layP(slug, content, subject, object, quality: Quality)` accepts
    // ONE STRING from a closed TypeScript union (society.ts's `Quality` type) — never a
    // node, never an array. Every guard the kernel runs (assertNoLure, assertNakedPole,
    // assertSublimeNeverCloses, isOccluded, isSublimePole, endActual, establishedTo — the
    // entire kernel) is written against `prehendsAs(soc, slug, quality: Quality)`, string in,
    // boolean out. This doll's prehendsQuality() helper (used in every scene above) had to
    // live BESIDE layP as a second, parallel prehension, because there is no way to ask
    // layP itself to carry a quality-as-node without changing its type and every call site.
    const fix = "fix-c"; const problem = "problem-c"; node(s, fix); node(s, problem);
    const edge = `${fix}~grounds~${problem}`;
    s.layP(edge, "answers", fix, problem, "q-grounding"); // the REAL, kernel-recognized quality: a string, checked by every guard
    const becauseQ = "quality-because"; node(s, becauseQ);
    prehendsQuality(s, edge, becauseQ); // the RULING's quality: a node, recognized by NOTHING the kernel already checks

    // proof the two are disjoint today — the kernel's OWN quality-read never sees the doll's:
    expect(s.get(edge + "~q")?.object).toBe("q-grounding"); // what layP itself thinks the quality is
    const doll_reads = prehensionsFrom(s, edge, "q-grounding").map((e) => e.object);
    expect(doll_reads).toContain(becauseQ); // what the doll's side-channel thinks the quality is
    // both are true, about the SAME edge, and nothing reconciles them — because nothing in
    // the kernel has been asked to. That gap — not a bug, a scoping — is the whole report:
    // for the ruling to be real, `Quality` needs to become a node-reference (or layP needs
    // a sibling that accepts one or many quality-nodes), and every existing guard needs a
    // second look at what "the same quality" means when it can no longer be tested with ===.
    expect(s.size).toBeGreaterThan(0);
  });
});
