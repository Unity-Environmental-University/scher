// ─────────────────────────────────────────────────────────────────────────────
// qualities-composed.play.test.ts — Hallie's mid-task EXTENSION to the qualities
// ruling (2026-07-27), played the same honest way as its sibling, qualities.play:
//
//   "Also this way we can chain quality effects. Make a new quality and have it
//   prehend other qualities? Like & types. Honestly qualities is pretty much our
//   type system, but it only applies to relationships."
//
// If a quality is an event (qualities.play's premise), it can ALSO prehend other
// qualities — a composite quality IS its parts, discovered by walking, never
// declared. That would make the quality vocabulary an intersection type system for
// EDGES specifically (nodes stay untyped; only relationships carry structure).
//
// This doll plays five scenes: a composed quality discovered purely by walking (7),
// the REAL live-canon case of q-end-pole/q-now-pole/q-sublime-pole sharing nothing
// today, checked against scher-core's is_any_pole (8), the q-depends-on/q-blocked-by
// rename that composition might have made unnecessary (9), depth and cycles (10),
// and the honest limit of what this buys as a type system (11).
//
// SIBLING: qualities.play.test.ts plays the base ruling (qualities as events, one
// quality per edge, laid-by/sublime/primordial) — read it first; this doll reuses
// its prehendsQuality() helper rather than re-deriving the same shape.
//
// Run: cd scher && npx vitest run qualities-composed.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom } from "../src/society.js";
import { node } from "../src/play.js";
import { prehendsQuality } from "./qualities.play.test.js";

/** COMPOSITION, played the same shape as prehendsQuality one level up: a quality-node
 *  ITSELF prehends other quality-nodes ("& types" — Hallie, mid-task). A composite
 *  quality carries no content of its own beyond the two (or more) it prehends; whether
 *  it IS both is answered only by walking, never by a stored flag. */
function composedOf(s: Society, compositeQuality: string, ...parts: string[]): void {
  node(s, compositeQuality);
  for (const part of parts) {
    node(s, part);
    s.layP(`${compositeQuality}~prehends~${part}`, "the composite quality prehends a part",
      compositeQuality, part, "q-grounding");
  }
}

/** discover, purely by walking, every quality (composite or bare) that `edgeSlug`
 *  effectively carries — one hop of the edge's own prehends-edges, then one hop of
 *  EACH quality's own composedOf prehends-edges. Two hops, no more: this is the
 *  literal depth SCENE 10 tests, not an assumed-unbounded walk. */
function qualitiesCarriedByWalk(s: Society, edgeSlug: string): string[] {
  const direct = prehensionsFrom(s, edgeSlug, "q-grounding").map((e) => e.object!);
  const out = new Set<string>();
  for (const q of direct) {
    out.add(q);
    for (const part of prehensionsFrom(s, q, "q-grounding").map((e) => e.object!)) out.add(part);
  }
  return [...out];
}

describe("Composed qualities — 'quality is our type system, but only for relationships' 🧩", () => {
  it("SCENE 7 — a COMPOSED quality: can a reader discover BOTH underlying qualities by walking alone?", () => {
    const s = new Society();
    // a composite quality that prehends two ordinary ones — "grounded AND blocking":
    const groundingQ = "quality-grounding"; const blockedByQ = "quality-blocked-by";
    const groundedBlocker = "quality-grounded-blocker"; // the composite
    composedOf(s, groundedBlocker, groundingQ, blockedByQ);

    // an edge in the story prehends ONLY the composite — never groundingQ or blockedByQ
    // directly. Nothing in this test's SETUP names either underlying quality on the edge:
    const wish = "wish-vendor-integration"; const fix = "fix-vendor-outage"; node(s, wish); node(s, fix);
    const theEdge = `${wish}~grounds~${fix}`;
    s.layP(theEdge, "the wish is grounded in, and blocked by, the fix", wish, fix, "q-grounding");
    prehendsQuality(s, theEdge, groundedBlocker);

    // THE WALK, cold — a reader who has never heard of "quality-grounded-blocker" before,
    // asking only "what does this edge carry, fully expanded": one hop to the composite,
    // one more hop through the composite's OWN prehensions to its parts:
    const discovered = qualitiesCarriedByWalk(s, theEdge);
    expect(discovered).toContain(groundedBlocker); // the composite itself, found directly
    expect(discovered).toContain(groundingQ);       // its FIRST part, found by walking ONE further hop
    expect(discovered).toContain(blockedByQ);       // its SECOND part, likewise — composition, not a single string
    // HOLDS, and this is the real result: qualitiesCarriedByWalk never had to be TOLD
    // "quality-grounded-blocker decomposes into grounding+blocked-by" — it discovered it
    // by walking prehensionsFrom twice, generically, the same call for any composite.
    // Composition is NOT decorative here — a reader with zero prior knowledge of this
    // specific composite recovers both parts using only the walk. The caveat, stated
    // plainly: the walk above is hard-coded to TWO hops (one for the edge, one for the
    // quality). A composite that itself prehends ANOTHER composite (three qualities
    // deep) would need the walk to recurse — untested here on purpose; see SCENE 10.
  });

  it("SCENE 8, THE REAL CASE — q-end-pole, q-now-pole, q-sublime-pole as three qualities sharing a composed q-pole", () => {
    const s = new Society();
    // MEASURED on the live canon: q-end-pole (612 rows), q-now-pole (286), and
    // q-sublime-pole are all "pole-ness with a variation," but as FLAT STRINGS today
    // they share nothing structurally — asking "is this any kind of pole" means naming
    // all three by hand (which is exactly what scher-core's is_any_pole does, in Rust,
    // by enumeration: `is_designated_end_pole(...) || is_now_pole(...)`, and even THAT
    // enumeration — read in poles.rs — deliberately EXCLUDES is_sublime_pole, a second,
    // separate hand-picked decision layered on top of the first).
    const polenessQ = "quality-pole"; // the shared composite ALL THREE would prehend
    const endPoleQ = "quality-end-pole-composed";
    const nowPoleQ = "quality-now-pole-composed";
    const sublimePoleQ = "quality-sublime-pole-composed";
    composedOf(s, endPoleQ, polenessQ);
    composedOf(s, nowPoleQ, polenessQ);
    composedOf(s, sublimePoleQ, polenessQ);

    // three DIFFERENT edges in the story, each prehending its OWN specific pole-quality,
    // never the shared "quality-pole" directly:
    const anEnd = "end-of-some-story"; const aNow = "now-of-some-story"; const aSublime = "some-sublime";
    const wishA = "wish-a"; const wishB = "wish-b"; const wishC = "wish-c";
    node(s, wishA); node(s, wishB); node(s, wishC); node(s, anEnd); node(s, aNow); node(s, aSublime);
    const edgeEnd = `${wishA}~designates~${anEnd}`; s.layP(edgeEnd, "designates an End-pole", wishA, anEnd, "q-end-pole"); prehendsQuality(s, edgeEnd, endPoleQ);
    const edgeNow = `${wishB}~designates~${aNow}`; s.layP(edgeNow, "designates a Now-pole", wishB, aNow, "q-now-pole"); prehendsQuality(s, edgeNow, nowPoleQ);
    const edgeSubl = `${wishC}~designates~${aSublime}`; s.layP(edgeSubl, "designates a sublime-pole", wishC, aSublime, "q-sublime-pole"); prehendsQuality(s, edgeSubl, sublimePoleQ);

    // "IS THIS ANY KIND OF POLE" — asked ONCE, generically, walking to the shared
    // composite, never naming end/now/sublime by name in the QUESTION itself:
    function isAnyKindOfPoleByWalk(edge: string): boolean {
      return qualitiesCarriedByWalk(s, edge).includes(polenessQ);
    }
    expect(isAnyKindOfPoleByWalk(edgeEnd)).toBe(true);
    expect(isAnyKindOfPoleByWalk(edgeNow)).toBe(true);
    expect(isAnyKindOfPoleByWalk(edgeSubl)).toBe(true);
    // a non-pole edge does NOT walk to the composite — the walk discriminates for real:
    const ordinaryEdge = "wish-d~grounds~fix-d"; node(s, "wish-d"); node(s, "fix-d");
    s.layP(ordinaryEdge, "an ordinary grounding, no pole at all", "wish-d", "fix-d", "q-grounding");
    expect(isAnyKindOfPoleByWalk(ordinaryEdge)).toBe(false);

    // DOES COMPOSITION REPLACE scher-core's is_any_pole, OR MERELY DUPLICATE IT? Answered
    // honestly: is_any_pole (scher-core/src/poles.rs:142) is `is_designated_end_pole(...)
    // || is_now_pole(...)` — a hand-written Rust OR over TWO named predicates, and it
    // deliberately EXCLUDES is_sublime_pole (poles.rs's own comment explains why: a
    // sublime is terminal too but was never at risk of the specific nested-pole bug
    // is_any_pole guards against — a DOMAIN reason, not a naming accident). Composition
    // as played here is STRICTLY MORE GENERAL: `isAnyKindOfPoleByWalk` above answers
    // "is this a pole of ANY kind, including sublime" in ONE generic walk, with NO
    // per-kind Rust function to write or maintain — adding a fourth pole kind later
    // means one composedOf() call, not a new `is_designated_fourth_pole` plus editing
    // is_any_pole's OR-chain by hand. It would NOT be a pure duplicate: today's
    // enumeration encodes a real domain decision (exclude sublime) that composition, if
    // adopted, would have to make EXPLICIT as "sublime doesn't compose with quality-pole"
    // rather than implicit-by-omission — arguably a clarity WIN, since the omission in
    // poles.rs currently needs a paragraph of comment to justify, and a composition graph
    // would just show the missing edge.
  });

  it("SCENE 9, THE SECOND REAL CASE — q-depends-on/q-blocked-by, one relation in two spellings: does composition dissolve the need for renames?", () => {
    const s = new Society();
    // MEASURED: q-depends-on (24 rows, legacy) and q-blocked-by (23 rows, current) are
    // ONE relation under two names — edge_word.rs calls it, in its own comment, a
    // "both-spellings window" from the 2026-07-15 rename, and hard-codes BOTH strings
    // into becauseEdgesFrom's quality-enumeration loop so neither spelling goes unread.
    const blockedByQ = "quality-blocked-by"; // the CURRENT spelling, as a quality-event
    const dependsOnQ = "quality-depends-on"; // the LEGACY spelling, as a quality-event

    // UNDER COMPOSITION: is the legacy spelling a quality that simply PREHENDS the
    // current one — "depends-on IS blocked-by, plus nothing else"? Played directly:
    composedOf(s, dependsOnQ, blockedByQ);

    // an OLD edge, laid under the legacy spelling before the 2026-07-15 rename:
    const wish = "wish-legacy"; const fix = "fix-legacy"; node(s, wish); node(s, fix);
    const oldEdge = `${wish}~blocked-by~${fix}`;
    s.layP(oldEdge, "an old edge, laid under the legacy spelling", wish, fix, "q-blocked-by"); // kernel's layP still needs a real Quality string; reuse q-blocked-by as the closest legal stand-in
    prehendsQuality(s, oldEdge, dependsOnQ); // but the DOLL marks it as carrying the LEGACY quality-event

    // a reader asking "is this edge blocked-by, in the CURRENT sense" walks straight
    // through the composite, exactly like SCENE 8's pole walk — no rename needed to
    // answer the question, because the legacy quality's OWN prehension IS the answer:
    const carries = qualitiesCarriedByWalk(s, oldEdge);
    expect(carries).toContain(dependsOnQ);
    expect(carries).toContain(blockedByQ); // discovered THROUGH the legacy quality, not by renaming the edge
    // HONEST ANSWER, leading: composition would NOT force a choice between "rename the
    // 24 legacy rows" and "hard-code both spellings forever" — a THIRD option opens: lay
    // ONE quality-event ("depends-on") that composedOf()-prehends the other
    // ("blocked-by"), and every future reader that only knows to ask for "blocked-by"
    // finds legacy rows too, by walking, with ZERO edits to the 24 old rows and ZERO
    // per-caller enumeration of both spellings. That IS a real result: this specific
    // rename (and the "both-spellings window" it left as permanent debt in edge_word.rs)
    // would not have needed to happen at all under composition — the two spellings could
    // have coexisted, related by ONE quality-prehends-quality edge, forever, with old
    // code and new code both reading correctly without either being told about the other.
  });

  it("SCENE 10 — DEPTH AND CYCLES: a quality that prehends itself (through another), and whether the walk terminates", () => {
    const s = new Society();
    // a straightforward chain, three deep, to see how far a NAIVE (unbounded) walk goes
    // before this doll's own two-hop qualitiesCarriedByWalk stops seeing further:
    const q1 = "quality-chain-1"; const q2 = "quality-chain-2"; const q3 = "quality-chain-3";
    composedOf(s, q2, q1); composedOf(s, q3, q2);
    const wish = "wish-chain"; const fix = "fix-chain"; node(s, wish); node(s, fix);
    const chainEdge = `${wish}~grounds~${fix}`;
    s.layP(chainEdge, "chained composition, three deep", wish, fix, "q-grounding");
    prehendsQuality(s, chainEdge, q3);
    // qualitiesCarriedByWalk is DELIBERATELY two hops (edge→quality, quality→part) — it
    // finds q3 (hop 1) and q2 (hop 2, q3's own part), but NOT q1 (would need a THIRD hop,
    // q2's own part) — this is the walk's actual, honest depth, not an assumed one:
    const shallow = qualitiesCarriedByWalk(s, chainEdge);
    expect(shallow).toContain(q3);
    expect(shallow).toContain(q2);
    expect(shallow).not.toContain(q1); // the naive two-hop walk stops here — a silent depth limit, not a designed one

    // a GENERIC, UNBOUNDED walk (the honest version, tracking `seen` like routesTo does)
    // to answer "does it terminate, diverge, or silently return wrong":
    function allQualitiesUnbounded(edgeSlug: string, seen = new Set<string>()): Set<string> {
      const found = new Set<string>();
      for (const e of prehensionsFrom(s, edgeSlug, "q-grounding")) {
        const q = e.object!;
        if (seen.has(q)) continue; // CYCLE GUARD — same shape as routesTo's `seen`
        seen.add(q); found.add(q);
        for (const nested of allQualitiesUnbounded(q, seen)) found.add(nested);
      }
      return found;
    }
    const deep = allQualitiesUnbounded(chainEdge);
    expect(deep.has(q1)).toBe(true); // WITH a seen-guard and real recursion, all three levels ARE reachable
    expect(deep.has(q2)).toBe(true);
    expect(deep.has(q3)).toBe(true);

    // NOW THE CYCLE, laid deliberately: qA prehends qB, qB prehends qA right back:
    const qA = "quality-cycle-a"; const qB = "quality-cycle-b";
    node(s, qA); node(s, qB);
    s.layP(`${qA}~prehends~${qB}`, "A prehends B", qA, qB, "q-grounding");
    s.layP(`${qB}~prehends~${qA}`, "B prehends A right back", qB, qA, "q-grounding"); // the cycle
    const cycleEdge = "wish-cyc~grounds~fix-cyc"; node(s, "wish-cyc"); node(s, "fix-cyc");
    s.layP(cycleEdge, "carries a cyclic composite", "wish-cyc", "fix-cyc", "q-grounding");
    prehendsQuality(s, cycleEdge, qA);

    // does allQualitiesUnbounded (WITH its seen-guard) terminate on a real cycle?
    const cyclic = allQualitiesUnbounded(cycleEdge);
    expect(cyclic.has(qA)).toBe(true);
    expect(cyclic.has(qB)).toBe(true); // both found — the cycle is walked exactly once each, not infinitely

    // THE HONEST FINDING: it terminates ONLY because this doll wrote a `seen`-guard by
    // hand (the same discipline routesTo already uses in play.ts) — nothing in layP,
    // prehensionsFrom, or the Quality type itself refuses a cyclic prehends-edge, checks
    // for one, or warns about one. `qualitiesCarriedByWalk` (the doll's OWN naive,
    // fixed-two-hop helper used in scenes 7–9) has NO seen-guard at all; on a two-cycle
    // (qA↔qB) it would not infinite-loop only because it is HARD-CODED to stop at two
    // hops — an accident of how shallow the helper was written, not a property of the
    // grammar. A THIRD helper, written naively with unbounded recursion and no seen-set,
    // WOULD diverge (stack overflow) on exactly the qA/qB pair built above. This is the
    // worst-outcome risk Hallie named: not that composition fails loudly, but that most
    // naive implementations either silently truncate (this doll's own two-hop helper) or
    // silently hang — cycle-safety must be added by every walker, same as routesTo already
    // does for why-chains; the kernel offers no guard of its own for quality-composition,
    // the exact same gap this doll's other scenes found for laid-by, order, and dangling
    // strings.
  });

  it("SCENE 11 — THE HONEST LIMIT: what does prehension give this 'type system' for free, and what can it never express?", () => {
    const s = new Society();
    // FOR FREE, demonstrated above and summarized here rather than re-tested:
    // - INTERSECTION (SCENE 7): a composite quality prehending N parts IS discoverable
    //   as carrying all N, by walking — this is a real AND.
    // - a form of SUBSUMPTION/inheritance (SCENE 8): three specific pole-qualities each
    //   prehending one shared quality-pole makes "is a pole of any kind" answerable
    //   without naming every subtype — structurally close to a supertype/interface.
    // - DEDUPLICATION OF RENAMES (SCENE 9): two spellings of one relation can coexist
    //   related by a single prehends-edge instead of a hard rename + dual-read window.

    // WHAT IT CANNOT EXPRESS, played concretely rather than merely asserted:

    // (a) NEGATION — "this edge carries q-grounding but is NOT urgent." Prehension only
    // ever states POSITIVE membership (an edge onto a quality); there is no native "an
    // edge does NOT prehend X" fact to walk TO — absence is read by testing prehensions
    // and finding none, which is a different (and weaker) thing than a first-class
    // negative fact that itself could be composed with others:
    const groundingQ = "quality-grounding"; node(s, groundingQ);
    const wish = "wish-neg"; const fix = "fix-neg"; node(s, wish); node(s, fix);
    const edge = `${wish}~grounds~${fix}`;
    s.layP(edge, "grounded, not urgent", wish, fix, "q-grounding"); prehendsQuality(s, edge, groundingQ);
    // "not urgent" is only ever an ABSENCE — checked, never itself a walkable node:
    const urgentQ = "quality-urgent";
    expect(prehensionsFrom(s, edge, "q-grounding").map((e) => e.object)).not.toContain(urgentQ);
    // there is no "quality-NOT-urgent" node this doll could compose urgentQ's negation
    // INTO another composite with — negation isn't a value the grammar can hold and pass
    // around; it can only be the shape of a question a reader happens to ask.

    // (b) UNION as a first-class VALUE (as opposed to intersection): SCENE 8 built "is a
    // pole of any kind" as a reader-side OR over walk results (`.includes(polenessQ)`),
    // never as a single quality-node that itself MEANS "end-pole OR now-pole." Composition
    // as played here always narrows (a composite IS its parts, conjunctively) — there is
    // no dual operator that lets one quality-node stand for "either of these," reusable
    // as an object other edges could then also compose against uniformly:
    const eitherPoleKind = "quality-either-pole-kind"; node(s, eitherPoleKind);
    // nothing STOPS naming this node, but nothing in the grammar makes prehending IT mean
    // "carries end-pole OR now-pole" rather than "carries this specific third thing" —
    // the union semantics would have to live entirely in a reader's convention, unchecked:
    expect(s.has(eitherPoleKind)).toBe(true); // the SLUG exists; the semantics do not

    // (c) CONSTRAINTS/refinement types — "q-blocked-by, but only when the blocking fix's
    // End-pole is still open" — cannot be expressed as a quality at all; it needs a
    // predicate over OTHER nodes' state (endActual elsewhere in the graph), which no
    // quality-node, however composed, can encode; it stays a function a reader calls,
    // never a fact the edge itself carries.

    // THE LEADING LINE FOR THE REPORT: prehension gives real, working INTERSECTION
    // (AND) and a workable SUBSUMPTION shape, for free, by walking. It gives NO native
    // negation, NO first-class union (only reader-side OR over walk results), and NO
    // constraint/refinement types — those would all need machinery (a second edge
    // quality meaning "NOT," a distinct union-marking convention enforced by a guard, or
    // a predicate language over graph state) that does not exist today and is not implied
    // by "an edge can prehend multiple qualities." Composition genuinely buys AND; it
    // does not, by itself, buy a type system — it buys half of one.
    expect(s.size).toBeGreaterThan(0);
  });
});
