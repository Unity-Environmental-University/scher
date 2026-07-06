// ─────────────────────────────────────────────────────────────────────────────
// charge-auto-story.play.test.ts — DOLL 1: "auto-story." A small society (a two-person
// team: Beans the reporter, Marge the maintainer) plays out Hallie's charge charter —
// "does the user story that resolves it simply get auto created in the future and now
// it's your job to deal with it?"
//
// THE SHAPE: every unattached charge (a felt need with no story to press on) gets its
// OWN story minted on the spot — unpackPoles on a fresh event, immediately — and the
// charge is re-expressed to press on that story's End. No triage, no accumulation: as
// soon as Beans notices something, a story exists whether anyone chose it or not.
//
// We use the REAL machinery (layCharge, unpackPoles, voltageOf, endActual, closePole,
// chargesOn) — nothing invented. layCharge already lazily unpacks on first need
// (society.ts:730), so "auto-story" isn't even a new mechanism to build: it's the
// STANDING behavior of the charge path today, played out to see what it costs at volume.
//
// UPDATED mid-sitting: the build body landed the ADDRESS LAW (charge is a bare edge onto
// the open End-pole — no q-charge quality exists anymore; chargesOn(end) reads it) and
// made voltageOf frame-relative (a `ground` parameter, default the story's own frame's
// Now via storyNow — SOFD). Every read below now goes through the CURRENT exports; the
// doll's finding stands unchanged (this is a topology-level observation, not an API one).
//
// THE FIND (spoiler, played honestly below): 20 bug reports = 20 stories, none of them
// chosen — a lie about intention (nobody DECIDED "these are 20 things we're doing"), and
// it teaches nothing about which two matter. This is the doll BREAKING ITS OWN SHAPE, on
// purpose (charter: "the auto-story doll should show its own pathology honestly").
//
// Run: cd scher && npx vitest run charge-auto-story.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, layCharge, voltageOf, isStory, endOf, endActual, closePole, chargesOn,
  prehensionsFrom, isOccluded,
} from "../src/society.js";

function node(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}

describe("DOLL 1 — auto-story: every unattached charge mints its own resolving story", () => {
  it("Beans files a bug report with NO clear goal — a story is minted whether or not anyone chose it", () => {
    const s = new Society();
    node(s, "beans");
    // the felt need: "the export button does nothing on Safari." No goal named — Beans
    // doesn't know the fix, just the pain.
    node(s, "bug-export-safari", "export button does nothing on Safari");

    const chargeSlug = layCharge(s, "bug-export-safari", "beans", "export silently fails on Safari");

    // layCharge's FIRST NEED unpack already made this a story — nobody wrote "make this a
    // story," the mechanism did it as a side effect of marking voltage. That's the shape
    // under test: charge-implies-story, structurally, today.
    expect(isStory(s, "bug-export-safari")).toBe(true);
    const end = endOf(s, "bug-export-safari");
    expect(end).not.toBeNull();

    // voltage: one open differential (the strike itself) + one charge = 2. Read against
    // the story's own frame (SOFD default ground, voltageOf's own default parameter).
    expect(voltageOf(s, "bug-export-safari")).toBe(2);

    // the charge is a real BARE prehension onto the End (the address law's payoff — no
    // quality word to look up): Beans is its subject, findable via chargesOn(end).
    const charges = chargesOn(s, end!);
    expect(charges.map((c) => c.subject)).toEqual(["beans"]);
    expect(charges[0].slug).toBe(chargeSlug);
  });

  it("re-noticing (Marge sees it too) is MORE CHARGE on the SAME story, never a duplicate mint", () => {
    const s = new Society();
    node(s, "beans"); node(s, "marge");
    node(s, "bug-export-safari", "export button does nothing on Safari");

    layCharge(s, "bug-export-safari", "beans", "first report");
    layCharge(s, "bug-export-safari", "marge", "me too, same thing");

    // still ONE story — the F-A ruling's "re-noticing is additional charge across the
    // existing differential, not a duplicate task" holds even under auto-story: the
    // eager mint happens ONCE (unpackPoles is idempotent), not once per charge.
    expect(prehensionsFrom(s, "bug-export-safari", "q-end-pole").length).toBe(1);
    expect(voltageOf(s, "bug-export-safari")).toBe(3); // 1 (open) + 2 charges

    const end = endOf(s, "bug-export-safari")!;
    const charges = chargesOn(s, end);
    expect(charges.map((c) => c.subject).sort()).toEqual(["beans", "marge"]);
  });

  it("closing the circuit (Marge marks it done) drops voltage to zero in the story's own frame — every charge stays readable forever", () => {
    const s = new Society();
    node(s, "beans"); node(s, "marge");
    node(s, "bug-export-safari", "export button does nothing on Safari");

    layCharge(s, "bug-export-safari", "beans", "first report");
    const end = endOf(s, "bug-export-safari")!;

    expect(endActual(s, end)).toBe(false);
    expect(voltageOf(s, "bug-export-safari")).toBe(2);

    // Marge fixes it — closePole is the done-verb's kernel half today (replaces the
    // hand-laid `end ~because~ now` this doll used before the address law landed):
    closePole(s, "bug-export-safari");

    expect(endActual(s, end)).toBe(true);
    // voltage in the story's OWN frame (the default ground, closePole's own closing Now)
    // reads zero — the circuit closed exactly where it was closed:
    expect(voltageOf(s, "bug-export-safari")).toBe(0);
    // but the charge itself never un-happens — Beans's original report is still readable,
    // forever, on the closed story (append-only: nothing ever un-happens):
    const chargesAfterClose = chargesOn(s, end);
    expect(chargesAfterClose.map((c) => c.subject)).toEqual(["beans"]);
  });

  // ── THE PATHOLOGY, PLAYED HONESTLY: 20 bug reports = 20 half-formed stories ─────────
  it("BREAKS ITS OWN SHAPE: 20 unrelated charges auto-mint 20 stories nobody chose — a lie about intention", () => {
    const s = new Society();
    node(s, "beans");
    const bugs = Array.from({ length: 20 }, (_, i) => `bug-${i}`);
    for (const b of bugs) {
      node(s, b, `something felt wrong, #${b}`);
      layCharge(s, b, "beans", `report on ${b}`);
    }

    // every single one is now a Story — full pole apparatus, an End-pole minted, sitting
    // "scripted" (open) — for things nobody looked at, prioritized, or intends to do next.
    const mintedStories = bugs.filter((b) => isStory(s, b));
    expect(mintedStories.length).toBe(20);

    // the honest cost: nothing here distinguishes "Beans's pet peeve" from "the site is
    // down for everyone." Voltage on all 20 reads identically (2 each — one open strike,
    // one charge, each read in its OWN frame) because voltage counts CHARGES, not
    // consequence. A board that reads "20 open stories, equal voltage" is not wrong
    // per-edge, but it IS a lie about intention in aggregate: nobody decided these are 20
    // things the team is doing.
    const voltages = mintedStories.map((b) => voltageOf(s, b));
    expect(voltages.every((v) => v === 2)).toBe(true);

    // WHO OWNS the auto-minted story's frame under SOFD (Story's Own Frame Default,
    // Q2-ruled-for-now)? Read structurally: the q-end-pole designation's subject IS the
    // story's own frame (Q2 ink, society.ts:695) — so each bug report owns ITSELF, not
    // Beans, not the team. That is arguably right for a single report — but at 20-wide it
    // means there is no SHARED frame across the 20 to read "our current bug load" from;
    // each is an island. This is the eager-minting smell the charter asked us to look for:
    // isStory-per-charge is structurally sound (no spelling, no violation of the pole law)
    // but it mints 20 INDEPENDENT inertial frames where the team wanted one aggregate view.
    const poleFrames = mintedStories.map((b) =>
      prehensionsFrom(s, b, "q-end-pole")[0].subject);
    expect(new Set(poleFrames).size).toBe(20); // 20 distinct frames — no shared aggregate read exists

    // FINDING (not built): a "team bug board" read across these 20 would need EITHER a
    // lateral edge each auto-story lays back to a team-frame at mint time (a new relation
    // — minting one is out of scope for a doll; see committee minutes) OR a read that
    // aggregates by author (authorOf-adjacent) rather than by frame. Named gap, not built
    // here — HARD BOUNDARY: no src/ edits from this committee. See the it.todo below.
    // (NOTE: overload(soc, ground) — landed live in this sitting — reads voltage summed
    // across ALL stories against ONE ground, which is closer to this need than anything
    // that existed when this doll was first written; see the capacitor doll's discussion
    // of it. It still answers "total pressure on a lineage," not "which of these 20 are
    // the SAME team's board" — the gap named above survives even with overload present.)
  });

  it.todo(
    "aggregate 'team bug board' read across auto-minted stories, distinct from overload's total-" +
    "pressure-on-a-lineage — no such grouping read exists yet; needs either a lateral team-frame " +
    "edge laid at mint time, or an author-aggregating read (authorOf-adjacent). Minuted " +
    "(charge-routing-dolls, DOLL 1), not built — src/ is out of bounds here.",
  );

  it("reopening/merging duplicates: two auto-stories for the SAME underlying bug (Beans files it twice, worded differently)", () => {
    const s = new Society();
    node(s, "beans");
    node(s, "bug-safari-a", "safari export broken");
    node(s, "bug-safari-b", "export button dead in safari"); // same bug, Beans forgot he'd filed it

    layCharge(s, "bug-safari-a", "beans", "first phrasing");
    layCharge(s, "bug-safari-b", "beans", "second phrasing, same bug");

    // auto-story has ALREADY minted two full stories before anyone notices they're the
    // same thing. There is no dedup at charge-time — the shape has no read that would
    // catch this (a duplicate check would require semantic matching on content, which is
    // exactly the "no string-matching" discipline this repo refuses to do on slugs, and
    // rightly refuses to smuggle in on CONTENT either). Merging after the fact means: an
    // event occludes one story's End-pole prehension in favor of the other's — the
    // q-occludes machinery already used by succession-war.play.test.ts, played here on
    // pole-designations instead of version-tips:
    const dupEnd = prehensionsFrom(s, "bug-safari-b", "q-end-pole")[0];
    node(s, "marge");
    s.layP("marge-merges-dup", "duplicate of bug-safari-a — merging", "marge", dupEnd.slug, "q-occludes");

    expect(isOccluded(s, dupEnd.slug)).toBe(true);
    // bug-safari-b's pole is occluded, but bug-safari-b itself is STILL a story (isStory
    // just checks any q-end-pole edge exists — it.todo below names the socratic question
    // society.ts itself already carries at line 579: should isStory also check
    // occlusion? Un-answered upstream; we surface it here because merging duplicates is
    // exactly the case where the answer matters.)
    expect(isStory(s, "bug-safari-b")).toBe(true); // unaffected by the occlusion — a live question
  });

  it.todo(
    "does a merged-away duplicate story still read isStory === true forever, or should isStory " +
    "check occlusion of its q-end-pole designation? society.ts:579's own open socratic question, " +
    "surfaced concretely by the merge-duplicates scenario above. Not answered here — src/ out of bounds.",
  );
});
