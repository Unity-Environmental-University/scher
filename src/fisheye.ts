// ─────────────────────────────────────────────────────────────────────────────
// fisheye.ts — PORT work-round 4. TypeScript port of the harvested, Hallie-verified
// dock-magnifier fisheye motion engine.
//
// Source of truth (ported, not re-derived): fleet-bj-card-round1/lib/fisheye.js —
// the same file also harvested to github.com/unity-hallie/muslin-motion-lab
// (lib/fisheye.js). That file carries the full build history (islands-on-a-
// continuous-medium rewrite, spring+friction integrator, gaussian falloff,
// conservation-coupled push, box-not-text along-scale, transitionMs-as-timescale) —
// read it for the "why," not repeated here. This file is the physics and wiring,
// carried over faithfully: same formulas, same integrator, same defaults EXCEPT
// where Hallie's FINAL canonical params (BRIEF.md "HALLIE FINAL FISHEYE PARAMS")
// override the harvested file's in-progress defaults. Those are called out below.
//
// HALLIE'S FINAL CANONICAL PARAMS (locked — THE default for createFisheye here):
//   alongPeakScale 1.60, orthoPeakScale 1.02, falloffMode 'gaussian', sigma 0.65,
//   flowAxis 'y', transitionMs 2760, stiffness 715, damping 27, mass 5.9,
//   staticFriction 34, dynamicFriction 28, scaleCurve floor >= 1.0 (kept),
//   box-not-text along scale (kept).
//
// TS DISCIPLINE: no window globals. Everything is exported from the module; no
// `typeof window !== 'undefined'` global-export block (the harvested file's
// <script src> global-export tail is dropped — scher is an ES module library).
// prefers-reduced-motion detection still reads `window.matchMedia` when window
// exists (browser runtime), same guarded check as the source, just without the
// side-effecting global assignment.
// ─────────────────────────────────────────────────────────────────────────────

export type FalloffMode = "gaussian" | "curve";
export type FlowAxis = "x" | "y";

export interface FisheyeOpts {
  /** Legacy scale values by distance [active, distance-1, distance-2, ...]. Used for
   *  BOTH axes if along/orthoScaleCurve not given, and as the falloffMode:'curve' source. */
  scaleCurve?: number[];
  alongScaleCurve?: number[];
  orthoScaleCurve?: number[];
  /** Gaussian-mode peak scale, along (box-growth) axis. Hallie's final default: 1.60. */
  alongPeakScale?: number;
  /** Gaussian-mode peak scale, ortho (transform) axis. Hallie's final default: 1.02. */
  orthoPeakScale?: number;
  /** 'gaussian' (default) or 'curve' (legacy explicit-array distance lookup). */
  falloffMode?: FalloffMode;
  /** Gaussian bell width. Hallie's final default: 0.65. */
  sigma?: number;
  /** 'y' (default, vertical list) or 'x' (row). */
  flowAxis?: FlowAxis;
  /** Resting box size (px) along the flow axis. If omitted, measured per-element via
   *  getBoundingClientRect() at setup. */
  baseSizePx?: number | null;
  /** Optional additive manual displacement (px) on top of the conservation-derived push. */
  pushCurve?: number[];
  /** 'y' (default) or 'x' — which axis neighbors translate along. */
  pushAxis?: FlowAxis;
  /** Where the ortho scale grows from. Default: 'bottom center'. */
  transformOrigin?: string;
  /** Which events drive magnification. Default: ['focus', 'hover']. */
  driveOn?: Array<"focus" | "hover">;
  /** CSS transition-duration the frozen spring/friction shape plays over — the timescale
   *  knob (see harvested file's SHAPE VS CLOCK note). Hallie's final default: 2760. */
  transitionMs?: number;
  /** CSS easing function OR 'spring' (default) to use the physics model. */
  easing?: string;
  /** Spring stiffness (k). Hallie's final default: 715. */
  stiffness?: number;
  /** Spring damping (c), velocity-proportional. Hallie's final default: 27. */
  damping?: number;
  /** Spring mass (m), inertia. Hallie's final default: 5.9. */
  mass?: number;
  /** Coulomb static/breakaway friction threshold. Hallie's final default: 34. */
  staticFriction?: number;
  /** Coulomb kinetic friction (constant drag during the slide). Hallie's final default: 28. */
  dynamicFriction?: number;
  /** MASS-HOOK SEAM (scher-side addition, not in the harvested engine): optional
   *  per-element mass override, read positionally against `elements`. The harvested
   *  physics model's `mass` is a single scalar shared by the whole spring/friction
   *  integrator (inertia of the MOTION, not a per-item weight) — there is no per-element
   *  slot in the ported physics to plug a row's data-mass/--mass into today. This array
   *  is accepted and, if present, its AVERAGE (or the focused element's own entry, when
   *  set) can widen/narrow that element's peak scale — see computeScales below for the
   *  honest, tentative wiring. Left undefined = identical output to the harvested engine.
   *  NOTE (see the honest report to the caller): this is a real seam, not a full physical
   *  fold-in. The harvested engine's `mass` is a global spring inertia; per-row mass
   *  is a DIFFERENT physical quantity (how heavy correlates with how much distortion),
   *  so wiring it in as "makes this row's peak scale bigger" is a scher-side judgment
   *  call, not a port of anything Hallie signed off on for per-element weighting yet.
   */
  perElementMass?: Array<number | undefined>;
}

export interface FisheyeHandle {
  teardown(): void;
}

const DEFAULT_OPTS: Required<
  Omit<FisheyeOpts, "scaleCurve" | "alongScaleCurve" | "orthoScaleCurve" | "baseSizePx" | "perElementMass">
> = {
  alongPeakScale: 1.6,
  orthoPeakScale: 1.02,
  falloffMode: "gaussian",
  sigma: 0.65,
  flowAxis: "y",
  pushCurve: [0, 0, 0, 0],
  pushAxis: "y",
  transformOrigin: "bottom center",
  driveOn: ["focus", "hover"],
  transitionMs: 2760,
  easing: "spring",
  stiffness: 715,
  damping: 27,
  mass: 5.9,
  staticFriction: 34,
  dynamicFriction: 28,
};

// ── SPRING MODEL (ported verbatim — see harvested file for the physical derivation) ──

/** Damped harmonic oscillator position at time t (seconds), analytically solved for
 *  underdamped / critically damped / overdamped. Runs 0 -> 1. */
export function springPosition(t: number, stiffness: number, damping: number, mass: number): number {
  const wn = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = wn * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + ((zeta * wn) / wd) * Math.sin(wd * t));
  }
  if (Math.abs(zeta - 1) < 1e-9) {
    return 1 - Math.exp(-wn * t) * (1 + wn * t);
  }
  const r1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
  const r2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
  const c2 = -r1 / (r2 - r1);
  const c1 = 1 - c2;
  return 1 - (c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

export function sampleSpringCurve(
  stiffness: number,
  damping: number,
  mass: number,
  durationMs: number,
  numSamples = 48,
): number[] {
  const durationS = durationMs / 1000;
  const pts: number[] = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = (durationS * i) / numSamples;
    pts.push(Math.round(springPosition(t, stiffness, damping, mass) * 10000) / 10000);
  }
  return pts;
}

export function sampleSpringToLinear(
  stiffness: number,
  damping: number,
  mass: number,
  durationMs: number,
  numSamples = 48,
): string {
  const pts = sampleSpringCurve(stiffness, damping, mass, durationMs, numSamples);
  return `linear(${pts.join(", ")})`;
}

/** Velocity floor for "not meaningfully moving," scaled to duration. */
function restVelocityFloor(durationS: number): number {
  return (1 / durationS) * 0.01;
}

/** Numerically integrate a damped spring WITH Coulomb static+dynamic friction.
 *  Semi-implicit (symplectic) Euler at a fine internal timestep, impulse-based
 *  friction resolution, resampled to numSamples+1 points. Ported verbatim from the
 *  harvested engine (see its extensive in-line derivation notes/bugfix history). */
export function sampleFrictionSpringCurve(
  stiffness: number,
  damping: number,
  mass: number,
  staticFriction: number,
  dynamicFriction: number,
  durationMs: number,
  numSamples = 48,
): number[] {
  const durationS = durationMs / 1000;
  const internalSteps = Math.max(200, Math.round(durationS * 2000));
  const dt = durationS / internalSteps;

  let x = 0;
  let v = 0;
  let stuck = false;
  let stuckAtIndex = -1;
  const raw: number[] = [x];
  const rawV: number[] = [v];

  for (let i = 0; i < internalSteps; i++) {
    if (stuck) {
      raw.push(x);
      rawV.push(0);
      continue;
    }

    const springForce = -stiffness * (x - 1);
    const dampingForce = -damping * v;
    const driveForce = springForce + dampingForce;

    const vTentative = v + (driveForce / mass) * dt;

    const frictionImpulse = (dynamicFriction / mass) * dt;
    let vNext: number;
    if (vTentative > 0) {
      vNext = Math.max(0, vTentative - frictionImpulse);
    } else if (vTentative < 0) {
      vNext = Math.min(0, vTentative + frictionImpulse);
    } else {
      vNext = 0;
    }

    if (vNext === 0) {
      const restSpringForce = -stiffness * (x - 1);
      if (Math.abs(restSpringForce) <= staticFriction) {
        x = 1;
        v = 0;
        stuck = true;
        stuckAtIndex = i;
        raw.push(x);
        rawV.push(0);
        continue;
      }
    }

    v = vNext;
    x = x + v * dt;
    raw.push(x);
    rawV.push(v);
  }

  const V_FLOOR = restVelocityFloor(durationS);
  let lastMovingIndex = -1;
  for (let i = rawV.length - 1; i >= 0; i--) {
    if (Math.abs(rawV[i]!) > V_FLOOR) {
      lastMovingIndex = i;
      break;
    }
  }
  let plateauStart = stuckAtIndex >= 0 ? stuckAtIndex : lastMovingIndex >= 0 ? lastMovingIndex + 1 : raw.length - 1;
  plateauStart = Math.min(plateauStart, raw.length - 1);

  if (plateauStart < raw.length - 1) {
    const startVal = raw[plateauStart]!;
    const span = raw.length - 1 - plateauStart;
    for (let i = plateauStart; i < raw.length; i++) {
      const t = span > 0 ? (i - plateauStart) / span : 1;
      const smoothT = t * t * (3 - 2 * t);
      raw[i] = startVal + (1 - startVal) * smoothT;
    }
  }
  raw[raw.length - 1] = 1;

  const pts: number[] = [];
  for (let i = 0; i <= numSamples; i++) {
    const idx = Math.round((i / numSamples) * (raw.length - 1));
    pts.push(Math.round(raw[idx]! * 10000) / 10000);
  }
  pts[pts.length - 1] = 1;
  return pts;
}

export function sampleFrictionSpringToLinear(
  stiffness: number,
  damping: number,
  mass: number,
  staticFriction: number,
  dynamicFriction: number,
  durationMs: number,
  numSamples = 48,
): string {
  const pts = sampleFrictionSpringCurve(stiffness, damping, mass, staticFriction, dynamicFriction, durationMs, numSamples);
  return `linear(${pts.join(", ")})`;
}

/** Gaussian (bell-curve) falloff: 1 + (peak - 1) * exp(-(d^2)/(2*sigma^2)). */
export function gaussianFalloff(distance: number, peakScale: number, sigma: number): number {
  const bump = Math.exp(-(distance * distance) / (2 * sigma * sigma));
  return 1 + (peakScale - 1) * bump;
}

// SHAPE VS CLOCK: the physics is integrated ONCE at a fixed reference duration long
// enough to fully settle, producing a frozen normalized 0->1 linear() curve. transitionMs
// is then purely the CSS transition-duration that frozen shape plays over (a true uniform
// time-stretch) — ported verbatim from the harvested engine's build-timescale fix.
const SHAPE_REFERENCE_MS = 3000;

interface FisheyeElState {
  el: HTMLElement;
  wrapper: HTMLElement;
  baseSize: number;
}

/** Create a fisheye focus-magnification wiring over `elements` within `container`.
 *  Faithful TS port of the harvested lib/fisheye.js createFisheye — same spring+friction
 *  integrator, gaussian falloff, conservation-coupled no-overlap push, box-not-text
 *  along-scale, transitionMs-as-timescale. Defaults to Hallie's FINAL canonical params. */
export function createFisheye(
  container: HTMLElement,
  elements: HTMLElement[],
  options: FisheyeOpts = {},
): FisheyeHandle {
  const opts = { ...DEFAULT_OPTS, ...options };
  const {
    scaleCurve = [1.35, 1.12, 1.02, 1.0],
    alongScaleCurve = scaleCurve,
    orthoScaleCurve = scaleCurve,
    alongPeakScale,
    orthoPeakScale,
    falloffMode,
    sigma,
    flowAxis,
    baseSizePx = null,
    pushCurve,
    pushAxis,
    transformOrigin,
    driveOn,
    transitionMs,
    easing,
    stiffness,
    damping,
    mass,
    staticFriction,
    dynamicFriction,
    perElementMass,
  } = { ...options, ...opts };

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const transitionDuration = reduceMotion ? "0s" : `${transitionMs}ms`;
  let transitionEasing: string;
  if (reduceMotion) {
    transitionEasing = "linear";
  } else if (easing === "spring") {
    transitionEasing =
      staticFriction > 0 || dynamicFriction > 0
        ? sampleFrictionSpringToLinear(stiffness, damping, mass, staticFriction, dynamicFriction, SHAPE_REFERENCE_MS, 48)
        : sampleSpringToLinear(stiffness, damping, mass, SHAPE_REFERENCE_MS, 48);
  } else {
    transitionEasing = easing;
  }

  // BOX-SCALE SETUP: each element gets an inner content wrapper so along-axis growth
  // resizes the BOX, never a transform-scale on the text.
  const states: FisheyeElState[] = elements.map((el) => {
    let wrapper = el.querySelector<HTMLElement>('[data-fisheye-wrap="true"]');
    if (!wrapper) {
      wrapper = document.createElement("span");
      wrapper.dataset.fisheyeWrap = "true";
      wrapper.style.display = "inline-flex";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "center";
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      while (el.firstChild) wrapper.appendChild(el.firstChild);
      el.appendChild(wrapper);
    }
    const baseSize =
      baseSizePx != null
        ? baseSizePx
        : flowAxis === "x"
          ? el.getBoundingClientRect().width
          : el.getBoundingClientRect().height;
    return { el, wrapper, baseSize };
  });
  const baseSizes = states.map((s) => s.baseSize);

  function computeScales(distance: number, index: number): { along: number; ortho: number } {
    let rawAlong: number;
    let rawOrtho: number;
    // MASS-HOOK SEAM: if perElementMass carries a value for this index, widen the
    // along-peak proportionally (heavier rows read as "wanting more room" when
    // focused). Deliberately gentle (sqrt-scaled) and a no-op when unset — see the
    // FisheyeOpts.perElementMass doc comment for why this is a judgment call, not a
    // faithful physical fold-in of the harvested engine's scalar `mass`.
    const m = perElementMass?.[index];
    const massAlongPeak = m !== undefined && m > 0 ? alongPeakScale * Math.sqrt(m) : alongPeakScale;
    if (falloffMode === "curve") {
      rawAlong = alongScaleCurve[Math.min(distance, alongScaleCurve.length - 1)]!;
      rawOrtho = orthoScaleCurve[Math.min(distance, orthoScaleCurve.length - 1)]!;
    } else {
      rawAlong = gaussianFalloff(distance, massAlongPeak, sigma);
      rawOrtho = gaussianFalloff(distance, orthoPeakScale, sigma);
    }
    return {
      along: Math.max(1.0, rawAlong),
      ortho: Math.max(1.0, rawOrtho),
    };
  }

  function computeConservedPush(activeIndex: number, scales: Array<{ along: number; ortho: number }>): number[] {
    const n = elements.length;
    const pushSigned = new Array(n).fill(0);

    const activeBase = baseSizes[activeIndex]!;
    const activeGrowthPx = activeBase * (scales[activeIndex]!.along - 1);
    const halfActiveGrowth = activeGrowthPx / 2;

    let cumulative = halfActiveGrowth;
    for (let i = activeIndex - 1; i >= 0; i--) {
      pushSigned[i] = -cumulative;
      const base = baseSizes[i]!;
      const ownGrowth = base * (scales[i]!.along - 1);
      cumulative += ownGrowth;
    }

    cumulative = halfActiveGrowth;
    for (let i = activeIndex + 1; i < n; i++) {
      pushSigned[i] = cumulative;
      const base = baseSizes[i]!;
      const ownGrowth = base * (scales[i]!.along - 1);
      cumulative += ownGrowth;
    }

    return pushSigned;
  }

  function applyMagnification(activeIndex: number): void {
    const scales = elements.map((_el, i) => computeScales(Math.abs(i - activeIndex), i));
    const conservedPush = computeConservedPush(activeIndex, scales);

    elements.forEach((el, i) => {
      const distance = Math.abs(i - activeIndex);
      const { along: alongScale, ortho: orthoScale } = scales[i]!;

      const base = baseSizes[i]!;
      const alongSizePx = base * alongScale;
      if (flowAxis === "x") {
        el.style.width = `${alongSizePx}px`;
        el.style.flex = `0 0 ${alongSizePx}px`;
      } else {
        el.style.height = `${alongSizePx}px`;
        el.style.flex = `0 0 ${alongSizePx}px`;
      }

      const scaleXVal = flowAxis === "x" ? 1 : orthoScale;
      const scaleYVal = flowAxis === "x" ? orthoScale : 1;

      const direction = i < activeIndex ? -1 : i > activeIndex ? 1 : 0;
      const manualPushMagnitude = distance === 0 ? 0 : (pushCurve[Math.min(distance, pushCurve.length - 1)] ?? 0);
      const conserved = conservedPush[i] || 0;
      const offset = conserved + manualPushMagnitude * direction;

      const translate = pushAxis === "x" ? `translateX(${offset}px)` : `translateY(${offset}px)`;
      const scalePart = `scaleX(${scaleXVal}) scaleY(${scaleYVal})`;
      el.style.transform = offset !== 0 ? `${translate} ${scalePart}` : scalePart;
      el.style.zIndex = distance === 0 ? "2" : "1";
    });
  }

  function resetMagnification(): void {
    elements.forEach((el, i) => {
      const base = baseSizes[i]!;
      if (flowAxis === "x") {
        el.style.width = `${base}px`;
        el.style.flex = `0 0 ${base}px`;
      } else {
        el.style.height = `${base}px`;
        el.style.flex = `0 0 ${base}px`;
      }
      el.style.transform = "scale(1)";
      el.style.zIndex = "1";
    });
  }

  elements.forEach((el, i) => {
    el.style.transformOrigin = transformOrigin;
    el.style.transition =
      `transform ${transitionDuration} ${transitionEasing}, ` +
      `height ${transitionDuration} ${transitionEasing}, ` +
      `width ${transitionDuration} ${transitionEasing}, ` +
      `flex-basis ${transitionDuration} ${transitionEasing}`;
    const base = baseSizes[i]!;
    el.style.flex = `0 0 ${base}px`;
  });

  const listeners: Array<{ el: EventTarget; event: string; handler: EventListener }> = [];

  if (driveOn.includes("focus")) {
    elements.forEach((el, index) => {
      const focusHandler = () => applyMagnification(index);
      el.addEventListener("focus", focusHandler);
      listeners.push({ el, event: "focus", handler: focusHandler });
    });
  }

  if (driveOn.includes("hover")) {
    elements.forEach((el, index) => {
      const mouseoverHandler = () => applyMagnification(index);
      el.addEventListener("mouseover", mouseoverHandler);
      listeners.push({ el, event: "mouseover", handler: mouseoverHandler });
    });
  }

  const containerFocusoutHandler = (e: Event) => {
    const fe = e as FocusEvent;
    if (!container.contains(fe.relatedTarget as Node | null)) resetMagnification();
  };
  const containerMouseleaveHandler = () => {
    if (!container.contains(document.activeElement)) resetMagnification();
  };

  container.addEventListener("focusout", containerFocusoutHandler);
  container.addEventListener("mouseleave", containerMouseleaveHandler);
  listeners.push({ el: container, event: "focusout", handler: containerFocusoutHandler });
  listeners.push({ el: container, event: "mouseleave", handler: containerMouseleaveHandler });

  function teardown(): void {
    listeners.forEach(({ el, event, handler }) => {
      el.removeEventListener(event, handler);
    });
  }

  return { teardown };
}
