// ─────────────────────────────────────────────────────────────────────────────
// stack-inventory.ts — an inventory whose slots hold STACKS (item + count),
// not one row per item.
//
// Shared surface (Hallie, 2026-07-30). A game has an inventory; Penelope has
// "N beats of this kind." Same component, and the interesting part is that in
// an append-only society they are the same MECHANISM too:
//
//     A COUNT IS NOT STORED. IT IS FOLDED.
//
// You never write `count = 3`. You lay acquire/spend beats and the stack size
// is `rasterize`d from them. Which buys, for free and without asking:
//
//   * history — how you came to have 3 of these, who gave you each one
//   * as-of   — what you were carrying at any past moment
//   * undo    — occlude the acquire; the count re-reads
//   * audit   — a count that disagrees with its beats is impossible, because
//               there is no second place for a count to live and be wrong
//
// The alternative (a `{item: qty}` map you mutate) is smaller and gives up all
// four. It also reintroduces the one thing this library exists to refuse: a
// stored value that can drift from the events that produced it.
// ─────────────────────────────────────────────────────────────────────────────

import { Society, isOccluded } from "scher/society";
import { reading } from "scher/stories";
import { el, esc } from "scher/dom";
import { project } from "scher/projection";

/** A stack: one kind of thing, and how many of it are held. */
export interface Stack {
  /** what kind of thing. Opaque — never parsed for meaning. */
  item: string;
  /** display name, if the item beat carries one. */
  label: string;
  /** how many. FOLDED, never stored. */
  count: number;
  /** the beats that produced this count, newest first — so a UI can show
   *  "where did these come from" without a second query. */
  from: Array<{ slug: string; delta: number; by: string | null; at: number }>;
}

export interface InventoryParams {
  /** whose inventory. Beats are scoped to this holder so two characters do not
   *  share a bag by accident. */
  holder: string;
  /** read the inventory AS OF this clock; omit for now. */
  asOf?: number;
  /** show stacks that have fallen to zero (kept, struck through) rather than
   *  dropping them. Default false. */
  keepEmpty?: boolean;
  /** cap a stack at this size; over-acquiring beyond it is refused loudly
   *  rather than silently clamped. Omit for no cap. */
  maxStack?: number;
}

/** The quality that marks an inventory movement. One string, so the read has
 *  a single thing to look for and callers cannot invent variants. */
export const Q_HOLDS = "q-holds";

/** Slug for a movement beat. Derived (not random) so a replayed/idempotent lay
 *  is inert rather than double-counting — the append-only law does the work. */
function moveSlug(holder: string, item: string, n: number): string {
  return `hold-${holder}-${item}-${n}`;
}

// ── WRITES ──────────────────────────────────────────────────────────────────

/** Acquire `n` of `item`. Lays a movement beat; the count re-folds. */
export function acquire(soc: Society, params: InventoryParams,
                        item: string, n = 1, by?: string): string | null {
  if (n <= 0) return null;
  if (params.maxStack !== undefined) {
    const have = stackOf(soc, params, item)?.count ?? 0;
    // REFUSE LOUDLY rather than clamp: a silently-clamped acquire is a lie the
    // history cannot show. The caller decides what to do about the overflow.
    if (have + n > params.maxStack) return null;
  }
  return layMove(soc, params, item, n, by);
}

/** Spend `n` of `item`. Refuses if you do not have that many — the fold is the
 *  authority, so this cannot go negative behind your back. */
export function spend(soc: Society, params: InventoryParams,
                      item: string, n = 1, by?: string): string | null {
  if (n <= 0) return null;
  const have = stackOf(soc, params, item)?.count ?? 0;
  if (have < n) return null;
  return layMove(soc, params, item, -n, by);
}

function layMove(soc: Society, params: InventoryParams,
                 item: string, delta: number, by?: string): string {
  const existing = movesFor(soc, params.holder, item).length;
  const slug = moveSlug(params.holder, item, existing);
  soc.lay({
    slug,
    // the delta lives in the beat's own content, so the beat is self-describing
    // and the fold never has to consult anything else.
    content: String(delta),
    title: null, subject: null, object: null,
    laid_by: by ?? null,
  });
  soc.layP(`${slug}~h`, `${delta > 0 ? "+" : ""}${delta} ${item}`, slug, item, Q_HOLDS);
  return slug;
}

// ── READS ───────────────────────────────────────────────────────────────────

/** Every movement beat for one holder+item, oldest first. */
function movesFor(soc: Society, holder: string, item: string) {
  return soc.all()
    .filter((r) => r.subject !== null && r.object === item)
    .filter((r) => (r.subject as string).startsWith(`hold-${holder}-${item}-`))
    .sort((a, b) => (a.witnessed ?? 0) - (b.witnessed ?? 0));
}

/** One stack, folded. */
export function stackOf(soc: Society, params: InventoryParams, item: string): Stack | null {
  const edges = movesFor(soc, params.holder, item);
  if (!edges.length) return null;

  let count = 0;
  const from: Stack["from"] = [];
  for (const e of edges) {
    const beat = soc.get(e.subject as string);
    if (!beat) continue;
    const at = beat.witnessed ?? 0;
    if (params.asOf !== undefined && at > params.asOf) continue;
    // an occluded movement stops counting — which is how undo works here, with
    // no undo stack anywhere.
    if (isOccluded(soc, beat.slug) || isOccluded(soc, e.slug)) continue;
    const delta = Number(beat.content) || 0;
    count += delta;
    from.push({ slug: beat.slug, delta, by: beat.laid_by ?? null, at });
  }
  from.reverse();
  return { item, label: soc.get(item)?.title ?? soc.get(item)?.content ?? item, count, from };
}

/** THE READ: every stack this holder carries. */
export function inventoryOf(soc: Society, params: InventoryParams): Stack[] {
  const items = new Set<string>();
  for (const r of soc.all()) {
    if (r.subject && r.object && (r.subject as string).startsWith(`hold-${params.holder}-`))
      items.add(r.object as string);
  }
  return [...items]
    .map((i) => stackOf(soc, params, i))
    .filter((s): s is Stack => !!s)
    .filter((s) => params.keepEmpty || s.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Total things carried (sum of stack sizes) — the usual "encumbrance" read. */
export function carriedCount(soc: Society, params: InventoryParams): number {
  return inventoryOf(soc, params).reduce((n, s) => n + s.count, 0);
}

// ── the SPREAD ──────────────────────────────────────────────────────────────

export interface InventoryStoryParams extends InventoryParams {
  /** click a stack. */
  onPick?: (s: Stack) => void;
  /** show the movement history under each stack. */
  showProvenance?: boolean;
  empty?: string;
}

export function stackInventoryStory(soc: Society, params: InventoryStoryParams): Node {
  const read = reading(soc, (s) => inventoryOf(s, params));
  return project(read, (stacks) => {
    const box = el("div", { class: "scher-inv" });
    if (!stacks.length) {
      box.appendChild(el("div", { class: "scher-inv-empty" }, params.empty ?? "carrying nothing"));
      return box;
    }
    for (const st of stacks) {
      const row = el("div", {
        class: ["scher-inv-stack", st.count === 0 && "empty"],
        data: { item: st.item },
        on: { click: () => params.onPick?.(st) },
      });
      row.appendChild(el("span", { class: "n" }, esc(st.label)));
      // the count reads as ×N — and it is a fold, not a field.
      row.appendChild(el("span", { class: "x" }, `×${st.count}`));
      box.appendChild(row);

      if (params.showProvenance && st.from.length) {
        const prov = el("div", { class: "scher-inv-prov" });
        for (const m of st.from) {
          prov.appendChild(el("div", { class: "scher-inv-move" },
            `${m.delta > 0 ? "+" : ""}${m.delta}  ${esc(m.by ?? "—")}  @${m.at}`));
        }
        box.appendChild(prov);
      }
    }
    return box;
  }).node;
}

export const INVENTORY_INLINE_CSS = `
.scher-inv{font:12px ui-monospace,Menlo,monospace}
.scher-inv-stack{display:flex;gap:8px;padding:4px 6px;border:1px solid #ddd;margin-bottom:3px;
  cursor:pointer;align-items:center}
.scher-inv-stack:hover{background:#f4f2ea}
.scher-inv-stack .n{flex:1}
.scher-inv-stack .x{font-weight:700}
.scher-inv-stack.empty{opacity:.45;text-decoration:line-through}
.scher-inv-prov{font-size:10px;color:#666;padding:2px 0 6px 10px}
.scher-inv-move{padding:1px 0}
.scher-inv-empty{color:#888;padding:8px;text-align:center}
`;
