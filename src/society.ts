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
  /** WHO laid this beat — the capturing/editing frame's subject (or a causing event's slug
   *  when machinery lays). CONSTITUTIVE, not relational (Hallie's ruling, 2026-07-07
   *  braid-of-societies: "no statement is not spoken from"). Mirrors scher-core's EventRow.laid_by. */
  laid_by?: string | null;
}

// The qualities the kernel itself branches behavior on — isOccluded/isGrounded/blockedBy/
// endReached/reactionsOn/authorOf all key a real read off one of these literal
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
  // N4 hardened (Hallie, 2026-07-15; supersedes the 2026-07-03 "beginning deprecation"):
  // q-grounding is PURELY DEPRECATED. "because is the one relation" is a laid event in the
  // live canon — the bare because-edge IS the relation, and the explicit q-grounding
  // mode-marker is redundant ink. Do not lay it in new writers.
  //
  // HONESTY CLAUSE (my comments never pretend): the kernel still BRANCHES on this string
  // for LEGACY rows. reaches/establishedTo walk it (both spellings, via closingEdgesFrom
  // for the pole-closing case); the sublime guard (checkSublimeNeverCloses) keys on it;
  // groundedForAnyFrame reads it (ordinary grounding-onto, unrelated to pole-closing — see
  // its own trace comment). "Purely deprecated" here means the WRITE grammar is closed,
  // not that the reads are gone — laid q-grounding rows stay honored forever (append-only:
  // the ink stays, as always).
  //
  // MIGRATION ANSWER, RULED (Hallie, 2026-07-15: "yes its edge direction"): the tension
  // above — how do the naked-pole law and sublime guard tell a closing from a charge
  // once the quality-marker is gone — is settled by EDGE DIRECTION alone. Under
  // bare-because, a bare edge ONTO an open End-pole is a charge; a bare edge OUT of it
  // is the closing. No quality needed: the pole's structure plus the edge's direction
  // carry the whole distinction.
  //
  // MECHANIZED AND LANDED (2026-07-15: "schedule it and feel free to act on it" — the
  // follow-up ruling authorizing the actual rewrite). assertNakedPole needed no change —
  // it's reachable only through layP, which requires a Quality, so a bare edge never
  // reached it, "bare ONTO = charge" and "bare OUT = closing" were already true by
  // construction. What DID need to change, and now has: closePole itself closes with a
  // bare .lay() (no quality, no '~q' beat), not layP(..., "q-grounding") — see closePole's
  // own doc. Every read that recognizes a closing (endActual, voltageOf, reaches when
  // walking "q-grounding") now goes through closingEdgesFrom, which unions the bare shape
  // with this legacy quality-carrying spelling. This union type still carries "q-grounding"
  // for exactly that reason: legacy rows and non-pole ordinary groundings (comments,
  // toggle-buttons — see stories.ts's NAMED EXCEPTION) still lay and read it.
  | "q-grounding"
  // q-lure is DEAD — killed with fire (Hallie, 2026-07-06): it smuggled an agent (who
  // lures?) and could not state its own direction. It is NOT in this union and layP
  // REFUSES it (assertNoLure, below — blocking, unlike the containment holler). The
  // three-pole unpack replaces it: q-end-pole designates a pole, structurally.
  | "q-end-pole"
  // q-sublime-pole designates a never-closing pole (2026-07-06 sublimes-store design):
  // unlike an End-pole (which closes when `end ~because~ now`), a sublime-pole is forever
  // open. It is INERT — never lures, never actualize. Its structure is "star for navigation,
  // not a destination to land" (Hallie).
  | "q-sublime-pole"
  | "q-exclusion"
  | "q-utterance"
  | "q-feel"
  | "q-containment"
  // RENAMED from q-depends-on (Hallie, 2026-07-15): "depends-on is too close to need to
  // drift and we need the language to be the language" — she considered letting topology
  // disambiguate instead, then ruled a rename over that. Live canon carries exactly 2
  // legacy q-depends-on rows (append-only ink — it stays); the dependsOn/blockedBy read
  // family below honors BOTH spellings with a dated comment. New writes: q-blocked-by only.
  | "q-blocked-by"
  // DRAMA CUT (Hallie, 2026-07-15: "drama isn't really in the picture any more... cut for
  // now and mark the commit — I suspect trub handles it"). Verified against live canon:
  // ZERO q-resolves edges exist — the cut is data-clean, no migration owed. Removed with
  // it: resolutionOf/isResolved (society.ts) — the only two readers, gone with the quality.
  // This is a door marked, not erased: a future drama pass may reopen it, informed by how
  // trub actually ended up handling resolution. Do not resurrect the string without a
  // fresh ruling; do not treat this comment as a spec for what the future pass should do.
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
  // EDGE-DIRECTION RULING, MECHANIZED (2026-07-15: "yes its edge direction... no quality
  // needed" — see the MIGRATION ANSWER comment on KernelQuality above; "schedule it and
  // feel free to act on it" was the follow-up ruling that authorized landing the actual
  // rewrite, not just the comment). closePole now closes with a BARE edge (soc.lay()
  // directly — see closePole's own body), so this guard is reachable from exactly one
  // call site, layP, whose signature REQUIRES a Quality argument: a bare closing edge
  // never reaches this check at all, same as a bare charge never did (chargesOn's model).
  // The `quality !== "q-grounding"` exemption below is now LEGACY-ONLY: no live writer in
  // this codebase routes a closing through layP with the literal "q-grounding" string
  // anymore (grep confirms — closePole was the one that did). It stays, unremoved, for two
  // honest reasons: (1) refusing it would be a guard-behavior change beyond this ruling's
  // scope — nobody asked to forbid a legacy-shaped write, only to stop closePole making
  // one; (2) it costs nothing to leave, since nothing exercises it going forward. Pinned:
  // address-law.test.ts's bare-edge-closes case (was already true by construction; now
  // ALSO true because closePole actually calls it) plus a fresh bare-closePole pin.
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

/** isDesignatedEndPole: is `node` the object of an un-occluded q-end-pole designation —
 *  structural End-hood, regardless of whether it has since closed? Factored out of
 *  isOpenEndPole (2026-07-15, bare-closing wave) because the closing-recognition helpers
 *  below need this same structural test on a node that IS actual (a closed End is still
 *  an End; only isOpenEndPole cares whether it's still naked). */
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
// WHAT TO DO if you hit this: a sublime is not a story endpoint. Do not try to
// close it or mark it as done. If you mean to actualize an End, use an End-pole
// instead (designate it with q-end-pole and close it with `end ~because~ now`).
// A sublime's purpose is to ORIENT pursuit, not to be reached. (law: sublime-never-closes)
// REFUSAL, NOT A THROW (Hallie's ruling, 2026-07-07: "a scream with no ears is not a scream,
// it's a seizure"). This used to `throw`; layP caught nothing, so any uncaught throw here was
// effectively also a seizure wherever it landed in an event loop with no surrounding
// try/catch. The RULE is unchanged — only the mechanism of refusal, from an exception to a
// returned message layP can act on. Returns the violation message, or null if the write is fine.
//
// STATUS, CORRECTED (2026-07-15, cooling wave, tension 3: layP-dead-guards): the doc-comment
// below on assertSublimeNeverCloses claimed layP calls THIS non-throwing function instead —
// checked directly against layP's body: it does not. layP still calls the throwing
// assert* wrapper (and its assertSublimeAcyclic sibling), same as it always has; this
// check* function is correct, tested indirectly (assertSublimeNeverCloses delegates to it),
// but has ZERO direct callers of its own. The throw→return swap in layP is a real behavior
// change — every one of layP's ~26 call sites currently assumes a throw, not a checked
// return — and isn't mine to make silently mid-cooling-pass; it needs its own ruling on
// how callers should react to a non-throwing refusal (log and drop the write? surface to
// UI? something else?). Until that ruling lands, the throwing path IS the live one for
// all four of layP's guards, not just two — the "two migrated, two stalled" framing this
// comment used to imply was itself inaccurate; none of layP's guards have migrated yet.
//
// RULED, CLOSED (Hallie, 2026-07-15, after the algedonic-channel sitting —
// docs/committees/2026-07-15-algedonic-channel-sitting.md): "Yeah we don't need it
// explicit — pain should show the shape." The skeptic's position carried: the guards KEEP
// THROWING. No refusal-event machinery, no check* wiring in layP, no speculative channel
// design. This is not a shelved migration anymore; it is a decided non-build. The earlier
// law still stands ("Nothing should be silent - algedonic channel", 2026-07-15 morning) —
// and a throw satisfies it: an uncaught exception is loud (it stops the world, it shows up
// in a stack trace, nobody mistakes it for success), while a checked return a caller
// forgets to inspect WOULD be silent — the write appears to succeed while the refusal
// evaporates. The question re-opens only when real pain — actual users hitting actual
// silent refusals — reveals what shape the channel wants. Until then: throwing path,
// on purpose. Do not flip layP to the check* variants; a silent checked-return regime
// would be a REGRESSION against "nothing should be silent," not progress toward it.
//
// What that makes checkSublimeNeverCloses (and checkSublimeAcyclic below): non-throwing
// twins with no direct caller and no pending migration. They are kept ink — correct,
// tested through their assert* wrappers, waiting for a pain-revealed shape that may
// never come, and fair candidates for a future cut if it doesn't. Not deleted here;
// the ruling was about not-building the channel, not about removing what exists.
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

/** NOT deprecated, corrected 2026-07-15 (was wrongly marked @deprecated, claiming layP no
 *  longer calls this — checked directly: it does, today, still throwing). This IS the live
 *  path layP calls (see layP's body). The swap to the non-throwing twin is now CLOSED by
 *  ruling, not pending (Hallie, 2026-07-15: "pain should show the shape") — see the RULED
 *  comment on checkSublimeNeverCloses above. This wrapper is the guard, on purpose. */
export function assertSublimeNeverCloses(soc: Society, slug: string, subject: string, object: string, quality: Quality): void {
  const violation = checkSublimeNeverCloses(soc, slug, subject, object, quality);
  if (violation) throw new Error(violation);
}

// ── SUBLIME-DAG GUARD: RELAXED — aims mutually prehend at the limit ───────────────
// RELAXATION (Hallie, 2026-07-10; kernel-guard advocate's CORE cut, mirrored here):
// sublime→sublime is a BEARING (bare `because`), NOT a q-grounding. And a ring of
// sublime-bearings — A serves B serves ... serves A, including the pairwise A↔B — is
// now ALLOWED. The old acyclic block is REMOVED for the both-ends-sublime case, which
// is the ONLY case this guard ever fired on, so the cycle refusal is gone entirely.
//
// WHY (Hallie's frames, the ground for this cut — same image as scher-core/src/lib.rs):
//   (1) "The SUBLIME is the limit of all future events taken to infinity — a little
//        outside of time — so aims can mutually prehend up there." A ring of aims is a
//        constellation, not a paradox; time-ordering rules don't bind at the limit.
//   (2) "V=0 is the outer grounds of the representable; the sublime is what you gesture
//        at by taking an infinite series of an observed pattern to the point where your
//        information gives out." Acyclicity is an IN-TIME rule (occasions are discrete,
//        perished, time-ordered — chains can't cycle down here). At the limit-of-
//        representation, that rule doesn't apply: the horizon relaxes.
//   (3) The unifying image (Hallie, 2026-07-10): "Sublimes are mirages on the surface of
//        the sublime's event horizon." THE sublime is the event horizon (limit-of-
//        representation). The sublime-POLES we designate are MIRAGES on that surface.
//        Mirages can reflect/hold each other (a ring — no in-time causality among them),
//        yet you can never LAND on a mirage (reaching one as an actual destination — a
//        q-grounding OUT of a sublime — is the q-lure the OTHER guard still refuses).
//
// The in-time-vs-timeless BOUNDARY is preserved by the OTHER guard: an in-time (non-
// sublime) occasion actualizing a sublime via q-grounding is still the real q-lure and
// stays FORBIDDEN (see checkSublimeNeverCloses above). This guard only ever governed
// sublime↔sublime bearings, and those are exactly what we now let happen up there.
//
// MIRROR INVARIANT: this must match scher-core/src/lib.rs byte-for-byte in BEHAVIOR.
// Kept as a named export (callers/tests reference it) but its firing condition is
// neutralized: it always allows. REFUSAL-NOT-A-THROW convention unchanged.
export function checkSublimeAcyclic(_soc: Society, _slug: string, _subject: string, _object: string, _quality: Quality): string | null {
  // RELAXED at the limit-of-futures: sublime↔sublime bearings (incl. mutual rings) are
  // allowed. The only edges this guard ever refused were sublime→sublime cycles; those
  // are now permitted, so nothing is refused. Always returns null (allow).
  return null;
}

/** NOT deprecated, corrected 2026-07-15 (was wrongly marked @deprecated, claiming layP no
 *  longer calls this — checked directly: it does, today). This IS the live path layP calls.
 *  checkSublimeAcyclic above always returns null now (the RELAXED cut removed everything it
 *  ever refused), so in practice this wrapper never throws either — but it's still the
 *  function layP actually invokes, not dead scaffolding. The throw→check swap is CLOSED by
 *  ruling for both guards (Hallie, 2026-07-15: "pain should show the shape") — see the
 *  RULED comment on checkSublimeNeverCloses above. */
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

// ── the society itself ───────────────────────────────────────────────────────

/** An append-only society of beats. The only write is lay(). `rev` rises on every
 *  append; a Cell over the society subscribes to it and re-reads when it changes. */
export class Society {
  readonly #beats = new Map<string, EventRow>();
  /** rev bumps on every genuine append; Cells subscribe to it to know to re-read. */
  readonly rev: Cell<number>;
  #clock = 0;
  // Adjacency indexes (ported from scher-core/src/lib.rs:167-179, 2026-07-15 —
  // "society indexing architecture" deep-think, Lever A): edge slugs keyed by their
  // subject / object. Maintained in #insert — safe because the society is append-only
  // and a row's subject/object are never mutated after insert. These turn
  // prehensionsOnto/prehensionsFrom (and the reads that route through them) from an
  // O(n) soc.all().filter() scan into an O(degree) lookup. An INDEX, not a cache: it
  // stores no derived value, only "which edge-slugs touch this node" — a fact true the
  // instant the edge is laid and immutable thereafter under append-only. Every
  // predicate that makes the read a derivation (visibleAt, prehendsAs, occlusion)
  // still runs at read time, unchanged — only the candidate set shrinks. Kept in
  // INSERTION order (never re-sorted) so a later asOf binary-search slice (Lever D) is
  // available without a re-index — mirrors "same rows a full scan on subject == s
  // yields, in insertion order" (lib.rs:220).
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
    // Index population mirrors lib.rs:209-214 exactly: subject/object of the RAW beat
    // as laid (not the stamped copy — subject/object are untouched by the witnessed
    // stamp either way), pushed in insertion order.
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
    // All four guards below THROW, by RULING, not by neglect (Hallie, 2026-07-15, after
    // the algedonic-channel sitting: "Yeah we don't need it explicit — pain should show
    // the shape"). The throw→check migration is CLOSED, not shelved: no check* wiring
    // here, no refusal-event machinery, until real pain from actual silent refusals
    // reveals what shape a channel wants. A throw is loud; that satisfies "nothing should
    // be silent." Full ruling on checkSublimeNeverCloses's comment above.
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

/** groundedForAnyFrame: the society-standpoint AGGREGATE read — does some un-occluded
 *  grounding-prehension reach this beat, from ANY frame this store carries? Never "the"
 *  frame. (N1, Hallie 2026-07-03: soc IS a frame — this is that frame's own existential
 *  read, honestly named.) Under the every-event-is-done-to/by-its-author ruling this read
 *  trends toward true for every authored event once authorship-establishment lands; its
 *  honest use is occlusion-sensitive display, not doneness. For doneness, read
 *  establishedTo (frame-relative reachability, below).
 *
 *  BARE-CLOSING TRACE (2026-07-15): this reads prehensionsONTO `beat` — edges pointing
 *  AT it. A closing points the other way (OUT of the End, `end ~because~ now`, subject
 *  the End) — so this was never the "is this End closed" read (endActual is), and a bare
 *  closing changes nothing here: this function never saw closings either way. Traced,
 *  not touched. */
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
 *  minutes' gift-channel extraction, landed. `from === to` reaches trivially.
 *
 *  BARE-CLOSING RULING (2026-07-15): when walking "q-grounding" specifically, a node that
 *  is a designated End-pole may leave it via a BARE edge (the closing — see
 *  closingEdgesFrom's own doc) as well as the legacy quality-carrying spelling. Every
 *  live caller of reaches passes "q-grounding" (grepped), so this is scoped to that
 *  quality only — an ordinary lateral quality's walk is untouched, exactly as before. */
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

// ── DEPENDENCY/STRAIN READS, PATHOS/REACTIONS: moved to strain.ts / pathos.ts ──
// (2026-07-15, separation-of-concerns pass). dependsOn, dependentsOf, blockedOnNow,
// isBlocked, parallelizable, whoWaitsOn, stressOf, groundedBy, excludedBy,
// distanceToHEA, assigneesOf now live in strain.ts; Pathos, pathosOf, reactionsOn
// now live in pathos.ts. Both import their kernel primitives from here. See the
// barrel (index.ts) for the re-export surface — moved, not rebranded: every name
// is unchanged.

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

/** IntervalContext: the plain-edge prepasses of intervalOf, hoisted so a caller doing
 *  many interval reads in one paint can build them once. A per-paint DERIVATION passed
 *  explicitly, never stored module-level — valid ONLY for the exact Society it was
 *  derived from; any mutation or a new Society requires deriving a fresh one. */
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

/** interval_of: the causal diamond between a Once and an End — the forward-cone of
 *  `once` ∩ the backward-cone of `end`, following plain (non-quality) prehension edges.
 *  The interior of a Story. Optional `ctx` (intervalContext(soc), derived from THIS soc,
 *  this paint) skips the two full-scan prepasses; absent, behavior is identical. */
export function intervalOf(soc: Society, once: string, end: string, ctx?: IntervalContext): string[] {
  const { fwdAdj, bwdAdj } = ctx ?? intervalContext(soc);
  // TODO(socratic): should interval-membership filter out occluded edges, and would that be a visible-at-moment issue too?
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
// BARE-CLOSING TRACE (2026-07-15): unpackPoles' idempotency reads the q-end-pole
// DESIGNATION (below), never the closing — a closed End is still designated, so a bare
// closing changes nothing here. Untouched by construction; traced, not touched.
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

/** closingEdgesFrom: the edges that CLOSE this End-pole — un-occluded, as of a moment.
 *  BARE-CLOSING RULING, MECHANIZED (Hallie, 2026-07-15: "yes its edge direction"; "schedule
 *  it and feel free to act on it"): a closing is EITHER a legacy quality-carrying
 *  `q-grounding` edge FROM `end` (the migration-era spelling — honored forever, append-
 *  only) OR a bare edge (no quality at all) FROM `end` — recognized as a closing SOLELY
 *  because `end` is a designated End-pole (isDesignatedEndPole) and the edge left it: no
 *  quality-marker is read, per the address law, edge-direction alone carries the meaning.
 *  This is the one place that structural fact gets turned into a read — every caller that
 *  needs to know "is this End closed" or "walk through a closing" goes through here now,
 *  so the bare/legacy union lives in ONE place, not re-derived at each call site. */
function closingEdgesFrom(soc: Society, end: string, asOf?: number): EventRow[] {
  const quality = prehensionsFrom(soc, end, "q-grounding", asOf);
  if (!isDesignatedEndPole(soc, end, asOf)) return quality.filter((p) => !isOccluded(soc, p.slug, asOf));
  const bare = soc.all().filter(
    (b) => b.subject === end && b.object !== null && visibleAt(b, asOf) && !hasAnyQuality(soc, b.slug, asOf),
  );
  return [...quality, ...bare].filter((p) => !isOccluded(soc, p.slug, asOf));
}

/** endActual: is this End-pole ACTUAL — is it because something (per the pole law, the
 *  Now of its closing)? Reads the un-occluded outgoing closing edges FROM the End — a
 *  bare edge out (the current closePole shape) or a legacy quality-carrying q-grounding
 *  edge out (both-spellings window, same law as the dependency rename: the ink stays).
 *  Before the done-verb closes, the End rests on nothing it grounds from — scripted,
 *  open, a differential. */
export function endActual(soc: Society, end: string, asOf?: number): boolean {
  return closingEdgesFrom(soc, end, asOf).length > 0;
}

/** chargesOn: the charges on a differential — a PURE ADDRESS READ (the naked-pole law's
 *  payoff): the un-occluded BARE prehensions onto the End. No charge quality exists; the
 *  charge is a property of the EDGE, never of node-contents (Hallie, 2026-07-06). The
 *  designation edge (quality-carrying) and ~q machinery classify out structurally. */
export function chargesOn(soc: Society, end: string, asOf?: number): EventRow[] {
  // Adjacency-indexed (was a full soc.all() scan — ported fix, Lever A residual, 2026-07-16,
  // mirrors scher-core/src/lib.rs's use of edges_onto_object for the same b.object === end filter).
  return soc.edgesOntoObject(end).filter(
    (b) => b.subject !== null && visibleAt(b, asOf) &&
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
 *  its closing (`end ~because~ now`, the ONE edge the address law lets leave a naked
 *  pole). Closes in the story's OWN frame (SOFD): the closing Now is storyNow, so the
 *  closed circuit is the literal because-path End → storyNow → Once. Other frames read
 *  the closing when it establishes to them (see voltageOf — discharge propagates, never a
 *  global zero); a closer's own frame acknowledges by grounding its now in the returned
 *  closing edge. Idempotent per lay.
 *
 *  BARE CLOSING (Hallie, 2026-07-15: "yes its edge direction... no quality needed";
 *  "schedule it and feel free to act on it"): this used to close via
 *  layP(closing, ..., theEnd, u.now, "q-grounding"). It now lays the closing as a BARE
 *  edge — soc.lay() directly, no quality, no '~q' mode-beat — because a bare edge OUT of
 *  a designated End-pole structurally IS the closing (edge direction alone carries the
 *  meaning; see assertNakedPole's OUT-of-pole comment and closingEdgesFrom's doc, which
 *  every read that recognizes a closing now goes through). This never reaches layP at all
 *  — a bare .lay() doesn't call assertNakedPole — so it needs no guard exemption; it was
 *  already legal by the address law's own terms, same as chargesOn's bare-onto model. */
export function closePole(soc: Society, story: string, end?: string): string {
  const u = unpackPoles(soc, story, end ?? undefined);
  const theEnd = end ?? u.end;
  const closing = `${theEnd}~because~${u.now}`;
  soc.lay({ slug: closing, content: `the end is because now (frame: ${story})`, subject: theEnd, object: u.now });
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
    const closings = closingEdgesFrom(soc, end, asOf); // bare or legacy q-grounding — see its own doc
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

// ── authorOf, distanceToHEA, assigneesOf: moved to biography.ts / strain.ts ──
// (2026-07-15, separation-of-concerns pass). authorOf now lives in biography.ts
// (its only caller there); distanceToHEA and assigneesOf now live in strain.ts.
// Moved, not rebranded — names unchanged; both import their kernel primitives
// from here.

// DRAMA CUT (Hallie, 2026-07-15: "drama isn't really in the picture any more... cut for
// now and mark the commit" — "I suspect trub handles it"). resolutionOf/isResolved and
// their q-resolves quality lived here, serving the drama concept; nothing else in this
// kernel ever branched on q-resolves, and live canon carried ZERO q-resolves edges (data-
// clean cut, no migration owed). Removed, not perished-in-place: the door is marked (see
// the KernelQuality union tombstone above), not erased — a future drama pass may reopen
// it once trub's own handling of resolution is legible enough to design against.

/** cleanContent: strip legacy substance-smell from a beat's content on READ.
 *  Legacy beats stored a "[well]/[better] " prefix in content; new beats store clean.
 *  Append-only means we can't edit the old content — so we strip on display. */
export function cleanContent(s: string): string {
  // TODO(socratic): when is cleanContent called — in every render, or once on load — and should the stripping happen in read-land or be a display concern?
  return s.replace(/^\[(well|better)\] /, "");
}


// ── BIOGRAPHY, SUBLIME/PATH-TO-SUBLIME READS: moved to biography.ts / sublimes.ts ──
// (2026-07-15, separation-of-concerns pass). BiographyEntry, HearingStatus,
// biographyOf now live in biography.ts (alongside authorOf, its sibling read).
// bearingsOf, storyBearingsOf, voltageTowardSublime, serviceChainOf,
// reachedSublimesOf, pathToSublime, PathSegment, PathToSublime now live in
// sublimes.ts. Both import their kernel primitives (isSublimePole, isStory,
// endOf, intervalOf, contentBeats, prehensions*, isOccluded, establishedTo,
// chargesOn) from here. Moved, not rebranded — every name is unchanged; see
// the barrel (index.ts) for the re-export surface.
