// ─────────────────────────────────────────────────────────────────────────────
// juice.ts — particles and screenshake, as SYSTEMS.
//
// Hallie, 2026-07-30: "those should be just — in the scher-game as systems
// easily doable too."
//
// They were written inside match3-canvas.ts, which meant a second game would
// rewrite them. Nothing about a burst of glyphs or a decaying shake is
// match-3 shaped; both are "a way of looking at an event," and the next board
// wants them on day one.
//
// THE LAW THEY FOLLOW (the same one everything here follows)
// ---------------------------------------------------------
// Juice is DERIVED and never laid. A particle is not an event — it is a way of
// looking at one. Nothing here touches a Society, nothing survives a reload,
// and killing the renderer kills all of it with no trace in the log. If you
// ever find yourself wanting to lay a particle, what you actually want is to
// lay the EVENT and let the renderer derive the particle from it.
//
// Which is also why these take a canvas context and numbers rather than a
// board: they know nothing about gems, cells or moves.
// ─────────────────────────────────────────────────────────────────────────────

export interface Particle {
  x: number; y: number;         // px
  vx: number; vy: number;       // px per ms
  life: number; max: number;    // ms
  glyph: string;
  size: number;
  spin: number;
  /** px/ms², downward. 0 for a drifting spark, high for debris. */
  gravity: number;
  drag: number;
}

export interface BurstOptions {
  /** how many. Kept low on purpose — see the cost note at the bottom. */
  count?: number;
  /** px/ms outward. */
  speed?: number;
  /** ms. */
  life?: number;
  size?: number;
  gravity?: number;
  drag?: number;
  /** slight upward bias so a burst reads as "breaking" rather than "spilling". */
  lift?: number;
  spin?: number;
}

/**
 * A particle field. One per canvas; it holds the live list and nothing else.
 *
 * Deliberately unpooled and allocation-happy: a few dozen particles is nothing,
 * and a pool is a cache — which means a second place for state to live. If a
 * game ever needs thousands, that is the moment to reach for the compiled
 * kernel, with this as the correctness oracle.
 */
export class Particles {
  private parts: Particle[] = [];

  get count(): number { return this.parts.length; }
  get busy(): boolean { return this.parts.length > 0; }
  clear(): void { this.parts = []; }

  /** A ring of glyphs bursting from a point. */
  burst(x: number, y: number, glyph: string, o: BurstOptions = {}): void {
    const n = o.count ?? 7;
    const speed = o.speed ?? 0.07;
    const life = o.life ?? 440;
    for (let i = 0; i < n; i++) {
      // deterministic spread rather than random: a burst should look like a
      // burst every time, not occasionally like a clump.
      const a = (Math.PI * 2 * i) / n + (i % 2 ? 0.4 : 0);
      const v = speed * (0.8 + (i % 3) * 0.2);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (o.lift ?? 0.05),
        life: 0, max: life + (i % 4) * 60,
        glyph,
        size: o.size ?? 14,
        spin: (i % 2 ? 1 : -1) * (o.spin ?? 0.004),
        gravity: o.gravity ?? 0.00042,
        drag: o.drag ?? 0.995,
      });
    }
  }

  /** A burst at each of several points — the shape a multi-cell clear wants. */
  burstAll(points: Array<[number, number]>, glyph: string, o: BurstOptions = {}): void {
    for (const [x, y] of points) this.burst(x, y, glyph, o);
  }

  /** Advance. `dt` in ms; frame-rate independent. */
  step(dt: number): void {
    for (const p of this.parts) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
  }

  /** Draw. Fades late and shrinks slightly — holds its shape, then goes. */
  draw(ctx: CanvasRenderingContext2D, font = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji"'): void {
    for (const p of this.parts) {
      const t = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t * t);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin * p.life);
      ctx.font = `${Math.floor(p.size * (1 - t * 0.45))}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    }
  }
}

/**
 * Screenshake.
 *
 * Applied as a CANVAS TRANSLATE, never a CSS transform on the element — a
 * shaking board inside a visual novel must not shove the dialogue under it
 * around. The shake stays inside its own rectangle.
 *
 * `add` takes the MAX rather than summing, so a cascade of clears cannot stack
 * into a screen-destroying convulsion. Amplitude is capped for the same reason.
 */
export class Shake {
  private amp = 0;

  constructor(
    /** hardest it can ever shake, px. */
    private readonly cap = 9,
    /** fraction remaining per 16ms. */
    private readonly decay = 0.86,
  ) {}

  get active(): boolean { return this.amp >= 0.15; }
  get amplitude(): number { return this.amp; }

  /** Shake at least this hard. Takes the max — never sums. */
  add(px: number): void { this.amp = Math.min(this.cap, Math.max(this.amp, px)); }

  /** Frame-rate independent decay. */
  step(dt: number): void {
    this.amp *= Math.pow(this.decay, dt / 16);
    if (this.amp < 0.15) this.amp = 0;
  }

  /** Current offset. Random direction, so it reads as impact not oscillation. */
  offset(): [number, number] {
    if (!this.active) return [0, 0];
    const a = Math.random() * Math.PI * 2;
    return [Math.cos(a) * this.amp, Math.sin(a) * this.amp];
  }

  /** Wrap a draw call in the shake transform. */
  around(ctx: CanvasRenderingContext2D, draw: () => void): void {
    const [x, y] = this.offset();
    ctx.save();
    ctx.translate(x, y);
    draw();
    ctx.restore();
  }
}

/**
 * SHAKE THAT MEANS SOMETHING.
 *
 * A screen that shakes equally at everything is noise. This scales with what
 * actually happened, so the shake REPORTS: a 3-match is a nudge, a fifth-link
 * cascade is a thump, and a player learns to feel the difference before they
 * read the number.
 */
export const shakeForClear = (cellsCleared: number, chainLink: number): number =>
  Math.min(9, 1 + cellsCleared * 0.5 + chainLink * 1.2);

/** A deliberate, big event — a card, an ability, a job completing. */
export const SHAKE_EVENT = 7;

/**
 * A JUICE BOX: particles + shake + the frame plumbing, so a renderer wires
 * one thing instead of three.
 */
export class Juice {
  readonly particles = new Particles();
  readonly shake: Shake;

  constructor(cap?: number, decay?: number) {
    this.shake = new Shake(cap, decay);
  }

  get busy(): boolean { return this.particles.busy || this.shake.active; }

  /** Advance both. Call once per frame with the frame delta. */
  step(dt: number): void {
    this.particles.step(dt);
    this.shake.step(dt);
  }

  /** Draw the world inside the shake, then particles on top of it. */
  render(ctx: CanvasRenderingContext2D, drawWorld: () => void): void {
    this.shake.around(ctx, () => {
      drawWorld();
      this.particles.draw(ctx);
    });
  }
}
