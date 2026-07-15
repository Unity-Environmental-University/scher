// ─────────────────────────────────────────────────────────────────────────────
// strain.ts — dependency/strain reads, cut out of society.ts (2026-07-15,
// separation-of-concerns pass). Pure leaf reads over the kernel's establishment
// and quality primitives (prehensionsFrom/Onto, isOccluded, isEstablished) —
// nothing here is called back into by society.ts itself. Moved, not rebranded:
// every name, doc-comment, and TODO below is unchanged from its home in
// society.ts; only the file boundary is new.
// ─────────────────────────────────────────────────────────────────────────────

import { type Society, type Quality, prehensionsFrom, prehensionsOnto, isOccluded, isEstablished, endOf, intervalOf } from "./society.js";

// ── DEPENDENCY / STRAIN READS ──────────────────────────────────────────────────
// One structural edge — q-blocked-by (RENAMED from q-depends-on, Hallie, 2026-07-15:
// "depends on is too close to need to drift and we need the language to be the
// language") — read in several directions. "blocked" and "parallelizable" are NOT
// stored flags; they are READINGS of blocked-by against establishment (and, like every
// read here, against a moment via asOf). The law: one edge, many reads; never store the
// derived. A dep that establishes stops blocking the instant it does, with no write —
// because blocked was never a fact, only a reading.
//
// BOTH-SPELLINGS WINDOW (dated 2026-07-15): live canon carries exactly 2 legacy
// q-depends-on rows. Append-only means that ink stays — so every read below honors
// EITHER spelling. New writes must use q-blocked-by only; q-depends-on is retired ink,
// not a live grammar choice. Drop the q-depends-on half of these reads once no legacy
// row remains (a greppable fact, same exit shape as pathosOf's).
//
// FUNCTION-NAME HANDOFF (deliberately NOT renamed this pass): dependsOn/dependentsOf
// keep their names. dependsOn is imported by stories.ts (not this file's to edit —
// one-file-one-agent) and by test/depends.test.ts + test/drop.test.ts (outside item 3's
// scope, the only test-editing door this pass opened). Renaming the function here would
// break both without my being able to repair them. Reasoned deferral, not an oversight:
// "the language to be the language" is satisfied by the quality-string rename above;
// dependsOn is an English verb phrase, not a q- spelling echo, so it doesn't carry the
// same drift risk. stories.ts's own agent can pick up blockedBy/blockersOf (or keep
// dependsOn) with full context once it follows this rename through.

/** dependsOn: the beats this one is waiting ON (its blockers) — the q-blocked-by edges
 *  FROM this beat (this beat as subject), plus legacy q-depends-on rows (both-spellings
 *  window, see above). Non-superseded, as of a moment. */
export function dependsOn(soc: Society, beat: string, asOf?: number): string[] {
  const fresh = prehensionsFrom(soc, beat, "q-blocked-by", asOf);
  const legacy = prehensionsFrom(soc, beat, "q-depends-on", asOf);
  return [...fresh, ...legacy]
    .filter((p) => !isOccluded(soc, p.slug, asOf))
    .map((p) => p.object!).filter(Boolean);
}

/** dependentsOf: the beats waiting on THIS one — the BACKWARD read (this beat as object).
 *  "who is blocked because of me." The mirror dependsOn couldn't see. Reads both
 *  spellings (both-spellings window, see above). */
export function dependentsOf(soc: Society, beat: string, asOf?: number): string[] {
  const fresh = prehensionsOnto(soc, beat, "q-blocked-by", asOf);
  const legacy = prehensionsOnto(soc, beat, "q-depends-on", asOf);
  return [...fresh, ...legacy]
    .filter((p) => !isOccluded(soc, p.slug, asOf))
    .map((p) => p.subject!).filter(Boolean);
}

/** blockedOnNow: of this beat's dependencies, the ones NOT yet established — the live
 *  blockers. Blocked is a reading, not a stored state: a dep that's established no longer
 *  blocks. Empty ⇒ not blocked. */
export function blockedOnNow(soc: Society, beat: string, asOf?: number): string[] {
  // TODO(socratic): should blockedOnNow skip occluded dependencies, or is checking only for establishment the right filter?
  return dependsOn(soc, beat, asOf).filter((d) => !isEstablished(soc, d, asOf));
}

/** isBlocked: the boolean companion — any live (unestablished) dependency remains. */
export function isBlocked(soc: Society, beat: string, asOf?: number): boolean {
  return blockedOnNow(soc, beat, asOf).length > 0;
}

/** parallelizable: not blocked AND not yet established — work that could start right now. */
export function parallelizable(soc: Society, beat: string, asOf?: number): boolean {
  return !isBlocked(soc, beat, asOf) && !isEstablished(soc, beat, asOf);
}

/** whoWaitsOn: alias of dependentsOf in intention — "waiting on me" — kept as a named
 *  read because the views ask the question in those words. */
export function whoWaitsOn(soc: Society, beat: string, asOf?: number): string[] {
  return dependentsOf(soc, beat, asOf);
}

/** stressOf: a beat's blast-radius — how much waits on it, weighted by the dependents'
 *  own commitment (established counts most, then blocked, then merely scripted). A
 *  high-stress beat is one whose slipping hurts a lot of committed work. (the strain
 *  channel: the algedonic signal made a reading, not a stored alarm.) */
export function stressOf(soc: Society, beat: string, asOf?: number): { count: number; weight: number; dependents: string[] } {
  const dependents = dependentsOf(soc, beat, asOf);
  // TODO(socratic): why weight 3-2-1 for established-blocked-scripted — what changes if I used other ratios, and how would I know the right one?
  const weight = dependents.reduce((w, d) => w + (isEstablished(soc, d, asOf) ? 3 : isBlocked(soc, d, asOf) ? 2 : 1), 0);
  return { count: dependents.length, weight, dependents };
}

/** grounded_by / excluded_by: WHO grounded/excluded — the subject (frame) of each
 *  grounding/exclusion prehension. Frame-on-grounding, read client-side. */
export function groundedBy(soc: Society, beat: string): string[] {
  // TODO(socratic): should these functions pass asOf so they can show the state as-of-a-moment, or is "now" the only sensible frame for showing who grounded something?
  return prehensionsOnto(soc, beat, "q-grounding").map((p) => p.subject!).filter(Boolean);
}
export function excludedBy(soc: Society, beat: string): string[] {
  // TODO(socratic): should these functions filter out occluded groundings/exclusions, or is the raw list (including superseded) what the caller wants?
  return prehensionsOnto(soc, beat, "q-exclusion").map((p) => p.subject!).filter(Boolean);
}

/** distance-to-HEA: how far the frame's End is from being established. `realized` is
 *  true when the End beat is itself established; `remaining` is how many interior beats
 *  are still scripted (ungrounded). */
export function distanceToHEA(soc: Society, frameOnce: string, end?: string): { realized: boolean; remaining: number; total: number } {
  // TODO(socratic): the fallback to `${frameOnce}-end` — if endOf returns null, should distanceToHEA error, or is a constructed slug a reasonable default?
  const theEnd = end ?? endOf(soc, frameOnce) ?? `${frameOnce}-end`;
  const interior = intervalOf(soc, frameOnce, theEnd).filter((b) => b !== frameOnce && b !== theEnd);
  const remaining = interior.filter((b) => !isEstablished(soc, b)).length;
  // the End is "realized" when it is itself established (an actual met the HEA).
  const realized = isEstablished(soc, theEnd);
  return { realized, remaining, total: interior.length };
}

// ── ITHACA-REQUIRED READS (ported from vendored scher copy, promoted into the package) ──

/** assigneesOf: who is assigned to a card — the actor beats its q-assigned-to prehensions reach.
 *  Reads the quality grammar (card --q-assigned-to--> actor), non-occluded, returns the actor
 *  beat slugs. (2026-07-03: the old slug-shape read (`<card>-asn-<who>`, 'actor-' prefix strip)
 *  was checked against every live store — gen3.beat, canon.event, the prehension graphs — and
 *  had never once been laid; the q-assigned-to quality edges are what real writers actually lay.
 *  The old TODO-socratic questions here asked exactly this; the record answered. No shim for the
 *  never-used grammar: break forward.) */
export function assigneesOf(soc: Society, card: string): string[] {
  return prehensionsFrom(soc, card, "q-assigned-to")
    .filter((p) => !isOccluded(soc, p.slug))
    .map((p) => p.object!)
    .filter(Boolean);
}
