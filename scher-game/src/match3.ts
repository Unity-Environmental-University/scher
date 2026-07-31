// ─────────────────────────────────────────────────────────────────────────────
// match3.ts — a match-3 board as a scher society. THE STRESS TEST.
//
// Hallie, 2026-07-30: "how much do you feel like writing something that does a
// simple match 3 game in scher-game? To stress test the game parts." … "we want
// to do simple gravity looking falling and chains. And we might well want it as
// a minigame in the visual novel."
//
// Match-3 is a sharper test than it looks, because it attacks the exact
// assumptions this stack has been making:
//
// ── THE CASCADE QUESTION (the one that had to be answered) ──────────────────
// One click can produce: swap → match → clear → gravity → new match → clear →
// gravity → … If every intermediate board is a laid beat, ONE CLICK writes
// dozens of beats and the log explodes. If none are, replay dies.
//
// RULING (and it is the same rule as animation tweens and the 60Hz tick):
//
//        LAY THE SWAP. DERIVE THE SETTLE.
//
// The player made ONE move. The cascade is its deterministic consequence — so
// the swap is the event, and everything after it is a READ. The board is a
// pure function of the moves that produced it: `boardAt(n)` replays n swaps and
// settles each. Undo is free (occlude the swap). "Show me three moves ago" is a
// read. And a 200-move session is ~200 beats, not ~6000.
//
// THE COST, NAMED: intermediate cascade states are not addressable. You cannot
// occlude "the third clear in that chain" because it was never laid. If a
// design ever needs pause-mid-cascade as canon, this is a rewrite, not a tweak.
// Accepted deliberately — the animation needs those states RENDERED, not
// STORED, and derived steps render exactly as well as laid ones.
//
// ── DETERMINISM: the refill problem ─────────────────────────────────────────
// Gravity needs new gems, and `Math.random()` would break replay forever — the
// same log would settle differently on every read. So refills come from a
// SEEDED stream keyed by (seed, move index, cell). No RNG state is carried;
// each refill is a pure function of where and when. Replay is exact, and the
// seed is laid as a beat so the board is reconstructible from the log alone.
// ─────────────────────────────────────────────────────────────────────────────

import { Society, isOccluded } from "scher/society.js";

export type Gem = number;               // 0..kinds-1. Opaque; the view names them.
export const EMPTY: Gem = -1;

export interface BoardSpec {
  id: string;
  w: number;
  h: number;
  kinds: number;
  /** laid as a beat, so the board is reconstructible from the log alone. */
  seed: number;
}

export interface Board {
  cells: Gem[];                          // row-major, length w*h
  /** how many clears the settle took — the chain length, for scoring/juice. */
  chain: number;
  /** cleared cells per cascade step, oldest first. THE ANIMATION SCRIPT:
   *  derived, never stored, and enough to render falling without laying it. */
  steps: SettleStep[];
  score: number;
}

export interface SettleStep {
  /** indices cleared in this step. */
  cleared: number[];
  /** (from, to) index pairs for gems that fell. The tween source. */
  fell: Array<[number, number]>;
  /** indices refilled from the top, with what. */
  spawned: Array<[number, Gem]>;
}

// ── deterministic gem stream ────────────────────────────────────────────────
// A pure hash, not a stateful RNG: refill(seed, move, cell) always answers the
// same thing, so replaying the log reproduces the board EXACTLY. A stateful
// generator would make the board depend on how many times you read it.

function hash3(a: number, b: number, c: number): number {
  let h = (a | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (b + 0x85ebca6b), 0xcc9e2d51);
  h = Math.imul(h ^ (c + 0xc2b2ae35), 0x1b873593);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

const gemAt = (spec: BoardSpec, move: number, nonce: number): Gem =>
  hash3(spec.seed, move, nonce) % spec.kinds;

// ── reads: the board is a fold over swaps ───────────────────────────────────

const idx = (spec: BoardSpec, x: number, y: number) => y * spec.w + x;

/**
 * Lay a CARD PLAY. The other write besides swap().
 *
 * `sets` is (cellIndex → gem) for every cell the card changed, computed by the
 * caller's own effect read. Stored as the beat's content so the fold is
 * self-describing and never has to know what a "card" is.
 */
export function playCardOnBoard(
  soc: Society, spec: BoardSpec, sets: Array<[number, Gem]>, by?: string,
): string | null {
  if (!sets.length) return null;
  const n = cardBeats(soc, spec).length;
  const slug = `${cardPrefix(spec.id)}${n}`;
  soc.lay({
    slug,
    content: JSON.stringify(sets),
    title: null, subject: null, object: null,
    laid_by: by ?? null,
  });
  soc.layP(`${slug}~m`, `card sets ${sets.length} cells`, slug, spec.id, "q-move");
  return slug;
}

function cardBeats(soc: Society, spec: BoardSpec, asOf?: number) {
  const p = cardPrefix(spec.id);
  return soc.all()
    .filter((r) => r.subject !== null && r.object === spec.id &&
                   (r.subject as string).startsWith(p))
    .map((r) => soc.get(r.subject as string)!)
    .filter(Boolean)
    .filter((b) => asOf === undefined || (b.witnessed ?? 0) <= asOf)
    .filter((b) => !isOccluded(soc, b.slug, asOf))
    .sort((a, b) => (a.witnessed ?? 0) - (b.witnessed ?? 0));
}

/** The opening board: filled deterministically, then settled so it never
 *  starts already-matched (a start with free matches is the classic bug). */
function initialCells(spec: BoardSpec): Gem[] {
  const cells: Gem[] = new Array(spec.w * spec.h);
  for (let i = 0; i < cells.length; i++) cells[i] = gemAt(spec, 0, i);
  // re-roll any cell that completes a run, walking forward — cheaper and more
  // predictable than settling the opening position.
  for (let y = 0; y < spec.h; y++) {
    for (let x = 0; x < spec.w; x++) {
      let n = 1;
      while (completesRun(spec, cells, x, y)) {
        cells[idx(spec, x, y)] = gemAt(spec, 0, idx(spec, x, y) + n * 7919);
        if (++n > spec.kinds * 4) break;   // fence: never spin forever
      }
    }
  }
  return cells;
}

function completesRun(spec: BoardSpec, c: Gem[], x: number, y: number): boolean {
  const g = c[idx(spec, x, y)];
  if (g === EMPTY) return false;
  if (x >= 2 && c[idx(spec, x - 1, y)] === g && c[idx(spec, x - 2, y)] === g) return true;
  if (y >= 2 && c[idx(spec, x, y - 1)] === g && c[idx(spec, x, y - 2)] === g) return true;
  return false;
}

/** Every index that is part of a run of 3+. The hot loop — and the first thing
 *  that genuinely earns a Rust port (with this as the correctness oracle). */
export function findMatches(spec: BoardSpec, c: Gem[]): number[] {
  const hit = new Set<number>();
  // horizontal
  for (let y = 0; y < spec.h; y++) {
    let run = 1;
    for (let x = 1; x <= spec.w; x++) {
      const same = x < spec.w && c[idx(spec, x, y)] !== EMPTY &&
                   c[idx(spec, x, y)] === c[idx(spec, x - 1, y)];
      if (same) run++;
      else {
        if (run >= 3) for (let k = x - run; k < x; k++) hit.add(idx(spec, k, y));
        run = 1;
      }
    }
  }
  // vertical
  for (let x = 0; x < spec.w; x++) {
    let run = 1;
    for (let y = 1; y <= spec.h; y++) {
      const same = y < spec.h && c[idx(spec, x, y)] !== EMPTY &&
                   c[idx(spec, x, y)] === c[idx(spec, x, y - 1)];
      if (same) run++;
      else {
        if (run >= 3) for (let k = y - run; k < y; k++) hit.add(idx(spec, x, k));
        run = 1;
      }
    }
  }
  return [...hit].sort((a, b) => a - b);
}

/**
 * Clear, drop, refill — until stable. Returns the animation script as it goes.
 * THIS IS A READ: nothing here is laid. The steps exist so a renderer can show
 * gems falling without any of it becoming canon.
 */
export function settle(spec: BoardSpec, cells: Gem[], move: number): {
  cells: Gem[]; steps: SettleStep[]; chain: number; score: number;
} {
  const c = [...cells];
  const steps: SettleStep[] = [];
  let chain = 0, score = 0, nonce = 1;

  for (;;) {
    const cleared = findMatches(spec, c);
    if (!cleared.length) break;
    chain++;
    // chain scoring: later links are worth more — the reason cascades feel good.
    score += cleared.length * 10 * chain;
    for (const i of cleared) c[i] = EMPTY;

    const fell: Array<[number, number]> = [];
    const spawned: Array<[number, Gem]> = [];

    // gravity, column by column, bottom-up
    for (let x = 0; x < spec.w; x++) {
      let write = spec.h - 1;
      for (let y = spec.h - 1; y >= 0; y--) {
        const from = idx(spec, x, y);
        if (c[from] === EMPTY) continue;
        const to = idx(spec, x, write);
        if (to !== from) { c[to] = c[from]; c[from] = EMPTY; fell.push([from, to]); }
        write--;
      }
      // refill the gap from above — deterministic, keyed by move+nonce
      for (let y = write; y >= 0; y--) {
        const at = idx(spec, x, y);
        const g = gemAt(spec, move, nonce++);
        c[at] = g;
        spawned.push([at, g]);
      }
    }
    steps.push({ cleared, fell, spawned });
    if (steps.length > 200) break;   // fence: a pathological board must not hang
  }
  return { cells: c, steps, chain, score };
}

// ── the log ─────────────────────────────────────────────────────────────────

const swapPrefix = (id: string) => `swap-${id}-`;
const cardPrefix = (id: string) => `card-${id}-`;

/** A laid card play: which cells it set, and to what.
 *  THE BUG THIS FIXES (Hallie, 2026-07-30: "I dont think the cards are
 *  actually doing anything?"): the demo computed a card's new board with
 *  applyCard() and then threw it away. The board is a FOLD OVER LAID EVENTS,
 *  so an effect that is not laid does not exist — the next boardAt() replayed
 *  swaps only and the card's work vanished.
 *
 *  A card play is therefore an event on the SAME chain as a swap, carrying
 *  the cells it changed, and boardAt applies it in order like everything else.
 *  Which also means card plays get undo, as-of and replay for free. */
export interface CardPlay { at: number[]; to: Gem }

/** Lay a swap. THE ONLY WRITE in the whole game. */
export function swap(soc: Society, spec: BoardSpec,
                     a: number, b: number, by?: string): string | null {
  if (!adjacent(spec, a, b)) return null;
  // a swap that matches nothing is refused — the classic rule, and it keeps
  // the log free of no-op moves.
  const before = boardNow(soc, spec).cells;
  const test = [...before];
  [test[a], test[b]] = [test[b], test[a]];
  if (!findMatches(spec, test).length) return null;

  const n = swapBeats(soc, spec).length;
  const slug = `${swapPrefix(spec.id)}${n}`;
  soc.lay({
    slug, content: `${a},${b}`, title: null,
    subject: null, object: null, laid_by: by ?? null,
  });
  soc.layP(`${slug}~m`, `swap ${a}<->${b}`, slug, spec.id, "q-move");
  return slug;
}

export const adjacent = (spec: BoardSpec, a: number, b: number): boolean => {
  const [ax, ay] = [a % spec.w, Math.floor(a / spec.w)];
  const [bx, by] = [b % spec.w, Math.floor(b / spec.w)];
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
};

function swapBeats(soc: Society, spec: BoardSpec, asOf?: number) {
  const p = swapPrefix(spec.id);
  return soc.all()
    .filter((r) => r.subject !== null && r.object === spec.id &&
                   (r.subject as string).startsWith(p))
    .map((r) => soc.get(r.subject as string)!)
    .filter(Boolean)
    .filter((b) => asOf === undefined || (b.witnessed ?? 0) <= asOf)
    // an occluded swap never happened — UNDO, with no undo stack.
    .filter((b) => !isOccluded(soc, b.slug, asOf))
    .sort((a, b) => (a.witnessed ?? 0) - (b.witnessed ?? 0));
}

/** Lay the board's own beat (id + seed) so the log is self-contained. */
export function openBoard(soc: Society, spec: BoardSpec, by?: string): void {
  soc.lay({
    slug: spec.id,
    content: JSON.stringify({ w: spec.w, h: spec.h, kinds: spec.kinds, seed: spec.seed }),
    title: `board ${spec.id}`,
    subject: null, object: null, laid_by: by ?? null,
  });
}

/**
 * THE FOLD: replay every live swap and settle each. The board is a pure
 * function of its moves — which is what buys undo, as-of, and replay for free.
 */
export function boardAt(soc: Society, spec: BoardSpec, asOf?: number): Board {
  let cells = initialCells(spec);
  let score = 0, chain = 0;
  let steps: SettleStep[] = [];

  // the opening settle: the board may need one before any move.
  const opened = settle(spec, cells, 0);
  cells = opened.cells;

  // Replay EVERY move on the chain — swaps and card plays — in witnessing
  // order. Interleaving matters: a card played between two swaps changed the
  // board those swaps saw.
  const moves = [...swapBeats(soc, spec, asOf), ...cardBeats(soc, spec, asOf)]
    .sort((a, b) => (a.witnessed ?? 0) - (b.witnessed ?? 0));

  moves.forEach((b, i) => {
    if (b.slug.startsWith(cardPrefix(spec.id))) {
      let sets: Array<[number, Gem]>;
      try { sets = JSON.parse(b.content); } catch { return; }
      for (const [at, to] of sets) if (at >= 0 && at < cells.length) cells[at] = to;
    } else {
      const [a, z] = b.content.split(",").map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(z)) return;
      [cells[a], cells[z]] = [cells[z], cells[a]];
    }
    const s = settle(spec, cells, i + 1);
    cells = s.cells; score += s.score; chain = s.chain; steps = s.steps;
  });

  return { cells, chain, steps, score };
}

export const boardNow = (soc: Society, spec: BoardSpec) => boardAt(soc, spec);

/** Undo the last move: occlude it. The board re-folds; nothing is deleted. */
export function undoLastSwap(soc: Society, spec: BoardSpec, by?: string): string | null {
  const swaps = swapBeats(soc, spec);
  const last = swaps[swaps.length - 1];
  if (!last) return null;
  const occ = `occ-${last.slug}`;
  if (soc.get(occ)) return null;
  soc.lay({ slug: occ, content: "took it back", subject: null, object: null, laid_by: by ?? null });
  soc.layP(`${occ}~o`, "took it back", occ, last.slug, "q-occludes");
  return occ;
}

/** How many moves have been made (live ones only). */
export const moveCount = (soc: Society, spec: BoardSpec, asOf?: number) =>
  swapBeats(soc, spec, asOf).length + cardBeats(soc, spec, asOf).length;

/** Every legal move on the current board — the hint read, and the thing that
 *  tells you a board is dead. */
export function legalMoves(soc: Society, spec: BoardSpec): Array<[number, number]> {
  const { cells } = boardNow(soc, spec);
  const out: Array<[number, number]> = [];
  for (let y = 0; y < spec.h; y++) {
    for (let x = 0; x < spec.w; x++) {
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx >= spec.w || ny >= spec.h) continue;
        const a = idx(spec, x, y), b = idx(spec, nx, ny);
        const t = [...cells];
        [t[a], t[b]] = [t[b], t[a]];
        if (findMatches(spec, t).length) out.push([a, b]);
      }
    }
  }
  return out;
}
