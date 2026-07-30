// ─────────────────────────────────────────────────────────────────────────────
// history.ts — the state-history-list: every beat, who laid it, read at any
// point in the past.
//
// This is the component that makes the substrate VISIBLE. Undo, replay,
// provenance and time-travel are not features here — they are what an
// append-only society already is, shown. If this list is boring to build, that
// is the claim working.
//
// Shared surface (Hallie, 2026-07-30): Penelope wants this and so does a game.
// Neither wants a bespoke one.
// ─────────────────────────────────────────────────────────────────────────────

import { Society, isOccluded, isIngressionNode, type EventRow } from "scher/society.js";
import { reading } from "scher/stories.js";
import { el, esc } from "scher/dom.js";
import { project } from "scher/projection.js";
import type { Read } from "scher/cell.js";

/** One row of the history: a beat as it reads from HERE. */
export interface HistoryEntry {
  slug: string;
  title: string | null;
  content: string;
  /** WHO laid it. Provenance travels with the beat — never reconstructed. */
  laidBy: string | null;
  /** the society's own clock for this beat. */
  witnessed: number;
  /** occluded beats stay in the list, struck through: nothing is ever deleted. */
  occluded: boolean;
  /** an edge (subject→object) rather than a plain beat. */
  isEdge: boolean;
}

export interface HistoryParams {
  /** read the society AS OF this clock value; omit for now. The whole point:
   *  the past is not a snapshot you kept, it is a read you can take. */
  asOf?: number;
  /** hide authorship/ingression plumbing (on by default — it is machinery,
   *  not history a human wants to scroll). */
  hideMachinery?: boolean;
  /** newest first (default) or oldest first. */
  newestFirst?: boolean;
  /** only beats laid by these frames. */
  byFrames?: string[];
  limit?: number;
}

/** THE READ. Pure (Society, params) → rows. No DOM, no English. */
export function historyOf(soc: Society, params: HistoryParams = {}): HistoryEntry[] {
  const { asOf, hideMachinery = true, newestFirst = true, byFrames, limit } = params;

  let rows: EventRow[] = [...soc.all()];

  // AS-OF is the load-bearing line: filter by the society's own clock rather
  // than keeping snapshots. A beat that had not been witnessed yet simply is
  // not in the past you are reading from.
  if (asOf !== undefined) rows = rows.filter((r) => (r.witnessed ?? 0) <= asOf);

  if (hideMachinery) rows = rows.filter((r) => !isIngressionNode(r.slug));
  if (byFrames?.length) rows = rows.filter((r) => r.laid_by && byFrames.includes(r.laid_by));

  rows.sort((a, b) => (a.witnessed ?? 0) - (b.witnessed ?? 0));
  if (newestFirst) rows.reverse();
  if (limit) rows = rows.slice(0, limit);

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title ?? null,
    content: r.content,
    laidBy: r.laid_by ?? null,
    witnessed: r.witnessed ?? 0,
    // occlusion is standpoint-relative and MUST be read at the same asOf,
    // or a beat occluded later reads as struck-through in a past you are
    // visiting — the past would change every time the present did.
    occluded: isOccluded(soc, r.slug),
    isEdge: r.subject !== null && r.object !== null,
  }));
}

/** Every distinct clock value in the society — the points you can travel to. */
export function momentsOf(soc: Society): number[] {
  return [...new Set([...soc.all()].map((r) => r.witnessed ?? 0))].sort((a, b) => a - b);
}

/** Every frame that has laid anything. For the by-author filter. */
export function authorsOf(soc: Society): string[] {
  return [...new Set([...soc.all()].map((r) => r.laid_by).filter(Boolean) as string[])].sort();
}

// ── the SPREAD (DOM) ────────────────────────────────────────────────────────

/** A live history list. Re-observes; nothing is pushed to it.
 *  Uses the house `project(read, fn)` idiom (as gistStory does) rather than a
 *  hand-rolled subscribe, so lifecycle is handled the same way everywhere. */
export function historyStory(soc: Society, params: HistoryParams = {}): Node {
  const read: Read<HistoryEntry[]> = reading(soc, (s) => historyOf(s, params));
  return project(read, (entries) => {
    const box = el("div", { class: "scher-history" });
    if (!entries.length) {
      box.appendChild(el("div", { class: "scher-history-empty" }, "nothing yet"));
      return box;
    }
    for (const e of entries) {
      const row = el("div", {
        class: ["scher-history-row", e.occluded && "occluded", e.isEdge && "edge"],
        data: { slug: e.slug },
      });
      row.appendChild(el("span", { class: "t" }, esc(e.title || e.content)));
      // provenance is not decoration — it is a column the substrate already has.
      row.appendChild(el("span", { class: "by" }, e.laidBy ? esc(e.laidBy) : "—"));
      row.appendChild(el("span", { class: "at" }, String(e.witnessed)));
      box.appendChild(row);
    }
    return box;
  }).node;
}

export const HISTORY_INLINE_CSS = `
.scher-history{font:12px ui-monospace,Menlo,monospace}
.scher-history-row{display:flex;gap:8px;padding:3px 6px;border-bottom:1px solid #ddd}
.scher-history-row .t{flex:1}
.scher-history-row .by{color:#6a3fb5;font-size:10px}
.scher-history-row .at{color:#888;font-size:10px}
.scher-history-row.occluded .t{text-decoration:line-through;opacity:.55}
.scher-history-row.edge{opacity:.7;font-style:italic}
.scher-history-empty{color:#888;padding:8px;text-align:center}
`;
