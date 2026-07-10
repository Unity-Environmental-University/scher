// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// listStory.test.ts — PORT work-round 3 (frame-crew-port-eventview-list): "a list
// is a spread of superject-face EventViews" made real. listStory's default
// per-item render (no `item` override) now composes eventView(mode:'superject')
// per member, not a bespoke card render.
//
// CLAIMS under test:
//   1. Each member renders as an event-view superject row (eventView's own shape),
//      not the old story-card render.
//   2. A member that reads as a proposition (scripted/ungrounded, or a sublime
//      pole) carries the not-yet marker AUTOMATICALLY — no special-casing by the
//      caller of listStory.
//   3. The optional mass hook (massOf) shows up as data-mass / --mass on a row
//      when supplied, and is absent when not.
//   4. Supplying `item` still opts fully out of the default (back-compat escape
//      hatch, e.g. boardStory's own usage).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society } from "../src/society.js";
import { listStory } from "../src/stories.js";
import type { SuperjectArm } from "../src/eventview.js";

const testSuperjectArm: SuperjectArm = (v) => document.createTextNode(v.slug);

function society() {
  return new Society([
    { slug: "grounder", content: "grounds things", subject: null, object: null },
    { slug: "established-beat", content: "grounded", subject: null, object: null },
    { slug: "scripted-beat", content: "not yet grounded", subject: null, object: null },
  ]);
}

describe("listStory — a list is a spread of superject-face EventViews", () => {
  it("renders each member as an event-view superject row", () => {
    const soc = society();
    soc.layP("g1", "grounder grounds established-beat", "grounder", "established-beat", "q-grounding");
    const node = listStory(soc, {
      slice: (s) => [s.get("established-beat")!.slug],
      superjectArm: testSuperjectArm,
    }) as HTMLElement;

    const row = node.querySelector(".event-view.superject") as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.textContent).toBe("established-beat");
    // NOT the old card render.
    expect(node.querySelector(".story-card")).toBeNull();
  });

  it("a scripted/ungrounded member carries the proposition marker automatically", () => {
    const soc = society();
    const node = listStory(soc, {
      slice: () => ["scripted-beat"],
      superjectArm: testSuperjectArm,
    }) as HTMLElement;

    const row = node.querySelector(".event-view") as HTMLElement;
    expect(row.getAttribute("data-proposition")).toBe("true");
    expect(row.className).toContain("proposition");
  });

  it("an established, grounded member does NOT carry the proposition marker", () => {
    const soc = society();
    soc.layP("g2", "grounder grounds established-beat", "grounder", "established-beat", "q-grounding");
    const node = listStory(soc, {
      slice: () => ["established-beat"],
      superjectArm: testSuperjectArm,
    }) as HTMLElement;

    const row = node.querySelector(".event-view") as HTMLElement;
    expect(row.getAttribute("data-proposition")).toBeNull();
    expect(row.className).not.toContain("proposition");
  });

  it("a mixed slice shows propositions and settled rows side by side, unaided", () => {
    const soc = society();
    soc.layP("g3", "grounder grounds established-beat", "grounder", "established-beat", "q-grounding");
    const node = listStory(soc, {
      slice: () => ["established-beat", "scripted-beat"],
      superjectArm: testSuperjectArm,
    }) as HTMLElement;

    const rows = Array.from(node.querySelectorAll(".event-view")) as HTMLElement[];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.getAttribute("data-proposition")).toBeNull();
    expect(rows[1]!.getAttribute("data-proposition")).toBe("true");
  });

  it("massOf, when supplied, carries the mass hook (data-mass + --mass) on the row", () => {
    const soc = society();
    const node = listStory(soc, {
      slice: () => ["scripted-beat"],
      superjectArm: testSuperjectArm,
      massOf: (_s, slug) => (slug === "scripted-beat" ? 7 : undefined),
    }) as HTMLElement;

    const row = node.querySelector(".event-view") as HTMLElement;
    expect(row.getAttribute("data-mass")).toBe("7");
    expect(row.style.getPropertyValue("--mass")).toBe("7");
  });

  it("without massOf, no mass hook appears at all", () => {
    const soc = society();
    const node = listStory(soc, {
      slice: () => ["scripted-beat"],
      superjectArm: testSuperjectArm,
    }) as HTMLElement;

    const row = node.querySelector(".event-view") as HTMLElement;
    expect(row.getAttribute("data-mass")).toBeNull();
    expect(row.style.getPropertyValue("--mass")).toBe("");
  });

  it("massOf returning undefined for a given member omits the hook for that row only", () => {
    const soc = society();
    soc.layP("g4", "grounder grounds established-beat", "grounder", "established-beat", "q-grounding");
    const node = listStory(soc, {
      slice: () => ["established-beat", "scripted-beat"],
      superjectArm: testSuperjectArm,
      massOf: (_s, slug) => (slug === "scripted-beat" ? 3 : undefined),
    }) as HTMLElement;

    const rows = Array.from(node.querySelectorAll(".event-view")) as HTMLElement[];
    expect(rows[0]!.getAttribute("data-mass")).toBeNull();
    expect(rows[1]!.getAttribute("data-mass")).toBe("3");
  });

  it("supplying `item` opts fully out of the superject default (e.g. boardStory's usage)", () => {
    const soc = society();
    const node = listStory(soc, {
      slice: () => ["established-beat"],
      item: (_s, slug) => document.createTextNode(`custom:${slug}`),
    }) as HTMLElement;

    expect(node.textContent).toBe("custom:established-beat");
    expect(node.querySelector(".event-view")).toBeNull();
  });

  it("throws a clear error when superjectArm is missing and no item override is given", () => {
    const soc = society();
    expect(() =>
      listStory(soc, { slice: () => ["established-beat"] }),
    ).toThrow(/superjectArm/);
  });

  it("throws a migration-pointing error when only the deprecated modeArm is supplied", () => {
    const soc = society();
    expect(() =>
      listStory(soc, {
        slice: () => ["established-beat"],
        modeArm: (v) => document.createTextNode(v.content),
      }),
    ).toThrow(/superjectArm.*modeArm|modeArm.*superjectArm/);
  });
});
