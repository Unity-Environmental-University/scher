// ─────────────────────────────────────────────────────────────────────────────
// day-as-story.test.ts — a day IS a story (H6, 2026-07-13 one-renderer sitting).
//
// Hallie's ruling: a day unpacks into poles like any other story — an End minted
// (`hea-{day}`), designated via q-end-pole (unpackPoles), with a story-Now laid. Its
// captured beats live INSIDE its interval, so containsOf(soc, daySlug) returns them —
// the same betweenness read every other story already gets, no second mechanism.
//
// THE FABRIC, empirically found (probe against the built dist/, see the report to the
// Rust lights): intervalOf(once, end) reaches FORWARD from once and BACKWARD from end
// along plain (non-quality-designation) edges, and INTERSECTS the two cones. A day's
// existing `{day}~holds~{event}` bare edge already gives the forward reach (day → beat).
// What's MISSING today is the backward reach (beat → end) — and it must be a BARE edge
// (a charge), never a q-grounding: the naked-pole address law refuses any quality
// prehension onto an open End-pole (assertNakedPole, society.ts) — only bare
// charge-edges and the ONE closing q-grounding may touch a naked End. So per beat:
//   day ~holds~ beat            (already laid by capture_into_day — untouched)
//   beat ~charge~ hea-{day}     (NEW — a bare edge, the only thing capture_into_day
//                                 is missing to make containsOf see the beat)
// plus, once per day (already laid by open_story/unpackPoles):
//   day ~end-pole~ hea-{day}    (q-end-pole, designates the End — makes isStory(day) true)
//   day-Now node + day-Now ~because~ day (q-grounding, the story's own frame's first Now)
//
// This file is the conformance twin stories.ts's containsOf/requiresOf/enablesOf/isStory
// need for day-hood specifically — locking the exact edge shape so a future refactor of
// capture_into_day (Rust) can't silently drift from what scher actually reads.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, isStory, endOf, unpackPoles } from "../src/index.js";
import { containsOf, requiresOf, enablesOf } from "../src/stories.js";

function node(s: Society, slug: string) {
  s.lay({ slug, content: slug, subject: null, object: null });
}

/** Lay one captured beat into a day, per the fabric above: the existing bare `holds`
 *  edge (day → beat) plus the new bare charge edge (beat → the day's End-pole). Mirrors
 *  what gen4-policy's capture_into_day must lay once the migration lands. */
function captureIntoDay(s: Society, day: string, end: string, beat: string) {
  node(s, beat);
  s.lay({ slug: `${day}~holds~${beat}`, content: "", subject: day, object: beat });
  s.lay({ slug: `${beat}~charge~${end}`, content: "", subject: beat, object: end });
}

describe("a day is a story — unpacked into poles, its beats living inside via containment", () => {
  it("an unpacked day IS a story: isStory true, endOf reads the q-end-pole designation", () => {
    const s = new Society();
    node(s, "day-2026-07-13");
    const u = unpackPoles(s, "day-2026-07-13", "hea-day-2026-07-13");
    expect(isStory(s, "day-2026-07-13")).toBe(true);
    expect(endOf(s, "day-2026-07-13")).toBe(u.end);
  });

  it("containsOf returns a captured beat once it's charged onto the day's End (the missing edge)", () => {
    const s = new Society();
    node(s, "day-2026-07-13");
    const u = unpackPoles(s, "day-2026-07-13", "hea-day-2026-07-13");
    captureIntoDay(s, "day-2026-07-13", u.end, "capture-milk");

    expect(containsOf(s, "day-2026-07-13")).toEqual(["capture-milk"]);
  });

  it("containsOf returns EVERY captured beat, in the order the interval walk finds them", () => {
    const s = new Society();
    node(s, "day-2026-07-13");
    const u = unpackPoles(s, "day-2026-07-13", "hea-day-2026-07-13");
    captureIntoDay(s, "day-2026-07-13", u.end, "capture-milk");
    captureIntoDay(s, "day-2026-07-13", u.end, "walk-the-dog");
    captureIntoDay(s, "day-2026-07-13", u.end, "write-the-report");

    const contains = containsOf(s, "day-2026-07-13");
    expect(contains).toHaveLength(3);
    expect(contains).toEqual(
      expect.arrayContaining(["capture-milk", "walk-the-dog", "write-the-report"]),
    );
    // the day's own lips never show up as their own members
    expect(contains).not.toContain("day-2026-07-13");
    expect(contains).not.toContain(u.end);
  });

  it("the `holds` edge alone is not enough — a beat only inside once it also charges the End", () => {
    // this is the exact partial-migration trap: a day that lays membership but forgets
    // the charge to the End reads as containing nothing, same as no migration at all.
    const s = new Society();
    node(s, "day-2026-07-13");
    unpackPoles(s, "day-2026-07-13", "hea-day-2026-07-13");
    node(s, "half-migrated-beat");
    s.lay({
      slug: "day-2026-07-13~holds~half-migrated-beat",
      content: "",
      subject: "day-2026-07-13",
      object: "half-migrated-beat",
    });
    // no charge onto the End laid — the backward cone never reaches this beat.
    expect(containsOf(s, "day-2026-07-13")).toEqual([]);
  });

  it("requiresOf/enablesOf behave sanely on a day: no phantom requires; enables carries only the day's own story-Now background, never a captured beat", () => {
    const s = new Society();
    node(s, "day-2026-07-13");
    const u = unpackPoles(s, "day-2026-07-13", "hea-day-2026-07-13");
    captureIntoDay(s, "day-2026-07-13", u.end, "capture-milk");

    // a day never gets a q-depends-on edge from this fabric alone — requiresOf is empty.
    expect(requiresOf(s, "day-2026-07-13")).toEqual([]);

    // enablesOf (downstreamsOf's alias) walks q-grounding/because edges FROM other beats
    // ONTO the day. unpackPoles lays exactly one such edge — the day's own story-Now
    // grounding in it (`${day}~now ~because~ day`) — background machinery every unpacked
    // story carries, not a captured beat. A captured beat's `charge`/`holds` edges are
    // bare (no quality), so they never feed enablesOf/downstreamsOf at all.
    expect(enablesOf(s, "day-2026-07-13")).toEqual([`day-2026-07-13~now`]);
  });

  it("a leaf beat captured into a day stays a leaf — containsOf on the BEAT (not the day) is empty", () => {
    const s = new Society();
    node(s, "day-2026-07-13");
    const u = unpackPoles(s, "day-2026-07-13", "hea-day-2026-07-13");
    captureIntoDay(s, "day-2026-07-13", u.end, "capture-milk");

    expect(isStory(s, "capture-milk")).toBe(false);
    expect(containsOf(s, "capture-milk")).toEqual([]);
  });

  // ── THE NEGATIVE — locks WHY the migration is needed. ──────────────────────────
  it("a bare ~holds~-only day (today's live shape, no pole at all) is NOT a story: containsOf is empty", () => {
    const s = new Society();
    node(s, "day-2026-07-13");
    node(s, "capture-milk");
    // exactly today's production shape: capture_into_day's membership edge, nothing else —
    // no unpackPoles, no End, no q-end-pole designation, no charge.
    s.lay({
      slug: "day-2026-07-13~holds~capture-milk",
      content: "",
      subject: "day-2026-07-13",
      object: "capture-milk",
    });

    expect(isStory(s, "day-2026-07-13")).toBe(false);
    expect(endOf(s, "day-2026-07-13")).toBeNull();
    // this is the exact silent-empty-card bug the sitting named: readCardAnatomy would
    // open a day-card that lies by omission — it has beats, but containsOf can't see them
    // because there is no interval to walk (no End, no isStory).
    expect(containsOf(s, "day-2026-07-13")).toEqual([]);
  });
});
