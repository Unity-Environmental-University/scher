// ─────────────────────────────────────────────────────────────────────────────
// society.ts — an append-only log of beats, not a key/value store. The only
// write is lay(); beats are never overwritten. Values are read from the log,
// not stored (see mode_at, confidence, below).
// ─────────────────────────────────────────────────────────────────────────────

import { Cell, type Read } from "./cell.js";

/** A beat. With subject+object it is an edge. A quality beat (slug ending '~q',
 *  object is the quality) carries mode. Its spelling is never read — see hasAnyQuality. */
export interface EventRow {
  slug: string;
  content: string;
  /** the BULLET — a short headline, separate from content (the notes). New human beats
   *  need one; pre-title beats and auto edges may have none. */
  title?: string | null;
  subject: string | null;
  object: string | null;
  /** when the local society witnessed this beat (the client's own db_witnessed). */
  witnessed?: number;
  /** WHO laid this beat: the frame's subject, or a causing event's slug when machinery
   *  lays it. Required by rule (2026-07-07): no statement is not spoken from. */
  laid_by?: string | null;
}

// These are the quality strings the kernel itself branches on (isOccluded, endReached,
// etc.). Other qualities (q-shared, q-due, q-succeeds, or any caller-invented string)
// work fine as plain strings with no kernel branch, so they don't need to live here.
// Splitting it this way just catches typos on the names the kernel actually reads.
export type KernelQuality =
  // q-grounding: write-deprecated (2026-07-15) — new code should use a bare edge, not
  // this quality-marker. But the kernel still reads it on old rows (reaches,
  // establishedTo, the sublime guard) and it stays legal forever — old rows never get
  // rewritten. A bare edge ONTO an open End-pole is a charge; a bare edge OUT of it is
  // the closing. See closingEdgesFrom for where both shapes (bare + this legacy string)
  // get unioned into one read.
  | "q-grounding"
  // q-end-pole: designates a pole, structurally. Replaces the dead q-lure grammar
  // (2026-07-06) — layP refuses q-lure outright (see assertNoLure).
  | "q-end-pole"
  // q-sublime-pole: designates a pole that never closes. It is inert — a star to steer
  // by, not a place to land (Hallie).
  | "q-sublime-pole"
  // q-now-pole: designates a story's own Now as a structural pole (2026-07-20). Needed
  // because a charge and a closing are both bare edges FROM the End now — direction no
  // longer tells them apart, only the OBJECT does: a closing's object is a designated
  // Now-pole, a charge's object never is. See isNowPole / chargesOn / closingEdgesFrom.
  | "q-now-pole"
  | "q-exclusion"
  | "q-utterance"
  | "q-feel"
  | "q-containment"
  // q-blocked-by: renamed from q-depends-on (2026-07-15). A couple legacy
  // q-depends-on rows still exist and stay honored; new writes use q-blocked-by only.
  | "q-blocked-by"
  // q-occludes.
  // DRAMA CUT (2026-07-15): q-resolves and its readers (resolutionOf/isResolved) were
  // removed — zero live edges used them. Door marked, not erased: don't resurrect the
  // string without a fresh ruling.
  | "q-occludes"
  // NOTE: no charge quality exists on purpose. A charge is just any bare edge onto a
  // story's open End-pole (see chargesOn) — the charge is a property of the edge, not
  // of the node, so there's nothing to mint a word for.
  | "q-assigned-to";

/** The mode an edge can carry: a KernelQuality name, or any other string a caller invents
 *  (q-shared, q-due, q-succeeds, etc). */
export type Quality = KernelQuality | (string & { readonly __quality?: never });

/** The mode a beat reads as. Derived, not stored. */
export type Mode = "established" | "scripted";

// ── DEPRECATE GUARD: membership is NOT containment ─────────────────────────────
// LAW: a beat's membership in a Story is its position between the Story's Once/End
// bounds, computed by intervalOf — never a stored q-containment "inside" edge.
// q-containment is for part/whole nesting only.
//
// This guard hollers (does not block) when q-containment is laid in the membership
// shape ('-in'/'@in' edges) — scher corrupted its own reads doing this once; the holler
// is so it doesn't happen silently again.
// ── DEAD GRAMMAR GUARD: q-lure is killed with fire ──────────────────────────────
// Hallie's ruling, 2026-07-06: q-lure is dead. It smuggled an agent (who lures?) and
// couldn't state its own direction. Unlike the containment guard above, this one BLOCKS
// (throws), because a laid lure would silently re-teach dead grammar downstream.
//
// Replacement: unpack the event into its three poles (Once / End / Now) via unpackPoles,
// then close the End with `end ~because~ now` (q-grounding). Old lure rows stay in old
// logs as testimony but no new society may carry one — assertNoLureInSociety scans for
// smuggled ones.
export function assertNoLure(slug: string, quality: Quality): void {
  if (quality !== "q-lure") return;
  throw new Error(
    `[DEAD GRAMMAR] '${slug}' tries to lay q-lure. q-lure is DEAD (Hallie's ruling, ` +
    `2026-07-06): it smuggled an agent and could not state its own direction. An event is ` +
    `ONE event until lazily unpacked into its three poles (Once / End / Now — "the end is ` +
    `because now"); End-hood is the structural q-end-pole designation laid by the unpack. ` +
    `Fix: unpackPoles(soc, event) (or gen4-policy mark_done's lazy unpack), then close ` +
    `with 'end ~because~ now' (q-grounding). (law: three-poles, no-luring-verb)`,
  );
}

/** assertNoLureInSociety: the db-wide guard — throws if ANY q-lure exists anywhere in
 *  this society (however it got in: raw lay, seed, fetched canon). Same why/fix as
 *  assertNoLure; lists the offending mode-beats so the migration is a grep, not a hunt. */
export function assertNoLureInSociety(soc: Society): void {
  const lures = soc.all().filter((b) => b.object === "q-lure" && b.subject !== null);
  if (lures.length === 0) return;
  throw new Error(
    `[DEAD GRAMMAR] this society carries ${lures.length} q-lure mode-beat(s): ` +
    `${lures.map((b) => b.slug).join(", ")}. q-lure is DEAD (Hallie's ruling, 2026-07-06): ` +
    `it smuggled an agent and could not state its own direction. Fix each one: unpack its ` +
    `event into the three poles (Once / End / Now) — lay 'event ~q-end-pole~ end' via ` +
    `unpackPoles and close with 'end ~because~ now' (q-grounding); then drop or occlude ` +
    `the lure rows in the source log. (law: three-poles, no-luring-verb)`,
  );
}

// ── ADDRESS LAW: nothing touches a naked pole ───────────────────────────────────
// LAW (2026-07-06): an open End-pole receives only charge-edges onto it, and eventually
// one closing edge out of it. Nothing else touches a naked pole — comments and
// references go on the STORY, never its End. This is what makes a charge a pure address
// read (chargesOn): a charge is just a bare edge onto the open End, a property of the
// edge, never the node.
//
// If you hit this: point your edge at the story instead, or lay a bare edge if you mean
// a charge. Once the End closes, ordinary edges are fine again.
export function assertNakedPole(
  soc: Society,
  slug: string,
  subject: string,
  object: string,
  quality: Quality,
): void {
  // the q-end-pole designation itself is what MAKES a pole — exempt in both positions.
  if (quality === "q-end-pole") return;
  if (isOpenEndPole(soc, object)) {
    throw new Error(
      `[ADDRESS LAW] '${slug}' lays a ${quality} prehension ONTO the open End-pole ` +
      `'${object}'. A naked pole receives only charge-prehensions (bare edges) onto it — ` +
      `comments/references prehend the STORY, never its End. Fix: point this edge at the ` +
      `story (the pole's Once), or lay a bare edge if you mean a charge. (law: naked-pole)`,
    );
  }
  // 2026-07-15: closePole now closes with a bare edge, not layP, so it never reaches this
  // check. TRIPWIRE: the `quality !== "q-grounding"` exemption below is legacy-only — no
  // live writer uses it — but it must stay. Removing it would forbid a legacy-shaped
  // write nobody asked to forbid.
  if (isOpenEndPole(soc, subject) && quality !== "q-grounding") {
    throw new Error(
      `[ADDRESS LAW] '${slug}' lays a ${quality} prehension OUT of the open End-pole ` +
      `'${subject}'. The only edges that ever leave a naked pole are its ONE closing ` +
      `q-grounding ('end ~because~ now') or a bare edge (no quality at all — bare edges ` +
      `never reach this check; lay them via Society.lay() directly). Fix: close the pole ` +
      `with q-grounding, or hang this relation on the story instead. (law: naked-pole)`,
    );
  }
}

/** isDesignatedEndPole: is `node` the object of an un-occluded q-end-pole designation?
 *  True whether or not it has since closed — only isOpenEndPole cares about that. */
function isDesignatedEndPole(soc: Society, node: string | null, asOf?: number): boolean {
  if (!node) return false;
  return soc.all().some(
    (b) => b.object === node && b.subject !== null &&
      prehendsAs(soc, b.slug, "q-end-pole", asOf) && !isOccluded(soc, b.slug, asOf),
  );
}

/** isOpenEndPole: is `node` a designated End-pole that is not yet actual? The address
 *  law guards exactly these. */
function isOpenEndPole(soc: Society, node: string | null, asOf?: number): boolean {
  if (!node) return false;
  return isDesignatedEndPole(soc, node, asOf) && !endActual(soc, node, asOf);
}

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

// ── SUBLIME GUARD: sublimes never close ────────────────────────────────────
// THE LAW (one sentence, born with its guard per the meta-law of 2026-07-06):
// a sublime-pole is NEVER ACTUAL. It is a never-closing, receding horizon — a "star
// for navigation, not a destination to land" (Hallie). Unlike an End-pole (which
// closes when `end ~because~ now`), a sublime remains eternally open.
//
// This ensures the anti-q-lure guarantee: a sublime is INERT (never beckons, never
// actualizes an agent's promise). Closure is forbidden structurally.
//
// WHAT TO DO if you hit this: a sublime is not a story endpoint. Don't close it or mark
// it done. To actualize an End, use an End-pole instead. A sublime orients pursuit; it
// is never reached.
//
// This function returns a message (or null) instead of throwing, so layP could act on
// it — but layP does NOT call this one; it calls the throwing assertSublimeNeverCloses
// below. RULED CLOSED (2026-07-15, Hallie: "pain should show the shape"): guards keep
// throwing on purpose. Do not wire layP to this check* version — a throw is loud, a
// checked return a caller forgets to inspect would be silent. This function stays as a
// tested, correct, currently-uncalled twin. Don't delete it and don't "finish" the migration.
export function checkSublimeNeverCloses(soc: Society, slug: string, subject: string, object: string, quality: Quality): string | null {
  // q-sublime-pole designation itself is structural; it is exempt (like q-end-pole).
  if (quality === "q-sublime-pole") return null;
  // Trying to lay a q-grounding OUT of a sublime-pole (sublime as subject)
  if (subject !== null && isSublimePole(soc, subject) && quality === "q-grounding") {
    return (
      `[ANTI-Q-LURE GUARANTEE] '${slug}' tries to close the sublime-pole '${subject}' ` +
      `with q-grounding. A sublime is NEVER ACTUAL — it is a receding horizon, not a ` +
      `destination. Sublimes orient pursuit; they do not actualize. (law: ` +
      `sublime-never-closes)`
    );
  }
  return null;
}

/** The live path layP calls (not deprecated). Throws on purpose — see the note on
 *  checkSublimeNeverCloses above. */
export function assertSublimeNeverCloses(soc: Society, slug: string, subject: string, object: string, quality: Quality): void {
  const violation = checkSublimeNeverCloses(soc, slug, subject, object, quality);
  if (violation) throw new Error(violation);
}

// ── SUBLIME-DAG GUARD: RELAXED — aims mutually prehend at the limit ───────────────
// RELAXED (Hallie, 2026-07-10): sublime-to-sublime rings (even A serves B serves A) are
// now allowed — sublimes sit "outside time" so ordinary cycle rules don't bind them.
// The old acyclic block only ever fired on this case, so it's gone entirely.
//
// TRIPWIRE: this must match scher-core/src/lib.rs byte-for-byte in behavior. It is kept
// as a named export (tests reference it) even though it now always allows.
// A sublime still can never be closed/actualized — that's the OTHER guard
// (checkSublimeNeverCloses), untouched by this relaxation.
export function checkSublimeAcyclic(_soc: Society, _slug: string, _subject: string, _object: string, _quality: Quality): string | null {
  // Always allows now (RELAXED, 2026-07-10) — sublime rings are legal.
  return null;
}

/** The live path layP calls (not dead scaffolding, even though it never throws now). */
export function assertSublimeAcyclic(soc: Society, slug: string, subject: string, object: string, quality: Quality): void {
  const violation = checkSublimeAcyclic(soc, slug, subject, object, quality);
  if (violation) throw new Error(violation);
}

/** isSublimePole: is `node` a designated sublime-pole (object of an un-occluded
 *  q-sublime-pole edge)? Unlike an End-pole, a sublime is NEVER ACTUAL — its openness
 *  is eternal. */
export function isSublimePole(soc: Society, node: string | null, asOf?: number): boolean {
  if (!node) return false;
  return soc.all().some(
    (b) => b.object === node && b.subject !== null &&
      prehendsAs(soc, b.slug, "q-sublime-pole", asOf) && !isOccluded(soc, b.slug, asOf),
  );
}

/** isNowPole: is `node` the object of an un-occluded q-now-pole designation? Used to
 *  tell a closing (object is a Now-pole) from a charge (object isn't) — see q-now-pole
 *  on KernelQuality above. */
export function isNowPole(soc: Society, node: string | null, asOf?: number): boolean {
  if (!node) return false;
  return soc.edgesOntoObject(node).some(
    (b) => b.subject !== null && prehendsAs(soc, b.slug, "q-now-pole", asOf) && !isOccluded(soc, b.slug, asOf),
  );
}

// ── the society itself ───────────────────────────────────────────────────────

/** An append-only society of beats. The only write is lay(). `rev` rises on every
 *  append; a Cell over the society subscribes to it and re-reads when it changes. */
export class Society {
  readonly #beats = new Map<string, EventRow>();
  /** rev bumps on every genuine append; Cells subscribe to it to know to re-read. */
  readonly rev: Cell<number>;
  #clock = 0;
  // Adjacency indexes (ported from scher-core/src/lib.rs, 2026-07-15): edge slugs keyed
  // by subject/object, turning prehensionsOnto/From from an O(n) scan into O(degree).
  // Safe because subject/object never change after insert. Kept in insertion order.
  readonly #bySubject = new Map<string, string[]>();
  readonly #byObject = new Map<string, string[]>();

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
    // Mirrors lib.rs's index population: subject/object of the raw beat, insertion order.
    if (b.subject !== null && b.subject !== undefined) {
      const list = this.#bySubject.get(b.subject);
      if (list) list.push(b.slug); else this.#bySubject.set(b.subject, [b.slug]);
    }
    if (b.object !== null && b.object !== undefined) {
      const list = this.#byObject.get(b.object);
      if (list) list.push(b.slug); else this.#byObject.set(b.object, [b.slug]);
    }
    this.#beats.set(b.slug, { ...b, witnessed });
    return true;
  }

  /** Edges whose SUBJECT is `s` (adjacency-indexed; same rows a full scan on
   *  `subject === s` yields, in insertion order — mirrors edges_from_subject, lib.rs:221-223). */
  edgesFromSubject(s: string): EventRow[] {
    const slugs = this.#bySubject.get(s);
    if (!slugs) return [];
    const out: EventRow[] = [];
    for (const slug of slugs) {
      const row = this.#beats.get(slug);
      if (row) out.push(row);
    }
    return out;
  }

  /** Edges whose OBJECT is `o` (adjacency-indexed mirror of edgesFromSubject — mirrors
   *  edges_onto_object, lib.rs:226-228). */
  edgesOntoObject(o: string): EventRow[] {
    const slugs = this.#byObject.get(o);
    if (!slugs) return [];
    const out: EventRow[] = [];
    for (const slug of slugs) {
      const row = this.#beats.get(slug);
      if (row) out.push(row);
    }
    return out;
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
    // TRIPWIRE: all four guards below throw on purpose, by ruling (2026-07-15) — do not
    // swap them for the non-throwing check* variants. See checkSublimeNeverCloses's note.
    assertNoLure(slug, quality); // BLOCKS: q-lure is dead grammar (Hallie, 2026-07-06)
    assertNakedPole(this, slug, subject, object, quality); // BLOCKS: nothing touches a naked pole
    assertSublimeNeverCloses(this, slug, subject, object, quality); // BLOCKS: sublimes never close
    assertSublimeAcyclic(this, slug, subject, object, quality); // BLOCKS: sublime-DAG stays acyclic (currently never fires — RELAXED, see its own comment)
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
// A read is "from a moment." `asOf` is a witnessed-clock value; a read as-of t sees
// only beats witnessed at-or-before t — just the log truncated and re-read.
// `asOf === undefined` means "now": no filter.

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

/** hasAnyQuality: does this prehension co-prehend ANY quality — does its `~q` mode-beat
 *  exist? Reads presence only, never the object's spelling — this is how a future
 *  quality family that doesn't spell "q-" still classifies correctly. */
export function hasAnyQuality(soc: Society, pslug: string, asOf?: number): boolean {
  const q = soc.get(pslug + "~q");
  return !!q && visibleAt(q, asOf);
}

/** Every prehension reaching `beat` as object, co-prehending `quality`, as of a moment.
 *  Returns the prehension beats (whose `subject` is the frame/standpoint that laid it). */
export function prehensionsOnto(soc: Society, beat: string, quality: Quality, asOf?: number): EventRow[] {
  // Adjacency-indexed (was a full soc.all() scan per call — ported fix, mirrors
  // scher-core/src/lib.rs prehensions_onto, 2026-07-15).
  return soc.edgesOntoObject(beat).filter(
    (b) => b.subject !== null && visibleAt(b, asOf) && prehendsAs(soc, b.slug, quality, asOf),
  );
}

/** Every prehension reaching OUT of `beat` as its SUBJECT, co-prehending `quality`, as of
 *  a moment. The mirror of prehensionsOnto: that read sees edges INTO a beat (beat as
 *  object); this one sees edges FROM a beat (beat as subject). A lateral relation (depends-on,
 *  assigned-to) is laid A→B, so it is only legible from A's side through a -From read. */
export function prehensionsFrom(soc: Society, beat: string, quality: Quality, asOf?: number): EventRow[] {
  // Adjacency-indexed (mirror of prehensionsOnto's fix; mirrors
  // scher-core/src/lib.rs prehensions_from, 2026-07-15).
  return soc.edgesFromSubject(beat).filter(
    (b) => b.object !== null && visibleAt(b, asOf) && prehendsAs(soc, b.slug, quality, asOf),
  );
}

/** Is `target` OCCLUDED, as of a moment? A beat E can cast a shadow over another:
 *  E --q-occludes--> target. Standpoint-relative: `soc` is the frame — occluded here can
 *  be lit in another society. Reversible: an occluder that is itself occluded casts no
 *  shadow (one level, no recursion needed). */
export function isOccluded(soc: Society, target: string, asOf?: number): boolean {
  // TODO(socratic): the b.subject !== target guard — why exclude self-occlusion (if that's even layable), and what does it mean if it were?
  // Adjacency-indexed (was a full soc.all() scan — ported fix, mirrors scher-core/src/lib.rs
  // is_occluded's use of edges_onto_object, Lever A residual, 2026-07-16).
  return soc.edgesOntoObject(target).some((b) =>
    b.subject !== null && b.subject !== target &&
    visibleAt(b, asOf) && prehendsAs(soc, b.slug, "q-occludes", asOf) &&
    // emergent un-occlusion: an occluder that is itself occluded casts no shadow (one level).
    !isOccluder(soc, b.slug, asOf));
}

/** Is this occlusion-prehension itself occluded (its occluder occluded)? One level only — by
 *  design there is no deep recursion: un-occlusion is the absence of a LIVE occluder, read fresh. */
function isOccluder(soc: Society, occludeEdge: string, asOf?: number): boolean {
  // TODO(socratic): why is this logic a separate function instead of inlined in isOccluded, and does "one level only" mean we never ask isOccluder recursively?
  // Adjacency-indexed (Lever A residual, 2026-07-16 — same pattern as isOccluded above).
  return soc.edgesOntoObject(occludeEdge).some((b) =>
    b.subject !== null && b.subject !== occludeEdge &&
    visibleAt(b, asOf) && prehendsAs(soc, b.slug, "q-occludes", asOf));
}

/** groundedForAnyFrame: does some un-occluded grounding reach this beat, from ANY frame
 *  this store carries? Never "the" frame — soc IS a frame. Use for occlusion-sensitive
 *  display, not for doneness (use establishedTo for that, below). Unaffected by bare
 *  closings — this reads edges pointing AT the beat, a closing points the other way. */
export function groundedForAnyFrame(soc: Society, beat: string, asOf?: number): boolean {
  // TODO(socratic): why check isOccluded on the prehension slug (p.slug, the edge) instead of also checking if the prehension's subject (the grounding frame) is occluded?
  return prehensionsOnto(soc, beat, "q-grounding", asOf).some((p) => !isOccluded(soc, p.slug, asOf));
}

/** @deprecated Alias of groundedForAnyFrame — the name reads as frame-free doneness,
 *  which is a malformed question (2026-07-03 ruling). Migrate "done" reads to
 *  establishedTo; migrate "grounded for someone" reads to groundedForAnyFrame. */
export function isEstablished(soc: Society, beat: string, asOf?: number): boolean {
  return groundedForAnyFrame(soc, beat, asOf);
}

// ── FRAME-RELATIVE ESTABLISHMENT (Hallie's ruling, 2026-07-03: every event is done
// to/by its author — establishment is always relative to a standpoint, never frame-free) ──

/** reaches: is `to` reachable from `from` along un-occluded edges co-prehending
 *  `quality`, walking subject→object? `from === to` reaches trivially.
 *
 *  TRIPWIRE (2026-07-15): when quality is "q-grounding" specifically, a designated
 *  End-pole may also leave via a bare edge (a closing — see closingEdgesFrom). Other
 *  qualities are untouched by this. */
export function reaches(soc: Society, from: string, to: string, quality: Quality, asOf?: number): boolean {
  if (from === to) return true;
  const seen = new Set<string>([from]);
  const stack = [from];
  while (stack.length) {
    const n = stack.pop()!;
    const edges = quality === "q-grounding" ? closingEdgesFrom(soc, n, asOf) : prehensionsFrom(soc, n, quality, asOf);
    for (const p of edges) {
      if (isOccluded(soc, p.slug, asOf)) continue;
      const next = p.object!;
      if (next === to) return true;
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return false;
}

/** establishedTo: is `beat` behind the reader's Now on the grounding topology?
 *  `readerNow` is a node, never a slug convention — locating it is the caller's job
 *  (opaque-slugs law).
 *  TRIPWIRE: the authorship clause (done to/by its author from birth) is deliberately
 *  absent, pending a ruling. Do not add it without one. */
export function establishedTo(soc: Society, readerNow: string, beat: string, asOf?: number): boolean {
  return reaches(soc, readerNow, beat, "q-grounding", asOf);
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

// ── DEPENDENCY/STRAIN READS, PATHOS/REACTIONS: moved to strain.ts / pathos.ts ──
// (2026-07-15). Names unchanged; both import their kernel primitives from here.
// See index.ts for the re-export surface.

/** isStory: has `beat` been unpacked into its poles? Structural (2026-07-06) — reads the
 *  q-end-pole designation, never a slug's spelling. */
export function isStory(soc: Society, beat: string): boolean {
  // TODO(socratic): should isStory also check that the designation is not occluded, or is the existence of a pole-edge enough regardless of occlusion?
  return prehensionsFrom(soc, beat, "q-end-pole").length > 0;
}

/** content beats: subject===null and not a '~q' mode-beat — the nodes, not the edges. */
export function contentBeats(soc: Society): EventRow[] {
  return soc.all().filter((b) => b.subject === null && !b.slug.endsWith("~q"));
}

/** IntervalContext: intervalOf's plain-edge prepasses, hoisted so a caller doing many
 *  interval reads in one paint builds them once. TRIPWIRE: valid only for the exact
 *  Society it was derived from — a mutation or new Society needs a fresh one. */
export interface IntervalContext {
  /** objects of visible ~q mode-beats — the quality tokens classified OUT of the walk. */
  qualityTokens: Set<string>;
  /** plain-edge adjacency, subject→objects. */
  fwdAdj: Map<string, string[]>;
  /** plain-edge adjacency, object→subjects. */
  bwdAdj: Map<string, string[]>;
}

/** Build the IntervalContext for `soc` — identical to what intervalOf builds internally
 *  when no ctx is passed. See IntervalContext for the validity constraint. */
export function intervalContext(soc: Society): IntervalContext {
  // Interval edges: every prehension except the quality machinery itself — excludes ~q
  // mode-beats and edges whose OBJECT is a quality token, read structurally, never by
  // spelling.
  //
  // TRIPWIRE (2026-07-06 bug, event-1350): do NOT filter by !hasAnyQuality(edge) — that
  // excludes every quality-CARRYING edge (every layP-ed edge), which emptied production
  // story intervals, since bujo lays membership via layP q-grounding. Filter by the
  // OBJECT being a quality token instead, as done here.
  //
  // Also excludes occluded edges (2026-07-16) — same law as prehensionsOnto/From. Reads
  // the current moment only (no asOf param) — add one if a caller ever needs it.
  const qualityTokens = new Set<string>();
  for (const b of soc.all()) {
    if (b.slug.endsWith("~q") && b.object !== null && visibleAt(b)) qualityTokens.add(b.object);
  }
  const edges = soc.all().filter(
    (b) => b.subject !== null && b.object !== null && !qualityTokens.has(b.object) && !b.slug.endsWith("~q") &&
      visibleAt(b) && !isOccluded(soc, b.slug),
  );
  // Adjacency maps over the filtered plain edges, built once (was: the reach walk re-scanned
  // the WHOLE edges array per stack node — O(interval_size × total_edges), the real quadratic
  // cost here, worse than the two soc.all() prepasses above). Same edges, same steps: fwd
  // walks subject→object, bwd the reverse. Mirrors lib.rs's fwd_adj/bwd_adj (interval_of,
  // scher-core/src/lib.rs ~837-848), which solved this exact gap first.
  const fwdAdj = new Map<string, string[]>();
  const bwdAdj = new Map<string, string[]>();
  for (const e of edges) {
    const s = e.subject!, o = e.object!;
    const fl = fwdAdj.get(s); if (fl) fl.push(o); else fwdAdj.set(s, [o]);
    const bl = bwdAdj.get(o); if (bl) bl.push(s); else bwdAdj.set(o, [s]);
  }
  return { qualityTokens, fwdAdj, bwdAdj };
}

/** intervalOf: the causal diamond between a Once and an End — forward-cone of `once`
 *  intersect backward-cone of `end`, over plain edges. The interior of a Story.
 *  Optional `ctx` (from intervalContext) skips re-scanning; behavior is identical either
 *  way. Occlusion-aware — a passed-in ctx must match the moment you care about, since
 *  occlusion is baked into its adjacency at construction time. */
export function intervalOf(soc: Society, once: string, end: string, ctx?: IntervalContext): string[] {
  const { fwdAdj, bwdAdj } = ctx ?? intervalContext(soc);
  const reach = (from: string, dir: "fwd" | "bwd"): Set<string> => {
    const adj = dir === "fwd" ? fwdAdj : bwdAdj;
    const seen = new Set<string>([from]);
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      const nexts = adj.get(n);
      if (!nexts) continue;
      for (const next of nexts) {
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    return seen;
  };
  const fwd = reach(once, "fwd");
  const bwd = reach(end, "bwd");
  // TODO(socratic): what if fwd and bwd have no intersection, or if once is reachable from end (a cycle) — should both be checked?
  return [...fwd].filter((n) => bwd.has(n));
}

/** the story's End-pole — the object of its q-end-pole designation (laid by the unpack),
 *  structurally; no spelling is read (F-A ruling + pole law, 2026-07-06). */
export function endOf(soc: Society, story: string): string | null {
  // TODO(socratic): should endOf return null if the designation is occluded, or is the presence of any pole-edge the right answer?
  // TODO(socratic): if a story carries multiple pole-designations (reopened differentials), [0] returns only the first — is that intentional or a bug?
  const pole = prehensionsFrom(soc, story, "q-end-pole")[0];
  return pole?.object ?? null;
}

// ── THREE-POLE UNPACK · CHARGE · VOLTAGE (Hallie's ruling, 2026-07-06) ──
// An event is ONE event — no poles, no story apparatus — until first need. The unpack
// then lays three poles: the event as its own Once; an End-pole, not yet actual,
// designated by q-end-pole (never a slug spelling); a Now, because the Once. The End
// becomes actual only when it closes because a Now (`end ~because~ now`).
//
// Voltage is read ACROSS the poles, stored in neither, always relative to a ground (a
// frame's now-lineage head). A charge/strike/closing counts only if established to that
// ground — nothing is ever globally zeroed; a closing discharges outward by ordinary
// reachability. Charge is a bare edge onto the open End-pole. Reopen = a new unpack, never
// an un-doing.

/** what one unpack laid. */
export interface PoleUnpack {
  /** the event, standing as its own Once-pole. */
  once: string;
  /** the End-pole, not yet actual (Mode "scripted" until it closes because a Now). */
  end: string;
  /** the q-end-pole designation edge (the structural End-hood, laid by this unpack). */
  pole: string;
  /** the story's own frame's first Now — because the Once, laid by this unpack. */
  now: string;
}

/** the story's own frame's Now — an address (`${story}~now`), never parsed by reads.
 *  Voltage's default ground under SOFD. */
export function storyNow(story: string): string {
  return `${story}~now`;
}

/** unpackPoles: lazily unpack ONE event into its three-pole structure, on first need
 *  only. Idempotent — an already-unpacked event returns its existing poles. `end`
 *  defaults to `${event}~hea`, an address never parsed by reads.
 *
 *  Lays three things: the End + its q-end-pole designation, and the frame's first Now,
 *  because the Once. The Now is ALSO designated q-now-pole (2026-07-20) — needed so a
 *  closing (`end ~because~ now`) and a charge (also subject=end) can be told apart by
 *  OBJECT: a closing's object is a designated Now-pole, a charge's isn't. */
export function unpackPoles(soc: Society, event: string, end = `${event}~hea`): PoleUnpack {
  const now = storyNow(event);
  const existing = prehensionsFrom(soc, event, "q-end-pole")[0];
  if (existing) return { once: event, end: existing.object!, pole: existing.slug, now };
  soc.lay({ slug: end, content: `the End-pole of ${event}, not yet actual`, subject: null, object: null });
  // Q2 (Story's Own Frame Default, ruled-for-now): edges laid in a story's course carry
  // the story's own frame as EXPLICIT ink — visible, greppable, never parsed by a read.
  const pole = `${event}~end-pole~${end}`;
  soc.layP(pole, `End-pole designation (frame: ${event})`, event, end, "q-end-pole");
  soc.lay({ slug: now, content: `the Now of ${event}'s own frame`, subject: null, object: null });
  soc.layP(`${now}~because~${event}`, `now is because events (frame: ${event})`, now, event, "q-grounding");
  soc.layP(`${now}~now-pole~${event}`, `Now-pole designation (frame: ${event})`, event, now, "q-now-pole");
  return { once: event, end, pole, now };
}

/** closingEdgesFrom: the edges that CLOSE this End-pole. TRIPWIRE — single source of
 *  truth for "is this closed": a closing is either a legacy quality-carrying q-grounding
 *  edge FROM `end`, OR a bare edge FROM `end` whose object is a designated Now-pole
 *  (2026-07-20 narrowing — needed since a bare charge is also FROM `end` now, so direction
 *  alone no longer disambiguates; the Now-pole check does). Every caller asking "is this
 *  End closed" must go through here, not re-derive it. */
function closingEdgesFrom(soc: Society, end: string, asOf?: number): EventRow[] {
  const quality = prehensionsFrom(soc, end, "q-grounding", asOf);
  if (!isDesignatedEndPole(soc, end, asOf)) return quality.filter((p) => !isOccluded(soc, p.slug, asOf));
  const bare = soc.edgesFromSubject(end).filter(
    (b) => b.object !== null && visibleAt(b, asOf) && !hasAnyQuality(soc, b.slug, asOf) &&
      isNowPole(soc, b.object, asOf),
  );
  return [...quality, ...bare].filter((p) => !isOccluded(soc, p.slug, asOf));
}

/** endActual: is this End-pole actual (closed because a Now)? Reads closingEdgesFrom;
 *  before closing, an End rests on nothing — scripted, open. */
export function endActual(soc: Society, end: string, asOf?: number): boolean {
  return closingEdgesFrom(soc, end, asOf).length > 0;
}

/** chargesOn: the charges on a differential — un-occluded bare edges whose SUBJECT is the
 *  End (2026-07-20: "the End prehends the capture"). TRIPWIRE: must exclude any bare edge
 *  whose object is a designated Now-pole, since those are closings, not charges — mirrors
 *  scher-core's charges_on exactly. */
export function chargesOn(soc: Society, end: string, asOf?: number): EventRow[] {
  // Mirrors scher-core's edges_from_subject use, post charge-direction flip 2026-07-20.
  return soc.edgesFromSubject(end).filter(
    (b) => b.object !== null && visibleAt(b, asOf) &&
      !hasAnyQuality(soc, b.slug, asOf) && !isOccluded(soc, b.slug, asOf) &&
      !isNowPole(soc, b.object, asOf),
  );
}

/** layCharge: mark voltage against `story` — a bare edge, subject the story's open
 *  End-pole, object the charged event (2026-07-20: "the End prehends the capture").
 *  Unpacks the event first if needed. Re-noticing is never a duplicate, just another
 *  charge. Also weaves `storyNow ~because~ charge` so the story's own frame witnesses it. */
export function layCharge(soc: Society, story: string, by: string, content = "charge"): string {
  const u = unpackPoles(soc, story); // lazy unpack on first need (idempotent)
  const n = soc.all().filter((b) => b.subject === u.end && b.object !== null && !hasAnyQuality(soc, b.slug)).length;
  const slug = `${u.end}~charge-${n}`;
  soc.lay({ slug, content, subject: u.end, object: by });
  soc.layP(`${u.now}~because~${slug}`, `the story's frame witnesses its charge`, u.now, slug, "q-grounding");
  return slug;
}

/** closePole: the done-verb's kernel half — the End, now actual, because the Now of its
 *  closing. Closes in the story's own frame: the closing Now is storyNow. Other frames
 *  read the closing once it establishes to them (see voltageOf). Idempotent.
 *  TRIPWIRE (2026-07-15): closes with a BARE edge (soc.lay(), no quality) — never
 *  layP — because a bare edge out of a designated End-pole IS the closing, structurally.
 *  Do not route this back through layP with "q-grounding". */
export function closePole(soc: Society, story: string, end?: string): string {
  const u = unpackPoles(soc, story, end ?? undefined);
  const theEnd = end ?? u.end;
  const closing = `${theEnd}~because~${u.now}`;
  soc.lay({ slug: closing, content: `the end is because now (frame: ${story})`, subject: theEnd, object: u.now });
  return closing;
}

/** voltageOf: the scalar across the story's differentials, relative to a ground — derived,
 *  stored nowhere. `ground` is a now-lineage head node; default is the story's own Now.
 *
 *  Per differential: closed for this ground iff some closing establishes to it (discharge
 *  propagates — no global zeroing, so an un-reached frame honestly reads residual
 *  voltage). While open: the strike and each charge count iff established to the ground.
 *  Simple sum, no decay this pass. */
export function voltageOf(soc: Society, story: string, ground = storyNow(story), asOf?: number): number {
  const poles = prehensionsFrom(soc, story, "q-end-pole", asOf).filter((p) => !isOccluded(soc, p.slug, asOf));
  let v = 0;
  for (const p of poles) {
    const end = p.object!;
    const closings = closingEdgesFrom(soc, end, asOf); // bare or legacy q-grounding
    const closedHere = closings.length > 0 && (
      // the story's own frame always witnesses its own closing; other grounds wait for
      // ordinary establishment (discharge propagates).
      ground === storyNow(story) ||
      closings.some((c) => c.object === ground || establishedTo(soc, ground, c.slug, asOf))
    );
    if (closedHere) continue; // discharged to this ground — this differential reads closed
    if (establishedTo(soc, ground, story, asOf)) v += 1; // the strike
    for (const c of chargesOn(soc, end, asOf)) {
      if (establishedTo(soc, ground, c.slug, asOf)) v += 1;
    }
  }
  return v;
}

/** reopenTask: strike a NEW differential across the same subject matter — a fresh unpack
 *  to a fresh unactualized End. Never an un-doing: the prior End stays actual forever
 *  (Thursday's holding stays actual); no occlusion, no erasure, only a new opening. */
export function reopenTask(soc: Society, story: string): PoleUnpack {
  unpackPoles(soc, story); // a never-unpacked story reopens by unpacking first (lineage laid once)
  const n = prehensionsFrom(soc, story, "q-end-pole").length;
  const end = `${story}~hea-${n}`;
  soc.lay({ slug: end, content: `the End-pole of ${story} (reopened), not yet actual`, subject: null, object: null });
  const pole = `${story}~end-pole~${end}`;
  // Q2 frame mark, same ink as unpackPoles.
  soc.layP(pole, `End-pole designation (frame: ${story})`, story, end, "q-end-pole");
  // same frame, same lineage: the story's own Now (laid by the first unpack) carries on.
  return { once: story, end, pole, now: storyNow(story) };
}

// ── MEMBERSHIP: derived, never laid ink ─────────────────────────────────────────
// Ruling (2026-07-16): membership is never a stored containment edge — it's derived.
// LAW: m is a member of E iff
//   (1) m reaches E's Once through grounding, AND
//   (2) E's gathering edge reaches m: closed E uses end(E), open E uses now(E).
// A never-unpacked event gathers nothing — empty membership.

/** groundedCone: every node that reaches `once` through grounding — the backward cone,
 *  walked via reverse adjacency so it's one index-backed walk, not a scan. */
function groundedCone(soc: Society, once: string, asOf?: number): Set<string> {
  const seen = new Set<string>();
  const stack = [once];
  while (stack.length) {
    const n = stack.pop()!;
    for (const p of prehensionsOnto(soc, n, "q-grounding", asOf)) {
      if (isOccluded(soc, p.slug, asOf)) continue;
      const m = p.subject!;
      if (!seen.has(m)) { seen.add(m); stack.push(m); }
    }
  }
  return seen;
}

/** membersOf: the derived membership read. `event` need not be unpacked — returns []
 *  if not. Never consults `~holds~`/q-containment ink; walks grounding and gathering only. */
export function membersOf(soc: Society, event: string, asOf?: number): string[] {
  const end = endOf(soc, event);
  const now = storyNow(event);
  const hasNow = soc.has(now); // storyNow is a pure address — existence means the unpack ran
  if (end === null && !hasNow) return []; // never unpacked: nothing gathers, nothing is inside
  const gatherFrom = end !== null && endActual(soc, end, asOf) ? end : now;
  const cone = groundedCone(soc, event, asOf); // candidates: grounds in E's Once
  const out: string[] = [];
  for (const m of cone) {
    if (m === end || m === now) continue; // the pole/Now machinery is not itself a member
    if (reaches(soc, gatherFrom, m, "q-grounding", asOf)) out.push(m);
  }
  return out;
}

// ── BUCKETS: the drawer/interior read, built on membersOf's same walks ──────────────
// Partitions what's around an event into the shapes the card UI's drawers/interior read
// (drawer-contents.md item 10). "after"/"before" are OUTSIDE membership. "interior"
// partitions the INTERVAL SET (see intervalSet's own doc — not membersOf).
//
// THE LURE LAW (Hallie, 2026-07-17): "prehension by the future is appetition, prehension
// by now is past." So: future = prehends-the-Now (reaches(m, now)), past = gathered by
// Now. A sublime's grip on an event is APPETITION, read as a CHARGE, never grounding —
// see sublimesChargedFrom.
//
// sublimesTree is a flat closest-first array, not a nested tree — no branching shape is
// specified anywhere, so this doesn't invent one.

/** Buckets is the shape drawer-contents.md item 10 asks for. `sublimesTree` is a flat
 *  closest-first array (see call (c) above), not a nested tree. */
export interface Buckets {
  after: { direct: string[]; sublimesTree: string[]; indirect: string[]; indirectSublimesTree: string[] };
  before: { direct: string[]; indirect: string[] };
  interior: { future: string[]; present: string[]; past: string[] };
}

/** sublimesChargedFrom: THE LURE LAW — a sublime's grip on an event is appetition, read
 *  as a CHARGE, never grounding. "Which sublimes does this event sail under" reads edges
 *  onto `node` whose subject is a sublime-pole (2026-07-20 direction ruling: sublimes
 *  prehend the events charged toward them — subject=sublime, object=event). Mirrors
 *  chargesOn's shape from the opposite pole. */
function sublimesChargedFrom(soc: Society, node: string, asOf?: number): string[] {
  return soc.edgesOntoObject(node)
    .filter((b) => b.subject !== null && visibleAt(b, asOf) &&
      !hasAnyQuality(soc, b.slug, asOf) && !isOccluded(soc, b.slug, asOf) &&
      isSublimePole(soc, b.subject, asOf))
    .map((b) => b.subject!);
}

/** intervalSet: the INTERIOR's domain — bounded by both poles, wider than membersOf on
 *  an open event.
 *
 *  TRIPWIRE (2026-07-17): this never reads the End at all, open or closed. Do not try
 *  "reached by the End's scripted cone" — laying `end ~because~ someEvent` on a
 *  never-closed pole is accepted by layP but immediately flips endActual(end) to true as
 *  a side effect (scripting onto an open End silently closes it). Instead: the bounded
 *  interval is groundedCone(event) minus pole/Now infra — everything that reaches E's
 *  Once through grounding, same shape whether the story is open or closed. future/present/
 *  past (in bucketsOf) do all the work of separating "already gathered" from "still
 *  ahead." A never-unpacked event has no bounded interval. */
function intervalSet(soc: Society, event: string, asOf?: number): Set<string> {
  const end = endOf(soc, event);
  if (end === null) return new Set();
  const now = storyNow(event);
  const cone = groundedCone(soc, event, asOf); // grounds-in-Once candidates == the interval
  const out = new Set<string>();
  for (const m of cone) {
    if (m === end || m === now) continue; // pole/Now machinery is not itself an interval member
    out.add(m);
  }
  return out;
}

/** bucketsOf: the derived event → {after, before, interior} read (drawer-contents.md
 *  item 10). Built ON membersOf/its same grounding-walk primitives — one derivation,
 *  never two. Occlusion-honored throughout (every hop goes through prehensionsFrom/Onto,
 *  which already filter it). */
export function bucketsOf(soc: Society, event: string, asOf?: number): Buckets {
  const now = storyNow(event);
  const hasNow = soc.has(now);
  const end = endOf(soc, event);
  // the event's OWN pole/Now infrastructure is never itself an after/before neighbor —
  // unpackPoles lays `now~because~event` and `end~because~now`, both plain grounding
  // edges, so without this filter the Now/End nodes leak into "what prehends this event."
  const isInfra = (n: string) => n === now || n === end;

  // AFTER: what prehends this event (call (a)) — edges FROM another node grounding-in
  // `event` itself, i.e. prehensionsOnto(event) gives edges whose object is event.
  const directAfterRows = prehensionsOnto(soc, event, "q-grounding", asOf);
  const directAfter = directAfterRows.map((p) => p.subject!).filter((n) => !isInfra(n));
  // sublimesTree: stars a direct-after event sails under, closest-first, deduplicated.
  const sublimesSeen = new Set<string>();
  const sublimesTree: string[] = [];
  for (const m of directAfter) {
    for (const star of sublimesChargedFrom(soc, m, asOf)) {
      if (sublimesSeen.has(star)) continue;
      sublimesSeen.add(star); sublimesTree.push(star);
    }
  }
  const indirectAfterSeen = new Set<string>(directAfter);
  const indirectAfter: string[] = [];
  for (const m of directAfter) {
    for (const p of prehensionsOnto(soc, m, "q-grounding", asOf)) {
      const n = p.subject!;
      if (isInfra(n) || indirectAfterSeen.has(n)) continue;
      indirectAfterSeen.add(n); indirectAfter.push(n);
    }
  }
  const indirectSublimesSeen = new Set<string>(sublimesTree);
  const indirectSublimesTree: string[] = [];
  for (const m of indirectAfter) {
    for (const star of sublimesChargedFrom(soc, m, asOf)) {
      if (indirectSublimesSeen.has(star)) continue;
      indirectSublimesSeen.add(star); indirectSublimesTree.push(star);
    }
  }

  // BEFORE: what this event prehends (call (a)) — prehensionsFrom(event) gives edges
  // whose subject is event, i.e. event ~because~ object.
  const directBeforeRows = prehensionsFrom(soc, event, "q-grounding", asOf);
  const directBefore = directBeforeRows.map((p) => p.object!).filter((n) => !isInfra(n));
  const indirectBeforeSeen = new Set<string>(directBefore);
  const indirectBefore: string[] = [];
  for (const m of directBefore) {
    for (const p of prehensionsFrom(soc, m, "q-grounding", asOf)) {
      const n = p.object!;
      if (isInfra(n) || indirectBeforeSeen.has(n)) continue;
      indirectBeforeSeen.add(n); indirectBefore.push(n);
    }
  }

  // INTERIOR: partition the interval set by relation to E's own Now. past = gathered by
  // Now. future = prehends the Now (reaches(m, now)) — item 9 verbatim, not "anything not
  // yet gathered." present = the straddler: neither ahead of nor behind the Now.
  const future: string[] = [], present: string[] = [], past: string[] = [];
  for (const m of intervalSet(soc, event, asOf)) {
    const gatheredByNow = hasNow && reaches(soc, now, m, "q-grounding", asOf);
    if (gatheredByNow) { past.push(m); continue; }
    const prehendsNow = hasNow && reaches(soc, m, now, "q-grounding", asOf);
    if (prehendsNow) future.push(m);
    else present.push(m); // in the interval, not gathered, doesn't prehend the Now: the straddler
  }

  return {
    after: { direct: directAfter, sublimesTree, indirect: indirectAfter, indirectSublimesTree },
    before: { direct: directBefore, indirect: indirectBefore },
    interior: { future, present, past },
  };
}

/** countsOf: coarse-LOD variant for a collapsed/summary render — counts only, never the
 *  member arrays. Not bucketsOf-then-.length: it counts directly so a badge-only caller
 *  never pays to materialize arrays it won't use. */
export interface BucketCounts {
  after: { direct: number; sublimesTree: number; indirect: number; indirectSublimesTree: number };
  before: { direct: number; indirect: number };
  interior: { future: number; present: number; past: number };
}

export function countsOf(soc: Society, event: string, asOf?: number): BucketCounts {
  const now = storyNow(event);
  const hasNow = soc.has(now);
  const end = endOf(soc, event);
  const isInfra = (n: string) => n === now || n === end; // see bucketsOf's own comment

  const directAfterRows = prehensionsOnto(soc, event, "q-grounding", asOf);
  const directAfter = directAfterRows.map((p) => p.subject!).filter((n) => !isInfra(n));
  // sublimesTree via CHARGE, not grounding — THE LURE LAW, see sublimesChargedFrom's own doc.
  const sublimesSeen = new Set<string>();
  for (const m of directAfter) {
    for (const star of sublimesChargedFrom(soc, m, asOf)) sublimesSeen.add(star);
  }
  const indirectAfterSeen = new Set<string>(directAfter);
  const indirectAfterList: string[] = [];
  for (const m of directAfter) {
    for (const p of prehensionsOnto(soc, m, "q-grounding", asOf)) {
      const n = p.subject!;
      if (isInfra(n) || indirectAfterSeen.has(n)) continue;
      indirectAfterSeen.add(n);
      indirectAfterList.push(n);
    }
  }
  const indirectAfter = indirectAfterList.length;
  const indirectSublimesSeen = new Set<string>(sublimesSeen);
  for (const m of indirectAfterList) {
    for (const star of sublimesChargedFrom(soc, m, asOf)) indirectSublimesSeen.add(star);
  }
  const sublimesTree = sublimesSeen.size;
  const indirectSublimesTree = indirectSublimesSeen.size - sublimesSeen.size;

  const directBeforeRows = prehensionsFrom(soc, event, "q-grounding", asOf);
  const directBefore = directBeforeRows.map((p) => p.object!).filter((n) => !isInfra(n));
  const indirectBeforeSeen = new Set<string>(directBefore);
  let indirectBefore = 0;
  for (const m of directBefore) {
    for (const p of prehensionsFrom(soc, m, "q-grounding", asOf)) {
      const n = p.object!;
      if (isInfra(n) || indirectBeforeSeen.has(n)) continue;
      indirectBeforeSeen.add(n);
      indirectBefore++;
    }
  }

  // INTERIOR domain is the interval set, not membersOf; future = prehends-Now (item 9
  // verbatim), present = the straddler — see bucketsOf's own note.
  let future = 0, present = 0, past = 0;
  for (const m of intervalSet(soc, event, asOf)) {
    const gatheredByNow = hasNow && reaches(soc, now, m, "q-grounding", asOf);
    if (gatheredByNow) { past++; continue; }
    const prehendsNow = hasNow && reaches(soc, m, now, "q-grounding", asOf);
    if (prehendsNow) future++;
    else present++;
  }

  return {
    after: { direct: directAfter.length, sublimesTree, indirect: indirectAfter, indirectSublimesTree },
    before: { direct: directBefore.length, indirect: indirectBefore },
    interior: { future, present, past },
  };
}

// ── THE ALGEDONIC CHANNEL (Beer) — pain the system must not be able to mute ──────────
// Two reads, no writes. TRIPWIRE (don't-plug-the-channel law): these must never be
// silently filtered or thresholded in the kernel. Threshold policy is Hallie's; the
// kernel always returns raw readings, loudest first.

/** one floating differential: charge nobody's lineage holds. */
export interface FloatingCharge {
  story: string;
  end: string;
  /** the story's own frame's Now — unreachable from every live ground given. */
  now: string;
  /** raw un-occluded charge count on the open End (absolute — no ground can read it). */
  charges: number;
}

/** floatingCharge: open differentials carrying charge whose story-frame has no path from
 *  any live ground. `grounds` are lineage-head nodes; locating them is the caller's job.
 *  Sorted loudest first. Never silently filter (don't-plug-the-channel). */
export function floatingCharge(soc: Society, grounds: ReadonlyArray<string>, asOf?: number): FloatingCharge[] {
  const out: FloatingCharge[] = [];
  const seen = new Set<string>();
  for (const b of soc.all()) {
    // every un-occluded designation names a differential (subject = story, object = end)
    if (b.subject === null || b.object === null) continue;
    if (!prehendsAs(soc, b.slug, "q-end-pole", asOf) || isOccluded(soc, b.slug, asOf)) continue;
    if (endActual(soc, b.object, asOf)) continue; // closed — not floating, discharging normally
    const key = `${b.subject}\u0000${b.object}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const charges = chargesOn(soc, b.object, asOf).length;
    if (charges === 0) continue; // an idle open differential is calm, not dukkha
    const now = storyNow(b.subject);
    const held = grounds.some((g) => g === now || reaches(soc, g, now, "q-grounding", asOf));
    if (!held) out.push({ story: b.subject, end: b.object, now, charges });
  }
  return out.sort((a, b) => b.charges - a.charges);
}

/** one story's contribution to a lineage's load. */
export interface VoltageReading {
  story: string;
  voltage: number;
}

/** overload: total voltage grounded through ONE lineage. Reads voltageOf for every story
 *  against the given ground; raw readings, loudest first, no threshold applied here. */
export function overload(soc: Society, ground: string, asOf?: number): { ground: string; total: number; readings: VoltageReading[] } {
  const stories = new Set<string>();
  for (const b of soc.all()) {
    if (b.subject !== null && b.object !== null &&
        prehendsAs(soc, b.slug, "q-end-pole", asOf) && !isOccluded(soc, b.slug, asOf)) {
      stories.add(b.subject);
    }
  }
  const readings: VoltageReading[] = [];
  let total = 0;
  for (const story of stories) {
    const voltage = voltageOf(soc, story, ground, asOf);
    if (voltage > 0) readings.push({ story, voltage });
    total += voltage;
  }
  readings.sort((a, b) => b.voltage - a.voltage);
  return { ground, total, readings };
}

// ── authorOf, distanceToHEA, assigneesOf: moved to biography.ts / strain.ts ──
// (2026-07-15). Names unchanged; both import their kernel primitives from here.

// DRAMA CUT (2026-07-15): resolutionOf/isResolved and q-resolves were removed — zero
// live edges used them. Door marked (see KernelQuality above), not erased.

/** cleanContent: strip legacy substance-smell from a beat's content on READ.
 *  Legacy beats stored a "[well]/[better] " prefix in content; new beats store clean.
 *  Append-only means we can't edit the old content — so we strip on display. */
export function cleanContent(s: string): string {
  // TODO(socratic): when is cleanContent called — in every render, or once on load — and should the stripping happen in read-land or be a display concern?
  return s.replace(/^\[(well|better)\] /, "");
}


// ── BIOGRAPHY, SUBLIME/PATH-TO-SUBLIME READS: moved to biography.ts / sublimes.ts ──
// (2026-07-15). Names unchanged; both import their kernel primitives from here.
// See index.ts for the re-export surface.
