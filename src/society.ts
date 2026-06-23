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
export interface Beat {
  slug: string;
  content: string;
  subject: string | null;
  object: string | null;
  /** when the local society witnessed this beat (the client's own db_witnessed). */
  witnessed?: number;
}

/** The qualities a prehension can co-prehend (the mode it carries). */
export type Quality =
  | "q-grounding"
  | "q-lure"
  | "q-exclusion"
  | "q-utterance"
  | "q-feel"
  | "q-containment"
  | "q-shared"
  // dependency / assignment / due — the lateral qualities the planning surface lays.
  // q-depends-on: A waits on B (read both ways: dependsOn / dependentsOf). q-assigned-to:
  // a card → an actor. q-due: a temporal bound on a card. These are LATERAL prehensions
  // (object is the related beat/actor, NOT a content node folded into an interval) — never
  // membership, which stays betweenness. (harvested from the dependency/strain reads.)
  | "q-depends-on"
  | "q-assigned-to"
  | "q-due"
  // drama resolution — a q-resolves edge runs from drama→story when the drama is settled.
  | "q-resolves";

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
  readonly #beats = new Map<string, Beat>();
  /** rev bumps on every genuine append; Cells subscribe to it to know to re-read. */
  readonly rev: Cell<number>;
  #clock = 0;

  constructor(seed: ReadonlyArray<Beat> = []) {
    this.rev = new Cell(0);
    for (const b of seed) this.#insert(b);
  }

  // the one write. lay() of an existing slug is inert (ON CONFLICT DO NOTHING).
  // Beats are never overwritten; to undo, supersede with a new beat.
  #insert(b: Beat): boolean {
    if (this.#beats.has(b.slug)) return false;
    // The witnessing clock is monotone across BOTH explicit stamps and auto-stamps:
    // an explicitly-witnessed beat advances the clock so a later auto-stamp never
    // reuses (or precedes) a moment already witnessed. Without this, asOf reads lie.
    const witnessed = b.witnessed ?? this.#clock + 1;
    this.#clock = Math.max(this.#clock, witnessed);
    this.#beats.set(b.slug, { ...b, witnessed });
    return true;
  }

  /** Lay a beat into the society (the only write). Returns true if it was a genuine
   *  append (new slug), false if inert (slug already present). */
  lay(b: Beat): boolean {
    const appended = this.#insert(b);
    if (appended) this.rev.set(this.rev.get() + 1);
    return appended;
  }

  /** Lay a prehension (an edge) co-prehending a quality. Lays the prehension and its
   *  '~q' mode-beat, so the reads below can see the mode. */
  layP(slug: string, content: string, subject: string, object: string, quality: Quality): boolean {
    assertNotMembershipContainment(slug, quality);
    const a = this.lay({ slug, content, subject, object });
    const q = this.lay({ slug: slug + "~q", content: `${content} [${quality}]`, subject: slug, object: quality });
    return a || q;
  }

  /** Bulk-lay (e.g. a fetched canon, or a seed package). One rev bump for the batch. */
  layAll(beats: ReadonlyArray<Beat>): void {
    let any = false;
    for (const b of beats) any = this.#insert(b) || any;
    if (any) this.rev.set(this.rev.get() + 1);
  }

  get(slug: string): Beat | undefined {
    return this.#beats.get(slug);
  }

  /** All beats (a snapshot; do not mutate). */
  all(): Beat[] {
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
function visibleAt(b: Beat, asOf?: number): boolean {
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
export function prehensionsOnto(soc: Society, beat: string, quality: Quality, asOf?: number): Beat[] {
  return soc.all().filter(
    (b) => b.object === beat && b.subject !== null && visibleAt(b, asOf) && prehendsAs(soc, b.slug, quality, asOf),
  );
}

/** Every prehension reaching OUT of `beat` as its SUBJECT, co-prehending `quality`, as of
 *  a moment. The mirror of prehensionsOnto: that read sees edges INTO a beat (beat as
 *  object); this one sees edges FROM a beat (beat as subject). A lateral relation (depends-on,
 *  assigned-to) is laid A→B, so it is only legible from A's side through a -From read. */
export function prehensionsFrom(soc: Society, beat: string, quality: Quality, asOf?: number): Beat[] {
  return soc.all().filter(
    (b) => b.subject === beat && b.object !== null && visibleAt(b, asOf) && prehendsAs(soc, b.slug, quality, asOf),
  );
}

/** Is a beat superseded, as of a moment? A supersede is a self-pointing beat onto the
 *  thing it cancels. The superseded beat stays in the log; this read just ignores it.
 *  As of an earlier moment, a not-yet-witnessed supersede does not count — so an undo is
 *  itself a point on the trajectory, visible only after it lands. */
export function isSuperseded(soc: Society, target: string, asOfOrSeen?: number | Set<string>, _seen: Set<string> = new Set()): boolean {
  // When called with asOf (number), use the asOf-aware path.
  // When called with a Set (internal recursion), use the recursive cycle-guarded path.
  // Re-supersession = "supersede the supersede" = un-remove the target. One-level check
  // couldn't express "bring back a removed thing"; this recurses so a supersede-of-a-supersede
  // REVIVES the target. _seen guards against cycles.
  if (typeof asOfOrSeen === "number") {
    // asOf-relative: simple one-level check (no re-supersession tracking; use witnessed clock).
    return soc.all().some((b) => b.subject === target && b.object === target && b.slug !== target && visibleAt(b, asOfOrSeen));
  }
  const seen = asOfOrSeen ?? _seen;
  if (seen.has(target)) return false;
  seen.add(target);
  return soc.all().some((b) =>
    b.subject === target && b.object === target && b.slug !== target &&
    !isSuperseded(soc, b.slug, seen));
}

/** is_established, as of a moment: established iff some non-superseded grounding-prehension
 *  reaches it. Unchecking supersedes the grounding, so this re-reads as scripted; the
 *  grounding and its supersede both remain in the society. */
export function isEstablished(soc: Society, beat: string, asOf?: number): boolean {
  return prehensionsOnto(soc, beat, "q-grounding", asOf).some((p) => !isSuperseded(soc, p.slug, asOf));
}

/** mode_at: the establishment-mode read of a beat, as of a moment (default: now). */
export function modeAt(soc: Society, beat: string, asOf?: number): Mode {
  return isEstablished(soc, beat, asOf) ? "established" : "scripted";
}

/** confidence: groundings / (groundings + exclusions), in [0,1], as of a moment. Every
 *  prehension counts 1; weighting can live elsewhere. */
export function confidence(soc: Society, beat: string, asOf?: number): number {
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
    .filter((p) => !isSuperseded(soc, p.slug, asOf))
    .map((p) => p.object!).filter(Boolean);
}

/** dependentsOf: the beats waiting on THIS one — the BACKWARD read (this beat as object).
 *  "who is blocked because of me." The mirror dependsOn couldn't see. */
export function dependentsOf(soc: Society, beat: string, asOf?: number): string[] {
  return prehensionsOnto(soc, beat, "q-depends-on", asOf)
    .filter((p) => !isSuperseded(soc, p.slug, asOf))
    .map((p) => p.subject!).filter(Boolean);
}

/** blockedOnNow: of this beat's dependencies, the ones NOT yet established — the live
 *  blockers. Blocked is a reading, not a stored state: a dep that's established no longer
 *  blocks. Empty ⇒ not blocked. */
export function blockedOnNow(soc: Society, beat: string, asOf?: number): string[] {
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
  const weight = dependents.reduce((w, d) => w + (isEstablished(soc, d, asOf) ? 3 : isBlocked(soc, d, asOf) ? 2 : 1), 0);
  return { count: dependents.length, weight, dependents };
}

/** grounded_by / excluded_by: WHO grounded/excluded — the subject (frame) of each
 *  grounding/exclusion prehension. Frame-on-grounding, read client-side. */
export function groundedBy(soc: Society, beat: string): string[] {
  return prehensionsOnto(soc, beat, "q-grounding").map((p) => p.subject!).filter(Boolean);
}
export function excludedBy(soc: Society, beat: string): string[] {
  return prehensionsOnto(soc, beat, "q-exclusion").map((p) => p.subject!).filter(Boolean);
}

/** pathos: the q-feel reactions on a beat — emoji + count + who. */
export interface Pathos {
  emoji: string;
  count: number;
  by: string[];
}
export function pathosOf(soc: Society, beat: string): Pathos[] {
  const feels = prehensionsOnto(soc, beat, "q-feel");
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

/** reactionsOn: the q-feel reactions ON a beat, aggregated by emoji — the read paired with
 *  reactionStory. It is pathosOf with the SUPERSEDE GUARD: an un-react supersedes the q-feel
 *  beat (a self-loop), so a removed reaction must not linger. (pathosOf is the raw read kept
 *  for back-compat; reactionsOn is the one a reacting surface should use.) asOf-relative,
 *  like every read here. */
export function reactionsOn(soc: Society, beat: string, asOf?: number): Pathos[] {
  const feels = prehensionsOnto(soc, beat, "q-feel", asOf).filter((p) => !isSuperseded(soc, p.slug, asOf));
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

/** is_story: does `beat` lure to a beat whose slug contains 'end'? */
export function isStory(soc: Society, beat: string): boolean {
  return soc.all().some(
    (b) => b.subject === beat && (b.object?.includes("end") ?? false) && prehendsAs(soc, b.slug, "q-lure"),
  );
}

/** content beats: subject===null and not a '~q' mode-beat — the nodes, not the edges. */
export function contentBeats(soc: Society): Beat[] {
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
  return [...fwd].filter((n) => bwd.has(n));
}

/** the End-beat a story lures toward (the slug containing 'end' it q-lures to), if any. */
export function endOf(soc: Society, story: string): string | null {
  const lure = soc.all().find(
    (b) => b.subject === story && (b.object?.includes("end") ?? false) && prehendsAs(soc, b.slug, "q-lure"),
  );
  return lure?.object ?? null;
}

/** author_of: the subject of a q-utterance prehension onto `beat` (who said it). */
export function authorOf(soc: Society, beat: string): string | null {
  const utt = prehensionsOnto(soc, beat, "q-utterance")[0];
  return utt?.subject ?? null;
}

/** distance-to-HEA: how far the frame's End is from being established. `realized` is
 *  true when the End beat is itself established; `remaining` is how many interior beats
 *  are still scripted (ungrounded). */
export function distanceToHEA(soc: Society, frameOnce: string, end?: string): { realized: boolean; remaining: number; total: number } {
  const theEnd = end ?? endOf(soc, frameOnce) ?? `${frameOnce}-end`;
  const interior = intervalOf(soc, frameOnce, theEnd).filter((b) => b !== frameOnce && b !== theEnd);
  const remaining = interior.filter((b) => !isEstablished(soc, b)).length;
  // the End is "realized" when it is itself established (an actual met the HEA).
  const realized = isEstablished(soc, theEnd);
  return { realized, remaining, total: interior.length };
}

// ── ITHACA-REQUIRED READS (ported from vendored scher copy, promoted into the package) ──

/** assigneesOf: who is assigned to a card — the people on it. Reads the `<card>-asn-<who>` edges
 *  (object = `actor-<who>`), non-superseded, returns bare names. */
export function assigneesOf(soc: Society, card: string): string[] {
  return soc.all()
    .filter((b) => b.slug.startsWith(card + "-asn-") && !isSuperseded(soc, b.slug))
    .map((b) => (b.object ?? "").replace(/^actor-/, ""))
    .filter(Boolean);
}

/** resolutionOf: given a DRAMA slug, the story that settles it — read from the drama's OWN
 *  side in ONE pass. A drama is resolved iff a non-superseded q-resolves prehension runs
 *  from it to some story (its object). Returns the story slug, or null if still open. */
export function resolutionOf(soc: Society, drama: string): string | null {
  const r = prehensionsFrom(soc, drama, "q-resolves").find((p) => !isSuperseded(soc, p.slug));
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
  return s.replace(/^\[(well|better)\] /, "");
}
