// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// emoji-charge-doll-b.play.test.ts — DOLL B: "emoji-node as standing society-of-string."
// Committee charter's alternative shape: mint ONE standing node per glyph — "the society
// of 🔥" as a real address, not a derived filter — and have reaction-beats prehend it
// (in addition to, or instead of, the target beat).
//
// PLAYED HONESTLY, THIS DOLL TRIES TO BREAK ITSELF: what does the standing node actually
// buy over Doll A's derived read, and what does it cost?
//
// Persons: Cass the archivist (wants a stable address to point at), Théo the skeptic
// (asks what's bought that a filter-read didn't already give you), Priya the eternal/
// occasion watcher (from the charge-capacitor doll's lineage — checks the
// eternal-vs-occasion boundary: does the glyph-node ever accumulate charge itself?).
//
// Run: cd scher && npx vitest run emoji-charge-doll-b.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsOnto, prehensionsFrom, hasAnyQuality } from "../src/society.js";
import { reactionsOn } from "../src/pathos.js";
import { reactionStory } from "../src/stories.js";

function beat(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}

describe("DOLL B — a standing 'society of 🔥' node, reaction-beats prehend it too", () => {
  it("mint the glyph-node once; reaction-beats ALSO prehend it (dual-prehend: target AND glyph)", () => {
    const s = new Society();
    beat(s, "glyph-🔥", "the society of 🔥"); // minted once, eagerly, at first use
    beat(s, "beat-1", "Deb: shipped the thing");
    beat(s, "beat-2", "Deb: broke prod, then fixed it");

    // the reaction still lays the normal q-feel onto the target (Doll A's shape, unchanged —
    // this doll ADDS to it, doesn't replace it):
    (reactionStory(s, { target: "beat-1", by: "ren", emoji: "🔥" }) as HTMLButtonElement).click();
    (reactionStory(s, { target: "beat-2", by: "sol", emoji: "🔥" }) as HTMLButtonElement).click();
    // ...plus a SECOND edge, hand-laid here (no story helper exists for this — the charter
    // imagines it, the code doesn't have it), from the SAME reaction beat onto the glyph-node,
    // so the glyph-node's incoming edges ARE the cross-day index:
    s.layP("feel-ren-🔥-beat-1~indexes~glyph", "🔥", "feel-ren-🔥-beat-1", "glyph-🔥", "q-feel");
    s.layP("feel-sol-🔥-beat-2~indexes~glyph", "🔥", "feel-sol-🔥-beat-2", "glyph-🔥", "q-feel");

    // what the standing node BUYS: one address, `prehensionsOnto(s, "glyph-🔥", "q-feel")`,
    // answers "everything ever 🔥'd" WITHOUT enumerating the day's beats first (contrast
    // Doll A's test 4, which had to fold over a pre-known list of beats). This is the real
    // advantage: cross-corpus aggregation without knowing the corpus in advance.
    const allFireEvents = prehensionsOnto(s, "glyph-🔥", "q-feel");
    expect(allFireEvents.map((e) => e.subject)).toEqual(["feel-ren-🔥-beat-1", "feel-sol-🔥-beat-2"]);
  });

  it("BREAK IT (Théo the skeptic): for a KNOWN, bounded corpus (one story, one day), the glyph-node buys nothing Doll A's filter-read didn't — it only pays off when the corpus is unbounded/unknown ahead of time", () => {
    const s = new Society();
    beat(s, "b1", "one"); beat(s, "b2", "two");
    (reactionStory(s, { target: "b1", by: "ren", emoji: "🔥" }) as HTMLButtonElement).click();
    // derived filter-read (Doll A's shape) over a KNOWN corpus [b1, b2]:
    const derived = ["b1", "b2"].filter((b) => reactionsOn(s, b).some((p) => p.key === "🔥"));
    expect(derived).toEqual(["b1"]);
    // identical answer achievable with zero extra ink. The glyph-node's ONLY structural
    // advantage is when you don't have "[b1, b2]" in hand — an open-ended corpus, or a
    // cross-story/cross-frame read. For a closed corpus it's pure overhead.
  });

  it("BREAK IT (Priya, eternal-vs-occasion): does the glyph-node ever accumulate CHARGE itself, the way a capacitor-story does (charge-capacitor.play.test.ts)? No — it has no End-pole, was never unpackPoles'd, so voltageOf/chargesOn don't apply to it; it is a bare EVENT node (an eternal-object-like standing address), never a Story/Once with a differential", () => {
    const s = new Society();
    beat(s, "glyph-🔥", "the society of 🔥");
    // confirm structurally: glyph-🔥 has no q-end-pole prehension FROM it (it is not a story)
    expect(prehensionsFrom(s, "glyph-🔥", "q-end-pole")).toEqual([]);
    // and it carries no quality itself (it's a bare node, not even a prehension) —
    expect(hasAnyQuality(s, "glyph-🔥")).toBe(false);
    // FINDING: this is exactly the right eternal-object shape for a glyph-address — a
    // standing thing that OTHER beats prehend, never itself an occasion with a differential
    // to discharge. Confirms the charter's instinct that "🔥" itself is not a task/story.
  });

  it("BREAK IT (Cass, occlusion cost): banning an emoji (occluding the glyph-node itself) does NOT retract or hide the underlying reactions — occlusion is per-edge in this grammar, and the glyph-node is only ever the OBJECT of index edges, never occluded as a unit that cascades", () => {
    const s = new Society();
    beat(s, "glyph-🔥", "the society of 🔥");
    beat(s, "beat-1", "Deb: shipped the thing");
    (reactionStory(s, { target: "beat-1", by: "ren", emoji: "🔥" }) as HTMLButtonElement).click();
    s.layP("feel-ren-🔥-beat-1~indexes~glyph", "🔥", "feel-ren-🔥-beat-1", "glyph-🔥", "q-feel");
    // "occlude the glyph node" (ban the emoji) — lay a q-occludes edge naming the node.
    // But isOccluded reads occludes-edges keyed to a SLUG, and glyph-🔥 is a bare node
    // (no slug-as-prehension to occlude) — so a "ban" would have to occlude each index
    // edge individually, or the whole idea doesn't compose with the existing occlusion
    // machinery without new plumbing.
    s.layP("ban-🔥", "ban this emoji everywhere", "moderator", "glyph-🔥", "q-occludes");
    // the underlying reaction on beat-1 is completely unaffected — occluding the glyph
    // node (a node, not an edge/prehension) doesn't cascade to the index edge, let alone
    // the original q-feel:
    expect(reactionsOn(s, "beat-1")).toEqual([{ key: "🔥", count: 1, by: ["ren"] }]);
    // CONFIRMS THE COST the charter half-asked about: "banning an emoji" is not free with
    // a glyph-node under today's occlusion machinery — it would need its own guard
    // (walk-from-glyph-and-occlude-each-index, or a new kind of cascading occlusion),
    // which is new structure, which the meta-law says needs its own one-sentence law and
    // guard, not smuggled in as a side effect of "mint a node."
  });

  it.todo("value-carrying: does the kernel prefer N parallel index-edges (append-only, tested above) over a mutable count-annotation on the glyph-node? — this doll only tests the N-edges shape because a mutable count would need a settable field on EventRow, which is substance smuggled into a node; no such field exists to test against");
  it.todo("cross-day aggregation THROUGH established-to/ground the way voltageOf reads charge across frames — no read here folds glyph-node prehensions by a reading frame's lineage");
});
