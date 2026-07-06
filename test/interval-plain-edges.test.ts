// Conformance twin (paired with scher-core/tests/conformance.rs::interval_walks_quality_carrying_edges):
// pins the CORRECTION to migration-design item 1 (2026-07-06, event-1350 debugging sitting).
//
// intervalOf's plain-edge filter classifies out the quality MACHINERY — ~q mode-beats and
// quality-DESIGNATION edges (object is a quality token, read structurally) — but a
// quality-CARRYING edge (laid via layP, e.g. q-grounding) IS interval fabric and MUST be
// walked. Production (gen4 bujo) lays all its membership edges via layP q-grounding, and
// must: under the address law a bare edge onto an open End-pole reads as a charge, so the
// membership edges cannot be laid bare. The first structural replacement (!hasAnyQuality on
// the edge itself) excluded them all and emptied every production story interval.
import { describe, it, expect } from "vitest";
import { Society, intervalOf } from "../src/society.js";

function node(s: Society, slug: string) {
  s.lay({ slug, content: slug, subject: null, object: null });
}

describe("intervalOf plain-edge classification (structural, no spelling)", () => {
  it("walks quality-CARRYING edges: a layP q-grounding chain yields its interior", () => {
    const s = new Society();
    node(s, "once");
    node(s, "beat-a");
    node(s, "end");
    s.layP("once~because~beat-a", "chain", "once", "beat-a", "q-grounding");
    s.layP("beat-a~because~end", "chain", "beat-a", "end", "q-grounding");

    const interval = intervalOf(s, "once", "end");
    expect(interval).toContain("beat-a");
  });

  it("still excludes the quality machinery: ~q mode-beats and designation edges onto a quality token", () => {
    const s = new Society();
    node(s, "once");
    node(s, "end");
    // a quality-carrying chain, so "q-grounding" is a live quality token in this society
    s.layP("once~because~end", "chain", "once", "end", "q-grounding");
    // a designation-shaped edge pointing AT the quality token itself — must NOT be walked
    s.lay({ slug: "end~designates", content: "smuggle", subject: "end", object: "q-grounding" });
    s.lay({ slug: "q-grounding~leak", content: "smuggle", subject: "q-grounding", object: "once" });

    const interval = intervalOf(s, "once", "end");
    expect(interval).not.toContain("q-grounding");
  });
});
