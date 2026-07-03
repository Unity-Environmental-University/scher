// frame-relative establishment — conformance twin of scher-core/tests/frame_relative.rs.
// Guards the 2026-07-03 ruling's kernel landing: reaches / establishedTo / the honest
// aggregate rename, with the authorship clause DELIBERATELY absent pending F-A.
import { describe, expect, it } from "vitest";
import {
  Society,
  establishedTo,
  groundedForAnyFrame,
  isEstablished,
  reaches,
} from "../src/society.js";

const node = (slug: string) => ({ slug, content: slug, subject: null, object: null });

/** A small canon: now-r ~grounds~ a ~grounds~ b, plus an ungrounded stray c. */
function seed(): Society {
  const soc = new Society([node("now-r"), node("a"), node("b"), node("c")]);
  soc.layP("e1", "now touches a", "now-r", "a", "q-grounding");
  soc.layP("e2", "a rests on b", "a", "b", "q-grounding");
  return soc;
}

describe("reaches", () => {
  it("walks chains, from===to trivially, and refuses what is not there", () => {
    const soc = seed();
    expect(reaches(soc, "now-r", "b", "q-grounding")).toBe(true); // two hops
    expect(reaches(soc, "now-r", "now-r", "q-grounding")).toBe(true); // trivial
    expect(reaches(soc, "now-r", "c", "q-grounding")).toBe(false); // stray
    expect(reaches(soc, "b", "now-r", "q-grounding")).toBe(false); // no backward walk
  });

  it("an occluded edge breaks the walk; un-occlusion (occluding the occluder) restores it", () => {
    const soc = seed();
    soc.layP("shadow", "retract e2", "retractor", "e2", "q-occludes");
    expect(reaches(soc, "now-r", "b", "q-grounding")).toBe(false);
    soc.layP("shadow2", "retract the retraction", "restorer", "shadow", "q-occludes");
    expect(reaches(soc, "now-r", "b", "q-grounding")).toBe(true);
  });

  it("is asOf-threaded: an edge does not carry the walk before it was witnessed", () => {
    const soc = new Society([node("now-r"), node("a")]);
    const before = 5;
    soc.lay({ slug: "late", content: "", subject: "now-r", object: "a", witnessed: 10 });
    soc.lay({ slug: "late~q", content: "[q-grounding]", subject: "late", object: "q-grounding", witnessed: 10 });
    expect(reaches(soc, "now-r", "a", "q-grounding", before)).toBe(false);
    expect(reaches(soc, "now-r", "a", "q-grounding")).toBe(true);
  });
});

describe("establishedTo (frame-relative)", () => {
  it("is reachability from the reader's Now node", () => {
    const soc = seed();
    expect(establishedTo(soc, "now-r", "b")).toBe(true);
    expect(establishedTo(soc, "now-r", "c")).toBe(false);
  });

  it("composition law: establishedTo(now, beat) with now!==beat implies the aggregate read", () => {
    const soc = seed();
    for (const beat of ["a", "b"]) {
      expect(establishedTo(soc, "now-r", beat)).toBe(true);
      expect(groundedForAnyFrame(soc, beat)).toBe(true);
    }
  });
});

describe("the honest rename", () => {
  it("isEstablished (deprecated) and groundedForAnyFrame agree everywhere", () => {
    const soc = seed();
    for (const beat of ["now-r", "a", "b", "c"]) {
      expect(isEstablished(soc, beat)).toBe(groundedForAnyFrame(soc, beat));
    }
  });

  it("the aggregate and the frame-relative read genuinely differ (the fourth-pass collision)", () => {
    // b is grounded (aggregate true) but NOT reachable from a stranger's Now with no edges.
    const soc = seed();
    soc.lay(node("now-stranger"));
    expect(groundedForAnyFrame(soc, "b")).toBe(true);
    expect(establishedTo(soc, "now-stranger", "b")).toBe(false);
  });
});
