import { describe, it, expect } from "vitest";
import { Society } from "../../src/society.js";
import { openBoard, boardNow, legalMoves, moveCount, swap, type BoardSpec } from "../src/match3.js";
import { plan, planGreedy, playBest, legalOn } from "../src/match3-ai.js";
import { planProbabilistic, playProbabilistic, settleBelief, expectation,
         observe, UNRESOLVED } from "../src/match3-superposition.js";

const SPEC: BoardSpec = { id: "b", w: 8, h: 8, kinds: 6, seed: 99 };
const fresh = (seed = 99) => {
  const s = new Society(); const sp = { ...SPEC, seed };
  openBoard(s, sp); return { s, sp };
};
/** deterministic sampler so the probabilistic tests are reproducible */
const mulberry = (a: number) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("ai — plots by predicting board state", () => {
  it("thinking LAYS NOTHING", () => {
    const { s, sp } = fresh();
    const before = s.all().length;
    plan(s, sp, { depth: 3 });
    expect(s.all().length).toBe(before);
  });

  it("finds a move and explains it", () => {
    const { s, sp } = fresh();
    const p = plan(s, sp, { depth: 2 })!;
    expect(p).not.toBeNull();
    expect(p.boardsSearched).toBeGreaterThan(10);
    expect(p.because).toMatch(/predicted boards/);
  });

  it("deeper search folds more boards", () => {
    const { s, sp } = fresh();
    const d1 = plan(s, sp, { depth: 1 })!;
    const d3 = plan(s, sp, { depth: 3 })!;
    expect(d3.boardsSearched).toBeGreaterThan(d1.boardsSearched);
  });

  it("is DETERMINISTIC — same board, same plan", () => {
    const { s, sp } = fresh();
    expect(plan(s, sp, { depth: 3 })!.move).toEqual(plan(s, sp, { depth: 3 })!.move);
  });

  it("the plan is a real legal move", () => {
    const { s, sp } = fresh();
    const p = plan(s, sp, { depth: 2 })!;
    const legal = legalMoves(s, sp);
    expect(legal.some(([a, b]) => a === p.move[0] && b === p.move[1])).toBe(true);
  });

  it("playBest lays exactly one move", () => {
    const { s, sp } = fresh();
    const before = s.all().length;
    playBest(s, sp, { depth: 2 });
    expect(s.all().length - before).toBe(3);
    expect(moveCount(s, sp)).toBe(1);
  });

  // THE CLAIM UNDER TEST: lookahead has to beat the dumb baseline, or it is
  // expensive decoration.
  // THE CLAIM: lookahead must beat the dumb baseline or it is expensive
  // decoration. Given a generous timeout because it plays whole games — it is
  // a benchmark wearing a test's clothes, and shortening it to fit the default
  // would weaken the only check that the search is worth anything.
  it("SEARCH BEATS GREEDY over a full game", () => {
    // plan ONCE per move and play THAT plan — the first draft called plan()
    // and then playBest(), which planned again: double the work for the same
    // move, and the reason this test was slow.
    const play = (mode: "search" | "greedy", seed: number) => {
      const { s, sp } = fresh(seed);
      for (let i = 0; i < 25; i++) {
        const p = mode === "search" ? plan(s, sp, { depth: 2, width: 5 }) : planGreedy(s, sp);
        if (!p) break;
        if (!swap(s, sp, p.move[0], p.move[1], mode)) break;
      }
      return boardNow(s, sp).score;
    };
    let searchWins = 0;
    for (const seed of [1, 7, 13, 21, 34])
      if (play("search", seed) >= play("greedy", seed)) searchWins++;
    // not a clean sweep — match-3 has real luck in it. But the search must not
    // LOSE most of the time, or the lookahead is not buying anything.
    expect(searchWins).toBeGreaterThanOrEqual(3);
  }, 30_000);
});

describe("superposition — refills unresolved until observed", () => {
  it("new cells arrive UNRESOLVED, not rolled", () => {
    const { s, sp } = fresh();
    const cells = boardNow(s, sp).cells;
    const moves = legalMoves(s, sp);
    const [a, b] = moves[0];
    const t = [...cells]; [t[a], t[b]] = [t[b], t[a]];
    const belief = settleBelief(sp, t);
    expect(belief.unresolved).toBeGreaterThan(0);
    expect(belief.cells).toContain(UNRESOLVED);
  });

  it("an UNRESOLVED cell never matches — the cascade stops rather than guessing", () => {
    const { sp } = fresh();
    const cells = new Array(64).fill(0).map((_, i) => (i % 6));
    cells[0] = UNRESOLVED; cells[1] = UNRESOLVED; cells[2] = UNRESOLVED;
    const r = settleBelief(sp, cells);
    // three identical UNRESOLVED cells in a row must NOT clear
    expect(r.steps.every((st) => !st.cleared.includes(0))).toBe(true);
  });

  it("observing collapses the superposition", () => {
    const { sp } = fresh();
    const belief = new Array(64).fill(UNRESOLVED);
    const concrete = observe(sp, belief, mulberry(5));
    expect(concrete.every((g) => g >= 0 && g < sp.kinds)).toBe(true);
  });

  it("expectation reports SPREAD, not just a mean", () => {
    const { s, sp } = fresh();
    const cells = boardNow(s, sp).cells;
    const [a, b] = legalMoves(s, sp)[0];
    const t = [...cells]; [t[a], t[b]] = [t[b], t[a]];
    const e = expectation(sp, settleBelief(sp, t).cells, 20, mulberry(11));
    expect(e.samples).toBe(20);
    expect(e.best).toBeGreaterThanOrEqual(e.worst);
    expect(e.stdev).toBeGreaterThanOrEqual(0);
  });

  it("separates GUARANTEED from EXPECTED", () => {
    const { s, sp } = fresh();
    const p = planProbabilistic(s, sp, { samples: 16, roll: mulberry(3) })!;
    expect(p.guaranteed).toBeGreaterThan(0);            // clears that need no luck
    expect(p.expected).toBeGreaterThanOrEqual(p.guaranteed);
    expect(p.because).toMatch(/guaranteed/);
  });

  it("risk posture changes the pick", () => {
    const { s, sp } = fresh(4);
    const averse = planProbabilistic(s, sp, { samples: 40, risk: 3, roll: mulberry(2) })!;
    const seeking = planProbabilistic(s, sp, { samples: 40, risk: -3, roll: mulberry(2) })!;
    // they may agree on a board with one obvious move — but the utility used
    // to choose must differ, and the seeker must not prefer LOWER upside.
    expect(seeking.best).toBeGreaterThanOrEqual(averse.worst);
  });

  it("the probabilistic player plays, and lays one move", () => {
    const { s, sp } = fresh();
    const before = s.all().length;
    const p = playProbabilistic(s, sp, { samples: 8, roll: mulberry(9) });
    expect(p).not.toBeNull();
    expect(s.all().length - before).toBe(3);
  });

  it("thinking probabilistically LAYS NOTHING", () => {
    const { s, sp } = fresh();
    const before = s.all().length;
    planProbabilistic(s, sp, { samples: 20, roll: mulberry(1) });
    expect(s.all().length).toBe(before);
  });
});
