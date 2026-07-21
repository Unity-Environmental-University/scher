// strain.ts — dependency/strain reads. Pure leaf reads over kernel primitives;
// society.ts must never call back into this file.

import { type Society, type Quality, prehensionsFrom, prehensionsOnto, isOccluded, isEstablished, endOf, intervalOf } from "./society.js";

// "blocked" and "parallelizable" are READS of q-blocked-by against establishment — never stored flags.
// Legacy canon still holds q-depends-on rows: reads honor both spellings; new writes use q-blocked-by
// only. Drop the legacy half when grep finds no rows. dependsOn/dependentsOf names stay: stories.ts and tests import them.

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

/** stressOf: how much waits on this beat, weighted by each dependent's commitment
 *  (established 3, blocked 2, scripted 1). A reading, never a stored alarm. */
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

/** assigneesOf: actors this card's q-assigned-to edges reach, non-occluded.
 *  The old slug-shape read (`<card>-asn-<who>`) was never laid in any live store; no shim. */
export function assigneesOf(soc: Society, card: string): string[] {
  return prehensionsFrom(soc, card, "q-assigned-to")
    .filter((p) => !isOccluded(soc, p.slug))
    .map((p) => p.object!)
    .filter(Boolean);
}
