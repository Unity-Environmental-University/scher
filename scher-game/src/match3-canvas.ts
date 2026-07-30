// ─────────────────────────────────────────────────────────────────────────────
// match3-canvas.ts — the renderer. Canvas, upsized emoji, falling gems.
//
// Hallie, 2026-07-30: "yeah it would want rendering to a canvas probably." …
// "Just use upsized emoji?" … and two gem sets:
//   CAREER — 🧠 ❤️ 🔍 😎 🚀 🐛   (the resume keys, playable)
//   WORLD  — 🐜 🐝 🪲 🌙 ☀️ 🌸   (the planet, playable)
//
// Emoji as gems is not a placeholder dodge: it needs no art pipeline, it scales
// to any size, it matches the emoji-as-stats vocabulary the rest of the stack
// already uses, and a colourblind player can still tell a bee from a moon.
//
// WHAT THIS FILE PROVES ABOUT THE MODEL
// -------------------------------------
// Every falling gem here is DERIVED. `settle()` returns an animation script
// (cleared / fell / spawned per cascade step) that nothing ever laid, and this
// renderer tweens between those states at 60fps while the log holds exactly
// three beats for the whole move. That is the tick-is-a-measurement rule and
// the tween-is-not-a-beat rule, both, with something real riding on them.
//
// If the animation ever needs to be canon (a replay that must show the same
// bounce), the script is deterministic — same log, same steps, same frames —
// so it can be re-derived rather than stored. Still nothing to lay.
// ─────────────────────────────────────────────────────────────────────────────

import { Society } from "scher/society.js";
import {
  type BoardSpec, type SettleStep, boardNow, swap, legalMoves, adjacent,
} from "./match3.js";
// JUICE AS SYSTEMS (Hallie, 2026-07-30) — particles and shake were written
// inline here, which meant the next game would rewrite them. Nothing about a
// burst of glyphs or a decaying shake is match-3 shaped.
import { Juice, shakeForClear, SHAKE_EVENT } from "./juice.js";

/** Gem sets. `kinds` in the BoardSpec must match the set's length. */
// ONE VOCABULARY, not two palettes.
//
// A first version had a `career` set and a `world` set, and a board picked
// one. That broke the moment a character's star named something outside the
// chosen set: the moon moth was constructed with moon=3 against the career
// palette, so her card rendered "reloads on 😎" while her star said "the
// moon." The fiction and the gems drifted and nothing caught it.
//
// Since the palette is now DERIVED from who is on the job (match3-players.ts,
// `gemsFor`), the right shape is ONE table of every glyph the game speaks,
// with a board using whichever subset its crew and job actually need. A star
// can then name anything and always render as itself.
export const GLYPHS = [
  "🧠", "❤️", "🔍", "😎", "🚀", "🐛",     // 0-5  the resume keys
  "🌙", "☀️", "🌸", "🐜", "🐝", "🪲",     // 6-11 the planet
  "🔧", "❔",                             // 12-13 the work, the unknown
] as const;

/** Named indices, so callers never hardcode a number and drift from the
 *  glyph it means. This is the fix for the bug above. */
export const GEM = {
  BRAIN: 0, HEART: 1, GLASS: 2, COOL: 3, ROCKET: 4, BUG: 5,
  MOON: 6, SUN: 7, FLOWER: 8, ANT: 9, BEE: 10, BEETLE: 11,
  WRENCH: 12, QUESTION: 13,
} as const;

/** Kept as convenience SUBSETS for a board that wants a themed palette
 *  without deriving one — but note they are now views on the one vocabulary,
 *  so index 6 is 🌙 everywhere, in every set. */
export const GEMS = {
  career: [GLYPHS[0], GLYPHS[1], GLYPHS[2], GLYPHS[3], GLYPHS[4], GLYPHS[5]],
  world: [GLYPHS[9], GLYPHS[10], GLYPHS[11], GLYPHS[6], GLYPHS[7], GLYPHS[8]],
} as const;

export type GemSet = keyof typeof GEMS;

export interface CanvasParams {
  spec: BoardSpec;
  gems?: GemSet | readonly string[];
  /** px per cell. */
  cell?: number;
  /** ms for one cascade step's fall. */
  fallMs?: number;
  /** ms for the clear flash before things drop. */
  clearMs?: number;
  by?: string;
  onScore?: (total: number, chain: number) => void;
  /** embed-friendly: the VN owns the page, this owns a rectangle. */
  background?: string;
}

interface Anim {
  steps: SettleStep[];
  /** which step we are on. */
  i: number;
  /** 0..1 within the current step. */
  t: number;
  /** cells as they were BEFORE this step, for interpolation. */
  before: number[];
}

export function match3Canvas(soc: Society, params: CanvasParams) {
  const spec = params.spec;
  const set = typeof params.gems === "string" ? GEMS[params.gems]
            : (params.gems ?? GEMS.career);
  const CELL = params.cell ?? 56;
  const FALL = params.fallMs ?? 180;
  const CLEAR = params.clearMs ?? 140;

  const canvas = document.createElement("canvas");
  canvas.width = spec.w * CELL;
  canvas.height = spec.h * CELL;
  canvas.style.cssText =
    `display:block;touch-action:none;image-rendering:auto;` +
    `background:${params.background ?? "#141018"};border:3px solid #111`;
  const ctx = canvas.getContext("2d")!;

  let picked: number | null = null;
  let anim: Anim | null = null;
  const juice = new Juice();
  let raf = 0;
  let running = true;

  // ── drawing ───────────────────────────────────────────────────────────────

  const xy = (i: number) => [(i % spec.w) * CELL, Math.floor(i / spec.w) * CELL];

  function drawGem(g: number, px: number, py: number, scale = 1, alpha = 1) {
    if (g < 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${Math.floor(CELL * 0.68 * scale)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(set[g % set.length], px + CELL / 2, py + CELL / 2 + 1);
    ctx.restore();
  }

  function drawGrid() {
    ctx.fillStyle = params.background ?? "#141018";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    for (let i = 0; i <= spec.w; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    }
    for (let j = 0; j <= spec.h; j++) {
      ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(canvas.width, j * CELL); ctx.stroke();
    }
  }

  /** ease-out for the fall: gems arrive fast and settle, which reads as weight. */
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  /** Burst at a cell — the gem breaking apart. */
  function burst(cell: number, glyph: string, n = 7, speed = 1) {
    const [x, y] = xy(cell);
    juice.particles.burst(x + CELL / 2, y + CELL / 2, glyph,
      { count: n, speed: 0.07 * speed, size: CELL * 0.26 });
  }

  function draw() {
    drawGrid();
    const board = boardNow(soc, spec);

    if (!anim) {
      board.cells.forEach((g, i) => { const [x, y] = xy(i); drawGem(g, x, y); });
      if (picked !== null) {
        const [x, y] = xy(picked);
        ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
      }
      return;
    }

    // ── animating a derived cascade ─────────────────────────────────────────
    const step = anim.steps[anim.i];
    const cells = anim.before;
    const clearing = anim.t < CLEAR / (CLEAR + FALL);
    const ft = clearing ? 0 : (anim.t - CLEAR / (CLEAR + FALL)) / (FALL / (CLEAR + FALL));
    const moved = new Map(step.fell.map(([from, to]) => [to, from]));
    const cleared = new Set(step.cleared);

    for (let i = 0; i < cells.length; i++) {
      const [x, y] = xy(i);
      if (cleared.has(i)) {
        // the clear flash: pop and fade, so a chain reads as a chain.
        if (clearing) {
          const p = anim.t / (CLEAR / (CLEAR + FALL));
          drawGem(cells[i], x, y, 1 + p * 0.5, 1 - p);
        }
        continue;
      }
      if (!clearing && moved.has(i)) continue;   // drawn below, in flight
      drawGem(cells[i], x, y);
    }

    if (!clearing) {
      const e = ease(Math.min(1, ft));
      for (const [from, to] of step.fell) {
        const [fx, fy] = xy(from), [tx, ty] = xy(to);
        drawGem(cells[from], fx + (tx - fx) * e, fy + (ty - fy) * e);
      }
      for (const [at, g] of step.spawned) {
        const [tx, ty] = xy(at);
        // spawn from above the top edge and fall in
        const fy = -CELL * (1 + Math.floor(at / spec.w) * 0.15);
        drawGem(g, tx, fy + (ty - fy) * e);
      }
    }
  }

  // ── the loop: a MEASUREMENT, not a simulation step ───────────────────────
  // Nothing is laid per frame. The tick reads the society (and the derived
  // animation script) and paints. Stop looking and nothing accrues.

  let last = 0;
  function frame(now: number) {
    if (!running) return;
    const dt = last ? now - last : 16;
    last = now;
    if (anim) {
      const wasClearing = anim.t < CLEAR / (CLEAR + FALL);
      anim.t += dt / (CLEAR + FALL);
      // burst exactly once per step, at the moment the clear-flash ends
      if (wasClearing && anim.t >= CLEAR / (CLEAR + FALL)) {
        const step = anim.steps[anim.i];
        for (const i of step.cleared) burst(i, set[anim.before[i] % set.length] ?? "✦");
        juice.shake.add(shakeForClear(step.cleared.length, anim.i));
      }
      if (anim.t >= 1) {
        // apply this step to the local `before` and move on
        const step = anim.steps[anim.i];
        const next = [...anim.before];
        for (const i of step.cleared) next[i] = -1;
        for (const [from, to] of step.fell) { next[to] = next[from]; next[from] = -1; }
        for (const [at, g] of step.spawned) next[at] = g;
        anim.before = next;
        anim.i++; anim.t = 0;
        if (anim.i >= anim.steps.length) anim = null;
      }
    }
    juice.step(dt);
    juice.render(ctx, draw);         // world inside the shake, particles on top
    raf = requestAnimationFrame(frame);
  }

  // ── input ────────────────────────────────────────────────────────────────

  function cellAt(ev: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * spec.w);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * spec.h);
    return y * spec.w + x;
  }

  canvas.addEventListener("pointerdown", (ev) => {
    if (anim) return;                       // no input mid-cascade
    const i = cellAt(ev);
    if (i < 0 || i >= spec.w * spec.h) return;
    if (picked === null) { picked = i; draw(); return; }
    if (picked === i) { picked = null; draw(); return; }
    if (!adjacent(spec, picked, i)) { picked = i; draw(); return; }

    const from = picked;                    // keep it: `picked` is cleared below
    const before = boardNow(soc, spec).cells;
    const slug = swap(soc, spec, from, i, params.by);
    picked = null;
    if (!slug) { draw(); return; }          // refused: no match

    // THE WHOLE POINT: the swap is laid (3 beats), and the cascade to animate
    // is DERIVED from the new board. Nothing about the animation is canon.
    const after = boardNow(soc, spec);
    const swapped = [...before];
    [swapped[from], swapped[i]] = [swapped[i], swapped[from]];
    anim = { steps: after.steps, i: 0, t: 0, before: swapped };
    params.onScore?.(after.score, after.chain);
    draw();
  });

  raf = requestAnimationFrame(frame);

  return {
    node: canvas,
    /**
     * ANIMATE A MOVE THAT SOMEONE ELSE MADE.
     *
     * Hallie, 2026-07-30: "we need to animate turns happening no matter who's
     * taking them." Before this, only the player's own pointer-driven swap
     * animated — an AI or opponent move re-mounted the canvas and the board
     * just snapped to its new state, which loses the whole reason to watch a
     * coopetitive board: seeing what your colleague actually did.
     *
     * Takes the cells as they were BEFORE the swap; everything else is
     * derived, exactly as for a local move. Nothing extra is laid.
     */
    animateMove(beforeCells: number[], a: number, b: number) {
      const after = boardNow(soc, spec);
      const swapped = [...beforeCells];
      [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
      anim = { steps: after.steps, i: 0, t: 0, before: swapped };
      draw();
    },
    /** the juice systems, exposed so a caller can add its own bursts/shake. */
    juice,
    /** true while a cascade is playing — so a caller can wait rather than
     *  stacking turns on top of each other. */
    get busy() { return anim !== null; },

    /**
     * A CARD FIRED: burst at the cells it changed, then run the cascade its
     * change created.
     *
     * Hallie: "that needs to be a particle effect and then a match check too."
     * The match check is the important half — a card that transmutes cells can
     * CREATE a match, and before this the board just sat there holding a
     * three-in-a-row that nothing resolved.
     */
    cardFired(beforeCells: number[], changed: number[], glyph: string) {
      for (const c of changed) burst(c, glyph, 5, 1.5);
      juice.shake.add(SHAKE_EVENT);
      const after = boardNow(soc, spec);
      // the settle that the card's own change produced — derived, not laid
      const post = [...beforeCells];
      anim = { steps: after.steps, i: 0, t: 0, before: post };
      draw();
    },
    /** stop the loop — a VN scene that leaves the minigame stops measuring. */
    stop() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
    /** hints, and "is this board dead". */
    hints: () => legalMoves(soc, spec),
    redraw: draw,
  };
}
