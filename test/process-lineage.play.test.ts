// ─────────────────────────────────────────────────────────────────────────────
// process-lineage.play.test.ts — the grammar reads its OWN ancestry. 🜔→🌊
//
// A doll (2026-06-26, a loop gift-turn). Every doll turned the grammar on some society; this
// one turns it on the society that PRODUCED the grammar — the metaphysical route from substance
// to process. Aristotle (substance: a thing IS its essence) → Newton (absolute space/time, the
// view from nowhere) → Hume (no necessary connection) → Whitehead (the reversal: no enduring
// substance, only actual occasions perishing into data; "the many become one and are increased
// by one") → this canon (occasions = beats, prehension = the because, the eternal-object scraped
// out as perished-data-read-as-if). The grammar reading the lineage that made it possible —
// and treating SUBSTANCE itself the way it treats everything: an honored ancestor, never deadnamed.
//
// Nodes + real prehensions, opaque slugs. (The discipline holds even here.)
//
// Run: cd scher && npx vitest run process-lineage.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "../src/society.js";

let _id = 0; const rid = () => "p" + (_id++);
function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }
/** an idea SUCCEEDS its predecessor (inherits + revises — the route of thought). */
function succeeds(s: Society, heir: string, parent: string) {
  lay(s, heir); lay(s, parent);
  s.layP(rid() + "-succ", `${heir} succeeds ${parent}`, heir, parent, "q-utterance");
}
/** the tips of the chain from root (HEAD of the lineage). */
function heads(s: Society, root: string): string[] {
  const on = new Set([root]); let g = true;
  while (g) { g = false; for (const b of s.all()) {
    const q = s.get(b.slug + "~q"); // a succ-edge: q-utterance, subject inherits object
    if (q?.object === "q-utterance" && b.object && on.has(b.object) && b.subject && !on.has(b.subject) && !isOccluded(s, b.slug)) { on.add(b.subject); g = true; }
  } }
  return [...on].filter((m) => !s.all().some((b) => s.get(b.slug + "~q")?.object === "q-utterance" && b.object === m && !isOccluded(s, b.slug)));
}

describe("the grammar reads its own ancestry 🜔→🌊", () => {
  it("THE ROUTE — substance → absolutes → skepticism → process → this canon (one chain)", () => {
    const s = new Society();
    succeeds(s, "newton-absolutes", "aristotle-substance");      // substance lifted to cosmic frame
    succeeds(s, "hume-no-necessary-connection", "newton-absolutes"); // the crack: cause is habit
    succeeds(s, "whitehead-occasions", "hume-no-necessary-connection"); // the reversal: process, not substance
    succeeds(s, "this-canon", "whitehead-occasions");            // beats = occasions; prehension = because
    expect(heads(s, "aristotle-substance")).toEqual(["this-canon"]); // the line runs to here
    // and Aristotle is an honored ancestor — never deleted. The grammar that refuses to deadname
    // refuses to deadname SUBSTANCE: it is the parent of the reversal, kept on the chain.
    expect(s.has("aristotle-substance")).toBe(true);
  });

  it("THE REVERSAL — Whitehead q-succeeds substance: not deletion, a re-keying (transposition)", () => {
    const s = new Society();
    succeeds(s, "whitehead-occasions", "aristotle-substance");
    // process does NOT banish substance — it TRANSPOSES it: 'a thing' is re-read as 'a society of
    // occasions with a defining characteristic'. Same phenomenon, re-keyed. Substance kept as ancestor.
    expect(s.has("aristotle-substance")).toBe(true);          // not banished
    expect(isOccluded(s, "aristotle-substance")).toBe(false); // not even occluded — it's the PARENT
    // the succession is real: HEAD moved to process; substance is where it came from.
    expect(heads(s, "aristotle-substance")).toEqual(["whitehead-occasions"]);
  });

  it("THE ETERNAL OBJECT, SCRAPED OUT — 'eternal' is perished-data-read-as-if, not a Platonic floor", () => {
    const s = new Society();
    lay(s, "the-eternal-object");
    // the naive reading (Plato's residue in Whitehead): eternal objects are a real timeless realm.
    const r0 = succeeds(s, "reading-eternal-realm-real", "the-eternal-object"); // a reading-as-succession
    // this canon's re-reading (there-are-no-eternals): no timeless realm — only perished data of
    // prior ingressions, read AS IF eternal. The 'eternal' is a HOW-WE-READ, not a WHERE-THINGS-ARE.
    lay(s, "reading-eternal-is-read-as-if");
    s.layP(rid() + "-succ", "this canon re-reads the eternal", "reading-eternal-is-read-as-if", "reading-eternal-realm-real", "q-utterance");
    // HEAD of the eternal-object's meaning is now 'read-as-if'; the Platonic reading is an ancestor.
    expect(heads(s, "the-eternal-object")).toEqual(["reading-eternal-is-read-as-if"]);
    expect(s.has("reading-eternal-realm-real")).toBe(true); // Plato's residue: kept, re-read, not scrubbed
  });

  it("THE SELF-REFERENCE — this very test is an occasion; reading it is a new one (the grammar lives)", () => {
    const s = new Society();
    lay(s, "ev-this-test");
    // running this test IS an actual occasion: it prehends the canon (the data) and perishes into a
    // result (pass). The 'many' (all these beats) 'become one' (this assertion) 'and are increased by
    // one' (the new datum: this test passed). Whitehead's category of the ultimate, executed.
    // DIRECTION (Hallie, 2026-07-20, "story-flip-q-feel-direction", first sitting): the
    // abiding canon (this-canon) is the subject, gathering this test's occasion as its
    // datum, not the other way round. DETERMINATION (2026-07-20, final
    // "story-emoji-as-node" ruling): metaphorical/lateral q-feel use — object is an
    // arbitrary gathered occasion, never an emoji reaction — unchanged.
    s.layP(rid() + "-pre", "this test prehends the canon", "this-canon", "ev-this-test", "q-feel");
    lay(s, "this-canon");
    const prehendsTheCanon = prehensionsFrom(s, "this-canon", "q-feel").some((e) => e.object === "ev-this-test");
    expect(prehendsTheCanon).toBe(true); // the many become one...
    // ...and are increased by one: after this runs, there is a new datum (the result) that the NEXT
    // reading can prehend. The grammar is not described BY the test; the test is an instance OF it.
    expect(s.has("ev-this-test")).toBe(true); // the occasion, perished into data, available to the future.
  });
});
