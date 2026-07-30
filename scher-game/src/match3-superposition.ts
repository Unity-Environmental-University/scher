// ─────────────────────────────────────────────────────────────────────────────
// match3-superposition.ts — refills as UNRESOLVED possibility, not as values.
//
// Hallie, 2026-07-30: "we can do one better — New things can come in as
// Superpositions not rng'd yet." … "So the AI can actually operate over
// probabilities."
//
// WHY THIS IS BETTER THAN THE SEEDED LOOKAHEAD
// -------------------------------------------
// match3-ai.ts searches with the seeded hash, so it KNOWS what will fall in.
// That is a fair search (the refill is genuinely determined) but it is a strange
// game: the AI plays with perfect information about the future while the player
// does not. It reads the future rather than reasoning about it.
//
// Here a falling gem is not a value yet. It is a SUPERPOSITION — uniform over
// the gem kinds — and it collapses only when observed. Which means:
//
//   * the search computes EXPECTED value across what a cell could be, not
//     actual value of what it will be
//   * the AI faces the same uncertainty the player does
//   * "this move is worth 40 ± a lot" and "this move is worth 35 reliably"
//     become different, and a risk posture becomes a real choice
//
// SAME MOVE AS THE DECK (Hallie, earlier today): a deck is not a shuffled list
// you peek at, it is a constraint set that prunes as cards are observed. A
// refill is the same thing at cell scale: unresolved until read, and the read
// is what makes the fact.
//
// THE COST, NAMED: exact expectation over an unresolved cascade is
// combinatorial — a 5-cell refill over 6 kinds is 7776 futures for ONE step,
// and cascades compound. So this samples: N futures per evaluation, averaged,
// with the variance reported rather than hidden. Sampling is an approximation
// and says so; the alternative is pretending to an exactness nobody can pay for.
// ─────────────────────────────────────────────────────────────────────────────

import { Society } from "scher/society.js";
import {
  type BoardSpec, type Gem, type SettleStep, EMPTY,
  boardNow, findMatches, legalMoves, moveCount, swap,
} from "./match3.js";

/** A cell that has not been observed yet. Distinct from EMPTY (-1), which is a
 *  hole, and from a gem index, which is a fact. */
export const UNRESOLVED: Gem = -2;

export interface Belief {
  /** the board, with UNRESOLVED where refills have not been observed. */
  cells: Gem[];
  /** how many cells are still in superposition. */
  unresolved: number;
}

/** Settle a board that may contain UNRESOLVED cells.
 *
 *  The rule that makes this coherent: an UNRESOLVED cell NEVER MATCHES. It
 *  cannot — it has no value. So a run through a superposed cell is not a run
 *  yet, and the cascade stops there rather than guessing. That is the honest
 *  reading: you do not know, so you do not clear.
 */
export function settleBelief(spec: BoardSpec, cells: Gem[]): {
  cells: Gem[]; steps: SettleStep[]; chain: number; score: number; unresolved: number;
} {
  const c = [...cells];
  const steps: SettleStep[] = [];
  let chain = 0, score = 0;

  for (;;) {
    // findMatches already skips EMPTY; UNRESOLVED is negative too, and two
    // UNRESOLVED cells are not "equal" for matching purposes because we never
    // let them compare — guarded here rather than trusting the sign.
    const cleared = findMatches(spec, c).filter((i) => c[i] >= 0);
    if (!cleared.length) break;
    chain++;
    score += cleared.length * 10 * chain;
    for (const i of cleared) c[i] = EMPTY;

    const fell: Array<[number, number]> = [];
    const spawned: Array<[number, Gem]> = [];
    for (let x = 0; x < spec.w; x++) {
      let write = spec.h - 1;
      for (let y = spec.h - 1; y >= 0; y--) {
        const from = y * spec.w + x;
        if (c[from] === EMPTY) continue;
        const to = write * spec.w + x;
        if (to !== from) { c[to] = c[from]; c[from] = EMPTY; fell.push([from, to]); }
        write--;
      }
      // THE POINT: new cells arrive UNRESOLVED. Not rolled, not guessed.
      for (let y = write; y >= 0; y--) {
        const at = y * spec.w + x;
        c[at] = UNRESOLVED;
        spawned.push([at, UNRESOLVED]);
      }
    }
    steps.push({ cleared, fell, spawned });
    if (steps.length > 200) break;
  }
  return { cells: c, steps, chain, score, unresolved: c.filter((g) => g === UNRESOLVED).length };
}

/** Collapse every UNRESOLVED cell by observing it — one concrete future.
 *  `roll` is injected so a caller controls the sampling source; nothing here
 *  reaches for Math.random on its own. */
export function observe(spec: BoardSpec, cells: Gem[], roll: () => number): Gem[] {
  return cells.map((g) => (g === UNRESOLVED ? Math.floor(roll() * spec.kinds) % spec.kinds : g));
}

export interface Expectation {
  /** mean score across sampled futures. */
  expected: number;
  /** spread — a high-variance move is a gamble, and that is worth knowing
   *  rather than averaging away. */
  stdev: number;
  /** worst sampled outcome: the risk-averse read. */
  worst: number;
  /** best sampled outcome: the upside. */
  best: number;
  /** mean legal moves left — mobility, in expectation. */
  mobility: number;
  samples: number;
}

/**
 * Evaluate a belief-board by SAMPLING its possible futures.
 *
 * Each sample collapses the superposition, re-settles (a collapsed cell may now
 * complete a run the unresolved one could not), and scores. The mean is the
 * expected value; the spread is the risk.
 */
export function expectation(
  spec: BoardSpec, belief: Gem[], samples: number, roll: () => number,
): Expectation {
  const scores: number[] = [];
  let mobility = 0;

  for (let s = 0; s < samples; s++) {
    const concrete = observe(spec, belief, roll);
    // collapsing can complete runs that the unresolved board refused to clear —
    // this second settle is where "what might fall in" turns into value.
    const after = settleBelief(spec, concrete);
    scores.push(after.score);
    mobility += legalOnCells(spec, after.cells).length;
  }

  const n = scores.length || 1;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const varr = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return {
    expected: mean,
    stdev: Math.sqrt(varr),
    worst: Math.min(...scores),
    best: Math.max(...scores),
    mobility: mobility / n,
    samples: n,
  };
}

function legalOnCells(spec: BoardSpec, cells: Gem[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < spec.h; y++) {
    for (let x = 0; x < spec.w; x++) {
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx >= spec.w || ny >= spec.h) continue;
        const a = y * spec.w + x, b = ny * spec.w + nx;
        if (cells[a] < 0 || cells[b] < 0) continue;      // unresolved: unknown
        const t = [...cells];
        [t[a], t[b]] = [t[b], t[a]];
        if (findMatches(spec, t).filter((i) => t[i] >= 0).length) out.push([a, b]);
      }
    }
  }
  return out;
}

// ── the probabilistic player ────────────────────────────────────────────────

export interface ProbPlan {
  move: [number, number];
  /** the certain part: what this move clears regardless of what falls in. */
  guaranteed: number;
  /** expected total once the refills resolve. */
  expected: number;
  stdev: number;
  worst: number;
  best: number;
  mobility: number;
  /** how many futures were sampled to decide. */
  futures: number;
  because: string;
}

export interface ProbParams {
  /** futures sampled per candidate move. */
  samples?: number;
  /** risk posture. 0 = expected value. Positive = prefer certainty (subtract
   *  stdev). Negative = gamble (add it). A real dial, not a knob for show:
   *  a player behind on time wants variance; a player ahead wants none. */
  risk?: number;
  mobilityWeight?: number;
  /** injected randomness. Defaults to Math.random — but note it is only used
   *  for SAMPLING what might happen, never for the game's own refills, which
   *  stay deterministic. Thinking is allowed to be random; the world is not. */
  roll?: () => number;
}

export function planProbabilistic(
  soc: Society, spec: BoardSpec, params: ProbParams = {},
): ProbPlan | null {
  const samples = params.samples ?? 24;
  const risk = params.risk ?? 0;
  const mw = params.mobilityWeight ?? 2;
  const roll = params.roll ?? Math.random;

  const board = boardNow(soc, spec);
  const moves = legalMoves(soc, spec);
  if (!moves.length) return null;

  let best: ProbPlan | null = null;
  let bestUtility = -Infinity;

  for (const [a, b] of moves) {
    const t = [...board.cells];
    [t[a], t[b]] = [t[b], t[a]];
    // settle WITHOUT resolving: this is the part that is certain — what this
    // move clears no matter what falls in afterwards.
    const belief = settleBelief(spec, t);
    const e = expectation(spec, belief.cells, samples, roll);

    const utility = belief.score + e.expected - risk * e.stdev + mw * e.mobility;
    if (utility > bestUtility) {
      bestUtility = utility;
      best = {
        move: [a, b],
        guaranteed: belief.score,
        expected: belief.score + e.expected,
        stdev: e.stdev, worst: belief.score + e.worst, best: belief.score + e.best,
        mobility: e.mobility, futures: e.samples,
        because:
          `${belief.score} guaranteed (clears that do not depend on refills), ` +
          `+${e.expected.toFixed(1)} expected from ${belief.unresolved} unresolved ` +
          `cells over ${e.samples} sampled futures (σ${e.stdev.toFixed(1)}, ` +
          `worst ${e.worst}, best ${e.best})` +
          (risk ? `; risk posture ${risk > 0 ? "averse" : "seeking"}` : ""),
      };
    }
  }
  return best;
}

/** Plot probabilistically and play. The only write. */
export function playProbabilistic(
  soc: Society, spec: BoardSpec, params: ProbParams = {}, by = "frame-ai-prob",
): ProbPlan | null {
  const p = planProbabilistic(soc, spec, params);
  if (!p) return null;
  return swap(soc, spec, p.move[0], p.move[1], by) ? p : null;
}

/** The belief-board as the AI sees it right now: what is known, what is not. */
export function beliefNow(soc: Society, spec: BoardSpec): Belief {
  const cells = boardNow(soc, spec).cells;
  return { cells, unresolved: cells.filter((g) => g === UNRESOLVED).length };
}

void moveCount;
