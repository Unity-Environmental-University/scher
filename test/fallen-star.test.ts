// ─────────────────────────────────────────────────────────────────────────────
// fallen-star.test.ts — fallenStarOf: designation is not conduct (Hallie's
// ruling, 2026-07-21). A sublime is a star until it breaks one of three
// promises: it closed, it charges nothing, or it's orphaned from every other
// star in its constellation.
//
// Run: cd scher && npx vitest run test/fallen-star.test
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society } from "../src/society.js";
import { fallenStarOf } from "../src/sublimes.js";

function makeSublime(s: Society, name: string): void {
  s.lay({ slug: name, content: name, subject: null, object: null });
  s.layP(`${name}~pole`, name, name, name, "q-sublime-pole");
}

describe("fallenStarOf: sublime-ness is a designation, conduct must matter too", () => {
  it("a healthy sublime (charging, chained, open) is not fallen — []", () => {
    const s = new Society();
    makeSublime(s, "star-a");
    makeSublime(s, "star-b");

    // star-a serves star-b (b prehends a) — chains it.
    s.layP("a~serves~b", "serves", "star-b", "star-a", "because");
    // star-a charges a real event.
    s.lay({ slug: "work", content: "work", subject: null, object: null });
    s.layP("work~bear~a", "bearing", "star-a", "work", "because");

    expect(fallenStarOf(s, "star-a")).toEqual([]);
  });

  it("a lone-first sublime IS orphaned now — new constellations are impossible (ruling-one-constellation)", () => {
    const s = new Society();
    makeSublime(s, "only-star");

    // Give it charge so 'charges-nothing' doesn't also fire — isolate the orphan reason.
    s.lay({ slug: "work", content: "work", subject: null, object: null });
    s.layP("work~bear", "bearing", "only-star", "work", "because");

    expect(fallenStarOf(s, "only-star")).toEqual(["orphaned"]);
  });

  it("'closed': a sublime whose pole reads as an actual End is fallen", () => {
    const s = new Society();
    makeSublime(s, "closed-star");
    makeSublime(s, "other-star");
    // chain + charge so only 'closed' should fire
    s.layP("a~serves~b", "serves", "other-star", "closed-star", "because");
    s.lay({ slug: "work", content: "work", subject: null, object: null });
    s.layP("work~bear", "bearing", "closed-star", "work", "because");

    // Force an actual-End read on the sublime's own node without going through the
    // guarded layP (layP's guard blocks q-grounding out of a sublime-subject). The
    // kernel's endActual read on a non-End-pole node just checks for an un-occluded
    // q-grounding-quality edge FROM it — lay that shape directly via the raw beats.
    s.lay({ slug: "now-node", content: "now", subject: null, object: null });
    s.lay({ slug: "closed-star~because~now-node", content: "closed", subject: "closed-star", object: "now-node" });
    s.lay({ slug: "closed-star~because~now-node~q", content: "[q-grounding]", subject: "closed-star~because~now-node", object: "q-grounding" });

    expect(fallenStarOf(s, "closed-star")).toEqual(["closed"]);
  });

  it("'charges-nothing': a designated sublime with zero un-occluded outgoing bearings is fallen", () => {
    const s = new Society();
    makeSublime(s, "idle-star");
    makeSublime(s, "other-star");
    // chained, so only 'charges-nothing' should fire
    s.layP("a~serves~b", "serves", "other-star", "idle-star", "because");

    expect(fallenStarOf(s, "idle-star")).toEqual(["charges-nothing"]);
  });

  it("'charges-nothing' also fires when the only charge is occluded", () => {
    const s = new Society();
    makeSublime(s, "shadowed-star");
    makeSublime(s, "other-star");
    s.layP("a~serves~b", "serves", "other-star", "shadowed-star", "because");

    s.lay({ slug: "work", content: "work", subject: null, object: null });
    s.layP("work~bear", "bearing", "shadowed-star", "work", "because");
    s.layP("hide~bearing", "hide it", "hide", "work~bear", "q-occludes");

    expect(fallenStarOf(s, "shadowed-star")).toEqual(["charges-nothing"]);
  });

  it("'orphaned': no sublime<->sublime link in either direction, but another sublime exists", () => {
    const s = new Society();
    makeSublime(s, "lonely-star");
    makeSublime(s, "unrelated-star");

    // lonely-star charges a real event, so it isn't also 'charges-nothing'.
    s.lay({ slug: "work", content: "work", subject: null, object: null });
    s.layP("work~bear", "bearing", "lonely-star", "work", "because");

    expect(fallenStarOf(s, "lonely-star")).toEqual(["orphaned"]);
  });

  it("all three reasons can fire together on a fully broken sublime", () => {
    const s = new Society();
    makeSublime(s, "broken-star");
    makeSublime(s, "other-star"); // exists, but never linked — orphan holds

    // Force the closed read (same raw-beat shape as the 'closed' test above).
    s.lay({ slug: "now-node", content: "now", subject: null, object: null });
    s.lay({ slug: "broken-star~because~now-node", content: "closed", subject: "broken-star", object: "now-node" });
    s.lay({ slug: "broken-star~because~now-node~q", content: "[q-grounding]", subject: "broken-star~because~now-node", object: "q-grounding" });

    const reasons = fallenStarOf(s, "broken-star");
    expect(new Set(reasons)).toEqual(new Set(["closed", "charges-nothing", "orphaned"]));
  });

  it("non-sublime input returns [] — not a star at all, not fallen", () => {
    const s = new Society();
    s.lay({ slug: "plain-beat", content: "just a beat", subject: null, object: null });
    expect(fallenStarOf(s, "plain-beat")).toEqual([]);
  });
});
