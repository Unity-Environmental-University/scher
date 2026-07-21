// ─────────────────────────────────────────────────────────────────────────────
// stories.ts — builders for Story UI pieces. A UI part is a Story too.
// A Story reads the society and shows what it finds; only a button/composer press
// writes (it lays a beat). 2026-07-15: split into card-reads.ts, button-story.ts,
// board-drop.ts; this file re-exports them so old imports still work.
// ─────────────────────────────────────────────────────────────────────────────

import { derive, type Read } from "./cell.js";
import { el, on } from "./dom.js";
import { project, projectList } from "./projection.js";
import { eventView, type SuperjectArm } from "./eventview.js";
import { createFisheye, type FisheyeOpts } from "./fisheye.js";
import {
  Society,
  isEstablished,
  isOccluded,
  prehensionsOnto,
  intervalOf,
  endOf,
  isStory,
  unpackPoles,
  assertNoLure,
  assertNakedPole,
  assertSublimeNeverCloses,
  assertSublimeAcyclic,
  assertNotMembershipContainment,
} from "./society.js";
// reactionsOn: cut from society.ts into pathos.ts (2026-07-15, separation-of-
// concerns pass, society.ts's own advocate) — same name, new source file.
import { reactionsOn } from "./pathos.js";
import { readCard, type CardRead } from "./card-reads.js";
import { buttonStory } from "./button-story.js";

export {
  type CardRead,
  readCard,
  type TagRead,
  upstreamsOf,
  downstreamsOf,
  tagsOf,
  type CardInteriorRead,
  readCardInterior,
  type RequiresRow,
  requiresOf,
  containsOf,
  enablesOf,
  type CardAnatomyRead,
  readCardAnatomy,
} from "./card-reads.js";

export {
  type ButtonStoryParams,
  buttonStory,
  type ToggleButtonStoryParams,
  toggleButtonStory,
} from "./button-story.js";

export {
  type BoardColumn,
  type BoardStoryParams,
  boardStory,
  type DropBucket,
  type DropStoryParams,
  dropStory,
  relateBuckets,
} from "./board-drop.js";

/** A reading-cell over a society: re-derives whenever the society appends (rev bumps).
 *  This is the bridge — a Cell whose value is a DETERMINED READING of the society,
 *  not a stored value. `read(soc)` is one of society.ts's read functions. */
export function reading<T>(soc: Society, read: (s: Society) => T): Read<T> {
  // derive(compute, sources): re-derives whenever the society appends (rev bumps).
  return derive(() => read(soc), [soc.rev]);
}

// ── CARD STORY ────────────────────────────────────────────────────────────────
// Shows one beat as a card: its content, mode, and reactions. Point it at any slug.
// The read logic lives in card-reads.ts; this is just the drawing half.

/** the TASTE arm: given the read, draw the mode's copy/symbol. Caller supplies this —
 *  scher never picks the words. The copy is Penelope's to write, not scher's. */
export type ModeArm = (v: CardRead) => Node;

export interface CardStoryParams {
  slug: string;
  /** optional: standpoint label shown on the card (whose reading this is). */
  standpoint?: string;
  /** optional: drill-in. Given, the card becomes clickable — open this beat as its own
   *  story view. The card doesn't decide what "open" means; the caller routes. */
  onOpen?: (slug: string) => void;
  // TODO(socratic): onReify is accepted here and threaded through viewCardStory, yet cardStory's render never shows a reify affordance — is this a promise the card silently drops, and should the param exist at all until the face exists?
  // TODO(socratic): why is standpoint optional here but optional again in CardStoryParams — isn't the param interface the already-optional place, so the ? in the rendering is redundant?
  /** optional: reify this told-short card into an actual story (lay End + lure). */
  onReify?: (slug: string) => void;
  /** the TASTE: given the structural CardRead, render the mode slot's node (copy, symbols,
   *  phrasing — Penelope's voice). REQUIRED — cardStory does not choose words for you; the
   *  reading (mode as data) is scher's, the gloss is the caller's. */
  modeArm: ModeArm;
}

export function cardStory(soc: Society, params: CardStoryParams): Node {
  const { slug } = params;
  // the card is a projection of a reading: (content, mode, pathos) of this beat — pure
  // structure, no taste. (the scher-read half of the reads/spreads boundary.)
  const read = reading(soc, (s) => readCard(s, slug));

  return project(read, (v) => {
    const card = el("div", {
      class: `story-card ${v.mode}${params.onOpen ? " openable" : ""}`,
      attrs: { title: params.standpoint ? `read from: ${params.standpoint}` : undefined },
    });
    if (params.onOpen) on(card, "click", () => params.onOpen!(slug));
    card.appendChild(el("div", { class: "slug" }, slug));
    card.appendChild(el("div", { class: "content" }, v.content));
    // the mode SLOT is structural (scher); its CONTENTS are the caller's taste arm.
    const modeSlot = el("div", { class: `mode ${v.mode}` });
    modeSlot.appendChild(params.modeArm(v));
    card.appendChild(modeSlot);
    if (v.pathos.length) {
      const p = el("div", { class: "pathos" });
      for (const r of v.pathos) p.appendChild(el("span", { class: "pchip" }, `${r.key} ${r.count}`));
      card.appendChild(p);
    }
    return card;
  }).node;
}

// ── MODAL STORY — a modal is a Story. Its open/closed state is a read, not local state.
// Open = lay a beat. Close = occlude it. The modal's state lives in the society.
export interface ModalStoryParams {
  /** unique id for this modal (the open-beat slug derives from it). */
  id: string;
  /** the body of the modal — a Story (a node), built when open. */
  body: (soc: Society) => Node;
  title?: string;
}

/** Returns { openButton, overlay }. Mount both; the overlay shows iff the modal's
 *  open-beat is live in the society. */
export function modalStory(soc: Society, params: ModalStoryParams): { openButton: Node; overlay: Node } {
  const openSlug = `modal-open-${params.id}`;

  const isOpen = (s: Society) => !!s.get(openSlug) && !isOccluded(s, openSlug);
  const open = () => { if (!isOpen(soc)) soc.lay({ slug: openSlug, content: `modal ${params.id} open`, subject: null, object: null }); };
  const close = () => {
    // close = OCCLUDE the open-beat (append-only; 2026-06-26: was a self-loop supersede). The
    // ui-seat is the named occluder. re-open later lays a fresh open-beat.
    if (isOpen(soc)) {
      // TODO(socratic): counting `occ-${openSlug}` prefixes is string-matching a slug for meaning — the exact smuggling QUERIES.md forbids; why not read prehensionsOnto(soc, openSlug, "q-occludes").length instead of parsing names?
      const n = soc.all().filter((b) => b.slug.startsWith(`occ-${openSlug}`)).length;
      if (!soc.has("modal-ui")) soc.lay({ slug: "modal-ui", content: "modal ui seat", subject: null, object: null });
      soc.layP(`occ-${openSlug}-${n}`, `closes modal ${params.id}`, "modal-ui", openSlug, "q-occludes");
    }
  };

  const openButton = buttonStory(soc, {
    label: params.title ? `open: ${params.title}` : "open modal",
    enabled: (s) => !isOpen(s),
    press: () => open(),
    class: "modal-open-btn",
  });

  const overlay = project(
    reading(soc, (s) => isOpen(s)),
    (openNow) => {
      if (!openNow) return el("div", { class: "modal-overlay closed" });
      const sheet = el("div", { class: "modal-sheet" });
      if (params.title) sheet.appendChild(el("div", { class: "modal-title" }, params.title));
      sheet.appendChild(params.body(soc));
      const closeBtn = el("button", { class: "story-button modal-close" }, "× close (supersede)") as HTMLButtonElement;
      on(closeBtn, "click", () => close());
      sheet.appendChild(closeBtn);
      const ov = el("div", { class: "modal-overlay open" });
      ov.appendChild(sheet);
      return ov;
    },
  ).node;

  return { openButton, overlay };
}

// ── CLAMP STORY (the C-block) — a Once/End bracket with its beats inside.
// TRIPWIRE: recursion caps at ONE level. A nested story draws as a frame only at
// depth 0; deeper ones show a drill-in link instead. `depth` is internal — never
// pass past 0.
export interface FrameStoryParams {
  /** the Once-beat (top lip / input). */
  once: string;
  /** the End-beat (bottom lip / return). If omitted, read endOf(once). */
  end?: string;
  /** label override for the lips. */
  onceLabel?: string;
  endLabel?: string;
  /** the standpoint reading this frame. */
  standpoint?: string;
  /** the TASTE arm for any interior beats rendered as cards (leaf beats, and drill-in
   *  affordances at the depth cap). Threaded down to cardStory — see CardStoryParams.modeArm. */
  modeArm: ModeArm;
}

export function frameStory(soc: Society, params: FrameStoryParams, depth = 0): Node {
  const once = params.once;

  const read = reading(soc, (s) => {
    const end = params.end ?? endOf(s, once) ?? `${once}-end`;
    // TODO(socratic): why three fallbacks (params.end, endOf, hardcoded once-end) — are they ordered by preference (preferred to least preferred), or do they reflect three different cases?
    // the interior = the interval minus the lips themselves
    const interior = intervalOf(s, once, end).filter((b) => b !== once && b !== end);
    return { end, interior, onceBeat: s.get(once), endBeat: s.get(end) };
  });

  return project(read, (v) => {
    const frame = el("div", { class: `story-frame depth-${depth}` });

    // ── TOP LIP — the Once ──
    const onceLip = el("div", { class: "frame-lip lip-once" });
    onceLip.appendChild(el("div", { class: "lip-frame" }, params.onceLabel ?? "Once Upon A Time…"));
    onceLip.appendChild(el("div", { class: "lip-slug" }, once));
    onceLip.appendChild(el("div", { class: "lip-content" }, v.onceBeat?.content ?? `(no beat: ${once})`));
    frame.appendChild(onceLip);

    // ── INTERIOR — the body (held inside the jaws, indented past the spine) ──
    const body = el("div", { class: "frame-body" });
    // TODO(socratic): cardParams builds an object conditionally — why not always include standpoint (even if undefined) and let the card ignore it, rather than building two different shapes?
    // pass standpoint only when defined (exactOptionalPropertyTypes)
    const sp = params.standpoint;
    const cardParams = (slug: string) =>
      (sp !== undefined ? { slug, standpoint: sp, modeArm: params.modeArm } : { slug, modeArm: params.modeArm });
    for (const slug of v.interior) {
      const beatIsStory = isStory(soc, slug);
      // TODO(socratic): depth < 1 means depth 0 gets recursion but depth 1+ doesn't — but why is 1 the cap instead of allowing more levels, and what does "unreadable" look like in practice?
      if (beatIsStory && depth < 1) {
        // ONE LEVEL of recursion: nest a sub-frame for this interior story.
        body.appendChild(frameStory(
          soc,
          sp !== undefined
            ? { once: slug, standpoint: sp, modeArm: params.modeArm }
            : { once: slug, modeArm: params.modeArm },
          depth + 1,
        ));
      } else if (beatIsStory) {
        // depth cap reached: a story-beat becomes a drill-in affordance, NOT another bracket.
        const card = cardStory(soc, cardParams(slug));
        (card as HTMLElement).appendChild?.(el("div", { class: "frame-drillin" }, "↳ a story — drill in (nested depth capped)"));
        body.appendChild(card);
      } else {
        body.appendChild(cardStory(soc, cardParams(slug)));
      }
    }
    if (!v.interior.length) body.appendChild(el("div", { class: "frame-empty" }, "(empty interval — no interior beats yet)"));
    frame.appendChild(body);

    // ── BOTTOM LIP — the End ──
    const endLip = el("div", { class: "frame-lip lip-end" });
    endLip.appendChild(el("div", { class: "lip-content" }, v.endBeat?.content ?? params.endLabel ?? "…The End."));
    endLip.appendChild(el("div", { class: "lip-slug" }, v.end));
    frame.appendChild(endLip);

    return frame;
  }).node;
}

// ── GIST STORY — a short, frozen summary of a Story's interval. ────────────────
// The boundary (Once→End) told short; the full interval is still there to drill into.
// TRIPWIRE: it self-invalidates — if a beat lands behind the bound after the freeze,
// the gist goes stale and must be re-read. Frames use gistOf() so they don't re-derive
// the whole interior on every append.
export interface Gist {
  /** the boundary. */
  once: string;
  end: string;
  /** the interior beat slugs, as of the gist's freeze (the sealed volume). */
  interior: string[];
  /** an interior summary: count + how many established. (the "short".) */
  summary: { total: number; established: number };
  /** the witnessed-clock value this gist was frozen at. */
  at: number;
  /** is this gist STALE? — a behind-the-bound beat post-dates `at`. If so, re-gist. */
  stale: boolean;
}

/** Compute the Gist of a Story interval, frozen at the society's current witness-clock.
 *  Pure read (no write). Use freshGistOf for the reactive, self-invalidating version. */
export function gistOf(soc: Society, once: string, end?: string): Gist {
  const theEnd = end ?? endOf(soc, once) ?? `${once}-end`;
  const interior = intervalOf(soc, once, theEnd).filter((b) => b !== once && b !== theEnd);
  // TODO(socratic): why include boundary's witnessed-time in the freeze but foldGist explicitly excludes it (with the comment about not advancing the watermark past interior beats) — are the two doing different things on purpose?
  // freeze clock = max witnessed among the boundary+interior (the gist's "given time").
  const witnessedOf = (s: string) => soc.get(s)?.witnessed ?? 0;
  const at = Math.max(witnessedOf(once), witnessedOf(theEnd), ...interior.map(witnessedOf), 0);
  const established = interior.filter((b) => isEstablished(soc, b)).length;
  return { once, end: theEnd, interior, summary: { total: interior.length, established }, at, stale: false };
}

/** A reactive Gist: re-reads when the society appends, and reports `stale=true` when a
 *  beat behind the bound post-dates the original freeze. (The horizon evaporates →
 *  the consumer can choose to re-gist by re-reading.) Returns a Read<Gist>. */
export function freshGistOf(soc: Society, once: string, end?: string): Read<Gist> {
  // TODO(socratic): "fresh" here means frozen-at-construction-forever — stale never clears and the summary shown is the OLD freeze's shape with `...now` spread over it; is a Gist that can only ever announce its own death (never re-seal) what the name promises, and does an occlusion behind the bound (membership unchanged, `at` unchanged) even register as stale?
  const frozen = gistOf(soc, once, end);
  return reading(soc, (s) => {
    const now = gistOf(s, once, end);
    // TODO(socratic): grew checks membership change (length or content), but moved checks at > frozen.at — why not use now.at !== frozen.at to catch both direction and magnitude changes?
    // stale iff a new interior beat appeared, or any interior witnessed-time exceeds the freeze.
    const grew = now.interior.length !== frozen.interior.length
      || now.interior.some((b) => !frozen.interior.includes(b));
    const moved = now.at > frozen.at;
    return { ...now, at: frozen.at, stale: grew || moved };
  });
}

/** A Gist Story (default non-fancy UI): a one-line surface — the boundary told short,
 *  with a staleness flag. Drill-in / horizon-visibility is a UI decision the consumer
 *  makes; this is the legible default. */
export function gistStory(soc: Society, params: { once: string; end?: string }): Node {
  const read = freshGistOf(soc, params.once, params.end);
  return project(read, (g) => {
    const box = el("div", { class: `story-gist ${g.stale ? "stale" : "sealed"}` });
    box.appendChild(el("div", { class: "gist-line" },
      `Gist of "${soc.get(g.once)?.content ?? g.once}" → "${soc.get(g.end)?.content ?? g.end}"`));
    box.appendChild(el("div", { class: "gist-summary" },
      `${g.summary.total} interior beats sealed · ${g.summary.established} established` +
      (g.stale ? "  ⚠ STALE — the horizon evaporated (a beat landed behind the bound); re-gist to re-seal"
               : "  · sealed (drill in for the Long)")));
    return box;
  }).node;
}

// ── FOLD-GIST — like gistOf, but the summary can be any pluggable fold, not just a tally. ──
// Only the new tail past the cache gets folded, so a re-read after an append is fast.
// TRIPWIRE: the cursor only moves forward by a WHOLE frame (one witnessed transaction),
// never mid-frame — beats stamped together must fold together, or the fold breaks.
export interface Monoid<T> {
  /** the identity — fold of the empty interior. */
  empty: T;
  /** fold one more interior beat into the accumulator. MUST be associative w/ empty. */
  step: (acc: T, beat: string, soc: Society) => T;
}

/** A FoldGist: a Gist whose summary is the fold of a pluggable monoid over the interior,
 *  carried with the cursor (the watermark up to which the summary is already folded). */
export interface FoldGist<T> {
  once: string;
  end: string;
  interior: string[];
  /** the monoid fold over the interior, as of `cursor`. */
  summary: T;
  /** the watermark: the whole-frame witnessed-clock the summary is folded up to. */
  cursor: number;
}

/** the TALLY monoid: count + how many established. This is the one gistOf hard-codes,
 *  so gistOf ⊂ foldGist({fold: TALLY}). */
export const TALLY: Monoid<{ total: number; established: number }> = {
  empty: { total: 0, established: 0 },
  step: (acc, b, soc) => ({
    total: acc.total + 1,
    established: acc.established + (isEstablished(soc, b) ? 1 : 0),
  }),
};

/** Fold a Story interval through a pluggable monoid. No `cache`: folds everything (slow
 *  path). With a `cache`: folds only the new tail and combines it in (fast path). */
export function foldGist<T>(
  soc: Society,
  fold: Monoid<T>,
  once: string,
  end?: string,
  cache?: FoldGist<T>,
  combine?: (a: T, b: T) => T,
): FoldGist<T> {
  const theEnd = end ?? endOf(soc, once) ?? `${once}-end`;
  const interior = intervalOf(soc, once, theEnd).filter((b) => b !== once && b !== theEnd);
  const witnessedOf = (s: string) => soc.get(s)?.witnessed ?? 0;
  // TODO(socratic): the watermark is computed as max(interior + occlusions), but why fold occlusion's witnessed time and not the interior beat's membership-change time — are they guaranteeing the same clock?
  // TRIPWIRE: cursor = max witnessed-stamp of the INTERIOR only, never the boundary.
  // The boundary often pre-exists at a high stamp; including it would push the cursor
  // past interior beats not yet landed and silently drop them from future folds.
  // TRIPWIRE: an occlusion on an already-folded beat (2026-06-26 ruling: occlusion, not
  // a self-loop supersede) changes that beat's reading without changing membership. So
  // the cursor must also move on occlusion stamps, or a flipped beat goes unnoticed.
  // TODO(socratic): this scans the WHOLE society for ANY occlusion anywhere (and via `b.slug + "~q"`, another slug-parse) — so one unrelated uncheck elsewhere cold-scans every foldGist forever; is the promised O(tail) actually reachable while the watermark is global rather than bounded to this interval's reach?
  const occlusionStamps = soc.all()
    .filter((b) => soc.get(b.slug + "~q")?.object === "q-occludes")
    .map((b) => b.witnessed ?? 0);
  const cursor = Math.max(0, ...interior.map(witnessedOf), ...occlusionStamps);

  // if an occlusion landed after the cache's cursor, the cache may be stale — fall
  // back to a full re-scan instead of trusting the fast-path combine.
  const invalidatedSinceCache = cache !== undefined
    && occlusionStamps.some((t: number) => t > cache.cursor);

  // COLD path: no usable cache, or invalidation behind the bound → fold the whole interior.
  if (!cache || !combine || cache.cursor > cursor || invalidatedSinceCache) {
    const summary = interior.reduce((acc, b) => fold.step(acc, b, soc), fold.empty);
    return { once, end: theEnd, interior, summary, cursor };
  }

  // WARM path: fold only the tail (beats whose frame post-dates the cache cursor) and ⊕.
  // This is the O(tail) win AND the verify law: fold(all) == fold(cache) ⊕ fold(tail).
  const tail = interior.filter((b) => witnessedOf(b) > cache.cursor);
  const tailSummary = tail.reduce((acc, b) => fold.step(acc, b, soc), fold.empty);
  const summary = combine(cache.summary, tailSummary);
  return { once, end: theEnd, interior, summary, cursor };
}

// ── LORE — the opposite of a Gist. A Gist seals what's ahead of a story (its
// interval, told short). A Lore seals what's behind it (the settled facts it rests
// on). Making a Lore canonizes a grounded fact so a later story can reuse it cheaply.
export interface Lore {
  /** the established beat this lore is "the lore behind". */
  beat: string;
  /** is it actually established? (you can only make Lore of a settled fact.) */
  established: boolean;
  /** the grounding frames behind it — WHO established it (the settled provenance). */
  groundedBy: string[];
  /** the witnessed-clock when this lore was sealed. */
  at: number;
}

/** Read the Lore behind a beat: the settled establishment + its provenance, sealed at
 *  the current witness-clock. Pure read. (The forward-facing twin of gistOf.) */
export function loreOf(soc: Society, beat: string): Lore {
  const established = isEstablished(soc, beat);
  const groundedBy = prehensionsOnto(soc, beat, "q-grounding")
    .filter((p) => !isOccluded(soc, p.slug))
    .map((p) => p.subject!)
    .filter(Boolean);
  const at = soc.get(beat)?.witnessed ?? 0;
  return { beat, established, groundedBy, at };
}

/** MAKE a Lore: canonize an established fact into the society as reusable sealed
 *  background — a deliberate act (not a convenience). Lays a 'lore-<beat>' beat that
 *  a future story's Once can prehend. Returns the lore-beat slug, or null if the beat
 *  isn't established (you cannot make Lore of an ungrounded thing). */
export function makeLore(soc: Society, beat: string, by: string): string | null {
  // TODO(socratic): what happens if makeLore is called twice on the same beat — does the second lay overwrite the first's lore slug, or is the idempotency in the caller's hands?
  // ANSWERED(walk 2026-07-02): neither overwrite nor caller's burden — `lore-${beat}` is a stable slug, and a lay of an existing slug is INERT (append-only law: nothing is ever overwritten), so a second makeLore is a no-op end to end; idempotency lives in the society itself. — see Society::lay / append-only law
  if (!isEstablished(soc, beat)) return null;  // only settled facts become Lore
  const loreSlug = `lore-${beat}`;
  soc.lay({ slug: loreSlug, content: `Lore: ${soc.get(beat)?.content ?? beat} (canonized background)`, subject: null, object: null });
  // the lore prehends the fact it seals (q-utterance: this frame canonized it)
  soc.layP(`${loreSlug}-by`, `${by} made this Lore`, by, beat, "q-utterance");
  return loreSlug;
}

/** A Lore Story (default readout — UI optional): "the Lore behind" a beat — the settled
 *  fact + who grounded it. The forward-facing surface a new story rests on. */
export function loreStory(soc: Society, params: { beat: string }): Node {
  const read = reading(soc, (s) => loreOf(s, params.beat));
  return project(read, (l) => {
    const box = el("div", { class: `story-lore ${l.established ? "settled" : "ungrounded"}` });
    box.appendChild(el("div", { class: "lore-line" },
      `Lore behind "${soc.get(l.beat)?.content ?? l.beat}"`));
    box.appendChild(el("div", { class: "lore-summary" },
      l.established
        ? `settled background · grounded by ${l.groundedBy.join(", ") || "(an actual)"} · a new Once can prehend this`
        : `⚠ not established — cannot be made Lore (only settled facts become reusable background)`));
    return box;
  }).node;
}

// ── LIST STORY — an ordered slice of the society, each row an EventView. ────────
// No Once/End bracket, just a sequence. A Trello column is a List filtered by mode.
// Default per-row render is a superject EventView (2026-07-15 port); pass `item` to
// fully replace it with your own shape. `superjectArm` is required unless `item` is set.
export interface ListStoryParams {
  /** the slice: given the society, return the ordered beat-slugs to show. */
  slice: (s: Society) => string[];
  /** per-item render override (default: a superject-face EventView for the slug). */
  item?: (soc: Society, slug: string) => Node;
  standpoint?: string;
  class?: string;
  /** the TASTE arm for the default per-item render (superject-face EventView rows).
   *  Ignored if `item` is supplied — the caller's own `item` owns its own taste then.
   *  REQUIRED when `item` is absent, mirroring eventView's own required superjectArm. */
  superjectArm?: SuperjectArm;
  /** click-through, threaded to each member's superject EventView (default render only). */
  onOpen?: (slug: string) => void;
  /** optional per-row weight, shown as `data-mass` / `--mass`. Default render only. */
  massOf?: (soc: Society, slug: string) => number | undefined;
  /** @deprecated old taste arm for the pre-2026-07-15 Card render. Kept so mid-migration
   *  callers don't silently lose it — using this without superjectArm still throws. */
  modeArm?: ModeArm;
  /** opt-in hover/focus fisheye motion on rows (default off). `true` = canonical params;
   *  pass FisheyeOpts to override. Default render only.
   *  TRIPWIRE: if `massOf` is set, mass drives each row's endpoint FRICTION (settle
   *  speed), not its visual size — see fisheye.ts's perElementMass doc. */
  fisheye?: boolean | FisheyeOpts;
}

export function listStory(soc: Society, params: ListStoryParams): Node {
  const container = el("div", { class: `story-list ${params.class ?? ""}` });
  const read = reading(soc, (s) => params.slice(s));
  const renderItem = params.item ?? ((s: Society, slug: string) => {
    if (!params.superjectArm) {
      throw new Error(
        params.modeArm
          ? "listStory: default render is now a superject-face EventView (PORT work-round 3) — pass params.superjectArm, not modeArm (see the @deprecated note on ListStoryParams.modeArm)"
          : "listStory: default render needs params.superjectArm (the taste arm) when no params.item is supplied",
      );
    }
    return eventView(s, {
      slug,
      mode: "superject",
      superjectArm: params.superjectArm,
      ...(params.standpoint !== undefined ? { standpoint: params.standpoint } : {}),
      ...(params.onOpen ? { onOpen: params.onOpen } : {}),
      ...((() => {
        const m = params.massOf?.(s, slug);
        return m !== undefined ? { mass: m } : {};
      })()),
    });
  });
  projectList(read, container, {
    key: (slug) => slug,
    render: (slug) => renderItem(soc, slug),
  });

  // FISHEYE MOTION (PORT work-round 4, opt-in): wire createFisheye onto the rendered
  // row elements. Re-wired on every re-observe of the slice (projectList mutates
  // `container`'s children in place on membership change; fisheye's baseSizes/element
  // list are captured at wire-time, so a stale wiring after add/remove would drift —
  // teardown-then-rewire on each slice reading keeps it honest at the cost of losing
  // any in-flight magnification on a structural change, an acceptable seam for now).
  if (params.fisheye) {
    const fisheyeOpts: FisheyeOpts = params.fisheye === true ? {} : params.fisheye;
    let handle: { teardown(): void } | null = null;
    const wire = (slugs: readonly string[]): void => {
      handle?.teardown();
      handle = null;
      const rows = Array.from(container.children) as HTMLElement[];
      if (rows.length === 0) return;
      const perElementMass = params.massOf
        ? slugs.map((slug) => params.massOf!(soc, slug))
        : undefined;
      handle = createFisheye(container, rows, {
        ...fisheyeOpts,
        ...(perElementMass ? { perElementMass } : {}),
      });
    };
    read.subscribe((slugs) => {
      wire(slugs);
      // TRIPWIRE (the "black hole" bug): subscribe fires before container is attached
      // to the page, so getBoundingClientRect reads 0 and every row collapses to zero
      // height. The first wire() must stay synchronous (tests depend on it); this rAF
      // just re-wires once more after attach, to pick up real row sizes.
      if (typeof requestAnimationFrame === "function" && !container.isConnected) {
        requestAnimationFrame(() => {
          if (container.isConnected) wire(slugs);
        });
      }
    });
  }

  return container;
}

// ── REIFY — turn a told-short card into an actual story. ───────────────────────
// A card is a Story told short. Reifying unpacks its Once/End poles (2026-07-06
// ruling: q-lure is dead, End-hood is a structural designation). Append-only.
export function reify(soc: Society, beat: string): void {
  unpackPoles(soc, beat, `${beat}-end`);
}

// ── VIEW CARD STORY — a beat shows as a Card, unless it bounds an interval, then
// it shows as a Frame (its interior rail). isStory() reads this; nothing is stored.
//   leaf beat → cardStory | story beat → frameStory
export interface ViewCardParams {
  slug: string;
  standpoint?: string;
  /** drill-in: open a beat as its own story view (the caller routes). */
  onOpen?: (slug: string) => void;
  /** reify: make this told-short card an actual story (lay its End + duration + between).
   *  Given, the card shows a "reify" affordance. The caller re-renders after. */
  onReify?: (slug: string) => void;
  /** the TASTE arm — threaded to cardStory (leaf) and frameStory (interior cards). */
  modeArm: ModeArm;
}

export function viewCardStory(soc: Society, params: ViewCardParams): Node {
  const { slug, standpoint: sp, onOpen, onReify, modeArm } = params;
  // TODO(socratic): why build common conditionally instead of always passing the optionals (even if undefined) to cardStory and frameStory — does passing undefined break something?
  const common = {
    ...(sp !== undefined ? { standpoint: sp } : {}),
    ...(onOpen ? { onOpen } : {}),
    ...(onReify ? { onReify } : {}),
  };
  if (isStory(soc, slug)) {
    // TODO(socratic): dropping onReify from frameCommon makes sense (can't reify a story that's already bounded), but why omit it with _drop + void instead of just not passing it?
    // already a story — tell it long (no reify affordance; it's already bounded).
    const { onReify: _drop, ...frameCommon } = common as typeof common & { onReify?: unknown };
    void _drop;
    return frameStory(soc, { once: slug, ...frameCommon, modeArm });
  }
  return cardStory(soc, { slug, ...common, modeArm });
}

// ── BOARD STORY / DROP STORY / relateBuckets ─────────────────────────────────
// Moved to board-drop.ts (2026-07-15 split) — re-exported above at the top of
// this file. boardStory composes listStory per column; dropStory/relateBuckets
// wire drag-and-drop-as-a-lay onto viewCardStory targets. See board-drop.ts.

// ── COMPOSER STORY — like a Button, but its press carries the user's typed text. ──
// The input holds no real state — just a draft until submit, which hands the text
// to the caller's closure and clears the field. Enter or the button both submit.
export interface ComposerStoryParams {
  /** the submit: LAY the user's text into the society. The closure owns the (possibly
   *  multi-beat) lay — composerStory only hands it the trimmed text. */
  submit: (soc: Society, text: string) => void;
  placeholder?: string;
  /** the button label (default "Add"). */
  label?: string;
  /** enabled — default always; or a reading (e.g. disabled once a frame is sealed). */
  enabled?: (s: Society) => boolean;
  class?: string;
}

export function composerStory(soc: Society, params: ComposerStoryParams): Node {
  const read = reading(soc, (s) => ({ enabled: params.enabled ? params.enabled(s) : true }));

  return project(read, (v) => {
    const input = el("input", {
      class: "composer-input",
      attrs: {
        type: "text",
        placeholder: params.placeholder ?? "",
        disabled: v.enabled ? undefined : "true",
      },
    }) as HTMLInputElement;

    const submit = () => {
      const text = input.value.trim();
      // TODO(socratic): should submit re-read enabled from the society instead of trusting the captured v.enabled (which may have staled since projection), or does the input's disabled attr prevent firing until re-projection?
      // TODO(socratic): toggleButtonStory re-reads the society AT CLICK TIME because "don't trust the captured v" — so why does submit trust this captured v.enabled, when the frame could seal between projection and Enter?
      if (!text || !v.enabled) return;             // an empty field is inert
      params.submit(soc, text);                    // the closure owns the lay
      // TODO(socratic): clearing the input happens synchronously after submit, but what if params.submit batches an async lay — does the clear fire before or after the batch?
      input.value = "";                            // clear the transient draft
    };

    on(input, "keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") { e.preventDefault(); submit(); }
    });

    const btn = el("button", {
      class: "story-button composer-submit",
      attrs: { disabled: v.enabled ? undefined : "true" },
      on: { click: () => submit() },
    }, params.label ?? "Add") as HTMLButtonElement;

    const box = el("div", { class: `story-composer ${params.class ?? ""}` });
    box.appendChild(input);
    box.appendChild(btn);
    return box;
  }).node;
}

// ── REACTION STORY — a button whose press lays a typed feeling, not a fixed beat. ──
// 2026-07-06 emoji-charge-quality-committee ruling: an emoji rides as plain content on
// a q-feel edge — no special valence type, no kernel change. Reading the spectrum
// (which glyphs count as pain) is the caller's job, never the kernel's.
// 2026-07-20 "story-emoji-as-node" ruling (final shape, supersedes that day's earlier
// object=reactor shape): subject=event, object=emoji-node.
// TRIPWIRE: the reactor is who LAID the feel, not who spoke (q-utterance stays a
// separate, untouched idiom for comments). The q-feel row's own laid_by is set inline,
// plus a redundant authorship testimony pair — mirrors gen4-policy's lay_authorship
// exactly (gen4-policy/src/lib.rs:790-805), so Rust and TS read the identical shape.
// SINGLE-SHAPE READS ONLY: rows from either of this day's earlier, superseded shapes
// are not supported — they wait for the kalpa.
export interface ReactionStoryParams {
  /** the beat being reacted to (the subject of the q-feel edge). */
  target: string;
  /** the standpoint doing the reacting — sets the q-feel row's own laid_by inline, plus
   *  the q-authorship testimony pair (see the AUTHORSHIP RECONCILIATION note above);
   *  never rides the q-feel edge's subject/object. */
  by: string;
  /** the emoji this button carries (the lazily-minted emoji-node's content). */
  emoji: string;
  /** stable slug stem for THIS reactor's reaction (so re-press is supersede-able). */
  reactSlug?: string;
  class?: string;
}

/** A stable handle for an emoji-node. TRIPWIRE (opaque-slugs law): never parse this
 *  slug for meaning — the glyph lives in the node's content, not the slug text. */
function emojiNodeSlug(emoji: string): string {
  return `emoji-${emoji}`;
}

/** Lays the q-feel edge with laid_by set inline. layP has no laid_by param, so this
 *  repeats layP's guards by hand, plus the one thing gen4-policy adds: laid_by set
 *  at lay time, never patched in after (append-only). */
function layReactionFeel(soc: Society, slug: string, content: string, subject: string, object: string, layer: string): boolean {
  assertNoLure(slug, "q-feel");
  assertNakedPole(soc, slug, subject, object, "q-feel");
  assertSublimeNeverCloses(soc, slug, subject, object, "q-feel");
  assertSublimeAcyclic(soc, slug, subject, object, "q-feel");
  assertNotMembershipContainment(slug, "q-feel");
  const a = soc.lay({ slug, content, subject, object, laid_by: layer });
  const q = soc.lay({ slug: slug + "~q", content: `${content} [q-feel]`, subject: slug, object: "q-feel" });
  return a || q;
}

/** The authorship testimony pair, mirroring gen4-policy's lay_authorship exactly
 *  (gen4-policy/src/lib.rs:797-804). Deliberately redundant with the inline laid_by
 *  above — ruling 13: "both the column and the entry." */
function layReactionAuthorship(soc: Society, event: string, layer: string): void {
  const node = `laid-${event}-by-${layer}`;
  soc.lay({ slug: node, content: `${layer} laid ${event}`, subject: null, object: null });
  soc.layP(`${node}~lays~${event}`, "authorship", node, event, "q-authorship");
}

export function reactionStory(soc: Society, params: ReactionStoryParams): Node {
  const { target, by, emoji } = params;
  // TODO(socratic): the default reactSlug template uses by + emoji + target, but what if the same emotion should be layered (multiple reactions per emoji per standpoint), or is one-per-standpoint-per-emoji the rule?
  // a deterministic slug for THIS (standpoint, emoji, target) reaction. Idempotent: pressing
  // again reads the same slug and supersedes it (un-react), never lays a duplicate.
  const slug = params.reactSlug ?? `feel-${by}-${emoji}-${target}`;

  // LIVE = does this reaction exist AND not superseded? The truth is the read, not a flag.
  const isLive = (s: Society) => s.has(slug) && !isOccluded(s, slug);

  // TODO(socratic): reactionsOn(target) scans all reactions on target, but could there be a more direct read that avoids the find() each time (e.g., prehensionsOnto + filter)?
  // the button shows the emoji + the total count of THIS emoji across all reactors (a reading
  // of reactionsOn), and a "mine" marker when this standpoint's own reaction is live.
  const read = reading(soc, (s) => ({
    live: isLive(s),
    count: reactionsOn(s, target).find((r) => r.key === emoji)?.count ?? 0,
  }));

  return project(read, (v) => {
    const btn = el("button", {
      class: `story-button reaction ${v.live ? "mine" : ""} ${params.class ?? ""}`,
      on: {
        click: () => {
          // TODO(socratic): like toggleButtonStory, this re-reads isLive(soc) at click time — is the pattern that cached projections can stale between render and event, so every toggle/reaction needs to re-check?
          if (!isLive(soc)) {
            // REACT: lazily mint the emoji-node (idempotent — lay() no-ops if it already
            // exists), lay a q-feel FROM `target` ONTO the emoji-node WITH laid_by set,
            // and the q-authorship testimony pair — mirrors gen4-policy's lay_authorship
            // exactly (see the AUTHORSHIP RECONCILIATION note above).
            const emojiNode = emojiNodeSlug(emoji);
            soc.lay({ slug: emojiNode, content: emoji, subject: null, object: null });
            layReactionFeel(soc, slug, emoji, target, emojiNode, by);
            layReactionAuthorship(soc, slug, by);
          } else {
            // UN-REACT = OCCLUDE my own q-feel (2026-06-26: was a self-loop supersede). `by` is the
            // named occluder. Append-only; the read drops the occluded feel.
            soc.layP(`occ-${slug}`, `un-react ${emoji}`, by, slug, "q-occludes");
          }
        },
      },
    }, `${emoji}${v.count ? " " + v.count : ""}`) as HTMLButtonElement;
    return btn;
  }).node;
}
