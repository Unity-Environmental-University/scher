// sublimes.ts — sublime-DAG reads: bearings, service chains, path-to-sublime.
// Depends only on kernel reads from society.ts.

import { type Society, type EventRow, prehensionsFrom, prehensionsOnto, isOccluded, isSublimePole, isStory, endOf, intervalOf, contentBeats, endActual } from "./society.js";

// ── SUBLIME READS ────────────────────────────────────────────────────────────
// Sublimes are never-closing poles. They orient events via because-edges
// (bearings) but never lure.

/** bearingsOf: because-edges ONTO this event whose subject is a sublime — the
 *  bearings it sails under. Charge-direction law (2026-07-20): the abiding thing
 *  is the subject — subject=sublime, object=story/event, uniformly. Do not flip back. */
export function bearingsOf(soc: Society, event: string, asOf?: number): EventRow[] {
  return prehensionsOnto(soc, event, "because", asOf).filter(
    (p) => !isOccluded(soc, p.slug, asOf) && isSublimePole(soc, p.subject, asOf),
  );
}

/** storyBearingsOf: bearings inherited via story membership. Membership is
 *  betweenness, never a stored edge: `s` contains `beat` iff beat is in
 *  intervalOf(s, endOf(s)). Union over containing stories, deduped by sublime. */
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
      if (bearing.subject && !seen.has(bearing.subject)) {
        seen.add(bearing.subject);
        out.push(bearing);
      }
    }
  }
  return out;
}

/** voltageTowardSublime: count of non-occluded because-edges FROM this sublime.
 *  Unlike an End-pole's charge, this never discharges. Direction law (2026-07-20):
 *  the abiding thing is the subject — reads FROM the sublime, not onto it. */
export function voltageTowardSublime(soc: Society, sublime: string, asOf?: number): number {
  return prehensionsFrom(soc, sublime, "because", asOf).filter((p) => !isOccluded(soc, p.slug, asOf)).length;
}

// ── SUBLIME CHAINING: sublimes serve sublimes. B ~because~ A means A is in
// service of B (B prehends A; same subject law). Cycles are LAWFUL in the
// sublime layer (2026-07-20 ruling) — every climb here MUST stay cycle-safe.

/** serviceChainOf: all sublimes this one transitively serves, excluding itself.
 *  The seen-set is REQUIRED: sublime cycles are lawful, so an unguarded climb
 *  will not terminate. Occlusion-aware via bearingsOf. */
export function serviceChainOf(soc: Society, sublime: string, asOf?: number): string[] {
  const seen = new Set<string>([sublime]);
  const out: string[] = [];
  const stack = [sublime];
  while (stack.length) {
    const n = stack.pop()!;
    for (const b of bearingsOf(soc, n, asOf)) {
      const next = b.subject!;
      if (!seen.has(next)) {
        seen.add(next);
        out.push(next);
        stack.push(next);
      }
    }
  }
  return out;
}

/** reachedSublimesOf: every sublime an event sails under — direct bearings plus
 *  everything those transitively serve. Deduplicated; cycle-safe. */
export function reachedSublimesOf(soc: Society, event: string, asOf?: number): string[] {
  const direct = bearingsOf(soc, event, asOf).map((b) => b.subject!);
  const all = new Set<string>(direct);
  for (const s of direct) {
    for (const up of serviceChainOf(soc, s, asOf)) all.add(up);
  }
  return [...all];
}

// ── PATH TO SUBLIME: a navigable spine of segments from a starting event to a
// sublime target, reporting reachability and whether the path is established
// (q-grounding) or forward (bearings).

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

/** pathToSublime: the reachability chain from start to sublime. Tries
 *  q-grounding first (established=true); falls back to because-edges
 *  (established=false). Empty segments iff unreachable either way. */
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

    // Direction law (2026-07-20): the sublime is the subject, so climbing
    // toward it means following `.subject`, not `.object`.
    const bearings = bearingsOf(soc, current, asOf);
    for (const bearing of bearings) {
      const next = bearing.subject!;
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

// ── FALLEN STAR: a designation alone is not conduct (Hallie's ruling, 2026-07-21) ──

/** FallenReason: a promise a designated sublime has broken. Empty list = still a star. */
export type FallenReason = "closed" | "charges-nothing" | "orphaned";

/** fallenStarOf: which promises a designated sublime has broken. Non-sublime input
 *  returns [] (not a star at all, not fallen). See each reason below for the kernel
 *  read chosen. */
export function fallenStarOf(soc: Society, sublime: string, asOf?: number): FallenReason[] {
  if (!isSublimePole(soc, sublime, asOf)) return [];
  const reasons: FallenReason[] = [];

  // closed: the sublime's own pole reads as an actual End. Sublimes never close by
  // the guard, but a designation can still be read this way if the kernel ever says so.
  if (endActual(soc, sublime, asOf)) reasons.push("closed");

  // charges-nothing: no un-occluded because-edge FROM the sublime onto anything —
  // same subject-edge family as bearingsOf/voltageTowardSublime, from its own side.
  if (voltageTowardSublime(soc, sublime, asOf) === 0) reasons.push("charges-nothing");

  // orphaned: no sublime<->sublime bearing either direction. RULED
  // (ruling-one-constellation): new constellations are impossible — no exemption,
  // fires regardless of whether any other sublime exists.
  {
    // as subject: sublime prehends another sublime (chains up, "sublime serves").
    const asSubject = prehensionsFrom(soc, sublime, "because", asOf).some(
      (p) => !isOccluded(soc, p.slug, asOf) && isSublimePole(soc, p.object, asOf),
    );
    // as object: bearingsOf already restricts to subjects that are sublimes.
    const asObject = bearingsOf(soc, sublime, asOf).length > 0;
    if (!asSubject && !asObject) reasons.push("orphaned");
  }

  return reasons;
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
