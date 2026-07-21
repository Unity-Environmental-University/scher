// eventview.ts — EventView has three modes: interior (the card open, full
// detail), superject (a compact row/chip), and proposition (a not-yet-real
// row, same shape as superject plus a "not yet" skin). Mode detection is
// this file's job; the words and visual skin belong to the caller.

import { el, on } from "./dom.js";
import { project } from "./projection.js";
import { reading, readCard, cardStory, type CardRead, type ModeArm } from "./stories.js";
import { Society, isEstablished, isSublimePole } from "./society.js";
import { bearingsOf, storyBearingsOf } from "./sublimes.js";

/** The three modes. Interior = open card. Superject = a compact row.
 *  Proposition = not real yet, same shape as superject plus a skin. */
export type EventViewMode = "interior" | "superject" | "proposition";

/** Reads a beat's shape plus one extra fact: is it a proposition (not yet
 *  real)? True if it isn't established yet, or if it's a sublime-pole (a
 *  target you steer by, never land on). This file decides that — callers
 *  only choose how to skin it, never set the flag themselves. */
export interface EventViewRead extends CardRead {
  isProposition: boolean;
}

export function readEventView(soc: Society, slug: string): EventViewRead {
  const base = readCard(soc, slug);
  const isProposition = !isEstablished(soc, slug) || isSublimePole(soc, slug);
  return { ...base, isProposition };
}

/** nextAlong: is this beat (or its story) pointed at a sublime worth
 *  showing as a ghost row beside it? Different question from isProposition
 *  ("is this beat alone not-real-yet") — a beat can be real and still have
 *  a next-thing-along worth previewing. Read only, no rendering here.
 *  Returns the first direct bearing, else one inherited via story, else
 *  null. */
export function nextAlong(soc: Society, slug: string, asOf?: number): { slug: string; viaStory: boolean } | null {
  // 2026-07-20 direction ruling: bearingsOf's sublime is .subject, not
  // .object. Don't flip this back.
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

/** Renders the compact row's contents for superject/proposition. Same
 *  shape as ModeArm, so a caller's existing card arm can be reused here. */
export type SuperjectArm = (v: EventViewRead) => Node;

/** The three interior lists, fixed render order. Also the names used by
 *  hiddenSections/onToggleSection. */
export type InteriorSection = "contains" | "future" | "past";
export const INTERIOR_SECTION_ORDER: readonly InteriorSection[] = ["contains", "future", "past"];

/** One row of an interior list. `met` only matters on past rows (done or
 *  pending); rendered as data-met, styled by the caller's css. */
export interface InteriorRow {
  slug: string;
  label?: string;
  met?: boolean;
}

export interface EventViewParams {
  slug: string;
  mode: EventViewMode;
  /** Renders the interior face. Required when mode may be "interior". */
  modeArm?: ModeArm;
  /** Renders the superject/proposition row. Required for those modes.
   *  Proposition reuses this same arm; the arm never needs to know it's
   *  being skinned as "not yet real" — that skin is added separately. */
  superjectArm?: SuperjectArm;
  /** interior-only passthroughs, threaded to cardStory. */
  standpoint?: string;
  onOpen?: (slug: string) => void;
  onReify?: (slug: string) => void;
  /** Lets a superject/proposition row expand to show its own interior in
   *  place, without navigating away — a peek, not a page change. Separate
   *  from onOpen, which does navigate. Omit for a plain row (also used
   *  once the depth cap below is reached). */
  inlineOpenArm?: (v: EventViewRead) => Node;
  /** Internal recursion counter — callers never set this above 0.
   *  inlineOpenArm only renders while depth < INLINE_OPEN_DEPTH_CAP; past
   *  the cap the row is plain. Enforced here once, not per caller. */
  depth?: number;
  /** Interior mode's three stacked lists, in order: contains (what's
   *  inside), future (what this makes possible), past (what had to come
   *  first, met or pending). Caller supplies the reads; this file only
   *  renders them. Any list can be omitted — a sparse interior still
   *  renders fine, never throws. */
  contains?: InteriorRow[];
  future?: InteriorRow[];
  past?: InteriorRow[];
  tags?: string[];
  /** Sections named here start hidden. Each section gets a toggle button
   *  that flips it and calls onToggleSection. Saving the choice is the
   *  caller's job, not this file's. */
  hiddenSections?: InteriorSection[];
  onToggleSection?: (section: InteriorSection, hidden: boolean) => void;
  /** Left-side glyph for a row's kind (task/dropped/migrated/...), separate
   *  from the done-check on the right. Works for all three lists. Omit for
   *  a plain list with no glyph. */
  rowGlyphArm?: (slug: string) => Node;
  /** Is this row done? Caller decides — this file doesn't judge. */
  isRowDone?: (slug: string) => boolean;
  onRowDone?: (slug: string) => void;
  onRowHide?: (slug: string) => void;
  /** "Expand to Grounding Info" button — a real navigate past the peek
   *  cap, not another peek. Omit to hide the button. */
  onExpandGrounding?: (slug: string) => void;
  /** Optional weight for a row, carried as data-mass and --mass. Structure
   *  only, no drag physics here. Not derived from voltage — that needs a
   *  story's poles, which a bare beat may not have — so caller supplies it. */
  mass?: number;
}

/** Peek-inline is only allowed 1 level deep. Past that, a row renders
 *  plain, no expand button — deeper needs a real navigate (onOpen /
 *  onExpandGrounding), never another peek. */
const INLINE_OPEN_DEPTH_CAP = 1;

/** eventView: builds the DOM for one of the three modes. Interior gets the
 *  full card: face (from cardStory) plus the three stacked lists. Superject
 *  is a compact row, optionally peek-expandable in place. Proposition is
 *  the same row with a "not yet real" marker added; the visual skin for
 *  that marker is the caller's CSS, not this file's job. */
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

    // One row in any list: glyph (what kind) + text + done-check + hide
    // tab. Two marks, not one confusing checkbox.
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
      // Peek only below the cap. The interior mounts once into a slot on
      // the row and toggles open/closed in place — no accordion reflow.
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
    // A caller can force mode:'proposition' on a plain beat. But a caller
    // can never force mode:'superject' to hide a real isProposition — this
    // OR can only add the marker, never remove it.
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

    // Same peek affordance for a plain top-level superject row.
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

// List rendering (spreading eventView across many items) lives in
// stories.ts's listStory, not here. This file owns one EventView only.
