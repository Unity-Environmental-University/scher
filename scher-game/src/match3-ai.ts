// ─────────────────────────────────────────────────────────────────────────────
// match3-ai.ts — a player that plots by PREDICTING BOARD STATE.
//
// Hallie, 2026-07-30: "And NOW you can — because we have a way of charting the
// future of the board — can you make an ai player that plots good moves by
// prediction board state?"
//
// This is the payoff of two decisions made earlier, and it would be impossible
// without either:
//
//   1. THE BOARD IS A PURE FUNCTION OF ITS MOVES. So "what if I played X" is
//      just the same fold with one more swap — no game object to clone, no
//      state to snapshot and restore, no undo to unwind. Simulation and play
//      are literally the same code path.
//
//   2. REFILLS ARE A SEEDED HASH OF (seed, move, cell), not a stateful RNG.
//      So the lookahead sees the TRUE future, not a guess. Most match-3 AIs
//      cannot search past the first cascade because they do not know what falls
//      in; this one does. A stateful generator would have made this file a
//      heuristic; a pure one makes it a search.
//
// WHAT IT DOES NOT DO
// -------------------
// It does not lay anything while thinking. Every candidate line is evaluated by
// READING a hypothetical board — the society is untouched until the AI actually
// commits a move. Thinking leaves no trace, which is correct: a move you
// considered and rejected did not happen.
// ─────────────────────────────────────────────────────────────────────────────

import { Society } from "scher/society.js";
import {
  type BoardSpec, type Gem, boardNow, findMatches, settle, swap, legalMoves, moveCount,
} from "./match3.js";

export interface Plan {
  /** the move to play now. */
  move: [number, number];
  /** what it is worth, all lookahead folded in. */
  score: number;
  /** immediate score from this move alone. */
  immediate: number;
  /** chain length this move triggers. */
  chain: number;
  /** the line the search liked, this move first. */
  line: Array<[number, number]>;
  /** how many hypothetical boards were folded to decide. */
  boardsSearched: number;
  /** why, in words a human can disagree with — same rule as the GM's rulings
   *  in scher-pages: a ruling nobody can argue with cannot be overruled. */
  because: string;
}

export interface AiParams {
  /** how many moves ahead. 1 = greedy. 2-3 is where it starts looking smart. */
  depth?: number;
  /** how many candidate moves to expand per level. The branching cap — a full
   *  8x8 board offers ~20-40 legal moves, and expanding all of them at depth 3
   *  is ~50k folds. Top-K by immediate value keeps it interactive. */
  width?: number;
  /** future moves are worth less than this one: the board will have changed,
   *  and a plan that depends on three moves landing exactly is a fantasy. */
  discount?: number;
  /** reward keeping options open — a board with more legal moves is a board
   *  you can still play. Pure score-chasing walks into dead boards. */
  mobilityWeight?: number;
}

const DEFAULTS: Required<AiParams> = {
  depth: 3, width: 6, discount: 0.7, mobilityWeight: 2,
};

/** Apply a hypothetical swap and settle — a READ, nothing laid. */
function imagine(spec: BoardSpec, cells: Gem[], a: number, b: number, move: number) {
  const t = [...cells];
  [t[a], t[b]] = [t[b], t[a]];
  return settle(spec, t, move);
}

/** Legal moves on a HYPOTHETICAL board (the real `legalMoves` reads the
 *  society; this one takes cells, so it works inside the search). */
export function legalOn(spec: BoardSpec, cells: Gem[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < spec.h; y++) {
    for (let x = 0; x < spec.w; x++) {
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx >= spec.w || ny >= spec.h) continue;
        const a = y * spec.w + x, b = ny * spec.w + nx;
        const t = [...cells];
        [t[a], t[b]] = [t[b], t[a]];
        if (findMatches(spec, t).length) out.push([a, b]);
      }
    }
  }
  return out;
}

/**
 * THE SEARCH. Depth-limited, best-first, on predicted boards.
 *
 * Because refills are deterministic, `move` (the index that seeds them) has to
 * advance with the search depth — otherwise the lookahead would predict gems
 * that will not actually fall. Getting this wrong is the subtle bug: the search
 * looks fine, plays badly, and nothing errors.
 */
function search(
  spec: BoardSpec, cells: Gem[], moveIndex: number,
  depth: number, p: Required<AiParams>, counter: { n: number },
): { score: number; line: Array<[number, number]> } {
  if (depth === 0) return { score: 0, line: [] };

  const moves = legalOn(spec, cells);
  if (!moves.length) {
    // a dead board is genuinely bad, and worth saying so loudly rather than
    // scoring 0 and letting a sibling line look equal.
    return { score: -1000, line: [] };
  }

  // rank by immediate value, expand only the top `width` — the branching cap.
  const scored = moves.map(([a, b]) => {
    counter.n++;
    const r = imagine(spec, cells, a, b, moveIndex);
    return { a, b, r, immediate: r.score + r.chain * 5 };
  }).sort((x, y) => y.immediate - x.immediate).slice(0, p.width);

  let best = { score: -Infinity, line: [] as Array<[number, number]> };
  for (const c of scored) {
    const mobility = legalOn(spec, c.r.cells).length * p.mobilityWeight;
    const deeper = search(spec, c.r.cells, moveIndex + 1, depth - 1, p, counter);
    const total = c.immediate + mobility + p.discount * deeper.score;
    if (total > best.score)
      best = { score: total, line: [[c.a, c.b], ...deeper.line] };
  }
  return best;
}

/** Plot the best move from the CURRENT board. Reads only. */
export function plan(soc: Society, spec: BoardSpec, params: AiParams = {}): Plan | null {
  const p = { ...DEFAULTS, ...params };
  const board = boardNow(soc, spec);
  const moves = legalMoves(soc, spec);
  if (!moves.length) return null;

  const counter = { n: 0 };
  const nextIndex = moveCount(soc, spec) + 1;
  const best = search(spec, board.cells, nextIndex, p.depth, p, counter);
  if (!best.line.length) return null;

  const [a, b] = best.line[0];
  const now = imagine(spec, board.cells, a, b, nextIndex);
  const after = legalOn(spec, now.cells).length;

  return {
    move: [a, b],
    score: best.score,
    immediate: now.score,
    chain: now.chain,
    line: best.line,
    boardsSearched: counter.n,
    because:
      `clears ${now.steps[0]?.cleared.length ?? 0} for ${now.score} ` +
      `(chain ${now.chain}), leaves ${after} legal moves; ` +
      `best line ${best.line.length} deep scores ${best.score.toFixed(0)} ` +
      `over ${counter.n} predicted boards`,
  };
}

/** Plot and PLAY. The only call here that writes. */
export function playBest(soc: Society, spec: BoardSpec,
                         params: AiParams = {}, by = "frame-ai"): Plan | null {
  const p = plan(soc, spec, params);
  if (!p) return null;
  return swap(soc, spec, p.move[0], p.move[1], by) ? p : null;
}

/**
 * A hint for a human: the best move, without playing it. Same search, and the
 * `because` is legible on purpose — the player can disagree with the reasoning,
 * not just the pick.
 */
export const hint = (soc: Society, spec: BoardSpec, params: AiParams = {}) =>
  plan(soc, spec, { depth: 2, width: 8, ...params });

/**
 * The honest baseline. Greedy: take the biggest immediate clear, no lookahead.
 * Every claim that the search is smart has to beat THIS, or the search is
 * expensive decoration. (Same argument as the optimizer-vs-LLM baseline in
 * MODEL.md — a clever thing that cannot beat the dumb thing is not clever.)
 */
export function planGreedy(soc: Society, spec: BoardSpec): Plan | null {
  const board = boardNow(soc, spec);
  const moves = legalMoves(soc, spec);
  if (!moves.length) return null;
  const nextIndex = moveCount(soc, spec) + 1;

  let best: Plan | null = null;
  for (const [a, b] of moves) {
    const r = imagine(spec, board.cells, a, b, nextIndex);
    if (!best || r.score > best.immediate)
      best = {
        move: [a, b], score: r.score, immediate: r.score, chain: r.chain,
        line: [[a, b]], boardsSearched: moves.length,
        because: `greedy: biggest immediate clear (${r.score})`,
      };
  }
  return best;
}
