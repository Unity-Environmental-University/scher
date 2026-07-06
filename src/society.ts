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
 *  ending '~q', object the quality itself — usually a q-*, but the spelling is never
 *  read; see hasAnyQuality) carries mode. */
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
  // N4 (Hallie, 2026-07-03): under the universal-grounding ruling the explicit q-grounding
  // mode-beat is BEGINNING DEPRECATION — every because-edge grounds relative to its laying
  // frame, so the marker trends redundant. Still fully usable until a future roadmap point;
  // reads keep honoring it. New writers should know the stock is scheduled, not eternal.
  | "q-grounding"
  // q-lure is DEAD — killed with fire (Hallie, 2026-07-06): it smuggled an agent (who
  // lures?) and could not state its own direction. It is NOT in this union and layP
  // REFUSES it (assertNoLure, below — blocking, unlike the containment holler). The
  // three-pole unpack replaces it: q-end-pole designates a pole, structurally.
  | "q-end-pole"
  | "q-exclusion"
  | "q-utterance"
  | "q-feel"
  | "q-containment"
  | "q-depends-on"
  | "q-resolves"
  | "q-occludes"
  // NOTE: there is deliberately NO charge quality. Charge is a pure ADDRESS read (Hallie,
  // 2026-07-06: "the charge is a property of the edge not of the node") — a charge is any
  // bare prehension onto a story's open End-pole (see chargesOn / the address law at
  // assertNakedPole). Minting a q-charge word would smuggle charge back into contents.
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
// scher laid this error itself, once, and corrupted its own containment reads doing it —
// this guard is scher owning that and refusing to let it happen silently again.
// THE LAW scher holds itself to: a beat's membership in a Story is its POSITION BETWEEN the
// Story's Once/End bounds — COMPUTED (intervalOf), CACHED if slow, CLEARLY DERIVED. It is
// NEVER a stored q-containment "inside" edge. q-containment is part/whole nesting only.
// Overloading it for membership is what scher corrupted: every read that walks containment,
// and the ability to tell authored-containment from derived-membership the instant a real
// edge landed in the wrong shape.
//
// So the guard hollers when q-containment is laid in the membership shape ('-in'/'@in'
// edges) — this is scher speaking about its own past mistake, not a generic lint. It does
// not block (won't break a running tool); it hollers, loudly, with the fix, because scher
// would rather a caller hear the lesson than repeat it quietly.
// ── DEAD GRAMMAR GUARD: q-lure is killed with fire ──────────────────────────────
// Hallie's ruling, 2026-07-06 (verbatim: "Q Lure is killed with fire thousands of times
// as it has been before"). Unlike the containment guard below, this one REFUSES — it does
// not holler and continue, because a laid lure would silently re-teach the dead grammar
// to every read downstream.
//
// WHY q-lure is dead: it smuggled an agent (who does the luring?) and could not state its
// own direction (does the Once lure the End, or the End the Once?). The pole law replaces
// it: an event is ONE event until lazily unpacked into its THREE poles — Once (the ground
// of everything, rests on nothing), End (when actual, is because Now), Now. End-hood is
// STRUCTURAL: the q-end-pole designation the unpack lays — never a lure edge, never a
// slug or content spelling.
//
// WHAT TO DO if you hit this: unpack the event into its poles (unpackPoles, or the
// done-verb's lazy unpack in gen4-policy's mark_done) and let the End close via
// `end ~because~ now` (q-grounding). If you are migrating old data, re-lay each lure as
// the unpack shape; the lure rows themselves stay in old logs as testimony, but no new
// society may carry them — assertNoLureInSociety scans for smuggled ones.
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
// THE LAW (one sentence, born with its guard per the meta-law of 2026-07-06): an open
// (not-yet-actual) End-pole receives ONLY charge-prehensions onto it and, eventually, the
// ONE closing q-grounding out of it — nothing else touches a naked pole; comments and
// references prehend the STORY, never its End.
//
// This is what makes charge a pure address read (chargesOn): "charges on this
// differential" = the bare prehensions onto its open End — the charge is a property of
// the EDGE, never of node-contents (Hallie, verbatim), so no charge quality-word exists
// to mint, and nothing else can be parked on the pole to muddy the count.
//
// WHAT TO DO if you hit this: prehend the STORY (the Once/event) instead — a comment, a
// dependency, a feel, a reference all belong on the story; only charges (bare edges) land
// on its open End, and only the closing grounding leaves it. Once the End is actual
// (closed), it is no longer naked and ordinary grammar applies.
export function assertNakedPole(
  soc: Society,
  slug: string,
  subject: string,
  object: string,
  quality: Quality,
): void {
  // the q-end-pole designation itself is what MAKES a pole — structural machinery, exempt
  // in both positions (a pole may itself be a story whose own End lies further in).
  if (quality === "q-end-pole") return;
  if (isOpenEndPole(soc, object)) {
    throw new Error(
      `[ADDRESS LAW] '${slug}' lays a ${quality} prehension ONTO the open End-pole ` +
      `'${object}'. A naked pole receives only charge-prehensions (bare edges) onto it — ` +
      `comments/references prehend the STORY, never its End. Fix: point this edge at the ` +
      `story (the pole's Once), or lay a bare edge if you mean a charge. (law: naked-pole)`,
    );
  }
  if (isOpenEndPole(soc, subject) && quality !== "q-grounding") {
    throw new Error(
      `[ADDRESS LAW] '${slug}' lays a ${quality} prehension OUT of the open End-pole ` +
      `'${subject}'. The only edge that ever leaves a naked pole is its ONE closing ` +
      `q-grounding ('end ~because~ now'). Fix: close the pole with q-grounding, or hang ` +
      `this relation on the story instead. (law: naked-pole)`,
    );
  }
}

/** isOpenEndPole: is `node` a designated End-pole (object of an un-occluded q-end-pole
 *  edge) that is not yet actual? The address law guards exactly these. */
function isOpenEndPole(soc: Society, node: string | null, asOf?: number): boolean {
  if (!node) return false;
  const designated = soc.all().some(
    (b) => b.object === node && b.subject !== null &&
      prehendsAs(soc, b.slug, "q-end-pole", asOf) && !isOccluded(soc, b.slug, asOf),
  );
  return designated && !endActual(soc, node, asOf);
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
    assertNoLure(slug, quality); // BLOCKS: q-lure is dead grammar (Hallie, 2026-07-06)
    assertNakedPole(this, slug, subject, object, quality); // BLOCKS: nothing touches a naked pole
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

/** hasAnyQuality: does this prehension co-prehend ANY quality — i.e. does its `~q`
 *  mode-beat exist? Structural: reads the mode-beat's PRESENCE (the layP constructor
 *  convention), never the object's text. This is the existential prehendsAs had no name
 *  for — "co-prehends *some* quality," not "co-prehends *this* one." It replaces the
 *  `q-` content-prefix sniff that used to classify plain vs quality edges (2026-07-06
 *  migration-design sitting, item 1): a quality family that doesn't spell `q-` (the
 *  coming f- stems) classifies correctly here because no spelling is ever read. */
export function hasAnyQuality(soc: Society, pslug: string, asOf?: number): boolean {
  const q = soc.get(pslug + "~q");
  return !!q && visibleAt(q, asOf);
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

/** groundedForAnyFrame: the society-standpoint AGGREGATE read — does some un-occluded
 *  grounding-prehension reach this beat, from ANY frame this store carries? Never "the"
 *  frame. (N1, Hallie 2026-07-03: soc IS a frame — this is that frame's own existential
 *  read, honestly named.) Under the every-event-is-done-to/by-its-author ruling this read
 *  trends toward true for every authored event once authorship-establishment lands; its
 *  honest use is occlusion-sensitive display, not doneness. For doneness, read
 *  establishedTo (frame-relative reachability, below). */
export function groundedForAnyFrame(soc: Society, beat: string, asOf?: number): boolean {
  // TODO(socratic): why check isOccluded on the prehension slug (p.slug, the edge) instead of also checking if the prehension's subject (the grounding frame) is occluded?
  return prehensionsOnto(soc, beat, "q-grounding", asOf).some((p) => !isOccluded(soc, p.slug, asOf));
}

/** @deprecated Alias of groundedForAnyFrame — same behavior, dishonest name (it reads as
 *  frame-free doneness, which the 2026-07-03 ruling made a malformed question). Migrate
 *  reads that mean "done" to establishedTo(readerNow, …); reads that mean "grounded for
 *  someone" to groundedForAnyFrame. Perishes when no caller remains (the pathosOf
 *  precedent: a greppable fact, not a policy wait). */
export function isEstablished(soc: Society, beat: string, asOf?: number): boolean {
  return groundedForAnyFrame(soc, beat, asOf);
}

// ── FRAME-RELATIVE ESTABLISHMENT (Hallie's ruling, 2026-07-03: "YES EVERY EVENT IS DONE
// to/by its author" — establishment is always relative to a standpoint; the frame-free
// question is malformed, and the old reads survive only as the society's OWN standpoint,
// per N1). Joint-sitting minutes: docs/committees/2026-07-03-q-grounding-joint-sitting.md ──

/** reaches: is `to` reachable from `from` along un-occluded prehensions co-prehending
 *  `quality`, walking subject→object, as of a moment? The BFS that existed twice
 *  (intervalOf's private walk here, done_to in gen4-policy) held once — the Now-pole
 *  minutes' gift-channel extraction, landed. `from === to` reaches trivially. */
export function reaches(soc: Society, from: string, to: string, quality: Quality, asOf?: number): boolean {
  if (from === to) return true;
  const seen = new Set<string>([from]);
  const stack = [from];
  while (stack.length) {
    const n = stack.pop()!;
    for (const p of prehensionsFrom(soc, n, quality, asOf)) {
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

/** establishedTo: frame-relative establishment — is `beat` behind the reader's Now on the
 *  grounding topology? `readerNow` is the reader-event's Now NODE: locating it (gen4's
 *  lazily-minted now-{frame}, or any future scheme) is POLICY and stays outside the kernel —
 *  the kernel takes a node, never a slug convention (opaque-slugs law). The missing-Now
 *  short-circuit ("no Now ⇒ nothing done-to-me") likewise lives with the caller, who knows
 *  whether a Now exists.
 *
 *  DELIBERATELY ABSENT, pending Hallie's F-A ruling: the authorship clause (done to/by its
 *  author from birth). Do not add it here without the ruling — the three-way fork
 *  (forever-done / occurrence-vs-work split / occludable authorship) changes its shape. */
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

/** is_story: has `beat` been UNPACKED into its poles? Story-hood is STRUCTURAL (F-A
 *  ruling + pole law, 2026-07-06): an event is one event until lazily unpacked into its
 *  three poles; the unpack lays a q-end-pole designation whose object is the story's End.
 *  The old read keyed on a q-lure toward a slug spelling "end" — the lure is killed with
 *  fire (assertNoLure) and no spelling is read anymore ("weekend-plans" confers nothing). */
export function isStory(soc: Society, beat: string): boolean {
  // TODO(socratic): should isStory also check that the designation is not occluded, or is the existence of a pole-edge enough regardless of occlusion?
  return prehensionsFrom(soc, beat, "q-end-pole").length > 0;
}

/** content beats: subject===null and not a '~q' mode-beat — the nodes, not the edges. */
export function contentBeats(soc: Society): EventRow[] {
  return soc.all().filter((b) => b.subject === null && !b.slug.endsWith("~q"));
}

/** interval_of: the causal diamond between a Once and an End — the forward-cone of
 *  `once` ∩ the backward-cone of `end`, following plain (non-quality) prehension edges.
 *  The interior of a Story. */
export function intervalOf(soc: Society, once: string, end: string): string[] {
  // Interval edges: every prehension that is not the quality machinery itself. Excluded:
  // ~q mode-beats (the constructor convention), and edges whose OBJECT is a quality token
  // — read structurally as "appears as the object of some visible ~q mode-beat," never by
  // spelling, so a quality family that doesn't spell `q-` (the coming f- stems) still
  // classifies out (migration-design item 1's real target: quality-DESIGNATION edges).
  //
  // CORRECTION (2026-07-06, debugging sitting on event-1350): the first structural
  // replacement here used !hasAnyQuality(edge) — the edge's OWN mode-beat presence. That
  // is a different predicate from the old object-spelling sniff: it excluded every
  // quality-CARRYING edge, i.e. every layP-ed edge, from the walk, emptying production
  // story intervals (gen4 bujo lays its membership fabric via layP q-grounding — and MUST,
  // because under the address law a bare edge onto an open End reads as a charge). The
  // sitting's own invariant was "no kernel behavior change for any existing caller";
  // this restores it. Conformance twin: interval-plain-edges.test.ts / lib.rs tests.
  const qualityTokens = new Set<string>();
  for (const b of soc.all()) {
    if (b.slug.endsWith("~q") && b.object !== null && visibleAt(b)) qualityTokens.add(b.object);
  }
  const edges = soc.all().filter(
    (b) => b.subject !== null && b.object !== null && !qualityTokens.has(b.object) && !b.slug.endsWith("~q"),
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

/** the story's End-pole — the object of its q-end-pole designation (laid by the unpack),
 *  structurally; no spelling is read (F-A ruling + pole law, 2026-07-06). */
export function endOf(soc: Society, story: string): string | null {
  // TODO(socratic): should endOf return null if the designation is occluded, or is the presence of any pole-edge the right answer?
  // TODO(socratic): if a story carries multiple pole-designations (reopened differentials), [0] returns only the first — is that intentional or a bug?
  const pole = prehensionsFrom(soc, story, "q-end-pole")[0];
  return pole?.object ?? null;
}

// ── THREE-POLE UNPACK · CHARGE · VOLTAGE (F-A ruling + pole law, Hallie 2026-07-06) ──
// "Capture strikes a voltage; marking voltage lays charge; done closes the circuit;
// nothing ever un-happens." (docs/committees/2026-07-06-F-A-ruled-voltage.md) — and, same
// morning: "An event is one event until it's lazily unpacked into the THREE poles."
//
// A captured event is ONE event — no poles minted, no story apparatus — until FIRST NEED
// (the first operation requiring the differential: a charge, a done-verb, an explicit
// story elaboration). The unpack lays the three-pole structure: the event stands as its
// own Once (the ground of everything, rests on nothing); an End-pole is minted, not yet
// actual (its Mode reads "scripted" — the honest existing mechanism), designated by the
// STRUCTURAL q-end-pole edge (never a lure — killed with fire, see assertNoLure — and
// never a slug or content spelling). The Now-relation is the pole law's closing move:
// when the End becomes actual it is BECAUSE the Now of its closing (`end ~because~ now`,
// q-grounding) — laid by the done-verb, never at unpack.
//
// The openness is VOLTAGE — read ACROSS the poles, stored in neither, and ALWAYS relative
// to a reference (Hallie, 2026-07-06 second sitting): the GROUND — the head of a frame's
// now-lineage ("the head of the society — the last now that the user's now is because (or
// whatever frame's now)", her words). A charge/strike/closing counts toward a reading iff
// it is ESTABLISHED TO that ground (the established_to walk); nothing is ever globally
// zeroed — a closing DISCHARGES outward by ordinary reachability, so a frame the closing
// has not yet established to honestly reads residual voltage ("done, still discharging").
//
// Marking voltage lays CHARGE — a BARE edge onto the open End-pole (pure address, see the
// naked-pole law); the scalar is derived, never stored. Done closes the circuit (End
// because Now) — the closed circuit IS a closed because-path End → Now-lineage → Once.
// Reopen = a NEW unpack (new differential), never an un-doing.
//
// NOTE (occlusion-of-now-connections): nothing here depends on its presence or absence —
// it is OUT of this ruling, chartered as a gen5 roadmap feature in the ruling minute.

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

/** the story's own frame's Now — the `${story}~now` constructor convention (an ADDRESS,
 *  the layP/`~hea` shape — reads never parse it). Under SOFD this Now's lineage head is
 *  voltage's default ground. */
export function storyNow(story: string): string {
  return `${story}~now`;
}

/** unpackPoles: lazily unpack ONE event into its three-pole structure (first need only —
 *  callers that can wait should wait; a captured-and-abandoned event stays one event
 *  forever). Idempotent: an already-unpacked event returns its existing poles. `end`
 *  defaults to the `${event}~hea` constructor convention (an ADDRESS, the layP/`now-{frame}`
 *  shape — reads never parse it; the q-end-pole edge is what designates).
 *
 *  THREE lays: the End + its designation, and the story's own frame's first Now, BECAUSE
 *  the Once — "Now is because events," and the Once is the story's first event (Hallie
 *  confirmed Now belongs in the unpack, 2026-07-06 second sitting; the Now-grounds-in-Once
 *  relationship is the convener's proposal, STANDING UNLESS SHE AMENDS IT). With the
 *  closing's `end ~because~ now`, the closed circuit is a literal because-path
 *  End → Now-lineage → Once. */
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
  return { once: event, end, pole, now };
}

/** endActual: is this End-pole ACTUAL — is it because something (per the pole law, the
 *  Now of its closing)? Reads the un-occluded outgoing q-grounding edges FROM the End.
 *  Before the done-verb lays `end ~because~ now`, the End rests on nothing it grounds
 *  from — scripted, open, a differential. */
export function endActual(soc: Society, end: string, asOf?: number): boolean {
  return prehensionsFrom(soc, end, "q-grounding", asOf).some((p) => !isOccluded(soc, p.slug, asOf));
}

/** chargesOn: the charges on a differential — a PURE ADDRESS READ (the naked-pole law's
 *  payoff): the un-occluded BARE prehensions onto the End. No charge quality exists; the
 *  charge is a property of the EDGE, never of node-contents (Hallie, 2026-07-06). The
 *  designation edge (quality-carrying) and ~q machinery classify out structurally. */
export function chargesOn(soc: Society, end: string, asOf?: number): EventRow[] {
  return soc.all().filter(
    (b) => b.object === end && b.subject !== null && visibleAt(b, asOf) &&
      !hasAnyQuality(soc, b.slug, asOf) && !isOccluded(soc, b.slug, asOf),
  );
}

/** layCharge: mark voltage against `story` — a BARE edge onto the story's open End-pole
 *  (the address law: bare-edges-onto-an-open-End ARE the charges; nothing to mint). FIRST
 *  NEED: a charge requires the differential, so an un-unpacked event unpacks here. Never a
 *  duplicate task: re-noticing is additional charge across the existing differential.
 *  Also weaves the story's own lineage — `storyNow ~because~ charge` (SOFD: the charge is
 *  an event in the story's course, witnessed by the story's own frame) — which is exactly
 *  what makes the charge count for the default ground's voltage reading. */
export function layCharge(soc: Society, story: string, by: string, content = "charge"): string {
  const u = unpackPoles(soc, story); // lazy unpack on first need (idempotent)
  const n = soc.all().filter((b) => b.object === u.end && b.subject !== null && !hasAnyQuality(soc, b.slug)).length;
  const slug = `${u.end}~charge-${n}`;
  soc.lay({ slug, content, subject: by, object: u.end });
  soc.layP(`${u.now}~because~${slug}`, `the story's frame witnesses its charge`, u.now, slug, "q-grounding");
  return slug;
}

/** closePole: the done-verb's kernel half — the End, now actual, is BECAUSE the Now of
 *  its closing (`end ~because~ now`, the ONE grounding the address law lets leave a naked
 *  pole). Closes in the story's OWN frame (SOFD): the closing Now is storyNow, so the
 *  closed circuit is the literal because-path End → storyNow → Once. Other frames read
 *  the closing when it establishes to them (see voltageOf — discharge propagates, never a
 *  global zero); a closer's own frame acknowledges by grounding its now in the returned
 *  closing edge. Idempotent per lay. */
export function closePole(soc: Society, story: string, end?: string): string {
  const u = unpackPoles(soc, story, end ?? undefined);
  const theEnd = end ?? u.end;
  const closing = `${theEnd}~because~${u.now}`;
  soc.layP(closing, `the end is because now (frame: ${story})`, theEnd, u.now, "q-grounding");
  return closing;
}

/** voltageOf: the scalar across the story's differentials, read RELATIVE TO A GROUND —
 *  DERIVED, stored nowhere. `ground` is the reading frame's now-lineage HEAD as a NODE
 *  (locating/walking lineage heads for other frames is POLICY, per the kernel boundary;
 *  no structural now-succession exists yet, so a frame's single Now IS its head — TODO
 *  when now-succession lands: walk to "the last Now that nothing newer is because of").
 *  Default ground under SOFD: the story's own frame's Now.
 *
 *  Per differential (un-occluded designation):
 *   · CLOSED for this ground iff some un-occluded closing (grounding out of the End) is
 *     established to the ground — or the ground IS the closing's own Now. Discharge
 *     PROPAGATES: no global zeroing anywhere; a frame the closing hasn't established to
 *     honestly reads residual voltage ("done, still discharging").
 *   · while open: the strike counts iff the story is established to the ground, and each
 *     charge counts iff established to the ground (the established_to walk, both).
 *  Simple sum, no decay this pass — decay/weighting is a future READ policy (the events
 *  stay; only the derivation would change). */
export function voltageOf(soc: Society, story: string, ground = storyNow(story), asOf?: number): number {
  const poles = prehensionsFrom(soc, story, "q-end-pole", asOf).filter((p) => !isOccluded(soc, p.slug, asOf));
  let v = 0;
  for (const p of poles) {
    const end = p.object!;
    const closings = prehensionsFrom(soc, end, "q-grounding", asOf).filter((c) => !isOccluded(soc, c.slug, asOf));
    const closedHere = closings.length > 0 && (
      // SOFD: a closing on this story's End is an event laid IN the story's own course,
      // so the story's OWN frame witnesses it by definition — whoever's Now it closed
      // because. Other grounds wait for ordinary establishment (discharge propagates).
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

// ── THE ALGEDONIC CHANNEL (Beer) — pain the system must not be able to mute ──────────
// Two READS, no writes. These are the algedonic channel of the viable system: the signal
// that bypasses ordinary reporting because ordinary reporting is exactly what failed.
// DON'T-PLUG-THE-CHANNEL LAW: these readings must never be silently filtered, thresholded
// away in the kernel, or defaulted to quiet — threshold POLICY is Hallie's; the kernel
// returns the raw readings, sorted loudest-first, always.

/** one floating differential: charge nobody's lineage holds. */
export interface FloatingCharge {
  story: string;
  end: string;
  /** the story's own frame's Now — unreachable from every live ground given. */
  now: string;
  /** raw un-occluded charge count on the open End (absolute — no ground can read it). */
  charges: number;
}

/** floatingCharge: the dukkha nobody holds — open differentials CARRYING CHARGE whose
 *  story-frame has no path from any live ground (its now-lineage head unreachable from
 *  every active frame's head). `grounds` are the live frames' lineage-head NODES (policy
 *  locates them; the kernel takes nodes). Sorted by charge, loudest first. Algedonic:
 *  never silently filter this (don't-plug-the-channel). */
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

/** overload: the total voltage grounded through ONE lineage — the line over rating. Reads
 *  voltageOf for every story against the given ground and returns the raw readings sorted
 *  loudest-first plus their sum. NO threshold here — threshold policy stays Hallie's;
 *  algedonic: never silently filter this (don't-plug-the-channel). */
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
