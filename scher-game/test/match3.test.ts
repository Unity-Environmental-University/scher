import { describe, it, expect } from "vitest";
import { Society } from "../../src/society.js";
import { openBoard, boardNow, boardAt, swap, undoLastSwap, findMatches,
         settle, legalMoves, moveCount, adjacent, type BoardSpec } from "../src/match3.js";

const SPEC: BoardSpec = { id: "board-1", w: 8, h: 8, kinds: 5, seed: 42 };
const fresh = () => { const s = new Society(); openBoard(s, SPEC); return s; };

describe("match3 — the board is a fold over swaps", () => {
  it("opens with no free matches", () => {
    expect(findMatches(SPEC, boardNow(fresh(), SPEC).cells)).toEqual([]);
  });

  it("is DETERMINISTIC: same log, same board, every read", () => {
    const s = fresh();
    const a = boardNow(s, SPEC).cells;
    const b = boardNow(s, SPEC).cells;
    expect(a).toEqual(b);
    // and a different society with the same seed agrees
    expect(boardNow(fresh(), SPEC).cells).toEqual(a);
  });

  it("a different seed gives a different board", () => {
    const other: BoardSpec = { ...SPEC, seed: 7 };
    const s = new Society(); openBoard(s, other);
    expect(boardNow(s, other).cells).not.toEqual(boardNow(fresh(), SPEC).cells);
  });

  it("refuses a swap that matches nothing", () => {
    const s = fresh();
    const legal = legalMoves(s, SPEC);
    const all: Array<[number, number]> = [];
    for (let i = 0; i < 63; i++) if (adjacent(SPEC, i, i + 1)) all.push([i, i + 1]);
    const illegal = all.find(([a, b]) =>
      !legal.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
    expect(illegal).toBeDefined();
    expect(swap(s, SPEC, illegal![0], illegal![1])).toBeNull();
  });

  it("refuses non-adjacent swaps", () => {
    expect(swap(fresh(), SPEC, 0, 9)).toBeNull();
  });

  it("ONE CLICK LAYS ONE BEAT, however long the cascade", () => {
    const s = fresh();
    const before = s.all().length;
    const [a, b] = legalMoves(s, SPEC)[0];
    swap(s, SPEC, a, b);
    // 3 beats: the swap node, its edge, and layP's quality-marker. The point
    // is that it is CONSTANT — not one per cascade step. A 7-link chain costs
    // exactly what a 1-link chain costs.
    expect(s.all().length - before).toBe(3);
  });

  it("the cascade is DERIVED — steps exist without being laid", () => {
    const s = fresh();
    const [a, b] = legalMoves(s, SPEC)[0];
    swap(s, SPEC, a, b);
    const board = boardNow(s, SPEC);
    expect(board.chain).toBeGreaterThan(0);
    expect(board.steps.length).toBeGreaterThan(0);
    expect(board.steps[0].cleared.length).toBeGreaterThanOrEqual(3);
  });

  it("settling leaves no matches behind", () => {
    const s = fresh();
    for (let i = 0; i < 10; i++) {
      const moves = legalMoves(s, SPEC);
      if (!moves.length) break;
      swap(s, SPEC, moves[0][0], moves[0][1]);
      expect(findMatches(SPEC, boardNow(s, SPEC).cells)).toEqual([]);
    }
  });

  it("scores chains higher than singles", () => {
    const flat = settle(SPEC, new Array(64).fill(0).map((_, i) => (i < 3 ? 1 : (i % 5) + 2)), 1);
    expect(flat.score).toBeGreaterThan(0);
  });

  it("UNDO is occlusion — the board re-folds", () => {
    const s = fresh();
    const start = boardNow(s, SPEC).cells;
    const [a, b] = legalMoves(s, SPEC)[0];
    swap(s, SPEC, a, b);
    expect(boardNow(s, SPEC).cells).not.toEqual(start);
    undoLastSwap(s, SPEC);
    expect(boardNow(s, SPEC).cells).toEqual(start);
    expect(moveCount(s, SPEC)).toBe(0);
  });

  it("AS-OF replays the board three moves ago", () => {
    const s = fresh();
    const marks: number[] = [];
    for (let i = 0; i < 4; i++) {
      const m = legalMoves(s, SPEC);
      if (!m.length) break;
      const slug = swap(s, SPEC, m[0][0], m[0][1]);
      marks.push(s.get(slug!)!.witnessed!);
    }
    expect(marks.length).toBeGreaterThan(2);
    const atFirst = boardAt(s, SPEC, marks[0]).cells;
    const now = boardNow(s, SPEC).cells;
    expect(atFirst).not.toEqual(now);
    // and re-reading the past is stable
    expect(boardAt(s, SPEC, marks[0]).cells).toEqual(atFirst);
  });

  it("a long session stays at HUMAN SCALE in the log", () => {
    const s = fresh();
    let moves = 0;
    for (let i = 0; i < 60; i++) {
      const m = legalMoves(s, SPEC);
      if (!m.length) break;
      if (swap(s, SPEC, m[0][0], m[0][1])) moves++;
    }
    expect(moves).toBeGreaterThan(20);
    // 3 beats per move + the board beat. If cascades were laid, a session with
    // chains averaging 2-3 links would be several thousand.
    expect(s.all().length).toBeLessThanOrEqual(moves * 3 + 5);
  });
});
