// ─────────────────────────────────────────────────────────────────────────────
// bag.ts — the rendering layer over a Counted. Behaves like a WoW bag.
//
// Hallie, 2026-07-30: "a rendering layer that takes a counted item list (could
// be ints or not) and works as you'd expect like a wow bag to work."
//
// WHAT "LIKE A WOW BAG" MEANS, CONCRETELY
//   * a fixed grid of slots, not a list — empty slots are visible and real
//   * a stack shows its count in the corner; 1 shows nothing
//   * drag a stack to an empty slot to move it; onto another slot to swap
//   * drag between BAGS (sections) — the same gesture, a different target
//   * a full bag refuses the drop instead of silently eating it
//   * hover for a tooltip
//   * shift-drag to split a stack (the classic)
//
// "COULD BE INTS OR NOT"
// ----------------------
// A Counted's value is an integer, but what a slot DISPLAYS need not be. The
// `render` hook takes the whole Counted and returns a Node — so a slot can be
// an icon, a portrait, a card face, a bar. The count is the model; the glyph
// is the caller's. That is why this file has no icons in it.
//
// SLOT ORDER IS A READ, NOT A STORED GRID
// ---------------------------------------
// A WoW bag remembers which square each item sits in. The tempting
// implementation is a stored `slotIndex` per item — which is exactly the field
// this library refuses. Instead a slot is a SECTION-with-index: `bag1/3` is a
// section name, placement is an append, and where something sits is read from
// the newest live placement. Rearranging your bag is history, same as anything
// else. Slightly more machinery; no stored grid to drift.
// ─────────────────────────────────────────────────────────────────────────────

import { Society } from "scher/society.js";
import { reading } from "scher/stories.js";
import { el, esc } from "scher/dom.js";
import { project } from "scher/projection.js";
import {
  type Counted, type CountedSpec, type CountedRead,
  readCounted, place, count, sectionOf, valueOf,
} from "./counted.js";

export interface BagSpec extends CountedSpec {
  /** how many slots this bag shows. Empty ones render as empty squares. */
  slots: number;
  /** bag id — becomes the section prefix, so `bag-main` slot 3 is `bag-main/3`. */
  bag: string;
}

export interface BagViewParams {
  spec: BagSpec;
  read?: CountedRead;
  /** what a filled slot looks like. Gets the whole Counted — value, label,
   *  provenance — and returns whatever the caller wants. Icons live here. */
  render?: (c: Counted) => Node;
  /** tooltip text for a stack. */
  tooltip?: (c: Counted) => string;
  onPick?: (c: Counted) => void;
  /** called when a stack is dragged somewhere. Return false to refuse. */
  onMove?: (c: Counted, toSlot: number, toBag: string) => boolean | void;
  /** allow shift-drag splitting. Needs `onSplit` to do the halving. */
  onSplit?: (c: Counted, n: number, toSlot: number, toBag: string) => void;
  by?: string;
}

/** The slot a key sits in, read from its section name (`bag/index`). */
export function slotOf(soc: Society, spec: BagSpec, key: string, opts?: CountedRead): number | null {
  const s = sectionOf(soc, spec, key, opts);
  if (!s || !s.startsWith(`${spec.bag}/`)) return null;
  const n = Number(s.slice(spec.bag.length + 1));
  return Number.isInteger(n) ? n : null;
}

/** Put a key in a slot. An append — rearranging is history. */
export function putInSlot(soc: Society, spec: BagSpec, key: string,
                          slot: number, by?: string): string | null {
  if (slot < 0 || slot >= spec.slots) return null;
  return place(soc, { ...spec, sections: undefined }, key, `${spec.bag}/${slot}`, by);
}

/** The first slot with nothing in it, or null if the bag is full. */
export function firstFreeSlot(soc: Society, spec: BagSpec, opts?: CountedRead): number | null {
  const taken = new Set(
    readCounted(soc, spec, opts).map((c) => slotOf(soc, spec, c.key, opts)).filter((n) => n !== null),
  );
  for (let i = 0; i < spec.slots; i++) if (!taken.has(i)) return i;
  return null;
}

/** Is the bag full? A full bag REFUSES a drop rather than eating it. */
export const isFull = (soc: Society, spec: BagSpec, opts?: CountedRead) =>
  firstFreeSlot(soc, spec, opts) === null;

/** Add to the bag, placing into the first free slot. Refuses if full — which
 *  is the behaviour a player expects and a silent drop is not. */
export function addToBag(soc: Society, spec: BagSpec, key: string,
                         n = 1, by?: string): string | null {
  const existing = slotOf(soc, spec, key);
  if (existing === null) {
    const free = firstFreeSlot(soc, spec);
    if (free === null) return null;                      // BAG FULL — refuse
    const laid = count(soc, spec, key, n, by);
    if (!laid) return null;
    putInSlot(soc, spec, key, free, by);
    return laid;
  }
  return count(soc, spec, key, n, by);                   // stack in place
}

// ── the SPREAD ──────────────────────────────────────────────────────────────

export function bagStory(soc: Society, params: BagViewParams): Node {
  const { spec } = params;
  const read = reading(soc, (s) => {
    const items = readCounted(s, spec, params.read);
    const grid: Array<Counted | null> = Array(spec.slots).fill(null);
    for (const c of items) {
      const i = slotOf(s, spec, c.key, params.read);
      if (i !== null && i < spec.slots) grid[i] = c;
    }
    return grid;
  });

  return project(read, (grid) => {
    const box = el("div", {
      class: "scher-bag",
      data: { bag: spec.bag },
      style: { gridTemplateColumns: `repeat(${Math.min(spec.slots, 8)}, 1fr)` },
    });

    grid.forEach((c, i) => {
      const slot = el("div", {
        class: ["scher-bag-slot", !c && "empty"],
        data: { slot: String(i), bag: spec.bag },
        attrs: c ? { title: params.tooltip?.(c) ?? `${c.label} ×${c.value}`, draggable: "true" } : {},
        on: {
          click: () => c && params.onPick?.(c),
          dragstart: (e) => {
            if (!c) return;
            (e as DragEvent).dataTransfer?.setData(
              "application/scher-bag",
              JSON.stringify({ key: c.key, from: spec.bag, split: (e as DragEvent).shiftKey }),
            );
          },
          dragover: (e) => e.preventDefault(),
          drop: (e) => {
            e.preventDefault();
            const raw = (e as DragEvent).dataTransfer?.getData("application/scher-bag");
            if (!raw) return;
            const { key, from, split } = JSON.parse(raw);
            const moving = readCounted(soc, spec, params.read).find((x) => x.key === key);
            if (!moving) return;
            if (split && params.onSplit) {
              params.onSplit(moving, Math.floor(moving.value / 2), i, spec.bag);
              return;
            }
            if (params.onMove?.(moving, i, spec.bag) === false) return;
            // swap: whatever is here goes where the dragged thing came from
            const sitting = grid[i];
            const wasAt = slotOf(soc, spec, key, params.read);
            putInSlot(soc, spec, key, i, params.by);
            if (sitting && sitting.key !== key && wasAt !== null)
              putInSlot(soc, spec, sitting.key, wasAt, params.by);
            void from;
          },
        },
      });

      if (c) {
        slot.appendChild(params.render ? params.render(c)
                                       : el("span", { class: "scher-bag-label" }, esc(c.label)));
        // a count of 1 shows nothing — the WoW convention, and it keeps the
        // grid quiet when most slots hold singles.
        if (c.value > 1)
          slot.appendChild(el("span", { class: "scher-bag-count" }, String(c.value)));
        if (c.cap !== undefined && c.value >= c.cap)
          slot.appendChild(el("span", { class: "scher-bag-capped", attrs: { title: "stack full" } }, "▲"));
      }
      box.appendChild(slot);
    });
    return box;
  }).node;
}

export const BAG_INLINE_CSS = `
.scher-bag{display:grid;gap:3px;font:12px ui-monospace,Menlo,monospace}
.scher-bag-slot{position:relative;aspect-ratio:1;border:2px solid #4a4a4a;background:#1c1c22;
  color:#eee;display:flex;align-items:center;justify-content:center;padding:3px;
  text-align:center;overflow:hidden;cursor:grab;font-size:10px;line-height:1.15}
.scher-bag-slot.empty{background:#111117;border-color:#333;cursor:default}
.scher-bag-slot:not(.empty):hover{border-color:#c8a44a}
.scher-bag-count{position:absolute;right:2px;bottom:1px;font-weight:700;font-size:11px;
  color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}
.scher-bag-capped{position:absolute;left:2px;top:1px;font-size:8px;color:#c8a44a}
.scher-bag-label{word-break:break-word}
`;
