// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// fisheye.test.ts — PORT work-round 4 (frame-crew-port-fisheye): the ported
// spring+friction+gaussian fisheye engine, faithfulness + wiring.
//
// CLAIMS under test:
//   1. Importable: createFisheye, springPosition, sampleSpringToLinear,
//      sampleFrictionSpringToLinear, gaussianFalloff all resolve from fisheye.ts.
//   2. sampleFrictionSpringToLinear(Hallie's final params) produces a non-trivial
//      linear() easing string: starts at 0, ends at 1, has the expected point
//      count, and is NOT a flat/degenerate line (the spring+friction shape has
//      actual curvature — some interior sample differs meaningfully from a
//      straight lerp between endpoints).
//   3. createFisheye, given a container + row elements, wires a `transition` style
//      containing the sampled linear() curve onto each element (CDP-gotcha-aware:
//      read el.style.transition synchronously, no rAF).
//   4. listStory with fisheye:true wires transitions onto its rendered rows.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  createFisheye,
  springPosition,
  sampleSpringCurve,
  sampleSpringToLinear,
  sampleFrictionSpringCurve,
  sampleFrictionSpringToLinear,
  gaussianFalloff,
} from "../src/fisheye.js";
import { Society } from "../src/society.js";
import { listStory } from "../src/stories.js";
import type { SuperjectArm } from "../src/eventview.js";

// Hallie's final canonical params (BRIEF.md "HALLIE FINAL FISHEYE PARAMS").
const HALLIE_PARAMS = {
  alongPeakScale: 1.6,
  orthoPeakScale: 1.02,
  falloffMode: "gaussian" as const,
  sigma: 0.65,
  flowAxis: "y" as const,
  transitionMs: 2760,
  stiffness: 715,
  damping: 27,
  mass: 5.9,
  staticFriction: 34,
  dynamicFriction: 28,
};

describe("fisheye.ts — importable", () => {
  it("exports the physics + wiring functions", () => {
    expect(typeof createFisheye).toBe("function");
    expect(typeof springPosition).toBe("function");
    expect(typeof sampleSpringCurve).toBe("function");
    expect(typeof sampleSpringToLinear).toBe("function");
    expect(typeof sampleFrictionSpringCurve).toBe("function");
    expect(typeof sampleFrictionSpringToLinear).toBe("function");
    expect(typeof gaussianFalloff).toBe("function");
  });
});

describe("fisheye.ts — spring+friction curve shape (Hallie's final params)", () => {
  it("produces a linear() easing string with the right endpoints and point count", () => {
    const linear = sampleFrictionSpringToLinear(
      HALLIE_PARAMS.stiffness,
      HALLIE_PARAMS.damping,
      HALLIE_PARAMS.mass,
      HALLIE_PARAMS.staticFriction,
      HALLIE_PARAMS.dynamicFriction,
      3000,
      48,
    );
    expect(linear.startsWith("linear(")).toBe(true);
    expect(linear.endsWith(")")).toBe(true);
    const pts = linear
      .slice("linear(".length, -1)
      .split(", ")
      .map((s) => Number(s));
    expect(pts.length).toBe(49); // numSamples + 1
    expect(pts[0]).toBe(0);
    expect(pts[pts.length - 1]).toBe(1);
  });

  it("is non-trivial: not a flat line, has curvature (overshoot or a grip delay)", () => {
    const pts = sampleFrictionSpringCurve(
      HALLIE_PARAMS.stiffness,
      HALLIE_PARAMS.damping,
      HALLIE_PARAMS.mass,
      HALLIE_PARAMS.staticFriction,
      HALLIE_PARAMS.dynamicFriction,
      3000,
      48,
    );
    // A pure lerp from 0->1 over 48 samples would hit index i at i/48 exactly.
    // The real spring+friction shape should diverge from that lerp somewhere
    // in the interior (grip at the start, possible overshoot past 1, or a
    // friction-arrested plateau before the end).
    const maxDeviation = Math.max(
      ...pts.map((v, i) => Math.abs(v - i / (pts.length - 1))),
    );
    expect(maxDeviation).toBeGreaterThan(0.02);
  });

  it("heavier mass (Hallie's 5.9) settles differently than a much lighter spring", () => {
    const heavy = sampleFrictionSpringCurve(715, 27, 5.9, 34, 28, 3000, 48);
    const light = sampleFrictionSpringCurve(715, 27, 0.5, 34, 28, 3000, 48);
    // mass materially changes the integrated shape — the two curves are not
    // identical partway through (heavier inertia changes the whole trajectory,
    // not just an early "grip" window).
    const midDeviation = Math.abs(heavy[8]! - light[8]!);
    expect(midDeviation).toBeGreaterThan(0.05);
  });

  it("gaussianFalloff peaks at distance 0 and decays toward 1.0 with distance", () => {
    const peak = gaussianFalloff(0, HALLIE_PARAMS.alongPeakScale, HALLIE_PARAMS.sigma);
    const near = gaussianFalloff(1, HALLIE_PARAMS.alongPeakScale, HALLIE_PARAMS.sigma);
    const far = gaussianFalloff(5, HALLIE_PARAMS.alongPeakScale, HALLIE_PARAMS.sigma);
    expect(peak).toBeCloseTo(HALLIE_PARAMS.alongPeakScale, 6);
    expect(near).toBeLessThan(peak);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeCloseTo(1.0, 2);
  });
});

describe("fisheye.ts — createFisheye wiring on real elements", () => {
  function makeRows(n: number): { container: HTMLDivElement; rows: HTMLDivElement[] } {
    const container = document.createElement("div");
    const rows: HTMLDivElement[] = [];
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div");
      row.textContent = `row ${i}`;
      // jsdom doesn't do layout; getBoundingClientRect() is all-zero, which is
      // fine here (baseSizePx is supplied explicitly to keep the math well-defined).
      container.appendChild(row);
      rows.push(row);
    }
    return { container, rows };
  }

  it("wires a transition style with the spring+friction linear() curve onto each row", () => {
    const { container, rows } = makeRows(3);
    const handle = createFisheye(container, rows, { ...HALLIE_PARAMS, baseSizePx: 40 });
    try {
      for (const row of rows) {
        // synchronous read — no rAF, per the CDP gotcha.
        expect(row.style.transition).toContain("linear(");
        expect(row.style.transition).toContain(`${HALLIE_PARAMS.transitionMs}ms`);
      }
    } finally {
      handle.teardown();
    }
  });

  it("hovering a row applies box-grow (height) beyond the base size, box-not-text", () => {
    const { container, rows } = makeRows(3);
    const handle = createFisheye(container, rows, { ...HALLIE_PARAMS, baseSizePx: 40 });
    try {
      rows[1]!.dispatchEvent(new Event("mouseover", { bubbles: true }));
      expect(rows[1]!.style.height).toBe("64px"); // 40 * 1.6 (alongPeakScale)
      // neighbor grows less (gaussian falloff), never below base.
      const neighborHeight = parseFloat(rows[0]!.style.height);
      expect(neighborHeight).toBeGreaterThanOrEqual(40);
      expect(neighborHeight).toBeLessThan(64);
    } finally {
      handle.teardown();
    }
  });

  it("teardown removes the wired listeners (no magnification after teardown)", () => {
    const { container, rows } = makeRows(2);
    const handle = createFisheye(container, rows, { ...HALLIE_PARAMS, baseSizePx: 40 });
    handle.teardown();
    rows[0]!.dispatchEvent(new Event("mouseover", { bubbles: true }));
    // after teardown, no NEW magnification is applied — height was never set by
    // setup (only `flex` is set at rest; height is only written by
    // applyMagnification/resetMagnification), so it stays unset, not swelled to peak.
    expect(rows[0]!.style.height).toBe("");
    expect(rows[0]!.style.flex).toBe("0 0 40px");
  });
});

describe("listStory — fisheye:true wires transitions onto rendered rows", () => {
  const testSuperjectArm: SuperjectArm = (v) => document.createTextNode(v.slug);

  function society() {
    return new Society([
      { slug: "a", content: "a", subject: null, object: null },
      { slug: "b", content: "b", subject: null, object: null },
      { slug: "c", content: "c", subject: null, object: null },
    ]);
  }

  it("does nothing extra when fisheye is omitted (default off)", () => {
    const soc = society();
    const node = listStory(soc, {
      slice: () => ["a", "b"],
      superjectArm: testSuperjectArm,
    }) as HTMLElement;
    const row = node.querySelector(".event-view") as HTMLElement;
    expect(row.style.transition).toBe("");
  });

  it("wires fisheye transitions onto rows when fisheye:true", () => {
    const soc = society();
    const node = listStory(soc, {
      slice: () => ["a", "b", "c"],
      superjectArm: testSuperjectArm,
      fisheye: true,
    }) as HTMLElement;
    const rows = Array.from(node.querySelectorAll(".event-view")) as HTMLElement[];
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expect(row.style.transition).toContain("linear(");
      // Hallie's default transitionMs (2760) should be present unless overridden.
      expect(row.style.transition).toContain("2760ms");
    }
  });

  it("accepts a FisheyeOpts override (e.g. a faster transitionMs)", () => {
    const soc = society();
    const node = listStory(soc, {
      slice: () => ["a", "b"],
      superjectArm: testSuperjectArm,
      fisheye: { transitionMs: 500 },
    }) as HTMLElement;
    const row = node.querySelector(".event-view") as HTMLElement;
    expect(row.style.transition).toContain("500ms");
  });
});
