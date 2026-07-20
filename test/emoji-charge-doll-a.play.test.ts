// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// emoji-charge-doll-a.play.test.ts — DOLL A: "emoji via the existing reaction shape."
// Committee charter (Hallie, 2026-07-06): "Emoji as charge markers on events... probably
// prehensions of the emoji as particular qualities of that beat... a generic 'the society
// of string x' with some way of carrying a value at each read."
//
// PREMISE CHECKED FIRST (per quaker-process-for-agents: verify before building): the
// charter imagines this as new. It ISN'T. `reactionsOn`/`pathosOf` (society.ts:526-571)
// already read q-feel prehensions whose `content` is a raw emoji string, already
// aggregate by emoji into {emoji, count, by[]}, and this is already regression-tested at
// test/drop.test.ts:131-164 with 🔥 on "ann"/"bo". DOLL A's job is not to invent the
// shape but to STRESS it against the charter's exact three questions:
//   1. does count-by-multiple-edges work today for the SAME person reacting thrice —
//      does the un-react/occlude guard collapse repeats, or does the slug-idempotence
//      (feel-${by}-${emoji}-${target}) mean a third press is a no-op re-lay, not a
//      third charge?
//   2. can you read the "🔥-ness of a whole day/story" — a society-wide emoji tally
//      across many beats, not just one beat's reactionsOn?
//   3. is "the society of 🔥" just a DERIVED READ — all beats whose q-feel content is
//      🔥 — with no new node minted? (charter's "generic society of string x")
//
// Persons: Deb the diarist (writes the day's beats), Ren and Sol (react across the day).
//
// Run: cd scher && npx vitest run emoji-charge-doll-a.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto } from "../src/society.js";
import { reactionsOn, pathosOf } from "../src/pathos.js";
import { reactionStory } from "../src/stories.js";

function beat(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}

describe("DOLL A — emoji via the existing q-feel reaction shape", () => {
  it("a single press lays one q-feel edge, read by reactionsOn — nothing new needed", () => {
    const s = new Society();
    beat(s, "beat-1", "Deb: shipped the thing");
    const btn = reactionStory(s, { target: "beat-1", by: "ren", emoji: "🔥" }) as HTMLButtonElement;
    btn.click();
    expect(reactionsOn(s, "beat-1")).toEqual([{ key: "🔥", count: 1, by: ["ren"] }]);
  });

  it("BREAK IT (a real one): react → un-react → react-again does NOT restore the reaction — append-only `lay` no-ops on an existing slug, so the third click's `layP(slug, ...)` never lifts the occlusion laid by the second click. The button is honestly broken past one full cycle.", () => {
    const s = new Society();
    beat(s, "beat-1", "Deb: shipped the thing");
    const btn = reactionStory(s, { target: "beat-1", by: "ren", emoji: "🔥" }) as HTMLButtonElement;
    btn.click(); // react — lays `slug`
    expect(reactionsOn(s, "beat-1")).toEqual([{ key: "🔥", count: 1, by: ["ren"] }]);
    btn.click(); // un-react — lays `occ-${slug}`, occluding it
    expect(reactionsOn(s, "beat-1")).toEqual([]);
    btn.click(); // react again — re-lays `slug`, but the slug already exists in ink...
    // ...so `lay` is a no-op (append-only never overwrites a slug) and the occlusion from
    // click 2 is never lifted. This is NOT the doll's bug — it's a real latent gap in
    // reactionStory's un-react/re-react cycle, exposed by exactly the charter's "same
    // person, three times" question. FENCED FINDING for the committee minutes: pre-dates
    // this doll, orthogonal to "emoji as charge," worth a ticket of its own.
    expect(reactionsOn(s, "beat-1")).toEqual([]); // <- the honest, broken result today
    // EMOJI-AS-NODE, the final q-feel ruling (Hallie, "story-emoji-as-node", 2026-07-20):
    // the beat is subject, the lazily-minted emoji-node is object. AUTHORSHIP
    // RECONCILIATION (same day): "ren" no longer rides the q-feel edge — it's set as
    // laid_by on the q-feel row itself, mirroring gen4-policy's lay_authorship, never a
    // q-utterance row (that idiom stays reserved for comments/speech).
    const feels = prehensionsFrom(s, "beat-1", "q-feel").filter((p) => p.object === "emoji-🔥");
    expect(feels.length).toBe(1); // the one edge from click 1 — occluded, never revived
    expect(s.get("feel-ren-🔥-beat-1")).toMatchObject({ laid_by: "ren" });
    expect(s.get("laid-feel-ren-🔥-beat-1-by-ren")).toBeDefined();
  });

  it("a genuinely DIFFERENT reaction event (different reactSlug) from the same person on the same beat DOES accumulate as a second edge — the guard collapses same-button-repeat, not same-person-same-emoji as a concept", () => {
    const s = new Society();
    beat(s, "beat-1", "Deb: shipped the thing");
    // two independently-slugged q-feel lays, both onto the SAME lazily-minted emoji-node,
    // both authored by ren — this is what the charter's "multiple edges to the same"
    // would require if the UI ever allowed it (it currently doesn't: reactionStory's slug
    // template forecloses it). EMOJI-AS-NODE, the final q-feel ruling (Hallie,
    // "story-emoji-as-node", 2026-07-20): subject=beat-1, object=emoji-node.
    // AUTHORSHIP RECONCILIATION (same day): laid_by set on each q-feel row directly,
    // mirroring gen4-policy's lay_authorship, never a q-utterance row.
    beat(s, "emoji-🔥", "🔥");
    // laid via plain lay() (not layP — layP has no laid_by parameter, same constraint
    // layReactionFeel in stories.ts works around) plus its own '~q' mode-beat, matching
    // layP's constructor convention so prehensionsFrom's quality read (prehendsAs) sees it:
    s.lay({ slug: "feel-ren-🔥-beat-1-a", content: "🔥", subject: "beat-1", object: "emoji-🔥", laid_by: "ren" });
    s.lay({ slug: "feel-ren-🔥-beat-1-a~q", content: "🔥 [q-feel]", subject: "feel-ren-🔥-beat-1-a", object: "q-feel" });
    s.lay({ slug: "feel-ren-🔥-beat-1-b", content: "🔥", subject: "beat-1", object: "emoji-🔥", laid_by: "ren" });
    s.lay({ slug: "feel-ren-🔥-beat-1-b~q", content: "🔥 [q-feel]", subject: "feel-ren-🔥-beat-1-b", object: "q-feel" });
    // pathosOf (raw, unfiltered) counts both edges but only records "ren" once per hit —
    // by[] is push-per-edge, so it appears TWICE, honestly reflecting two edges:
    expect(pathosOf(s, "beat-1")).toEqual([{ key: "🔥", count: 2, by: ["ren", "ren"] }]);
    // FINDING: reactionsOn/pathosOf's "count" is a COUNT OF EDGES, and "value at each
    // read" (the charter's phrase) already exists as `count` — no new node needed for
    // COUNTING (though the emoji itself is now a node, per the final ruling, for a
    // different reason: giving the glyph a standing address). The only foreclosure is at
    // the UI layer (reactionStory's one-slug-per-person-per-emoji template), not in the
    // read itself.
  });

  it("the '🔥-ness of a whole day' — aggregating across MANY beats — is a derived read today: fold reactionsOn over the day's beats, no new machinery, no new node", () => {
    const s = new Society();
    beat(s, "morning", "Deb: coffee");
    beat(s, "afternoon", "Deb: shipped the thing");
    beat(s, "evening", "Deb: broke prod");
    for (const [target, by] of [["morning", "ren"], ["afternoon", "ren"], ["afternoon", "sol"], ["evening", "sol"]] as const) {
      (reactionStory(s, { target, by, emoji: "🔥" }) as HTMLButtonElement).click();
    }
    const dayBeats = ["morning", "afternoon", "evening"];
    const fireCount = dayBeats.reduce((n, b) => n + (reactionsOn(s, b).find((p) => p.key === "🔥")?.count ?? 0), 0);
    expect(fireCount).toBe(4);
    // "the society of 🔥" for the day, as a read, not a node: every beat + its 🔥 count.
    const societyOfFire = dayBeats
      .map((b) => ({ beat: b, count: reactionsOn(s, b).find((p) => p.key === "🔥")?.count ?? 0 }))
      .filter((row) => row.count > 0);
    expect(societyOfFire).toEqual([
      { beat: "morning", count: 1 },
      { beat: "afternoon", count: 2 },
      { beat: "evening", count: 1 },
    ]);
  });

  it("REVERSED FINDING under the final ruling: 'the society of 🔥' now IS a real glyph-node — prehensionsOnto('emoji-🔥', 'q-feel') answers it directly, no derived filter needed", () => {
    // SUPERSEDES this doll's original premise (charter, 2026-07-06): DOLL A originally
    // found "no glyph-node needed, content is directly greppable on the edge." The FINAL
    // q-feel ruling (Hallie, "story-emoji-as-node", 2026-07-20) overturns that finding on
    // purpose: the emoji IS now a lazily-minted node, exactly the shape DOLL B explored as
    // an alternative and this doll's own premise argued against. Kept here, corrected, as
    // the honest record of the ruling's actual landing — not silently deleted.
    const s = new Society();
    beat(s, "b1", "one"); beat(s, "b2", "two");
    (reactionStory(s, { target: "b1", by: "ren", emoji: "🔥" }) as HTMLButtonElement).click();
    (reactionStory(s, { target: "b2", by: "sol", emoji: "😱" }) as HTMLButtonElement).click();
    // "the society of 🔥" is now a real address: every beat that q-feels the shared
    // emoji-node "emoji-🔥" is directly readable via prehensionsOnto, no content filter
    // over soc.all() required:
    const societyOfFireEdges = prehensionsOnto(s, "emoji-🔥", "q-feel");
    expect(societyOfFireEdges.map((e) => e.subject)).toEqual(["b1"]);
    // the emoji-node itself carries the glyph as its content — the honest, structural
    // source of truth, never a slug parse:
    expect(s.get("emoji-🔥")?.content).toBe("🔥");
    expect(s.get("emoji-😱")?.content).toBe("😱");
  });

  it.todo("cross-story emoji tally established through a lineage/ground the way voltageOf reads charge relative to a frame — no current read folds reactionsOn across established-to frames");
  it.todo("does an occluded (un-reacted) 🔥 still count toward a society-wide 🔥 tally under pathosOf (the unfiltered read)? — plausible footgun if a future 'society of 🔥' read reaches for pathosOf instead of reactionsOn for convenience");
});
