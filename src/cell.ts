// ─────────────────────────────────────────────────────────────────────────────
// cell.ts — the read-cell. "A value is a READING."
//
// This is store.ts's Cell<T>, extracted and hardened. The thesis is unchanged
// (store.ts said it first): the reactivity Hallie likes about React — a measurement
// changes → the view recomputes — IS Penelope's read-at-prehension. A cell HOLDS a
// reading; setting it RE-OBSERVES; subscribers RE-PROJECT. No virtual DOM, no
// components-as-things, no borrowed substance-metaphysics. Hold a value, notify on
// change, let the view re-read.
//
// What store.ts's Cell already had (and we keep, verbatim in spirit):
//   • equality-gated set() — an identical read is inert, moves no needle, notifies nobody.
//   • subscribe() fires once immediately (the current read) and returns an unsubscribe.
//
// What this file ADDS (the "harden" of the framework pass):
//   • derive()  — a READ COMPUTED FROM OTHER READS. A standpoint that observes other
//                 standpoints. Recomputed on any source change, equality-gated, disposable.
//   • batch()   — coalesce several re-observations into ONE notification wave, so a
//                 view that reads N cells re-projects once, not N times.
//   • dispose() — a cell can be ended (its line dissolves); subscribers are dropped.
//                 This is what stops the memory leak on re-project (see projection.ts).
//
// No runtime deps. Pure TS. This is the whole reactive core of the lib.
// ─────────────────────────────────────────────────────────────────────────────

export type Subscriber<T> = (value: T) => void;
export type Unsubscribe = () => void;

// TODO(socratic): why does Subscriber<T> take one T argument rather than the old and new values, or a delta, or an event object with metadata?

/** A read-cell: a value that, when re-observed, notifies whoever is reading it.
 *
 *  This is the "a value is a reading" primitive. Everything reactive in the lib —
 *  derived cells, projections, list-projections — is built on this one interface. */
export interface Read<T> {
  /** Observe the current reading. */
  get(): T;
  /** Subscribe to re-observations. Fires once immediately with the current reading;
   *  returns an unsubscribe. */
  subscribe(sub: Subscriber<T>): Unsubscribe;
}

// ── the batching frame ───────────────────────────────────────────────────────
// During a batch, cells that change collect themselves here and flush ONCE at the
// end. A view reading several cells then re-projects a single time. Re-entrant:
// nested batch() calls share the outer frame (only the outermost flushes).

// TODO(socratic): this frame is module-global — if two independent stores batch on the same tick, their waves entangle; is "one shared Now" a commitment here, or an accident of module scope?
// TODO(socratic): why is batchDepth a number (counting depth) rather than a flag, and does the number itself matter past zero-or-nonzero?
let batchDepth = 0;
// TODO(socratic): pendingFlush holds bare functions, not Cell references — does this loose-coupling hide or reveal the cells involved, and can that hide cascading flushes?
const pendingFlush = new Set<() => void>();

/** Run `fn`, coalescing every cell re-observation inside it into ONE notification
 *  wave at the end. Use when a single user act changes several cells and you want
 *  the views to re-project once, not once per cell. Re-entrant and exception-safe. */
export function batch<R>(fn: () => R): R {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      // TODO(socratic): why check batchDepth === 0 rather than 1, and does the off-by-one direction matter?
      // copy + clear first: a flush may itself set a cell (legal; it re-queues).
      // TODO(socratic): a flush that sets a cell re-queues into pendingFlush — but nothing here re-drains that set outside a batch, so those late notifications fire immediately and un-coalesced; is that the wave you promised, or a second smaller wave the caller never asked for?
      const flushes = [...pendingFlush];
      pendingFlush.clear();
      for (const flush of flushes) flush();
    }
  }
}

/** A single observable read-cell. set() re-observes → notifies → readers re-project.
 *
 *  Equality-gated (Object.is by default): an identical read moves no needle, so it
 *  notifies nobody — only a genuine change recomputes. */
export class Cell<T> implements Read<T> {
  #value: T;
  readonly #subs = new Set<Subscriber<T>>();
  // TODO(socratic): why is #eq stored on every cell rather than passed fresh to set(), and does that bake in a fixed equality rule for a cell's whole lifetime?
  readonly #eq: (a: T, b: T) => boolean;
  #disposed = false;
  // true when this cell already has a flush queued inside an open batch frame.
  #queued = false;

  constructor(initial: T, eq: (a: T, b: T) => boolean = Object.is) {
    this.#value = initial;
    this.#eq = eq;
  }

  get(): T {
    return this.#value;
  }

  /** Re-observe with a new value. Equality-gated; inert reads notify nobody. Inside
   *  a batch() the notification is deferred to the flush (coalesced to one wave). */
  set(next: T): void {
    // TODO(socratic): should a set() to a disposed cell throw rather than silently return, and does silent disposal hide lost updates?
    if (this.#disposed) return;
    // TODO(socratic): this checks eq(next, current) — which order of arguments, and does it matter if eq is asymmetric or has side effects?
    if (this.#eq(next, this.#value)) return;
    this.#value = next;
    this.#fire();
  }

  /** Re-observe by reading off the current value, then force a notify even if the
   *  value identity is unchanged (for in-place mutation of a held structure). Prefer
   *  set() with a fresh value where copying is cheap; this is the escape hatch for
   *  the cases where copying a whole structure every keystroke is wasteful. */
  // TODO(socratic): update() silently bypasses the equality gate that set() calls the cell's defining virtue — does the name "update" confess that it always fires, or does it lie by symmetry with set()?
  update(mutate: (current: T) => T): void {
    // TODO(socratic): should update() also return the mutated value, or does that encourage further mutation chaining?
    if (this.#disposed) return;
    this.#value = mutate(this.#value);
    this.#fire();
  }

  // notify now, or queue for the batch flush.
  #fire(): void {
    // TODO(socratic): does #queued prevent duplicate flushes for the same cell, or does it create silent drops if a cell changes twice inside a batch?
    if (batchDepth > 0) {
      if (!this.#queued) {
        this.#queued = true;
        pendingFlush.add(() => {
          this.#queued = false;
          this.#notify();
        });
      }
      return;
    }
    this.#notify();
  }

  #notify(): void {
    // snapshot the subscriber set: a subscriber may unsubscribe (or subscribe) during
    // its own run, and mutating a Set mid-iteration is a footgun.
    // TODO(socratic): is the spread [...this.#subs] meant to be a cheap shallow copy, and does it hold if #subs contains millions of subscribers?
    for (const sub of [...this.#subs]) sub(this.#value);
  }

  subscribe(sub: Subscriber<T>): Unsubscribe {
    // TODO(socratic): a disposed cell that still whispers its last value to new subscribers — if the line has dissolved, why does it keep answering, and could a re-projected view mistake that ghost reading for a live one?
    if (this.#disposed) {
      // a disposed cell still answers the current read once, but never again.
      // TODO(socratic): why fire the subscriber synchronously here, and does that create asymmetry between disposed and live cells?
      sub(this.#value);
      return () => {};
    }
    this.#subs.add(sub);
    // TODO(socratic): the immediate fire happens before the subscriber is even added to #subs — does that fire-before-add order hide a race if the subscriber itself sets this cell?
    sub(this.#value);
    return () => this.#subs.delete(sub);
  }

  /** End this cell: drop every subscriber. The line dissolves. Idempotent. After
   *  dispose, set() is inert and subscribe() answers the current read once only.
   *  Projections call this on the cells they own when they re-project, so a
   *  re-observe doesn't leak the old subscriptions. */
  dispose(): void {
    this.#disposed = true;
    // TODO(socratic): dispose() sets #disposed before clearing subscribers — does this prevent a subscriber's own unsubscribe from racing against the clear?
    this.#subs.clear();
  }

  get disposed(): boolean {
    return this.#disposed;
  }
}

// ── derive: a read computed from other reads ─────────────────────────────────
// A standpoint that observes other standpoints and projects its own reading. The
// value is recomputed when any source re-observes, equality-gated so a derived read
// that lands on the same value is itself inert (the change wave stops here).

/** A read computed from one or more source cells. Recomputes (equality-gated) when
 *  any source changes. Dispose it to detach from its sources (no leak). */
export class Derived<T> implements Read<T> {
  readonly #cell: Cell<T>;
  readonly #unsubs: Unsubscribe[] = [];
  #disposed = false;

  // TODO(socratic): the sources array is a hand-written duplicate of what compute() actually reads — when a builder edits the closure but not the list, the derived read goes quietly stale; is manual wiring a chosen honesty (explicit prehension) or just tracking we haven't built?
  // TODO(socratic): if source A is itself a Derived of source B, a change to B notifies this cell twice (once via B, once via A) with no glitch-freedom — outside a batch, can a subscriber observe the torn intermediate reading, and is that a frame we accept?
  constructor(
    compute: () => T,
    sources: ReadonlyArray<Read<unknown>>,
    eq?: (a: T, b: T) => boolean,
  ) {
    // TODO(socratic): the initial compute() happens here outside any batch frame — if compute() itself calls set() on other cells, those notifications fire immediately rather than coalesced?
    this.#cell = new Cell<T>(compute(), eq);
    const recompute = (): void => {
      if (this.#disposed) return;
      this.#cell.set(compute());
    };
    for (const s of sources) {
      // subscribe() fires immediately; skip that first synchronous call (we already
      // computed the initial value above) with a primed flag, then recompute on change.
      let primed = false;
      this.#unsubs.push(
        s.subscribe(() => {
          if (!primed) {
            primed = true;
            return;
          }
          // TODO(socratic): recompute is called outside the batch frame of the original source change — does that break coalescing if multiple sources change in one batch?
          recompute();
        }),
      );
    }
  }

  get(): T {
    return this.#cell.get();
  }

  subscribe(sub: Subscriber<T>): Unsubscribe {
    return this.#cell.subscribe(sub);
  }

  /** Detach from every source and drop subscribers. The derived line dissolves. */
  dispose(): void {
    this.#disposed = true;
    // TODO(socratic): why unsubscribe from all sources before clearing the unsub list, and does the order protect against re-entrance?
    for (const u of this.#unsubs) u();
    this.#unsubs.length = 0;
    this.#cell.dispose();
  }
}

/** Sugar: derive a read from sources. `derive(() => a.get() + b.get(), [a, b])`. */
export function derive<T>(
  compute: () => T,
  sources: ReadonlyArray<Read<unknown>>,
  eq?: (a: T, b: T) => boolean,
): Derived<T> {
  // TODO(socratic): this is just a factory; why expose both the class and the function, and does that encourage builders to avoid the shorthand?
  return new Derived<T>(compute, sources, eq);
}

/** Sugar: a fresh cell. `cell(0)`. */
export function cell<T>(initial: T, eq?: (a: T, b: T) => boolean): Cell<T> {
  // TODO(socratic): this is just a factory; why expose both the class and the function, and do callers ever distinguish or mix them?
  return new Cell<T>(initial, eq);
}
