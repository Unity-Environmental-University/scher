// ─────────────────────────────────────────────────────────────────────────────
// sublimes.ts — the sublime-DAG reads (bearings, service chains, path-to-sublime),
// cut out of society.ts (2026-07-15, separation-of-concerns pass). Depends only
// on the kernel's isSublimePole/isStory/endOf/intervalOf/isOccluded/prehensions*.
// Moved, not rebranded — names and doc-comments unchanged from their home in
// society.ts; only the file boundary is new.
// ─────────────────────────────────────────────────────────────────────────────

import { type Society, type EventRow, prehensionsFrom, prehensionsOnto, isOccluded, isSublimePole, isStory, endOf, intervalOf, contentBeats } from "./society.js";

// ── SUBLIME READS (2026-07-06 sublimes-store design) ─────────────────────────────
// Sublimes are never-closing poles that ORGANIZE pursuit without luring. They orient
// events via because-edges (bearings). The reads here measure voltage-toward and
// trace inherited bearings through story membership.

/** bearingsOf: all because-edges FROM this event TO any sublime-pole, as of a moment.
 *  These are the bearings (orientations) the event sails under. A bare because-edge
 *  (`event ~because~ sublime`) is pure orientation, not establishment. Occluded bearings
 *  are filtered out. */
export function bearingsOf(soc: Society, event: string, asOf?: number): EventRow[] {
  return prehensionsFrom(soc, event, "because", asOf).filter(
    (p) => !isOccluded(soc, p.slug, asOf) && isSublimePole(soc, p.object, asOf),
  );
}

/** storyBearingsOf: bearings inherited via story membership. Membership is betweenness,
 *  never a stored edge (the settled gen3 law — see dropStory/place in stories.ts): a
 *  story stands as its OWN Once (the pole law, 2026-07-06), so a story `s` contains
 *  `beat` iff `beat` falls in intervalOf(s, endOf(s)) — the causal diamond between the
 *  story and its End. For every content beat that is a story and contains `beat` this
 *  way, climb to that story's Once (the story itself) and return its bearings — the
 *  because-edges from the story to sublime-poles. If `beat` is in multiple stories'
 *  intervals, union the inherited bearings, deduplicated by sublime-pole (a beat should
 *  not double-count a star it reaches via two containing stories). Empty if the beat is
 *  not in any story's interval. */
export function storyBearingsOf(soc: Society, beat: string, asOf?: number): EventRow[] {
  const seen = new Set<string>();
  const out: EventRow[] = [];
  for (const b of contentBeats(soc)) {
    const story = b.slug;
    if (!isStory(soc, story)) continue;
    const end = endOf(soc, story);
    if (!end) continue;
    const interior = intervalOf(soc, story, end);
    if (!interior.includes(beat)) continue;
    for (const bearing of bearingsOf(soc, story, asOf)) {
      if (bearing.object && !seen.has(bearing.object)) {
        seen.add(bearing.object);
        out.push(bearing);
      }
    }
  }
  return out;
}

/** voltageTowardSublime: count of non-occluded bare prehensions onto this sublime,
 *  as of a moment. This is the sublime's "charge" — attraction without actualization.
 *  Unlike charge on an End-pole (which discharges when the pole closes), a sublime's
 *  voltage accumulates forever, never exhausted. */
export function voltageTowardSublime(soc: Society, sublime: string, asOf?: number): number {
  return prehensionsOnto(soc, sublime, "because", asOf).filter((p) => !isOccluded(soc, p.slug, asOf)).length;
}

// ── SUBLIME CHAINING (Hallie's extension, 2026-07-06): sublimes serve sublimes ───
// A sublime-pole may be the SUBJECT of a bearing edge, not only the object:
// sublime-A ~because~ sublime-B means A sails under B — A is IN SERVICE OF B. Sublimes
// form a DAG of stars (the-plan-reads-itself → nothing-unheard → people-are-not-grey-goo),
// kept acyclic by assertSublimeAcyclic. bearingsOf already works on a sublime as subject
// (it returns the sublimes IT serves — free, no new read). The reads here climb UP the DAG.

/** serviceChainOf: the sublimes this sublime serves, transitively — every sublime-pole
 *  reachable UP the because-DAG from this one (the why-behind-the-why). Excludes the
 *  sublime itself. Cycle-safe (reuses a seen-set); occlusion-aware via bearingsOf. */
export function serviceChainOf(soc: Society, sublime: string, asOf?: number): string[] {
  const seen = new Set<string>([sublime]);
  const out: string[] = [];
  const stack = [sublime];
  while (stack.length) {
    const n = stack.pop()!;
    for (const b of bearingsOf(soc, n, asOf)) {
      const next = b.object!;
      if (!seen.has(next)) {
        seen.add(next);
        out.push(next);
        stack.push(next);
      }
    }
  }
  return out;
}

/** reachedSublimesOf: every sublime-pole an event ultimately sails under — its DIRECT
 *  bearings PLUS everything those bearings transitively serve up the DAG (the full
 *  why-behind-the-why for this event). An event bearing A inherits bearing toward
 *  everything A serves. Deduplicated; cycle-safe. */
export function reachedSublimesOf(soc: Society, event: string, asOf?: number): string[] {
  const direct = bearingsOf(soc, event, asOf).map((b) => b.object!);
  const all = new Set<string>(direct);
  for (const s of direct) {
    for (const up of serviceChainOf(soc, s, asOf)) all.add(up);
  }
  return [...all];
}

// ── PATH TO SUBLIME: reachability spine (sublime ingression navigation) ──────────
// pathToSublime constructs a navigable spine from a starting event/now toward a
// sublime-pole target: the sequence of poles (End-poles and sublime-poles) that
// stand between the start and the goal, plus the interval members within each
// segment. Returns the spine as a chain of segments (pole-to-pole + members), and
// reports whether the target is reachable and whether any segment required
// forward/scripted traversal (not just established reachability).

/** PathSegment: one link in the chain from start to sublime. */
export interface PathSegment {
  /** The pole we're starting from (Once/End/Sublime). */
  from: string;
  /** The pole we're heading toward. */
  to: string;
  /** The interval members between from and to (beats in the causal diamond). */
  members: string[];
}

/** PathToSublime: the reachability spine and its properties. */
export interface PathToSublime {
  /** Ordered segments from start → sublime. Empty if unreachable. */
  segments: PathSegment[];
  /** True iff the target sublime is reachable from fromNow. */
  reachable: boolean;
  /** True iff the entire path is established (all edges are behind readerNow's grounding);
   *  false iff any segment requires forward/scripted walk (not yet actual). */
  established: boolean;
}

/** pathToSublime: given a starting event/now and a sublime-pole target, return
 *  the reachability chain between them—the ordered poles and interval members
 *  that form a drawable spine from current position to the star.
 *
 *  ALGORITHM:
 *  1. First attempt: walk via q-grounding (established reachability via `reaches`).
 *     If the sublime is reachable this way, return the established path.
 *  2. If established reachability fails, attempt the bearing structure (forward reachability).
 *     Walk via because-edges (bearingsOf); sublimes are scripted (never close), so this
 *     finds the forward-looking path to them.
 *  3. Return the path (established or forward), or empty if unreachable either way.
 *
 *  The `established` flag reports whether the path is behind readerNow's grounding
 *  (all edges are q-grounding paths) or forward-walking (requires bearing structure). */
export function pathToSublime(soc: Society, fromNow: string, sublime: string, asOf?: number): PathToSublime {
  // Sanity check: is the target actually a sublime-pole?
  if (!isSublimePole(soc, sublime, asOf)) {
    return { segments: [], reachable: false, established: false };
  }

  // Helper: build path from parent map
  const buildPath = (parentMap: Map<string, string | null>, target: string): string[] => {
    const path: string[] = [];
    let current: string | null = target;
    while (current !== null) {
      path.unshift(current);
      current = parentMap.get(current) ?? null;
    }
    return path;
  };

  // Attempt 1: established reachability via q-grounding
  const establishedParents = new Map<string, string | null>();
  establishedParents.set(fromNow, null);
  const establishedQueue: string[] = [fromNow];
  let head = 0;
  let foundViaEstablished = false;

  while (head < establishedQueue.length && !foundViaEstablished) {
    const current = establishedQueue[head++]!;
    if (current === sublime) {
      foundViaEstablished = true;
      break;
    }

    // Walk q-grounding edges from current
    for (const p of prehensionsFrom(soc, current, "q-grounding", asOf)) {
      if (isOccluded(soc, p.slug, asOf)) continue;
      const next = p.object!;
      if (!establishedParents.has(next)) {
        establishedParents.set(next, current);
        establishedQueue.push(next);
      }
    }
  }

  if (foundViaEstablished) {
    const path = buildPath(establishedParents, sublime);
    const segments = buildSegments(soc, path);
    return { segments, reachable: true, established: true };
  }

  // Attempt 2: forward reachability via because-edges (bearings)
  const forwardParents = new Map<string, string | null>();
  forwardParents.set(fromNow, null);
  const forwardQueue: string[] = [fromNow];
  head = 0;
  let foundViaForward = false;

  while (head < forwardQueue.length && !foundViaForward) {
    const current = forwardQueue[head++]!;
    if (current === sublime) {
      foundViaForward = true;
      break;
    }

    // Walk because-edges (bearings) from current
    const bearings = bearingsOf(soc, current, asOf);
    for (const bearing of bearings) {
      const next = bearing.object!;
      if (!forwardParents.has(next)) {
        forwardParents.set(next, current);
        forwardQueue.push(next);
      }
    }
  }

  if (foundViaForward) {
    const path = buildPath(forwardParents, sublime);
    const segments = buildSegments(soc, path);
    return { segments, reachable: true, established: false };
  }

  // Neither path found the sublime
  return { segments: [], reachable: false, established: false };
}

/** buildSegments: helper to construct PathSegments from a pole sequence. */
function buildSegments(soc: Society, path: string[]): PathSegment[] {
  const segments: PathSegment[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]!;
    const to = path[i + 1]!;

    // Get interval members between from and to (if "from" is a story)
    let members: string[] = [];
    if (isStory(soc, from)) {
      const end = endOf(soc, from);
      if (end !== null) {
        members = intervalOf(soc, from, end).filter((m) => m !== from && m !== end);
      }
    }

    segments.push({ from, to, members });
  }
  return segments;
}
