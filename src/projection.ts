// ─────────────────────────────────────────────────────────────────────────────
// projection.ts — "A VIEW IS A READING of state from a standpoint."
//
// store.ts named the thesis; this is the operation that makes it reusable. A
// PROJECTION binds a Read<T> to a render function and produces a live DOM node that
// RE-READS (re-projects) every time the read re-observes. That is gen3's own thesis
// — status is read, not stored; the view is observer-relative — applied to the UI:
//
//     project(cell, value => render(value)) → a DOM node that is, always, the
//     current reading of `cell` from this standpoint.
//
// Every shipped view hand-rolls this loop: subscribe to state, rebuild innerHTML,
// re-query + re-wire the events (feed.ts's mountFeed does it the long way every
// time). The danger that loop carries — and the reason feed.ts wrote refreshCard to
// patch ONE card instead of rebuilding the whole feed — is two-fold:
//   1. churn: replacing the whole list reflows it under the cursor, loses selection,
//      and a click lands on the wrong row. The fix is KEYED reconciliation
//      (projectList): diff by key, move/patch/remove minimally, leave untouched rows
//      exactly where they are.
//   2. leaks: each re-project re-subscribes without tearing down the old subscriptions
//      and listeners. The fix is OWNED disposal: a projection tracks what it created
//      and disposes it before re-creating (and on its own destroy()).
//
// Raw DOM, one Cell, no virtual DOM, no deps. The whole "framework" is this file +
// cell.ts + dom.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { type Read, type Unsubscribe } from "./cell.js";

/** A live projection: a DOM node that is the current reading of a cell, plus the
 *  handle to end it. `node` is stable across re-projections of a single-node project
 *  only when the render returns the same node; by default project() swaps the node
 *  in place (replaceWith) so the caller should read `.node` through the projection,
 *  or mount it into a stable parent slot. destroy() unsubscribes and disposes. */
export interface Projection {
  /** The current DOM node (the latest reading). Re-assigned on each re-project. */
  readonly node: Node;
  /** End the projection: unsubscribe from the cell, tear down owned listeners. */
  destroy(): void;
}

/** Render a reading into a DOM node. The "standpoint": given the current value, project
 *  it. Called once per re-observation. Should be PURE in (value → node) — side effects
 *  (event wiring) belong on the node it returns (use el()'s `on`, or dom.on()). */
export type RenderFn<T> = (value: T) => Node;

/** project(cell, render) → a DOM node that re-renders when the cell changes.
 *
 *  THE core operation: a view is a reading of state, re-observed. Mounts the first
 *  reading immediately; on every subsequent re-observe, renders the new reading and
 *  swaps it in place (replaceWith) so the node stays in its parent. Returns a
 *  Projection — call destroy() when the view goes away (it unsubscribes; no leak).
 *
 *  For a LIST of beats prefer projectList (keyed, minimal churn). Use project() for a
 *  single node whose whole content is a function of one reading (a detail pane, a
 *  status chip, a header). */
export function project<T>(read: Read<T>, render: RenderFn<T>): Projection {
  let current: Node;
  let mounted = false;

  const unsub: Unsubscribe = read.subscribe((value) => {
    const next = render(value);
    if (!mounted) {
      current = next;
      mounted = true;
      return;
    }
    // swap in place: the new reading takes the old reading's spot in the DOM.
    if (current.parentNode) (current as ChildNode).replaceWith(next);
    current = next;
  });

  return {
    get node(): Node {
      return current;
    },
    destroy(): void {
      unsub();
    },
  };
}

// ── keyed list projection ────────────────────────────────────────────────────
// The lesson feed.ts learned the hard way (refreshCard's comment: "the list reflowed
// under the cursor, the selection was lost, a click could land on the wrong card").
// A list-projection reconciles a list of items → DOM by KEY: existing rows are reused
// (and re-rendered only if their datum changed), new rows are inserted at the right
// place, gone rows are removed. Untouched rows stay exactly where they are. Stable
// list = reliable clicks.

/** Render one list item to a node. Called when an item is first seen, and again when
 *  its datum changes (the projection decides "changed" via the `eq` option). */
export type ItemRender<T> = (item: T, key: string) => Node;

export interface ListOptions<T> {
  /** The stable identity of an item (e.g. a beat slug). Two items with the same key
   *  are "the same row across re-observations." */
  key: (item: T) => string;
  /** How to render one item to a node. */
  render: ItemRender<T>;
  /** Did this item's DATUM change since last projection? If false, the existing node
   *  is kept untouched (no re-render, no churn). Default: never re-render an existing
   *  key in place — i.e. treat the key as the whole identity. Pass a real comparison
   *  (e.g. shallow-equal of the fields the row shows) to get in-place patching. */
  changed?: (prev: T, next: T) => boolean;
}

/** A live list projection: a container node holding one child per item, reconciled by
 *  key when the source list changes. */
export interface ListProjection<T> extends Projection {
  /** The container element (mount this once; its children are reconciled in place). */
  readonly container: HTMLElement;
}

interface Tracked<T> {
  item: T;
  node: Node;
}

/** projectList(cell, container, opts) → a container whose children are the keyed
 *  projection of the list in `cell`. Reconciles minimally on every re-observe:
 *  reused keys keep their node (re-rendered only if `changed` says so), new keys are
 *  inserted in order, removed keys are dropped. The order of the DOM children is made
 *  to match the order of the list, moving as few nodes as possible.
 *
 *  This is the primitive every Penelope view that shows a society of beats needs —
 *  the feed rail, the sub-beat list, the trajectory sections, the retro panel. It
 *  replaces the "rebuild the whole innerHTML" pattern with "re-read, reconcile." */
export function projectList<T>(
  read: Read<ReadonlyArray<T>>,
  container: HTMLElement,
  opts: ListOptions<T>,
): ListProjection<T> {
  const { key, render, changed } = opts;
  let tracked = new Map<string, Tracked<T>>();

  const reconcile = (items: ReadonlyArray<T>): void => {
    const nextKeys: string[] = [];
    const nextTracked = new Map<string, Tracked<T>>();

    // build/patch the node for each item, in list order.
    for (const item of items) {
      const k = key(item);
      nextKeys.push(k);
      const prev = tracked.get(k);
      if (prev && (!changed || !changed(prev.item, item))) {
        // reuse the existing node untouched (stable — no reflow, selection kept).
        nextTracked.set(k, { item, node: prev.node });
      } else if (prev) {
        // same key, datum changed: re-render, swap the node in place.
        const node = render(item, k);
        if (prev.node.parentNode) (prev.node as ChildNode).replaceWith(node);
        nextTracked.set(k, { item, node });
      } else {
        // a new row.
        nextTracked.set(k, { item, node: render(item, k) });
      }
    }

    // remove rows whose key is gone.
    for (const [k, t] of tracked) {
      if (!nextTracked.has(k)) (t.node as ChildNode).remove?.();
    }

    // order the DOM to match nextKeys, moving as few nodes as we can. Walk the desired
    // order; if the child at the cursor isn't the one we want, insert it there.
    let cursor: Node | null = container.firstChild;
    for (const k of nextKeys) {
      const want = nextTracked.get(k)!.node;
      if (cursor === want) {
        cursor = cursor.nextSibling;
      } else {
        container.insertBefore(want, cursor);
        // cursor stays put: `want` is now before it, the rest shift right.
      }
    }

    tracked = nextTracked;
  };

  const unsub = read.subscribe(reconcile);

  return {
    container,
    get node(): Node {
      return container;
    },
    destroy(): void {
      unsub();
      tracked.clear();
    },
  };
}

// ── a standpoint that owns a region (the component seam) ─────────────────────
// A component, in this lib's idiom, is a STANDPOINT: a function that, given its
// inputs and a place to mount, projects a society of beats and returns a handle to
// end the projection. This tiny helper bundles a root node with the projections it
// owns so destroy() tears them ALL down (no orphaned subscriptions on unmount).

/** A mounted standpoint: a root node + a destroy() that ends every projection it owns.
 *  Returned by a component fn so the host can unmount it cleanly. */
export interface Standpoint {
  readonly root: Node;
  destroy(): void;
}

/** Bundle a root node with the projections/teardowns it owns into one Standpoint.
 *  destroy() runs every teardown (projections, event off-handles, child standpoints). */
export function standpoint(root: Node, owns: ReadonlyArray<{ destroy(): void } | (() => void)>): Standpoint {
  return {
    root,
    destroy(): void {
      for (const o of owns) {
        if (typeof o === "function") o();
        else o.destroy();
      }
    },
  };
}
