// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// eventview.test.ts — EventView's THREE-MODE dispatch (interior/superject/proposition).
//
// CLAIMS under test, mirroring the reads/spreads/taste-arm seam cardStory's de-taste
// established (stories.ts readCard/ModeArm/cardStory):
//   1. interior renders via cardStory (the full card — slug/content/mode/pathos).
//   2. superject renders compact (no full card body — just the taste arm's row).
//   3. proposition carries the STRUCTURAL not-yet marker (data-proposition + class),
//      and — the real claim — scher DETECTS proposition-ness itself from the society
//      (a scripted/unestablished beat, or a sublime-pole) even when the caller asks
//      for plain 'superject'. Detection is scher's; the skin is the caller's.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society } from "../src/society.js";
import { eventView, readEventView, type SuperjectArm } from "../src/eventview.js";
import type { ModeArm } from "../src/stories.js";

const testModeArm: ModeArm = (v) => document.createTextNode(`card:${v.mode}`);
const testSuperjectArm: SuperjectArm = (v) => document.createTextNode(v.slug);

function society() {
  return new Society([
    { slug: "grounder", content: "grounds things", subject: null, object: null },
    { slug: "scripted-beat", content: "not yet grounded", subject: null, object: null },
    { slug: "established-beat", content: "grounded", subject: null, object: null },
    { slug: "star", content: "a sublime bearing-target", subject: null, object: null },
  ]);
}

describe("eventView — three modes, one harness", () => {
  it("interior mode delegates to cardStory (full card body)", () => {
    const soc = society();
    const node = eventView(soc, { slug: "established-beat", mode: "interior", modeArm: testModeArm }) as HTMLElement;
    expect(node.className).toContain("story-card");
    expect(node.querySelector(".content")?.textContent).toBe("grounded");
    expect(node.querySelector(".slug")?.textContent).toBe("established-beat");
  });

  it("superject mode renders a compact row (no card body)", () => {
    const soc = society();
    soc.layP("g1", "grounder grounds established-beat", "grounder", "established-beat", "q-grounding");
    const node = eventView(soc, { slug: "established-beat", mode: "superject", superjectArm: testSuperjectArm }) as HTMLElement;
    expect(node.className).toContain("event-view");
    expect(node.className).toContain("superject");
    expect(node.querySelector(".slug")).toBeNull();     // not a card — compact row only
    expect(node.querySelector(".content")).toBeNull();
    expect(node.textContent).toBe("established-beat");   // the taste arm's own render
    // established + grounded ⇒ NOT proposition-y.
    expect(node.getAttribute("data-proposition")).toBeNull();
    expect(node.className).not.toContain("proposition");
  });

  it("proposition mode carries the structural not-yet marker", () => {
    const soc = society();
    const node = eventView(soc, { slug: "scripted-beat", mode: "proposition", superjectArm: testSuperjectArm }) as HTMLElement;
    expect(node.getAttribute("data-proposition")).toBe("true");
    expect(node.className).toContain("proposition");
  });

  it("scher DETECTS proposition-ness from the society even when caller asks for plain superject", () => {
    const soc = society();
    // scripted-beat has no grounding at all ⇒ isEstablished === false ⇒ structurally a proposition,
    // regardless of the caller's declared mode.
    const node = eventView(soc, { slug: "scripted-beat", mode: "superject", superjectArm: testSuperjectArm }) as HTMLElement;
    expect(node.getAttribute("data-proposition")).toBe("true");
    expect(node.className).toContain("proposition");
  });

  it("a sublime-pole reads as a proposition even if nothing grounds it directly", () => {
    const soc = society();
    soc.layP("star-pole", "grounder aims at star", "grounder", "star", "q-sublime-pole");
    const read = readEventView(soc, "star");
    expect(read.isProposition).toBe(true);

    const node = eventView(soc, { slug: "star", mode: "superject", superjectArm: testSuperjectArm }) as HTMLElement;
    expect(node.getAttribute("data-proposition")).toBe("true");
  });

  it("readEventView: an established, non-sublime beat is not a proposition", () => {
    const soc = society();
    soc.layP("g2", "grounder grounds established-beat", "grounder", "established-beat", "q-grounding");
    const read = readEventView(soc, "established-beat");
    expect(read.isProposition).toBe(false);
    expect(read.mode).toBe("established");
  });

  it("throws a clear error when the required taste arm is missing", () => {
    const soc = society();
    expect(() => eventView(soc, { slug: "established-beat", mode: "interior" })).toThrow(/modeArm/);
    expect(() => eventView(soc, { slug: "established-beat", mode: "superject" })).toThrow(/superjectArm/);
  });
});
