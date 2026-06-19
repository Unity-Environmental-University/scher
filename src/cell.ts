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

let batchDepth = 0;
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
      // copy + clear first: a flush may itself set a cell (legal; it re-queues).
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
    if (this.#disposed) return;
    if (this.#eq(next, this.#value)) return;
    this.#value = next;
    this.#fire();
  }

  /** Re-observe by reading off the current value, then force a notify even if the
   *  value identity is unchanged (for in-place mutation of a held structure). Prefer
   *  set() with a fresh value where copying is cheap; this is the escape hatch for
   *  the cases where copying a whole structure every keystroke is wasteful. */
  update(mutate: (current: T) => T): void {
    if (this.#disposed) return;
    this.#value = mutate(this.#value);
    this.#fire();
  }

  // notify now, or queue for the batch flush.
  #fire(): void {
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
    for (const sub of [...this.#subs]) sub(this.#value);
  }

  subscribe(sub: Subscriber<T>): Unsubscribe {
    if (this.#disposed) {
      // a disposed cell still answers the current read once, but never again.
      sub(this.#value);
      return () => {};
    }
    this.#subs.add(sub);
    sub(this.#value);
    return () => this.#subs.delete(sub);
  }

  /** End this cell: drop every subscriber. The line dissolves. Idempotent. After
   *  dispose, set() is inert and subscribe() answers the current read once only.
   *  Projections call this on the cells they own when they re-project, so a
   *  re-observe doesn't leak the old subscriptions. */
  dispose(): void {
    this.#disposed = true;
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

  constructor(
    compute: () => T,
    sources: ReadonlyArray<Read<unknown>>,
    eq?: (a: T, b: T) => boolean,
  ) {
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
  return new Derived<T>(compute, sources, eq);
}

/** Sugar: a fresh cell. `cell(0)`. */
export function cell<T>(initial: T, eq?: (a: T, b: T) => boolean): Cell<T> {
  return new Cell<T>(initial, eq);
}
