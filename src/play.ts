// ─────────────────────────────────────────────────────────────────────────────
// play.ts — the doll primitives. The shared toys every *.play.test.ts re-derived.
//
// Twelve dolls each hand-rolled succeeds / heads / routesTo / occlude. The queries say
// reuse what exists; this mints them once, plainly, so a doll is mostly its STORY, not its
// plumbing. Every relation is a real prehension; slugs stay opaque (no string-matching).
//
// A doll built on these reads like the history it models:
//   succeeds(s, heir, parent)   — the crown/idea/branch passes (a commit on the line)
//   heads(s, root)              — the live tip(s); >1 = a fork (succession war)
//   occlude(s, target, by)      — a named event shadows a member (frame-scoped, reversible)
//   why(s, from, aim) / routesTo — the why, and whether it reaches V=0
// ─────────────────────────────────────────────────────────────────────────────

import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "./society.js";

// TODO(socratic): a single module-level counter shared by every Society — is a doll's history really self-contained if its edge ids depend on which other dolls ran first in the process?
let _n = 0;
/** an opaque id — carries no meaning; structure lives in the edges, never the slug. */
export function pid(): string { return "n" + (_n++); }

export function node(s: Society, slug: string): void {
  if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null });
}

/** `heir` succeeds `parent` — inherits and revises it (a commit on the line of crown/idea/branch).
 *  A real q-succeeds prehension; the parent stays an honored ancestor. The line is the chain of these. */
export function succeeds(s: Society, heir: string, parent: string): void {
  node(s, heir); node(s, parent);
  s.layP(pid() + "-succ", `${heir} succeeds ${parent}`, heir, parent, "q-succeeds");
}

/** the live HEAD(s) of the line from `root`: members on the chain that nothing live succeeds.
 *  One tip = a clean line; more than one = a fork (a schism / succession war). Reads q-succeeds. */
export function heads(s: Society, root: string): string[] {
  // TODO(socratic): the header vows "slugs stay opaque (no string-matching)" — is composing `slug + "~q"` here reading structure from edges, or smuggling the ~q convention in through a name?
  const isSucc = (slug: string) => s.get(slug + "~q")?.object === "q-succeeds";
  const on = new Set<string>([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const b of s.all()) {
      if (isSucc(b.slug) && b.object && on.has(b.object) && b.subject && !on.has(b.subject) && !isOccluded(s, b.slug)) {
        on.add(b.subject); grew = true;
      }
    }
  }
  // TODO(socratic): occlusion silences the succession EDGE but never the member itself — if `root` or a tip is an occluded node, should it still be crowned a live HEAD, and whose frame decided?
  return [...on].filter((m) =>
    !s.all().some((b) => isSucc(b.slug) && b.object === m && !isOccluded(s, b.slug)));
}

/** every heir that q-succeeds `parent` (the children of a node on the line; >1 = a fork). */
export function heirsOf(s: Society, parent: string): string[] {
  return prehensionsOnto(s, parent, "q-succeeds").filter((e) => !isOccluded(s, e.slug)).map((e) => e.subject!);
}

/** a named event `by` occludes `target` — casts q-occludes over it. Frame-scoped, reversible,
 *  agent-named. (Used for a banished claim, a hidden truth, a branch read out of one frame's light.) */
export function occlude(s: Society, target: string, by: string): void {
  node(s, by);
  s.layP(pid() + "-occ", `${by} occludes ${target}`, by, target, "q-occludes");
}

/** is `target` occluded right now? (a thin re-export so dolls need only import from play.) */
export function occluded(s: Society, target: string): boolean { return isOccluded(s, target); }

/** `from` happens SO THAT `aim` can be — a why: the aim stands as an End-pole of
 *  `from`'s happening (q-end-pole, the structural future-because; there is no luring
 *  verb — q-lure killed with fire, Hallie 2026-07-06: it smuggled an agent and could
 *  not state its own direction). */
export function why(s: Society, from: string, aim: string): void {
  node(s, from); node(s, aim);
  s.layP(pid() + "-why", `${from} so that ${aim}`, from, aim, "q-end-pole");
}

/** does `start` reach `target` by live End-pole-ward hops? (the why-circuit, walked — does it reach V=0?) */
export function routesTo(s: Society, start: string, target: string, seen = new Set<string>()): boolean {
  // TODO(socratic): `start === target` says a why-circuit of length zero always closes — is every event trivially its own aim, or should reaching V=0 require at least one live why-edge?
  if (start === target) return true;
  if (seen.has(start)) return false;
  seen.add(start);
  return prehensionsFrom(s, start, "q-end-pole")
    .filter((e) => !isOccluded(s, e.slug))
    .some((e) => e.object != null && routesTo(s, e.object, target, seen));
}

/** every member that q-feels onto `event` (a reading-of, a splinter-of, a witness) — live only. */
export function feltOnto(s: Society, event: string): string[] {
  // TODO(socratic): heirsOf, feltOnto, and the occlusion-filtered map differ only in quale — is this the same read wanting to converge into one `liveOnto(s, event, quale)`?
  return prehensionsOnto(s, event, "q-feel").filter((e) => !isOccluded(s, e.slug)).map((e) => e.subject!);
}
