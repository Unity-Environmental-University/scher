// ─────────────────────────────────────────────────────────────────────────────
// society.ts — the client-side Society: an append-only log of beats, not a
// key/value store. The only write is lay(); beats are never overwritten. Values
// aren't stored — they're read from the log (see the reads below: mode_at,
// confidence, …). State changes only by appending, and readers re-derive.
//
// Versioning, rollback, and audit are free, because they are what an append-only log
// IS. If you back this with a server, a Society is the local cone of the canon: what
// you've fetched plus what you've optimistically laid, reconciled out of band.
// ─────────────────────────────────────────────────────────────────────────────

import { Cell, type Read } from "./cell.js";

/** A beat. With subject+object it is a prehension (an edge). A quality beat (slug
 *  ending '~q', object a q-*) carries mode. */
export interface EventRow {
  slug: string;
  content: string;
  /** the BULLET — a short human headline, distinct from content (the notes). Render this as the
   *  scannable line; content is the foldable detail. (gen3.beat.title; the title-ratchet requires it
   *  on new human beats.) Optional: pre-title beats and auto edges have none. */
  title?: string | null;
  subject: string | null;
  object: string | null;
  /** when the local society witnessed this beat (the client's own db_witnessed). */
  witnessed?: number;
}

// The qualities the kernel itself branches behavior on — isOccluded/isGrounded/dependsOn/
// resolutionOf/endReached/reactionsOn/authorOf all key a real read off one of these literal
// strings (see the functions below). q-containment also lives here because
// assertNotMembershipContainment hardcodes it as a guard trip-wire. Everything else that has
// ever been a "quality" (q-shared, q-assigned-to, q-due, q-receives, q-succeeds, and any
// quality a caller invents, like a directional q-move-toward/q-move-away pair) rides through
// prehendsAs/prehensionsOnto/prehensionsFrom as a plain string comparison with no kernel
// branch — so it never needed to live in a closed union to be safe. (Committee, 2026-07-03:
// see docs/committees/2026-07-03-quality-extensibility.md — the closed union bought a
// typo-catcher for ~9 names, never a runtime gate; prehendsAs already accepts any string a
// caller casts through. Splitting it this way keeps that one real benefit — catching a
// typo'd q-groundng on a name the kernel actually reads — while letting new lateral
// qualities typecheck without editing this file.)
export type KernelQuality =
  | "q-grounding"
  | "q-lure"
  | "q-exclusion"
  | "q-utterance"
  | "q-feel"
  | "q-containment"
  | "q-depends-on"
  | "q-resolves"
  | "q-occludes"
  // graduated 2026-07-03: assigneesOf now reads this quality (it used to read a slug shape no
  // live store had ever laid — checked against gen3.beat, canon.event, the prehension graphs —
  // while real q-assigned-to edges existed). q-due stays lateral: real edges exist but no
  // kernel read branches on it yet; it graduates when one does.
  | "q-assigned-to";

/** The qualities a prehension can co-prehend (the mode it carries). KernelQuality for the
 *  names the kernel branches on, or any other string for a lateral/caller-defined quality
 *  (q-shared, q-assigned-to, q-due, q-receives, q-succeeds, or something new entirely). */
export type Quality = KernelQuality | (string & { readonly __quality?: never });

/** The mode a beat reads as. Derived, not stored. */
export type Mode = "established" | "scripted";

// ── DEPRECATE GUARD: membership is NOT containment ─────────────────────────────
// THE LAW: a beat's membership in a Story is its POSITION BETWEEN the Story's Once/End bounds —
// COMPUTED (intervalOf), CACHED if slow, CLEARLY DERIVED. It is NEVER a stored q-containment
// "inside" edge. q-containment is part/whole nesting only. Overloading it for membership
// corrupts every read that walks containment AND makes authored-containment indistinguishable
// from derived-membership the instant someone adds a real edge.
//
// This guard YELLS when q-containment is laid in the membership shape ('-in'/'@in' edges),
// so the error can't be made silently again. It does not block (won't break a running tool),
// it hollers — loudly, with the fix.
export function assertNotMembershipContainment(slug: string, quality: Quality): void {
  if (quality !== "q-containment") return;
  if (/(?:-in|@in)$/.test(slug)) {
    // eslint-disable-next-line no-console
    console.error(
      `[DEPRECATED] '${slug}' lays q-containment in the MEMBERSHIP shape. ` +
      `Membership is BETWEENNESS — computed from a Story's Once/End bounds (intervalOf), ` +
      `cached if slow, never a stored 'inside' edge. q-containment is part/whole nesting only. ` +
      `Remove this; read membership instead. (law: membership-is-betweenness)`,
    );
  }
}

// ── the society itself ───────────────────────────────────────────────────────

/** An append-only society of beats. The only write is lay(). `rev` rises on every
 *  append; a Cell over the society subscribes to it and re-reads when it changes. */
export class Society {
  readonly #beats = new Map<string, EventRow>();
  /** rev bumps on every genuine append; Cells subscribe to it to know to re-read. */
  readonly rev: Cell<number>;
  #clock = 0;

  constructor(seed: ReadonlyArray<EventRow> = []) {
    this.rev = new Cell(0);
    for (const b of seed) this.#insert(b);
  }

  // the one write. lay() of an existing slug is inert (ON CONFLICT DO NOTHING).
  // Beats are never overwritten; to undo, supersede with a new beat.
  #insert(b: EventRow): boolean {
    if (this.#beats.has(b.slug)) return false;
    // TODO(socratic): if the beat already exists, why return false instead of throw or at least log — is silent inertness the only semantics we want here?
    // ANSWERED(walk 2026-07-02): yes — inertness IS the append-only law (a lay of an existing slug is a no-op, mirrored by Postgres ON CONFLICT (slug) DO NOTHING); a re-lay is a normal, legal event (reload, double-fire), not an error, and the boolean already tells the caller which it was. — see the comment above / append-only law
    // The witnessing clock is monotone across BOTH explicit stamps and auto-stamps:
    // an explicitly-witnessed beat advances the clock so a later auto-stamp never
    // reuses (or precedes) a moment already witnessed. Without this, asOf reads lie.
    const witnessed = b.witnessed ?? this.#clock + 1;
    // TODO(socratic): is the default-witnessed clock-increment-then-assign the right order, or should auto-stamps lag behind explicit ones?
    this.#clock = Math.max(this.#clock, witnessed);
    this.#beats.set(b.slug, { ...b, witnessed });
    return true;
  }

  /** Lay a beat into the society (the only write). Returns true if it was a genuine
   *  append (new slug), false if inert (slug already present). */
  lay(b: EventRow): boolean {
    const appended = this.#insert(b);
    // TODO(socratic): should the rev bump happen inside #insert, or is keeping it here in lay() the right separation — does every caller need that granularity?
    if (appended) this.rev.set(this.rev.get() + 1);
    return appended;
  }

  /** Lay a prehension (an edge) co-prehending a quality. Lays the prehension and its
   *  '~q' mode-beat, so the reads below can see the mode. */
  // TODO(socratic): if the prehension slug is already present but its '~q' beat is not (or vice versa),
  // I lay only the missing half and report true — is a half-mode-carrying prehension a state I mean to
  // permit, or a corruption the append-only law just made unfixable?
  layP(slug: string, content: string, subject: string, object: string, quality: Quality): boolean {
    assertNotMembershipContainment(slug, quality);
    // TODO(socratic): does the quality belong in the '~q' beat's content (as "[${quality}]"), or is it already fully encoded by the object field?
    const a = this.lay({ slug, content, subject, object });
    const q = this.lay({ slug: slug + "~q", content: `${content} [${quality}]`, subject: slug, object: quality });
    // TODO(socratic): returning a || q means we report "appended" if either half is new — but if only the '~q' half lands (prehension already laid), did we really append a full prehension?
    return a || q;
  }

  /** Bulk-lay (e.g. a fetched canon, or a seed package). One rev bump for the batch. */
  layAll(beats: ReadonlyArray<EventRow>): void {
    let any = false;
    // TODO(socratic): why iterate through #insert directly instead of calling lay() for each, and lose the per-beat rev structure — is the assumption that bulk-lay is from a trusted source that never conflicts?
    for (const b of beats) any = this.#insert(b) || any;
    if (any) this.rev.set(this.rev.get() + 1);
  }

  get(slug: string): EventRow | undefined {
    return this.#beats.get(slug);
  }

  /** All beats (a snapshot; do not mutate). */
  all(): EventRow[] {
    return [...this.#beats.values()];
  }

  has(slug: string): boolean {
    return this.#beats.has(slug);
  }

  get size(): number {
    return this.#beats.size;
  }
}

// ── the reads (pure functions over the log) ──────────────
// Pure functions over the society's current beats; a Cell reads these. A content
// beat is a beat with subject===null and slug not
// ending '~q'. A prehension P co-prehends quality Q iff there's a beat `${P.slug}~q`
// whose object is Q.

// ── the witnessing axis ────────────────────────────────────────────────────────
// A read is "from a moment." `asOf` is a witnessed-clock value; a read AS OF t sees
// only beats witnessed at-or-before t. This is just the log truncated at t, re-read —
// because a society IS read from its log, "as of t" needs no new storage, only a
// filter. `asOf === undefined` means "now": no filter, the existing reads unchanged.
//
// This makes the time-relative read a property of the READS, not of the consumer: you
// never rebuild a society to ask "what did this read as, then." It also makes "git for
// meaning" literal — every read has an `@{time}`.

/** Was beat `b` witnessed at-or-before moment `asOf`? (undefined ⇒ always visible.) */
function visibleAt(b: EventRow, asOf?: number): boolean {
  // TODO(socratic): when b.witnessed is undefined, why default to 0 instead of treating it as error/unknown, or storing the clock value that was chosen at insert time?
  return asOf === undefined || (b.witnessed ?? 0) <= asOf;
}

/** Does prehension P co-prehend the given quality, as of a moment? Both the prehension
 *  and its `~q` mode-beat must be visible — a grounding doesn't count before its quality
 *  has landed. */
export function prehendsAs(soc: Society, pslug: string, quality: Quality, asOf?: number): boolean {
  const q = soc.get(pslug + "~q");
  return !!q && q.object === quality && visibleAt(q, asOf);
}

/** Every prehension reaching `beat` as object, co-prehending `quality`, as of a moment.
 *  Returns the prehension beats (whose `subject` is the frame/standpoint that laid it). */
export function prehensionsOnto(soc: Society, beat: string, quality: Quality, asOf?: number): EventRow[] {
  return soc.all().filter(
    (b) => b.object === beat && b.subject !== null && visibleAt(b, asOf) && prehendsAs(soc, b.slug, quality, asOf),
  );
}

/** Every prehension reaching OUT of `beat` as its SUBJECT, co-prehending `quality`, as of
 *  a moment. The mirror of prehensionsOnto: that read sees edges INTO a beat (beat as
 *  object); this one sees edges FROM a beat (beat as subject). A lateral relation (depends-on,
 *  assigned-to) is laid A→B, so it is only legible from A's side through a -From read. */
export function prehensionsFrom(soc: Society, beat: string, quality: Quality, asOf?: number): EventRow[] {
  return soc.all().filter(
    (b) => b.subject === beat && b.object !== null && visibleAt(b, asOf) && prehendsAs(soc, b.slug, quality, asOf),
  );
}

/** Is `target` OCCLUDED within this society, as of a moment? (Supersession, reframed —
 *  2026-06-26.) A member E of the society casts a q-occludes shadow over the member it
 *  prehends: E --q-occludes--> target. Unlike the old self-loop supersede, occlusion NAMES
 *  the occluder (subject=E), so the perished past gains depth (walk target ← q-occludes ← E
 *  = readable lineage). It is STANDPOINT-RELATIVE: `soc` IS the frame — `target` occluded in
 *  THIS society stands in full light in another. And it is EMERGENT/REVERSIBLE: un-occlusion
 *  needs no "occlude the occlusion" recursion — it is simply the absence of a live occluder
 *  (an occluder that is itself occluded does not count, one level, no cycle-guard needed).
 *
 *  As of an earlier moment, a not-yet-witnessed occlusion does not count — so an undo is itself
 *  a point on the trajectory, visible only after it lands. */
export function isOccluded(soc: Society, target: string, asOf?: number): boolean {
  // TODO(socratic): the b.subject !== target guard — why exclude self-occlusion (if that's even layable), and what does it mean if it were?
  return soc.all().some((b) =>
    b.object === target && b.subject !== null && b.subject !== target &&
    visibleAt(b, asOf) && prehendsAs(soc, b.slug, "q-occludes", asOf) &&
    // emergent un-occlusion: an occluder that is itself occluded casts no shadow (one level).
    !isOccluder(soc, b.slug, asOf));
}

/** Is this occlusion-prehension itself occluded (its occluder occluded)? One level only — by
 *  design there is no deep recursion: un-occlusion is the absence of a LIVE occluder, read fresh. */
function isOccluder(soc: Society, occludeEdge: string, asOf?: number): boolean {
  // TODO(socratic): why is this logic a separate function instead of inlined in isOccluded, and does "one level only" mean we never ask isOccluder recursively?
  return soc.all().some((b) =>
    b.object === occludeEdge && b.subject !== null && b.subject !== occludeEdge &&
    visibleAt(b, asOf) && prehendsAs(soc, b.slug, "q-occludes", asOf));
}

/** is_established, as of a moment: established iff some non-superseded grounding-prehension
 *  reaches it. Unchecking supersedes the grounding, so this re-reads as scripted; the
 *  grounding and its supersede both remain in the society. */
export function isEstablished(soc: Society, beat: string, asOf?: number): boolean {
  // TODO(socratic): why check isOccluded on the prehension slug (p.slug, the edge) instead of also checking if the prehension's subject (the grounding frame) is occluded?
  return prehensionsOnto(soc, beat, "q-grounding", asOf).some((p) => !isOccluded(soc, p.slug, asOf));
}

/** mode_at: the establishment-mode read of a beat, as of a moment (default: now). */
export function modeAt(soc: Society, beat: string, asOf?: number): Mode {
  return isEstablished(soc, beat, asOf) ? "established" : "scripted";
}

/** confidence: groundings / (groundings + exclusions), in [0,1], as of a moment. Every
 *  prehension counts 1; weighting can live elsewhere. */
// TODO(socratic): I return 0 both for "no evidence at all" and "unanimously excluded" — do those two
// readings deserve the same number, or is silence being made to wear condemnation's face?
export function confidence(soc: Society, beat: string, asOf?: number): number {
  // TODO(socratic): should I filter out occluded groundings/exclusions like isEstablished does, or is raw count the right measure?
  const g = prehensionsOnto(soc, beat, "q-grounding", asOf).length;
  const e = prehensionsOnto(soc, beat, "q-exclusion", asOf).length;
  if (g + e === 0) return 0;
  return g / (g + e);
}

// ── DEPENDENCY / STRAIN READS ──────────────────────────────────────────────────
// One structural edge — q-depends-on — read in several directions. "blocked" and
// "parallelizable" are NOT stored flags; they are READINGS of depends-on against
// establishment (and, like every read here, against a moment via asOf). The law: one
// edge, many reads; never store the derived. A dep that establishes stops blocking the
// instant it does, with no write — because blocked was never a fact, only a reading.

/** dependsOn: the beats this one is waiting ON (its blockers) — the q-depends-on edges
 *  FROM this beat (this beat as subject). Non-superseded, as of a moment. */
export function dependsOn(soc: Society, beat: string, asOf?: number): string[] {
  return prehensionsFrom(soc, beat, "q-depends-on", asOf)
    .filter((p) => !isOccluded(soc, p.slug, asOf))
    .map((p) => p.object!).filter(Boolean);
}

/** dependentsOf: the beats waiting on THIS one — the BACKWARD read (this beat as object).
 *  "who is blocked because of me." The mirror dependsOn couldn't see. */
export function dependentsOf(soc: Society, beat: string, asOf?: number): string[] {
  return prehensionsOnto(soc, beat, "q-depends-on", asOf)
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

/** pathos: the q-feel reactions on a beat — emoji + count + who. */
export interface Pathos {
  emoji: string;
  count: number;
  by: string[];
}
// TODO(socratic): I am the raw read "kept for back-compat" while reactionsOn (below) is the honest
// one — how long does a deprecated read get to keep counting un-reacted feels before a surface
// trusts the wrong number, and what would let me perish?
// ANSWERED(walk 2026-07-02): the code names its own exit — reactionsOn's doc says it is "the one a reacting surface should use"; pathosOf perishes the moment no caller remains, which is a greppable fact today, not a policy wait. — see reactionsOn's doc-comment below
export function pathosOf(soc: Society, beat: string): Pathos[] {
  const feels = prehensionsOnto(soc, beat, "q-feel");
  const byEmoji = new Map<string, Pathos>();
  for (const p of feels) {
    // TODO(socratic): what happens if p.content is not a single emoji, or contains whitespace within the emoji — does trim() on a multi-codepoint string work as intended?
    const emoji = p.content.trim();
    if (!emoji) continue;
    const cur = byEmoji.get(emoji) ?? { emoji, count: 0, by: [] };
    cur.count++;
    if (p.subject) cur.by.push(p.subject);
    byEmoji.set(emoji, cur);
  }
  // TODO(socratic): why sort by count descending, and should ties be broken by emoji value or by insertion order?
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}

/** reactionsOn: the q-feel reactions ON a beat, aggregated by emoji — the read paired with
 *  reactionStory. It is pathosOf with the SUPERSEDE GUARD: an un-react supersedes the q-feel
 *  beat (a self-loop), so a removed reaction must not linger. (pathosOf is the raw read kept
 *  for back-compat; reactionsOn is the one a reacting surface should use.) asOf-relative,
 *  like every read here. */
export function reactionsOn(soc: Society, beat: string, asOf?: number): Pathos[] {
  // TODO(socratic): when someone un-reacts, does the old reaction get occluded (shadowed) or deleted, and does reactionsOn see the deletion via occlude-guard?
  // ANSWERED(walk 2026-07-02): occluded, never deleted — nothing is ever deleted here (append-only; occluded ≠ deleted, the ink stays); the isOccluded filter on the next line IS the occlude-guard seeing it, so an un-reacted feel drops out of the count while staying in the record. — see the occluded≠deleted ruling (clearness-holds) / append-only law
  const feels = prehensionsOnto(soc, beat, "q-feel", asOf).filter((p) => !isOccluded(soc, p.slug, asOf));
  const byEmoji = new Map<string, Pathos>();
  for (const p of feels) {
    const emoji = p.content.trim();
    if (!emoji) continue;
    const cur = byEmoji.get(emoji) ?? { emoji, count: 0, by: [] };
    cur.count++;
    if (p.subject) cur.by.push(p.subject);
    byEmoji.set(emoji, cur);
  }
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}

// TODO(socratic): my own CLAUDE.md law is "opaque slugs, no string-matching" — yet here I decide
// story-hood by object.includes("end"); does a lure toward "weekend-plans" make anything a Story,
// and why isn't End-ness a quality or a read instead of a syllable?
/** is_story: does `beat` lure to a beat whose slug contains 'end'? */
export function isStory(soc: Society, beat: string): boolean {
  // TODO(socratic): should isStory also check that the lure is not occluded, or is the existence of a lure-edge enough regardless of occlusion?
  return soc.all().some(
    (b) => b.subject === beat && (b.object?.includes("end") ?? false) && prehendsAs(soc, b.slug, "q-lure"),
  );
}

/** content beats: subject===null and not a '~q' mode-beat — the nodes, not the edges. */
export function contentBeats(soc: Society): EventRow[] {
  return soc.all().filter((b) => b.subject === null && !b.slug.endsWith("~q"));
}

/** interval_of: the causal diamond between a Once and an End — the forward-cone of
 *  `once` ∩ the backward-cone of `end`, following plain (non-quality) prehension edges.
 *  The interior of a Story. */
export function intervalOf(soc: Society, once: string, end: string): string[] {
  // plain edges: a prehension whose object isn't a q-* and which isn't a ~q mode-beat.
  const edges = soc.all().filter(
    (b) => b.subject !== null && b.object !== null && !b.object.startsWith("q-") && !b.slug.endsWith("~q"),
  );
  // TODO(socratic): should interval-membership filter out occluded edges, and would that be a visible-at-moment issue too?
  const reach = (from: string, dir: "fwd" | "bwd"): Set<string> => {
    const seen = new Set<string>([from]);
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      for (const e of edges) {
        const next = dir === "fwd" ? (e.subject === n ? e.object : null)
                                   : (e.object === n ? e.subject : null);
        if (next && !seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    return seen;
  };
  const fwd = reach(once, "fwd");
  const bwd = reach(end, "bwd");
  // TODO(socratic): what if fwd and bwd have no intersection, or if once is reachable from end (a cycle) — should both be checked?
  return [...fwd].filter((n) => bwd.has(n));
}

/** the End-beat a story lures toward (the slug containing 'end' it q-lures to), if any. */
export function endOf(soc: Society, story: string): string | null {
  // TODO(socratic): should endOf return null if the lure is occluded, or is the presence of any lure-edge the right answer?
  // TODO(socratic): if a story lures to multiple end-beats, find() returns only the first — is that intentional or a bug?
  const lure = soc.all().find(
    (b) => b.subject === story && (b.object?.includes("end") ?? false) && prehendsAs(soc, b.slug, "q-lure"),
  );
  return lure?.object ?? null;
}

/** author_of: the subject of a q-utterance prehension onto `beat` (who said it). */
export function authorOf(soc: Society, beat: string): string | null {
  // TODO(socratic): if multiple actors have utteranced the same beat, [0] takes the first — what order, and should there be only one author or is this ambiguous?
  const utt = prehensionsOnto(soc, beat, "q-utterance")[0];
  return utt?.subject ?? null;
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

/** resolutionOf: given a DRAMA slug, the story that settles it — read from the drama's OWN
 *  side in ONE pass. A drama is resolved iff a non-superseded q-resolves prehension runs
 *  from it to some story (its object). Returns the story slug, or null if still open. */
export function resolutionOf(soc: Society, drama: string): string | null {
  // TODO(socratic): if a drama q-resolves to multiple stories (ambiguous resolution), find() returns the first — is that a conflict that should error instead?
  const r = prehensionsFrom(soc, drama, "q-resolves").find((p) => !isOccluded(soc, p.slug));
  return r?.object ?? null;
}

/** isResolved: is this drama settled? The boolean companion to resolutionOf. */
export function isResolved(soc: Society, drama: string): boolean {
  return resolutionOf(soc, drama) !== null;
}

/** cleanContent: strip legacy substance-smell from a beat's content on READ.
 *  Legacy beats stored a "[well]/[better] " prefix in content; new beats store clean.
 *  Append-only means we can't edit the old content — so we strip on display. */
export function cleanContent(s: string): string {
  // TODO(socratic): when is cleanContent called — in every render, or once on load — and should the stripping happen in read-land or be a display concern?
  return s.replace(/^\[(well|better)\] /, "");
}
