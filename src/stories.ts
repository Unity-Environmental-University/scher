// ─────────────────────────────────────────────────────────────────────────────
// stories.ts — the reusable STORY-CONSTRUCTORS. "Everything is a Story, very much
// including a UI component."
//
// A Story is (society, standpoint, params) → a projected reading. Reuse is free:
// vary the society and the standpoint, get a different card/list/button. None of
// these hold state. They READ the society (via society.ts reads) and re-project when
// it changes (via cell.ts batching on Society.rev). A Button's press LAYS a beat —
// the only write — so the UI writes into the canon, append-only, by construction.
// ─────────────────────────────────────────────────────────────────────────────

import { derive, type Read } from "./cell.js";
import { el, on } from "./dom.js";
import { project, projectList } from "./projection.js";
import {
  Society,
  modeAt,
  confidence,
  pathosOf,
  isSuperseded,
  isEstablished,
  prehensionsOnto,
  intervalOf,
  endOf,
  isStory,
  type Mode,
} from "./society.js";

/** A reading-cell over a society: re-derives whenever the society appends (rev bumps).
 *  This is the bridge — a Cell whose value is a DETERMINED READING of the society,
 *  not a stored value. `read(soc)` is one of society.ts's read functions. */
export function reading<T>(soc: Society, read: (s: Society) => T): Read<T> {
  // derive(compute, sources): re-derives whenever the society appends (rev bumps).
  return derive(() => read(soc), [soc.rev]);
}

// ── CARD STORY ────────────────────────────────────────────────────────────────
// Reads ONE beat (its content + its determined mode + its pathos) and projects a
// card. Reusable: point it at any slug. The card IS the reading of that beat-Story.

export interface CardStoryParams {
  slug: string;
  /** optional: standpoint label shown on the card (whose reading this is). */
  standpoint?: string;
}

export function cardStory(soc: Society, params: CardStoryParams): Node {
  const { slug } = params;
  // the card is a projection of a reading: (content, mode, pathos) of this beat.
  const read = reading(soc, (s) => {
    const beat = s.get(slug);
    return {
      content: beat?.content ?? `(no beat: ${slug})`,
      mode: modeAt(s, slug) as Mode,
      conf: confidence(s, slug),
      pathos: pathosOf(s, slug),
    };
  });

  return project(read, (v) => {
    const card = el("div", {
      class: `story-card ${v.mode}`,
      attrs: { title: params.standpoint ? `read from: ${params.standpoint}` : undefined },
    });
    card.appendChild(el("div", { class: "slug" }, slug));
    card.appendChild(el("div", { class: "content" }, v.content));
    card.appendChild(
      el("div", { class: `mode ${v.mode}` },
        v.mode === "established"
          ? `✓ established — an actual met this (conf ${v.conf.toFixed(2)})`
          : `○ scripted — a lure, ungrounded`,
      ),
    );
    if (v.pathos.length) {
      const p = el("div", { class: "pathos" });
      for (const r of v.pathos) p.appendChild(el("span", { class: "pchip" }, `${r.emoji} ${r.count}`));
      card.appendChild(p);
    }
    return card;
  }).node;
}

// ── BUTTON STORY ──────────────────────────────────────────────────────────────
// A Story whose determined values are (label, enabled) READ from the society, and
// whose PRESS lays a beat. The button does not "do an action" — it appends to the
// society, and every reading re-derives. check=ground, star, share are all buttonStories.

export interface ButtonStoryParams {
  /** the label — a fixed string, or a reading over the society. */
  label: string | ((s: Society) => string);
  /** enabled — default always; or a reading (e.g. disabled once grounded). */
  enabled?: (s: Society) => boolean;
  /** the press: LAY into the society. The only write. */
  press: (s: Society) => void;
  class?: string;
}

export function buttonStory(soc: Society, params: ButtonStoryParams): Node {
  const read = reading(soc, (s) => ({
    label: typeof params.label === "function" ? params.label(s) : params.label,
    enabled: params.enabled ? params.enabled(s) : true,
  }));

  return project(read, (v) => {
    const btn = el("button", {
      class: `story-button ${params.class ?? ""}`,
      attrs: { disabled: v.enabled ? undefined : "true" },
    }, v.label) as HTMLButtonElement;
    if (v.enabled) on(btn, "click", () => params.press(soc));  // press = lay a beat
    return btn;
  }).node;
}

// ── TOGGLE (UNCHECKABLE) BUTTON STORY — append-only undo via SUPERSEDE ──────────
// An "uncheckable" check. Press once: ground the beat (lay a grounding). Press again:
// UNGROUND — but you never delete; you lay a SUPERSEDE beat onto the grounding. The
// grounding STAYS IN INK; the read ignores it; the card flips back to scripted. The
// society's count only ever rises — undo is an append. (git-for-meaning: revert is a
// commit, not a rewrite.) check=ground is this. star-toggle is this.
export interface ToggleButtonStoryParams {
  /** the target beat this toggle grounds/ungrounds. */
  target: string;
  /** the frame (standpoint) doing the grounding — must exist in the society. */
  by: string;
  /** stable slug for THIS toggle's grounding (so re-press is idempotent / supersede-able). */
  groundSlug: string;
  labelChecked?: string;
  labelUnchecked?: string;
  class?: string;
}

export function toggleButtonStory(soc: Society, params: ToggleButtonStoryParams): Node {
  const { target, by, groundSlug } = params;

  // LIVE = does the TARGET have any non-superseded grounding? (the truth, not a single
  // slug's state). This is what fixes the one-loop bug: each re-ground uses a FRESH slug,
  // so reading a fixed slug desyncs after one cycle. Read the establishment of the target.
  const read = reading(soc, (s) => ({ live: isEstablished(s, target) }));

  // every grounding this toggle lays gets a unique slug (groundSlug + a counter) so a
  // re-ground is always a NEW, non-superseded beat — and uncheck supersedes ALL of them.
  let nth = 0;

  return project(read, (v) => {
    const btn = el("button", {
      class: `story-button toggle ${v.live ? "checked" : ""} ${params.class ?? ""}`,
    }, v.live ? (params.labelChecked ?? "☑ grounded — untick to supersede")
              : (params.labelUnchecked ?? "☐ check = ground")) as HTMLButtonElement;

    on(btn, "click", () => {
      // re-read live AT CLICK TIME (don't trust the captured v — defensive against any
      // stale projection). The society is the source of truth.
      const liveNow = isEstablished(soc, target);
      if (!liveNow) {
        // CHECK: lay a fresh-slugged grounding (always new → never born-superseded).
        soc.layP(`${groundSlug}-${nth++}`, `${by} grounds ${target}`, by, target, "q-grounding");
      } else {
        // UNCHECK = SUPERSEDE every live grounding onto the target. Append-only: the
        // groundings stay in ink, the read ignores them. The society count RISES on undo.
        const liveGroundings = prehensionsOnto(soc, target, "q-grounding").filter(
          (p) => !isSuperseded(soc, p.slug),
        );
        for (const g of liveGroundings) {
          soc.lay({ slug: `sup-${g.slug}`, content: `supersedes ${g.slug} (uncheck)`, subject: g.slug, object: g.slug });
        }
      }
    });
    return btn;
  }).node;
}

// ── MODAL STORY — a modal IS a Story. Open/closed is a READING of the society. ──
// Not useState. The modal's openness is "is there a live open-beat for this modal?".
// Open = lay a beat. Close = supersede it. The modal's existence is in the canon —
// observer-relative, rollback-able. This is "everything is a Story incl. a UI
// component" one notch past the card: the COMPONENT'S OWN STATE lives in the society.
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

  const isOpen = (s: Society) => !!s.get(openSlug) && !isSuperseded(s, openSlug);
  const open = () => { if (!isOpen(soc)) soc.lay({ slug: openSlug, content: `modal ${params.id} open`, subject: null, object: null }); };
  const close = () => {
    // close = supersede the open-beat (append-only). re-open later lays a fresh one.
    if (isOpen(soc)) {
      const n = soc.all().filter((b) => b.slug.startsWith(`sup-${openSlug}`)).length;
      soc.lay({ slug: `sup-${openSlug}-${n}`, content: `closes modal ${params.id}`, subject: openSlug, object: openSlug });
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

// ── CLAMP STORY (the C-block) — "a Story contains its beats." ───────────────────
// The Once/End bracket made visible: a top lip (the Once), the interior beats (the
// causal interval = the body), a bottom lip (the End), and a spine connecting them so
// you SEE the interior is HELD by the Once→End bound. Reads intervalOf(once, end).
//
// RECURSION CAP: ONE LEVEL. An interior beat that is itself a story renders as a nested
// frame ONLY at depth 0; deeper, story-beats render as a drill-in affordance (no more
// brackets). This bounds the render (and matches the loop-gate instinct: deep nesting is
// unreadable; cap it). depth is internal — callers never set it past 0.
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
}

export function frameStory(soc: Society, params: FrameStoryParams, depth = 0): Node {
  const once = params.once;

  const read = reading(soc, (s) => {
    const end = params.end ?? endOf(s, once) ?? `${once}-end`;
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
    // pass standpoint only when defined (exactOptionalPropertyTypes)
    const sp = params.standpoint;
    const cardParams = (slug: string) => (sp !== undefined ? { slug, standpoint: sp } : { slug });
    for (const slug of v.interior) {
      const beatIsStory = isStory(soc, slug);
      if (beatIsStory && depth < 1) {
        // ONE LEVEL of recursion: nest a sub-frame for this interior story.
        body.appendChild(frameStory(soc, sp !== undefined ? { once: slug, standpoint: sp } : { once: slug }, depth + 1));
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

// ── GIST STORY — "This is a Gist of that Story." ───────────────────────────────
// A sealed, frozen reading of a Story interval: the boundary (Once→End) told SHORT,
// the full interval still whole behind it (holographic — a Gist is always a gist OF a
// story; drill across the bound to the Long). A convenience bulkhead: you AGREE not to
// re-derive the interior; you read the surface. Honest memoization — the Gist is a
// cached reading laid AS A BEAT ("cached virtual edges, beats always win"), and it
// SELF-INVALIDATES: a beat landing behind the bound AFTER the gist's witness-time
// supersedes it (it re-gists). UI is optional; this returns the gist DATA + a default
// readout node. Frames consume gistOf() to stop re-deriving their interior every append.
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
  // capture the freeze at construction; re-derive marks stale if the interval grew/changed.
  const frozen = gistOf(soc, once, end);
  return reading(soc, (s) => {
    const now = gistOf(s, once, end);
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

// ── FOLD-GIST — the generalized Gist: a cached SSR cursor over a pluggable monoid. ──
// gistOf freezes an interval reading at at=max(witnessed) and reports `stale`. That
// watermark IS a render-cache cursor. foldGist generalizes on that axis: instead of the
// hard-coded {total,established} tally, the summary is ANY associative monoid, and the
// fold runs over only the TAIL past the cursor — so re-reading after an append is O(tail),
// not O(interval). The monoid law fold(all) == fold(cache) ⊕ fold(tail) IS the verify law.
//
// gistOf ⊂ foldGist: it is foldGist with TALLY (below). The cursor is a witnessed-clock
// watermark; it advances per WHOLE FRAME (witnessed txn) — never a partial frame — because
// beats sharing a witnessed-stamp are one transaction and must fold atomically.
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

/** Fold a Story interval through a pluggable monoid, frozen at a whole-frame cursor.
 *  Pure read. With no `cache`, folds the whole interior (the cold path). With a `cache`
 *  (a prior FoldGist), folds ONLY the tail past the cache cursor and ⊕-combines — O(tail).
 *  The cursor advances to the max whole-frame witnessed-stamp at or below the society's
 *  current witness; partial frames (a stamp mid-append) are excluded so the fold is atomic. */
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
  // the cursor = the max witnessed-stamp among the INTERIOR (the beats the monoid folds),
  // NOT the boundary. The boundary (once/end) often pre-exists at a high stamp and does
  // not participate in the summary; folding it into the cursor would push the watermark
  // past interior beats yet to land, silently dropping them from every future tail. The
  // cursor is a whole frame — each beat carries its txn's stamp, so max-present is by
  // construction a complete frame, never partial.
  // the watermark must move on ANY frame that can change the interval's reading — not only
  // appended interior members, but INVALIDATION behind the bound: a supersede onto a beat
  // already folded (e.g. a grounding cancelled → an interior beat flips established→scripted)
  // changes b's reading without changing membership, and lands at a NEW stamp. A supersede is
  // structurally a self-pointing beat (subject === object); fold its stamp into the cursor so
  // such a frame is never silently behind the watermark. (This is the seam freshGistOf's
  // `stale` only half-covered.) Bounding to supersedes onto interior beats or their reach is
  // a future O(tail) refinement; folding the watermark forward + cold-on-invalidation is the
  // correct, monoid-agnostic floor.
  const supersedeStamps = soc.all()
    .filter((b) => b.subject !== null && b.subject === b.object && b.slug !== b.subject)
    .map((b) => b.witnessed ?? 0);
  const cursor = Math.max(0, ...interior.map(witnessedOf), ...supersedeStamps);

  // a usable cache requires that NOTHING invalidating landed past it — only pure append.
  // If a supersede landed after cache.cursor, the cache's folded portion may be stale, so we
  // cannot trust the ⊕ shortcut: fall to the cold re-scan. Append-only growth stays O(tail).
  const invalidatedSinceCache = cache !== undefined
    && supersedeStamps.some((t) => t > cache.cursor);

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

// ── LORE — the conjugate of the Gist. "This is the Lore behind it." ────────────
// A Gist seals what's IN FRONT of a story (its interval, told short — you read the
// surface instead of the telling). A Lore seals what's BEHIND it (the settled
// establishment it rests on — the grounded facts it prehends without re-grounding).
// Of vs behind: the Gist faces FORWARD (to whoever reads the story short); the Lore
// faces DOWN (to the canon the story is built on). To MAKE a Lore is to canonize an
// establishment: take a grounded fact and seal it as reusable background, so the next
// story's Once can PREHEND it cheaply (every End a new Once, and the Once stands on Lore).
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
    .filter((p) => !isSuperseded(soc, p.slug))
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

// ── LIST STORY — an ordered society-slice, each member a Story. ────────────────
// The simpler sibling of the Frame: NO Once/End bracket, just a sequence. Reads a
// slice of the society (a query/filter you pass) and projects each beat through a
// per-item Story (default: a Card). Reusable: vary the slice. A List over "beats in
// mode=Done" IS the Trello Done column (lists-are-mode-readings); the rail is a List;
// a Table is a List rendered in a grid. Built on projectList (keyed, minimal churn).
export interface ListStoryParams {
  /** the slice: given the society, return the ordered beat-slugs to show. */
  slice: (s: Society) => string[];
  /** per-item render (default: a Card Story for the slug). */
  item?: (soc: Society, slug: string) => Node;
  standpoint?: string;
  class?: string;
}

export function listStory(soc: Society, params: ListStoryParams): Node {
  const container = el("div", { class: `story-list ${params.class ?? ""}` });
  const read = reading(soc, (s) => params.slice(s));
  const renderItem = params.item ?? ((s: Society, slug: string) =>
    cardStory(s, params.standpoint !== undefined ? { slug, standpoint: params.standpoint } : { slug }));
  projectList(read, container, {
    key: (slug) => slug,
    render: (slug) => renderItem(soc, slug),
  });
  return container;
}

// ── REIFY — make a told-short card an ACTUAL story-as-story. ────────────────────
// A card is a Story told short. Reifying it gives it BOUNDS: an End beat (the duration's
// far edge) and a q-lure from the beat to that End — the exact triple that makes isStory
// true. After reify, a View Card reads it as a Frame: the interior is whatever falls in
// intervalOf(beat, end) by betweenness. This is the only write reify makes, and it's
// append-only — the Once is the beat itself; the End and the lure are laid beside it.
// (No domain here: pure Once/End/betweenness grammar. A view's reify button presses this.)
export function reify(soc: Society, beat: string): void {
  const end = `${beat}-end`;
  soc.lay({ slug: end, content: `…The End of ${beat} — its duration's far edge (always further in).`, subject: null, object: null });
  soc.layP(`${beat}-lure`, `${beat} lures toward its End`, beat, end, "q-lure");
}

// ── VIEW CARD STORY — "a card, and if it contains cards, it renders like one." ──
// The single unit of the reading surface. A beat shows as a Card — UNLESS it is itself a
// Story (it bounds a non-empty interval between its Once/End), in which case it renders as
// a Frame (the rail of its interior). Containment is READ, never stored: isStory(beat) is
// true iff the beat bounds an interval (membership is betweenness). This is the recursive
// reading primitive — frameStory already nests one level via the same switch.
//   leaf beat  → cardStory
//   story beat → frameStory (its interior rail)
export interface ViewCardParams {
  slug: string;
  standpoint?: string;
}

export function viewCardStory(soc: Society, params: ViewCardParams): Node {
  const sp = params.standpoint;
  if (isStory(soc, params.slug)) {
    // already a story — tell it long (its interior rail).
    return frameStory(soc, sp !== undefined ? { once: params.slug, standpoint: sp } : { once: params.slug });
  }
  return cardStory(soc, sp !== undefined ? { slug: params.slug, standpoint: sp } : { slug: params.slug });
}

// ── BOARD STORY — "a board is a row of Lists, each over its own slice." ─────────
// The flat structure under EVERY board screen (Trello columns, a sprint board, a kanban):
// a row of columns, each a listStory over a caller-supplied slice. scher knows NOTHING
// about which columns exist — the domain lives entirely in the slice functions the caller
// passes (e.g. {name:'Doing', slice: s => beatsInMode(s,'doing')}). That keeps boardStory
// domain-free: a board IS a row of listStorys (the missing primitive, now present).
// Each member renders through `item` (default: a View Card — so a story-beat in a column
// unfolds as its interior frame, one level, by the same betweenness read).
export interface BoardColumn {
  /** the column heading. */
  name: string;
  /** the slice: given the society, the ordered beat-slugs in this column. */
  slice: (s: Society) => string[];
}

export interface BoardStoryParams {
  columns: BoardColumn[];
  /** per-item render (default: a View Card — leaf→card, story→frame). */
  item?: (soc: Society, slug: string) => Node;
  standpoint?: string;
  class?: string;
}

export function boardStory(soc: Society, params: BoardStoryParams): Node {
  const board = el("div", { class: `story-board ${params.class ?? ""}` });
  const sp = params.standpoint;
  const renderItem = params.item ?? ((s: Society, slug: string) =>
    viewCardStory(s, sp !== undefined ? { slug, standpoint: sp } : { slug }));

  for (const col of params.columns) {
    const column = el("div", { class: "board-column" });
    // the heading carries a live count — a reading of the slice, re-derived on append.
    const heading = project(
      reading(soc, (s) => col.slice(s).length),
      (n) => {
        const h = el("div", { class: "board-column-head" });
        h.appendChild(el("div", { class: "board-column-name" }, col.name));
        h.appendChild(el("div", { class: "board-column-count" }, String(n)));
        return h;
      },
    ).node;
    column.appendChild(heading);
    // the column body IS a listStory over this column's slice.
    column.appendChild(listStory(soc, {
      slice: col.slice,
      item: renderItem,
      ...(sp !== undefined ? { standpoint: sp } : {}),
      class: "board-column-list",
    }));
    board.appendChild(column);
  }
  return board;
}
