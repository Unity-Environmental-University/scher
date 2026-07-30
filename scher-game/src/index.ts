// scher-game — the game layer over a scher Society.
//
// Started as a STRESS TEST (Hallie, 2026-07-30: "how much do you feel like
// writing something that does a simple match 3 game in scher-game? To stress
// test the game parts"), because match-3 attacks the assumptions directly:
// cascades threaten log explosion, gravity threatens determinism, and a
// 60fps fall threatens the tick-is-a-measurement rule.
//
// All three held. A move costs 3 beats whatever the chain length; the board is
// a pure function of its swaps; the falling is derived and never laid.

export {
  type Gem, type Board, type BoardSpec, type SettleStep, EMPTY,
  openBoard, boardAt, boardNow, swap, undoLastSwap, moveCount,
  findMatches, settle, legalMoves, adjacent,
} from "./match3.js";

export { match3Canvas, GEMS, type GemSet, type CanvasParams } from "./match3-canvas.js";
