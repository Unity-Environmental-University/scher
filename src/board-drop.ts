// ─────────────────────────────────────────────────────────────────────────────
// board-drop.ts — BOARD STORY and DROP STORY (drag/drop-onto-relation wiring) +
// relateBuckets, the standard relate-bucket pair. Split out of stories.ts
// (2026-07-15, separation-of-concerns pass) — the board/column projection +
// drop/drag seam. Behavior is byte-identical to the code this was cut from; only
// the file boundary moved. stories.ts re-exports everything here at the same
// names, so no importer (barrel, frontend dist path, or test) changes.
//
// Composes viewCardStory/listStory, which stay in stories.ts (they are core
// Frame/Card composition primitives, not board-specific — listStory alone backs
// todayview.ts's rail with no board involved). Imported back from stories.js:
// a benign re-export cycle (stories.ts re-exports this file's names; this file
// only CALLS stories.ts's exports inside function bodies, never at module-init
// time), the same shape ESM tolerates for any barrel-and-satellite split.
// ─────────────────────────────────────────────────────────────────────────────

import { el, on } from "./dom.js";
import { project } from "./projection.js";
import { Society, type Quality } from "./society.js";
import { reading, listStory, viewCardStory, type ModeArm } from "./stories.js";

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
  /** the TASTE arm, used only by the default per-item render (ignored if `item` is
   *  supplied — the caller's own `item` owns its own taste then). */
  modeArm?: ModeArm;
}

export function boardStory(soc: Society, params: BoardStoryParams): Node {
  const board = el("div", { class: `story-board ${params.class ?? ""}` });
  const sp = params.standpoint;
  // TODO(socratic): why does boardStory pass standpoint conditionally to viewCardStory (matching listStory), but what if both could unconditionally pass all optionals?
  const renderItem = params.item ?? ((s: Society, slug: string) => {
    if (!params.modeArm) throw new Error("boardStory: default card render needs params.modeArm (the taste arm) when no params.item is supplied");
    return viewCardStory(s, sp !== undefined
      ? { slug, standpoint: sp, modeArm: params.modeArm }
      : { slug, modeArm: params.modeArm });
  });

  for (const col of params.columns) {
    const column = el("div", { class: "board-column" });
    // TODO(socratic): why count the slice length in a separate reading/project instead of inside the listStory's reading, where it's already computed?
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

// ── DROP STORY — "a drop is a reading." ────────────────────────────────────────
// The most imperative gesture in any UI — drag A onto B — collapses into ONE thing:
// the drop LAYS a beat, and the view RE-DERIVES from the canon. There is NO imperative
// drag-state: no HOT card, no stashed __dragA, no DOM bloom kept in memory. You drop, a
// beat lands, every reading re-reads. That is the whole process-ontology thesis made into
// a toy: the substance-flavoured interaction (move this thing onto that thing) becomes a
// pure write-then-read, append-only.
//
// A bucket is a way A may relate to B. Two kinds, and the difference IS the law:
//   • kind:'edge'       — lay a LATERAL prehension A --quality--> B (layP). depends-on, etc.
//   • kind:'membership' — lay NOTHING lateral; place A so it sits BETWEEN B's Once/End.
//                         Membership is betweenness, NEVER a stored containment edge — so
//                         the caller supplies HOW A is repositioned (grammar-specific), and
//                         the interval re-reads via intervalOf. (the settled gen3 law.)
export interface DropBucket {
  key: string;
  label: string;
  /** a one-line gloss of what this relation means (shown as the option's title). */
  sub?: string;
  kind: "edge" | "membership";
  /** edge-kind only: the quality of the lateral prehension laid A --quality--> B. */
  quality?: Quality;
  /** membership-kind only: place A inside B's interval. The caller owns the betweenness
   *  mechanics (e.g. lay a positioning edge between B's Once and End); dropStory itself
   *  lays NOTHING for membership — it only invokes place(). No stored containment. */
  place?: (soc: Society, a: string, b: string) => void;
}

export interface DropStoryParams {
  /** the dragged beat A — the draggable handle (optional; each target is also draggable). */
  source?: string;
  /** the candidate targets B. Each becomes a drop zone offering the buckets. */
  targets: string[];
  buckets: DropBucket[];
  /** how to render each target card (default: a View Card — leaf→card, story→frame). */
  item?: (soc: Society, slug: string) => Node;
  /** the TASTE arm, used only by the default `item` render (ignored if `item` is supplied). */
  modeArm?: ModeArm;
}

/** dropStory: a lane of targets, each a drop-zone that, on drop of A, blooms a small
 *  picker of buckets; choosing one LAYS the chosen relation. The relations on each target
 *  RE-DERIVE from the canon — drop, and the board re-reads itself. Zero imperative
 *  drag-state: each card is itself a story (viewCardStory) that re-reads its own relations
 *  when the society appends, so the drop only ever LAYS — the re-derivation is the cards'
 *  own, by construction. Returns the lane node. */
export function dropStory(soc: Society, params: DropStoryParams): Node {
  const drawCard = params.item ?? ((s: Society, slug: string) => {
    if (!params.modeArm) throw new Error("dropStory: default card render needs params.modeArm (the taste arm) when no params.item is supplied");
    return viewCardStory(s, { slug, modeArm: params.modeArm });
  });
  const lane = el("div", { class: "drop-lane" });

  // TODO(socratic): why check a === b in fire, when a comes from the dragged card and b from the drop target — can the UI allow dragging a card onto itself?
  // fire() is the WHOLE write surface: one beat (edge) or one caller-owned place()
  // (membership) per drop — nothing else. This is the dropStory thesis in three lines.
  const fire = (bucket: DropBucket, a: string, b: string) => {
    if (a === b) return;                          // a card can't relate to itself
    // TODO(socratic): layP's slug format (a-key-b) is deterministic, so a second drop with the same bucket onto the same target will be idempotent — but is that the intended behavior, or should each drop lay a new edge?
    if (bucket.kind === "edge" && bucket.quality) {
      // lay the lateral edge; idempotent by slug. The view re-derives — nothing else to do.
      soc.layP(`${a}-${bucket.key}-${b}`, `${a} ${bucket.label} ${b}`, a, b, bucket.quality);
    } else if (bucket.kind === "membership" && bucket.place) {
      bucket.place(soc, a, b);                     // betweenness, caller-owned; NO stored edge
    }
  };

  for (const target of params.targets) {
    const card = drawCard(soc, target) as HTMLElement;
    card.setAttribute("draggable", "true");
    on(card, "dragstart", (e) => (e as DragEvent).dataTransfer?.setData("text/plain", target));
    on(card, "dragover", (e) => e.preventDefault());   // allow drop
    on(card, "drop", (e) => {
      e.preventDefault();
      const a = (e as DragEvent).dataTransfer?.getData("text/plain");
      // TODO(socratic): the check !a || a === target happens here, but a is only set if dragstart fired on a card — is there a way the dragstart could fail and a be missing, or is the !a check purely defensive?
      if (!a || a === target) return;
      // the buckets bloom as a small picker; choosing one fires the lay. The picker is a
      // reading of "a drag is hovering here", not stored state — it lives only for this drop.
      const picker = el("div", { class: "drop-picker" });
      for (const bucket of params.buckets) {
        const opt = el("button", {
          class: `drop-bucket drop-${bucket.kind}`,
          attrs: { title: bucket.sub ?? "" },
          on: { click: (ev) => { ev.stopPropagation(); fire(bucket, a, target); picker.remove(); } },
        }, bucket.label);
        picker.appendChild(opt);
      }
      card.appendChild(picker);
    });
    lane.appendChild(card);
  }
  return lane;
}

/** the standard relate (A onto B): Blocked-By (a lateral edge) / Sub-Beat-Of (membership).
 *  Sub-beat-of is membership — the caller passes `place` to position A in B's interval,
 *  because betweenness is caller-owned grammar, never a stored containment edge.
 *  RENAMED (Hallie, 2026-07-15, q-blocked-by rename): this is a WRITER — it used to lay
 *  q-depends-on, now lays q-blocked-by, per "new writes: q-blocked-by only" (society.ts's
 *  KernelQuality doc). The label changes too ("Depends On" → "Blocked By"): "the language
 *  to be the language" was the reason for the quality rename, and a label that still says
 *  the retired word right next to the edge it lays would be the exact drift the rename was
 *  meant to stop. Key stays "depends-on" — see the doc below on why. */
export function relateBuckets(place: (soc: Society, a: string, b: string) => void): DropBucket[] {
  return [
    { key: "depends-on", label: "Blocked By", sub: "A needs B first (lateral edge)", kind: "edge", quality: "q-blocked-by" },
    { key: "sub-beat", label: "Sub-Beat Of", sub: "A is PART of B — membership = betweenness, not a stored edge", kind: "membership", place },
  ];
}
