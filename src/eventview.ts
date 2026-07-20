// ─────────────────────────────────────────────────────────────────────────────
// eventview.ts — EventView: one component, THREE MODES, which are Whitehead's
// subject-superject phases (BRIEF.md "HALLIE ARCHITECTURE" 2026-07-xx, live ~09:31/09:32):
//
//   interior    = the occasion in its own BECOMING     (card open / detail)
//   superject   = the occasion AS A DATUM for the next  (row / chip / glyph / sphere)
//   proposition = not-yet-actual, a lure                (superject render + a "not-yet" SKIN)
//
// Two render PATHS, three ontological faces: proposition is a SKIN ON SUPERJECT, not a
// third family (Hallie's decision, BRIEF.md line ~1630). This file follows the SAME
// reads/spreads/taste-arm seam that just passed the fence in stories.ts (readCard ~55,
// ModeArm ~71, cardStory ~90): a pure READ (Society -> structural shape), a structural
// SPREAD (the dispatch + DOM skeleton), and caller-supplied TASTE ARMS for the copy/visual
// inside each mode's slot. Mode DETECTION (interior/superject/proposition, and — inside
// superject/proposition — is-this-beat-a-story) is scher's read; the WORDS and SKIN are
// the caller's, exactly like modeArm never choosing English for cardStory.
// ─────────────────────────────────────────────────────────────────────────────

import { el, on } from "./dom.js";
import { project } from "./projection.js";
import { reading, readCard, cardStory, type CardRead, type ModeArm } from "./stories.js";
import { Society, isEstablished, isSublimePole } from "./society.js";
import { bearingsOf, storyBearingsOf } from "./sublimes.js";

/** the three faces. INTERIOR = becoming; SUPERJECT = datum-for-the-next; PROPOSITION =
 *  not-yet-actual (renders as superject + a not-yet skin). */
export type EventViewMode = "interior" | "superject" | "proposition";

/** the READ: pure (Society, slug) -> structural shape for the superject/proposition
 *  faces. Reuses readCard's beat-level read (content/mode/pathos) and adds the ONE
 *  structural fact those two faces need beyond a card: is this beat PROPOSITION-y —
 *  detected, never asserted by the caller. A beat reads as a proposition iff it is NOT
 *  established (scripted — the "not yet actual" mode) OR it is itself a sublime-pole (a
 *  never-closing bearing-target — a star to steer by, never a landed datum; see
 *  society.ts's sublime guard, "a star for navigation, not a destination to land"). */
export interface EventViewRead extends CardRead {
  /** structurally not-yet-actual: scripted, or a sublime bearing-target. scher's read —
   *  callers never assert this themselves; they only decide how to SKIN it. */
  isProposition: boolean;
}

export function readEventView(soc: Society, slug: string): EventViewRead {
  const base = readCard(soc, slug);
  const isProposition = !isEstablished(soc, slug) || isSublimePole(soc, slug);
  return { ...base, isProposition };
}

/** nextAlong: the RELATIONAL lure-read committee-eventview added (2026-07-10), distinct
 *  from `isProposition` on purpose — see the note above EventViewRead.isProposition and
 *  BRIEF.md's ghost-row/in-service-of committee (CLEARNESS-ghostrow-ontology.md, fork 3).
 *
 *  isProposition asks a PER-BEAT question ("is this beat, alone, not-yet-actual?") and is
 *  true for nearly every open todo on an ungrounded board — that's a true fact about the
 *  beat but NOT what "a ghost row attached to its todo" means. nextAlong asks a RELATIONAL
 *  question instead: "does this beat (or a story it belongs to) SERVE a sublime-pole worth
 *  previewing as a lure beside it?" — Hallie's "next thing along, attached to the todo row"
 *  / the ghost-chain-toward-the-sea image. Built entirely on the ghost-row committee's
 *  already-landed kernel reads (bearingsOf/storyBearingsOf, society.ts ~1217-1252); no new
 *  kernel primitive. Returns the FIRST direct bearing if the beat has one of its own,
 *  else the first bearing inherited via a containing story, else null (an ordinary open
 *  todo with nothing downstream to preview — the common case, and correctly undashed).
 *
 *  This is a READ ONLY — it does not decide skin or attachment DOM; callers (board.ts)
 *  decide whether/how to render a row for the returned bearing. Kept as an eventview.ts
 *  export (not folded into isProposition) because the two answer different questions and
 *  a caller may legitimately want either or both: isProposition for "skin this row that IS
 *  rendering," nextAlong for "should I render an attached ghost row at all." */
export function nextAlong(soc: Society, slug: string, asOf?: number): { slug: string; viaStory: boolean } | null {
  // DIRECTION FLIPPED (Hallie, 2026-07-20, ruling correction): bearingsOf now returns
  // edges whose SUBJECT is the sublime charging toward this beat — the sublime is
  // .subject, not .object.
  const firstDirect = bearingsOf(soc, slug, asOf)[0];
  if (firstDirect?.subject) {
    return { slug: firstDirect.subject, viaStory: false };
  }
  const firstInherited = storyBearingsOf(soc, slug, asOf)[0];
  if (firstInherited?.subject) {
    return { slug: firstInherited.subject, viaStory: true };
  }
  return null;
}

/** the TASTE arm for the superject/proposition faces: given the structural read, render
 *  the compact datum's contents (the row's label/glyph — Penelope's voice, not scher's).
 *  Reuses ModeArm's shape (CardRead -> Node) since EventViewRead extends CardRead — a
 *  caller who already has a ModeArm for cards can reuse it here, or supply a dedicated one. */
export type SuperjectArm = (v: EventViewRead) => Node;

/** the three interior lists, in render order (the corrected anatomy's fixed order —
 *  brief ¶2). Also the vocabulary for hiddenSections/onToggleSection. */
export type InteriorSection = "contains" | "future" | "past";
export const INTERIOR_SECTION_ORDER: readonly InteriorSection[] = ["contains", "future", "past"];

/** one row of an interior list. `met` is only meaningful on PAST rows (RequiresRow's
 *  met/pending discriminant) — rendered structurally as `data-met`; the skin is the
 *  caller's css. */
export interface InteriorRow {
  slug: string;
  label?: string;
  met?: boolean;
}

export interface EventViewParams {
  slug: string;
  mode: EventViewMode;
  /** the TASTE arm for the INTERIOR face — threaded straight to cardStory (see
   *  stories.ts CardStoryParams.modeArm). REQUIRED whenever mode may be "interior". */
  modeArm?: ModeArm;
  /** the TASTE arm for the SUPERJECT / PROPOSITION faces — the compact row's contents.
   *  REQUIRED whenever mode may be "superject" or "proposition". Proposition reuses this
   *  SAME arm (it is a skin ON superject, not a different render) — the skin (dashed/
   *  faint/conditional) is applied by scher as a structural class + data-attribute; the
   *  ARM never needs to know it's being skinned. */
  superjectArm?: SuperjectArm;
  /** interior-only passthroughs, threaded to cardStory. */
  standpoint?: string;
  onOpen?: (slug: string) => void;
  onReify?: (slug: string) => void;
  /** INLINE-OPEN (committee-eventview, card-interior-superject fleet, 2026-07-10):
   *  when supplied, a SUPERJECT/PROPOSITION row renders an additional affordance that
   *  expands the row to show that same occasion's INTERIOR *in place*, without becoming
   *  the standing frame — the crux move Hallie's card sketch names "peek into a
   *  downstream, don't navigate to it." This is INTENTIONALLY separate from `onOpen`:
   *  onOpen is a caller-routed "make this the new significator" navigation (board.ts's
   *  job); inlineOpenArm is scher's own bounded, in-place expansion (this file's job).
   *  A caller wanting the full card anatomy (face+tags / contains / future / past)
   *  supplies THIS arm — typically `(v) => eventView(soc, {slug: v.slug, mode:'interior',
   *  modeArm, depth: depth+1, ...})` — and scher enforces the depth cap below; the arm
   *  itself never has to know or check the cap. Omit to get a plain, non-expandable row
   *  (e.g. once the cap is reached — see `depth`). */
  inlineOpenArm?: (v: EventViewRead) => Node;
  /** RECURSION CAP — same idiom as stories.ts's frameStory(soc, params, depth=0): an
   *  INTERNAL counter, never set past 0 by an outside caller. `inlineOpenArm` is only
   *  offered (rendered as an affordance) while `depth < INLINE_OPEN_DEPTH_CAP`; at the
   *  cap, the row renders plain (no expand affordance) — matching the brief's "openable
   *  ~1-2 recursions deep... you do NOT navigate-to it / make it the standing frame."
   *  Bounding here, not in the caller's arm, means the cap is enforced ONCE, structurally,
   *  the same way frameStory enforces its one-level cap once rather than per-caller. */
  depth?: number;
  /** the CARD ANATOMY reads for INTERIOR mode: one opened card's interior is three
   *  STACKED LISTS, rendered in this order — CONTAINS (interior members), FUTURE (what
   *  X makes necessary/possible), PAST (what had to come before X, met/pending).
   *  Caller-supplied, never read here — the ontology reads are stories.ts's
   *  (requiresOf/containsOf/enablesOf/readCardAnatomy): PAST ≈ requiresOf (hence `met`
   *  on InteriorRow, rendered as `data-met`; the struck/pending skin is css's and must
   *  read as weather, never error-red), FUTURE ≈ enablesOf, CONTAINS = containsOf.
   *  (Earlier names afters/befores, and before that upstreams/downstreams, perished
   *  honestly.) Omit any list to omit that section — a bare beat with no assembled
   *  reads still renders a valid, sparse interior, never a throw. */
  contains?: InteriorRow[];
  future?: InteriorRow[];
  past?: InteriorRow[];
  tags?: string[];
  /** SECTION HIDE/SHOW (brief ¶4: the interior lists are hideable/showable, per-card):
   *  the same class-toggle idiom as the per-row hide, one level up. Sections named here
   *  START hidden; every rendered section carries a header toggle that flips the
   *  structural `hidden` class + `data-section-hidden` attribute (the css light's DOM
   *  contract) and reports through onToggleSection. PERSISTING the choice is the
   *  caller's (board.ts's) job — scher only flips the structure. */
  hiddenSections?: InteriorSection[];
  onToggleSection?: (section: InteriorSection, hidden: boolean) => void;
  /** the TASTE arm for each interior-list row's left STATE-CHANGE GLYPH (task/dropped/
   *  migrated/... — "what kind," per the checkbox-unification decision) — distinct from
   *  the row's right DONE-check (rendered structurally below as a plain checked/unchecked
   *  slot; whether/how it's interactive is Penelope's callback wiring via onRowDone, not
   *  scher's taste). SECTION-AGNOSTIC — applies to rows in all three lists (the v1
   *  downstream-only `downstreamGlyphArm`, generalized in the perish). Omit for a
   *  glyph-less plain list. */
  rowGlyphArm?: (slug: string) => Node;
  /** per-row DONE state — a plain read the caller supplies (scher does not decide what
   *  "done" means for an arbitrary beat; that's a quality/mode read owned by
   *  stories.ts/society.ts, same reasoning as contains/future/past above). */
  isRowDone?: (slug: string) => boolean;
  /** row callbacks — both OPTIONAL, both OMIT-TO-DISABLE, section-agnostic: */
  onRowDone?: (slug: string) => void;
  onRowHide?: (slug: string) => void;
  /** "Expand to Grounding Info" — the bottom affordance that drills DEEPER than the
   *  1-2 level inline-open cap allows (a real navigate, not a peek). Omit to hide it. */
  onExpandGrounding?: (slug: string) => void;
  /** MASS HOOK (tentative — RECESS-2 hunch, twice-confirmed, BRIEF.md "task mass made
   *  SOMATIC"): an OPTIONAL per-occasion weight for the superject/proposition row. This
   *  is STRUCTURE only — a number the row carries as `data-mass` + a `--mass` CSS var —
   *  never the drag physics itself (inertia/cursor-lag is a Penelope/interaction concern,
   *  wired later against these hooks). scher does not derive mass from voltage here:
   *  voltageOf(soc, story, ...) reads a STORY's differentials (it needs an End/poles), so
   *  it isn't trivially available for an arbitrary list member that may be a bare beat —
   *  deriving mass from the society is a real read, not a trivial one, so this stays an
   *  honest caller-supplied optional rather than a forced auto-derivation.
   *  TODO: once a cheap per-beat voltage/bearing-depth read exists for non-story beats,
   *  fold it in here as a fallback when `mass` is omitted. */
  mass?: number;
}

/** INLINE-OPEN RECURSION CAP — the crux number (committee-eventview, card-interior-
 *  superject fleet, 2026-07-10). frameStory caps its ONE nesting concept ("story-beat
 *  contains story-beat") at depth < 1. EventView's inline-open is the SAME idiom applied
 *  to "interior-list row peeks into its own interior": depth 0 (a plain interior card,
 *  freshly opened by the user or the standing frame) may inline-open ITS section rows
 *  to depth 1; depth 1's section rows render WITHOUT the expand affordance at all —
 *  no drill-in stub, just a plain closed row, because inline-open (unlike frameStory's
 *  drill-in) is a PEEK, not a promise of "more exists past here, click through." A
 *  separate, deliberate `onOpen`/`onExpandGrounding` navigation is always available past
 *  the cap for a reader who wants to go deeper — that's a re-centering action, not this
 *  one. Set to 1 (not 0) because the brief explicitly asks for "~1-2 recursions deep." */
const INLINE_OPEN_DEPTH_CAP = 1;

/** eventView: the harness. Dispatches on `mode` — scher's structure, never the caller's
 *  choice of copy. INTERIOR builds the full CARD ANATOMY (Hallie's corrected anatomy,
 *  card-v2 sitting 2026-07-13: face+tags, then the three stacked lists CONTAINS → AFTERS
 *  → BEFORES as superject-rows, then expand) around cardStory's existing face render
 *  (content/mode/pathos) — cardStory still owns the FACE, this harness adds the stacked
 *  sections after it, structurally, from caller-supplied reads (see
 *  EventViewParams.contains/future/past/tags — why they're caller-supplied, not read here).
 *  SUPERJECT is a compact row built fresh here (a card is too heavy — full content, pathos
 *  chips, an openable click-target — for "a datum in a list"); it may also carry an
 *  INLINE-OPEN affordance (see inlineOpenArm/depth) that expands the row to its own interior
 *  IN PLACE, capped at INLINE_OPEN_DEPTH_CAP, WITHOUT re-centering the standing frame.
 *  PROPOSITION renders the identical superject skeleton and adds ONLY a structural
 *  not-yet-actual marker (a class + data-attribute); the VISUAL skin (dashed border,
 *  faint opacity, "if…" phrasing) is the caller's CSS/taste, not scher's. */
export function eventView(soc: Society, params: EventViewParams): Node {
  const { slug, mode } = params;
  const depth = params.depth ?? 0;

  if (mode === "interior") {
    if (!params.modeArm) {
      throw new Error("eventView: mode 'interior' needs params.modeArm (the taste arm) — see cardStory");
    }
    const common = {
      ...(params.standpoint !== undefined ? { standpoint: params.standpoint } : {}),
      ...(params.onOpen ? { onOpen: params.onOpen } : {}),
      ...(params.onReify ? { onReify: params.onReify } : {}),
    };
    const face = cardStory(soc, { slug, modeArm: params.modeArm, ...common });

    // no anatomy reads supplied at all: caller gets the bare face (still a valid,
    // if sparse, interior render — never a throw; see the params doc).
    if (!params.contains && !params.future && !params.past && !params.tags) return face;

    const card = el("div", { class: `event-view interior depth-${depth}`, data: { slug } });

    // ── FACE (name + description via cardStory) + TAGS edge-strip ──
    const faceWrap = el("div", { class: "eventview-face" });
    faceWrap.appendChild(face);
    if (params.tags?.length) {
      const strip = el("div", { class: "eventview-tags" });
      for (const t of params.tags) strip.appendChild(el("div", { class: "eventview-tag" }, t));
      faceWrap.appendChild(strip);
    }
    card.appendChild(faceWrap);

    // ── one interior-list ROW — a bordered SUPERJECT sub-card row, SECTION-AGNOSTIC:
    //    left state-glyph (WHAT KIND) + text + right done-check (IS IT DONE) + hide tab
    //    (+ met/pending as data-met on past rows). Two marks, not one confusing checkbox. ──
    const interiorRow = (r: InteriorRow): HTMLElement => {
      const dRow = el("div", {
        class: "eventview-row",
        data: { slug: r.slug, met: r.met !== undefined ? String(r.met) : undefined },
      });
      const glyphSlot = el("div", { class: "eventview-row-glyph" });
      if (params.rowGlyphArm) glyphSlot.appendChild(params.rowGlyphArm(r.slug));
      dRow.appendChild(glyphSlot);
      dRow.appendChild(el("div", { class: "eventview-row-text" }, r.label ?? r.slug));
      const done = params.isRowDone ? params.isRowDone(r.slug) : false;
      const checkSlot = el("div", {
        class: `eventview-row-check${done ? " done" : ""}`,
        attrs: { role: "checkbox", "aria-checked": String(done) },
      });
      if (params.onRowDone) on(checkSlot, "click", () => params.onRowDone!(r.slug));
      dRow.appendChild(checkSlot);
      if (params.onRowHide) {
        const hideTab = el("button", { class: "eventview-row-hide" }, "Hide");
        on(hideTab, "click", (e) => {
          e.stopPropagation();
          params.onRowHide!(r.slug);
        });
        dRow.appendChild(hideTab);
      }
      // INLINE-OPEN: only offered below the cap. At/past the cap the row is a plain,
      // non-expandable superject row — a peek, capped, never a promise of infinite depth.
      // The recess discipline (sitting holdout H1): the interior mounts ONCE into a slot
      // ON the row and toggles via the "open" class — expanded AROUND you, in place,
      // never an accordion re-flow that swaps the open semantics.
      if (params.inlineOpenArm && depth < INLINE_OPEN_DEPTH_CAP) {
        let openNode: Node | null = null;
        const slot = el("div", { class: "eventview-row-interior-slot" });
        const trigger = el("button", { class: "eventview-row-peek" }, "▾ peek");
        on(trigger, "click", (e) => {
          e.stopPropagation();
          const isOpen = slot.classList.toggle("open");
          trigger.textContent = isOpen ? "▴ close" : "▾ peek";
          if (isOpen && !openNode) {
            openNode = params.inlineOpenArm!(readEventView(soc, r.slug));
            slot.appendChild(openNode);
          }
        });
        dRow.appendChild(trigger);
        dRow.appendChild(slot);
      }
      return dRow;
    };

    // ── the THREE STACKED LISTS, fixed order: CONTAINS → FUTURE → PAST. Each section
    //    is hideable/showable via its header toggle — the class-toggle idiom one level
    //    up from the per-row hide. Headings here are the STRUCTURAL section keys only;
    //    the human words are the caller's (strings follow the render). ──
    const sections: Record<InteriorSection, InteriorRow[] | undefined> = {
      contains: params.contains,
      future: params.future,
      past: params.past,
    };
    for (const name of INTERIOR_SECTION_ORDER) {
      const rows = sections[name];
      if (!rows?.length) continue;
      const hidden = params.hiddenSections?.includes(name) ?? false;
      const section = el("div", {
        class: `eventview-section eventview-${name}${hidden ? " hidden" : ""}`,
        data: { section: name, sectionHidden: hidden ? "true" : undefined },
      });
      const head = el("div", { class: "eventview-section-head" });
      head.appendChild(el("div", { class: "eventview-section-name" }, name));
      const toggle = el("button", { class: "eventview-section-toggle" }, hidden ? "show" : "hide");
      on(toggle, "click", (e) => {
        e.stopPropagation();
        const nowHidden = section.classList.toggle("hidden");
        if (nowHidden) section.setAttribute("data-section-hidden", "true");
        else section.removeAttribute("data-section-hidden");
        toggle.textContent = nowHidden ? "show" : "hide";
        params.onToggleSection?.(name, nowHidden);
      });
      head.appendChild(toggle);
      section.appendChild(head);
      const list = el("div", { class: "eventview-section-rows" });
      for (const r of rows) list.appendChild(interiorRow(r));
      section.appendChild(list);
      card.appendChild(section);
    }

    // ── BOTTOM: "Expand to Grounding Info" — drill deeper (a real navigate, past the
    //    inline-open cap; distinct from the peek above). ──
    if (params.onExpandGrounding) {
      const expand = el("button", { class: "eventview-expand-grounding" }, "Expand to Grounding Info");
      on(expand, "click", () => params.onExpandGrounding!(slug));
      card.appendChild(expand);
    }

    return card;
  }

  // superject AND proposition share one structural spread — proposition = superject + skin.
  if (!params.superjectArm) {
    throw new Error("eventView: mode 'superject'/'proposition' needs params.superjectArm (the taste arm)");
  }
  const superjectArm = params.superjectArm;
  const read = reading(soc, (s) => readEventView(s, slug));

  return project(read, (v) => {
    // the "is this a proposition RIGHT NOW" flag for THIS render is scher's structural
    // detection (v.isProposition) UNIONED with the caller's declared mode — a caller may
    // force mode:'proposition' on a beat scher would otherwise read as plain superject
    // (e.g. previewing a not-yet-committed lure before it's laid at all), but scher's own
    // detection can never be silenced by a caller declaring mode:'superject' on a beat
    // that structurally IS one — the not-yet-actual marker is never hidden.
    const asProposition = mode === "proposition" || v.isProposition;

    const row = el("div", {
      class: `event-view superject ${v.mode}${asProposition ? " proposition" : ""}`,
      attrs: {
        title: params.standpoint ? `read from: ${params.standpoint}` : undefined,
      },
      // the STRUCTURAL not-yet-actual marker — scher's fact, caller styles the skin.
      data: { proposition: asProposition ? "true" : undefined, mass: params.mass !== undefined ? String(params.mass) : undefined },
    });
    // the MASS HOOK as a CSS var too, for callers who'd rather style off `var(--mass)`
    // than re-read the data-attribute — same structural fact, two handles on it.
    if (params.mass !== undefined) row.style.setProperty("--mass", String(params.mass));
    if (params.onOpen) on(row, "click", () => params.onOpen!(slug));
    row.appendChild(superjectArm(v));

    // INLINE-OPEN affordance at the top level too — a bare superject row (e.g. a board
    // list item, not a downstream sub-row) can offer the same peek-inline, same cap rule.
    if (params.inlineOpenArm && depth < INLINE_OPEN_DEPTH_CAP) {
      let openNode: Node | null = null;
      const slot = el("div", { class: "eventview-inline-interior-slot" });
      const trigger = el("button", { class: "eventview-peek" }, "▾ peek");
      on(trigger, "click", (e) => {
        e.stopPropagation();
        const isOpen = slot.classList.toggle("open");
        trigger.textContent = isOpen ? "▴ close" : "▾ peek";
        if (isOpen && !openNode) {
          openNode = params.inlineOpenArm!(v);
          slot.appendChild(openNode);
        }
      });
      row.appendChild(trigger);
      row.appendChild(slot);
    }

    return row;
  }).node;
}

// NOTE: "a list is a spread of superject-face EventViews" (PORT work-round 3) lives in
// stories.ts's listStory, not here — list COMPOSITION belongs on the stories.ts side of
// the file-advocate boundary (this file owns the single EventView harness above; stories.ts
// owns spreading it across a slice, same as it already owns cardStory/frameStory/boardStory).
// listStory's default per-item render (no `item` override) composes eventView(soc, {slug,
// mode:'superject', superjectArm}) per member — see stories.ts.
