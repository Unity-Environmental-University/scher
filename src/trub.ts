// trub.ts — trub reads: log (past) fixed by hook (future) via q-fixes (subject=hook,
// object=log). Ruling: Hallie, 2026-07-21 (ruling-trub-pair-q-fixes). planned-vs-fixed
// is isEstablished on the grounding story, not read here; q-resolves stays dead.

import {
  type Society,
  prehensionsOnto,
  prehensionsFrom,
  isOccluded,
  isSublimePole,
  hasAnyQuality,
} from "./society.js";

export const Q_FIXES = "q-fixes";

/** isTrubLog: is `beat` a trub log — does some un-occluded q-fixes prehension
 *  land on it? A todo grounded in a past event via plain because stays a todo;
 *  only q-fixes makes it a trub log. */
export function isTrubLog(soc: Society, beat: string, asOf?: number): boolean {
  return prehensionsOnto(soc, beat, Q_FIXES, asOf).some((p) => !isOccluded(soc, p.slug, asOf));
}

/** trubHooksOf: the hooks fixing this log — subjects of the un-occluded q-fixes
 *  prehensions onto it. */
export function trubHooksOf(soc: Society, log: string, asOf?: number): string[] {
  return prehensionsOnto(soc, log, Q_FIXES, asOf)
    .filter((p) => !isOccluded(soc, p.slug, asOf))
    .map((p) => p.subject!)
    .filter(Boolean);
}

// WISH READ (seam, confessed): same face-prefix discipline as gen4-policy's
// is_wish_shaped — one vocabulary until trubness matures into a structural read.
const WISH_PREFIXES = ["User Story:", "Story:", "Wish:", "Sublime:", "Wonder:"];

/** isWishShaped: does this beat's title (or content, if no title) start with a
 *  wish face-prefix? Text-shaped, not structural — see the seam note above. */
function isWishShaped(soc: Society, slug: string): boolean {
  const b = soc.get(slug);
  if (!b) return false;
  const text = b.title ?? b.content;
  if (!text) return false;
  const trimmed = text.trim();
  return WISH_PREFIXES.some((p) => trimmed.startsWith(p));
}

/** isWish: a node counts as a wish if it is a designated sublime-pole, or if its
 *  text is wish-shaped (see isWishShaped). */
function isWish(soc: Society, node: string, asOf?: number): boolean {
  return isSublimePole(soc, node, asOf) || isWishShaped(soc, node);
}

/** trubHookIsAngry: cycle-safe climb (seen-set — because-cycles are lawful); true
 *  iff it never reaches a wish via grounding, holding, or End-pole hops. */
export function trubHookIsAngry(soc: Society, hook: string, asOf?: number): boolean {
  const seen = new Set<string>([hook]);
  const stack = [hook];
  while (stack.length) {
    const n = stack.pop()!;
    if (isWish(soc, n, asOf)) return false;

    const next: string[] = [];

    // (a) forward grounding
    for (const p of prehensionsFrom(soc, n, "q-grounding", asOf)) {
      if (!isOccluded(soc, p.slug, asOf) && p.object) next.push(p.object);
    }

    // (b) bare edges onto n (no quality at all) — things holding it, or its End
    // charging it.
    for (const p of soc.edgesOntoObject(n)) {
      if (p.subject === null) continue;
      if (p.slug.endsWith("~q")) continue;
      if (isOccluded(soc, p.slug, asOf)) continue;
      if (hasAnyQuality(soc, p.slug, asOf)) continue;
      next.push(p.subject);
    }

    // (c) End-pole hop: node designated by an un-occluded q-end-pole prehension
    for (const p of prehensionsOnto(soc, n, "q-end-pole", asOf)) {
      if (!isOccluded(soc, p.slug, asOf) && p.subject) next.push(p.subject);
    }

    for (const m of next) {
      if (isWish(soc, m, asOf)) return false;
      if (!seen.has(m)) {
        seen.add(m);
        stack.push(m);
      }
    }
  }
  return true;
}
