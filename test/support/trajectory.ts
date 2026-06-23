// ─────────────────────────────────────────────────────────────────────────────
// trajectory.ts — a PROCESS-SHAPED test harness.
//
// A substance test asserts about a final state: set up, act, snapshot, expect. Its
// unit is a value. This harness's unit is a TRAJECTORY: the ordered becoming of a
// society, with the witnessing-axis preserved so assertions can quantify over MOMENTS,
// not just "now."
//
// The harness records each lay with the witnessed clock the Society assigned it, so it
// can rebuild the society AS OF any past moment (replay) — and then read it there. The
// assertions it offers are process-kind:
//
//   • nowReads(beat).as(mode)        — the endpoint (the one substance assertion)
//   • asOf(t).reads(beat).as(mode)   — the reading FROM A MOMENT (the process assertion)
//   • everReached(beat, mode)        — the trajectory PASSED THROUGH a reading
//   • changesOnlyAt(beat, steps)     — a reading is piecewise-constant between witnessings
//
// This harness is itself tested AS A TRAJECTORY (trajectory.harness.test.ts): we prove
// the recorder is faithful — replay AS OF the last moment reproduces the live society —
// before trusting it to judge anything. A test framework exempt from its own discipline
// is the substance-shaped cheat (trust the tool's endpoint); this one isn't exempt.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Society,
  modeAt,
  type Beat,
  type Mode,
  type Quality,
} from "../../src/society.js";

/** One recorded step of becoming: the beats laid, and the clock AFTER they landed. */
interface Step {
  /** the beats this step appended (a step may lay >1, e.g. a prehension + its ~q). */
  beats: Beat[];
  /** the max witnessed-clock value present in the society after this step. */
  at: number;
  /** a human label for the step (for changesOnlyAt assertions). */
  label: string;
}

export class Trajectory {
  readonly #seed: Beat[];
  readonly #steps: Step[] = [];
  /** the live society — the endpoint, built by replaying every step in order. */
  readonly soc: Society;

  constructor(seed: ReadonlyArray<Beat> = []) {
    this.#seed = [...seed];
    this.soc = new Society(seed);
  }

  /** Lay a content beat (or any raw beat), recording the witnessing moment. */
  lay(b: Beat, label = b.slug): this {
    const appended = this.soc.lay(b);
    if (appended) this.#steps.push({ beats: [b], at: this.#maxWitnessed(), label });
    return this;
  }

  /** Lay a grounding prehension onto `target` from frame `by`. */
  ground(target: string, by: string, label?: string): this {
    return this.#prehend(`g-${target}-${by}-${this.#steps.length}`, by, target, "q-grounding", label ?? `ground ${target} by ${by}`);
  }

  /** Lay an exclusion prehension onto `target` from frame `by`. */
  exclude(target: string, by: string, label?: string): this {
    return this.#prehend(`x-${target}-${by}-${this.#steps.length}`, by, target, "q-exclusion", label ?? `exclude ${target} by ${by}`);
  }

  /** Supersede a beat (append-only undo): a self-pointing beat onto it. */
  supersede(slug: string, label?: string): this {
    const sup: Beat = { slug: `sup-${slug}-${this.#steps.length}`, content: `supersedes ${slug}`, subject: slug, object: slug };
    const appended = this.soc.lay(sup);
    if (appended) this.#steps.push({ beats: [sup], at: this.#maxWitnessed(), label: label ?? `supersede ${slug}` });
    return this;
  }

  #prehend(slug: string, subject: string, object: string, quality: Quality, label: string): this {
    const before = this.soc.size;
    this.soc.layP(slug, `${subject} → ${object}`, subject, object, quality);
    if (this.soc.size > before) {
      const beats = this.soc.all().filter((b) => b.slug === slug || b.slug === slug + "~q");
      this.#steps.push({ beats, at: this.#maxWitnessed(), label });
    }
    return this;
  }

  #maxWitnessed(): number {
    return this.soc.all().reduce((m, b) => Math.max(m, b.witnessed ?? 0), 0);
  }

  // ── replay: rebuild the society as it was AS OF a witnessed moment ────────────

  /** The witnessed clock after step `i` (0-indexed). `at(-1)` = seed only (moment 0). */
  momentAfter(stepIndex: number): number {
    if (stepIndex < 0) return this.#seedMax();
    return this.#steps[stepIndex]?.at ?? this.#maxWitnessed();
  }

  #seedMax(): number {
    return this.#seed.reduce((m, b) => Math.max(m, b.witnessed ?? 0), 0);
  }

  /** The number of recorded steps (genuine appends). */
  get stepCount(): number {
    return this.#steps.length;
  }

  /** The greatest witnessed moment in the live society. */
  get lastMoment(): number {
    return this.#maxWitnessed();
  }

  /** Rebuild the society including only beats witnessed at-or-before `t`. The whole
   *  point: a society is read from its log, so "as of t" is just the log truncated at t,
   *  re-read. The seed and replayed beats keep their witnessed stamps so truncation is
   *  exact. */
  societyAsOf(t: number): Society {
    const upTo = [...this.#seed, ...this.#steps.flatMap((s) => s.beats)].filter((b) => (b.witnessed ?? 0) <= t);
    return new Society(upTo);
  }

  // ── assertions (throw on failure; usable from any test runner) ────────────────

  /** ASOF reader: read the trajectory from a past moment. */
  asOf(t: number): { reads(beat: string): { as(mode: Mode): Trajectory } } {
    const self = this;
    const soc = this.societyAsOf(t);
    return {
      reads(beat: string) {
        return {
          as(mode: Mode): Trajectory {
            const got = modeAt(soc, beat);
            if (got !== mode) {
              throw new Error(`asOf(${t}) reads '${beat}' as '${got}', expected '${mode}'`);
            }
            return self;
          },
        };
      },
    };
  }

  /** The endpoint (substance) assertion — the reading now. */
  nowReads(beat: string): { as(mode: Mode): Trajectory } {
    const self = this;
    return {
      as(mode: Mode): Trajectory {
        const got = modeAt(self.soc, beat);
        if (got !== mode) throw new Error(`now reads '${beat}' as '${got}', expected '${mode}'`);
        return self;
      },
    };
  }

  /** Did the trajectory EVER read `beat` as `mode`, at any recorded moment? */
  everReached(beat: string, mode: Mode): boolean {
    for (let i = -1; i < this.#steps.length; i++) {
      const soc = this.societyAsOf(this.momentAfter(i));
      if (modeAt(soc, beat) === mode) return true;
    }
    return false;
  }
}

/** Start a trajectory from an optional seed. */
export function trajectory(seed?: ReadonlyArray<Beat>): Trajectory {
  return new Trajectory(seed);
}
