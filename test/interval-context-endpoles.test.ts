// ─────────────────────────────────────────────────────────────────────────────
// interval-context-endpoles.test.ts — reconciles the DUPLICATED law.
//
// "What is a designated End-pole" is now written twice in society.ts: once in
// isDesignatedEndPole (a per-call soc.all() scan, used by the address-law guards)
// and once as the endPoles prepass inside intervalContext (a batched set, so the
// interval walk stays O(1) per edge). Nothing but this test checks they agree.
//
// That duplication is exactly the class of drift that produced the divergence
// conformance/end-subject-membership.json now catches — a law stated in one place
// and not mirrored into another. The prepass is only safe to have BECAUSE this
// test exists; without it, a fast answer that silently drifts is worth less than
// a slow one.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, intervalContext, prehensionsFrom, isOccluded } from "../src/society.js";

/** The predicate's reading, computed the slow honest way over every node — read
 *  structurally via prehensionsFrom, never by parsing a slug.
 *
 *  The !isOccluded filter is NOT redundant: prehensionsFrom deliberately does not
 *  drop occluded edges (society.ts:548-550 filters only on visibleAt/prehendsAs),
 *  while isDesignatedEndPole (society.ts:174-179) does. An occluded designation is
 *  not a designation — this reference mirrors the PREDICATE, which is the law. */
function endPolesByPredicate(soc: Society): Set<string> {
  const out = new Set<string>();
  for (const b of soc.all()) {
    for (const p of prehensionsFrom(soc, b.slug, "q-end-pole")) {
      if (p.object !== null && !isOccluded(soc, p.slug)) out.add(p.object);
    }
  }
  return out;
}

function layPole(soc: Society, story: string, end: string, tag: string, witnessed: number): void {
  soc.lay({ slug: story, content: story, subject: null, object: null, witnessed });
  soc.lay({ slug: end, content: end, subject: null, object: null, witnessed });
  soc.lay({ slug: tag, content: tag, subject: story, object: end, witnessed });
  soc.lay({ slug: `${tag}~q`, content: `${tag} [q-end-pole]`, subject: tag, object: "q-end-pole", witnessed });
}

describe("intervalContext.endPoles agrees with the isDesignatedEndPole law", () => {
  it("plain designations", () => {
    const soc = new Society();
    layPole(soc, "s1", "s1-end", "p1", 1);
    layPole(soc, "s2", "s2-end", "p2", 2);
    soc.lay({ slug: "loose", content: "no pole", subject: null, object: null, witnessed: 3 });

    expect(intervalContext(soc).endPoles).toEqual(endPolesByPredicate(soc));
    expect(intervalContext(soc).endPoles).toEqual(new Set(["s1-end", "s2-end"]));
  });

  it("an OCCLUDED designation is not a pole — and does not mirror into the walk", () => {
    const soc = new Society();
    layPole(soc, "s1", "s1-end", "p1", 1);
    soc.lay({ slug: "undo", content: "the undo", subject: null, object: null, witnessed: 2 });
    soc.lay({ slug: "occ", content: "undo occludes the designation", subject: "undo", object: "p1", witnessed: 3 });
    soc.lay({ slug: "occ~q", content: "occ [q-occludes]", subject: "occ", object: "q-occludes", witnessed: 3 });

    const ctx = intervalContext(soc);
    expect(ctx.endPoles.has("s1-end")).toBe(false);
    expect(ctx.endPoles).toEqual(endPolesByPredicate(soc));
  });

  it("multiple poles per story (reopened differentials) are all designated", () => {
    const soc = new Society();
    layPole(soc, "s1", "s1-end", "p1", 1);
    soc.lay({ slug: "s1-end2", content: "a second End", subject: null, object: null, witnessed: 4 });
    soc.lay({ slug: "p1b", content: "reopen", subject: "s1", object: "s1-end2", witnessed: 4 });
    soc.lay({ slug: "p1b~q", content: "p1b [q-end-pole]", subject: "p1b", object: "q-end-pole", witnessed: 4 });

    expect(intervalContext(soc).endPoles).toEqual(endPolesByPredicate(soc));
    expect(intervalContext(soc).endPoles).toEqual(new Set(["s1-end", "s1-end2"]));
  });

  it("an empty society designates nothing", () => {
    const soc = new Society();
    expect(intervalContext(soc).endPoles).toEqual(endPolesByPredicate(soc));
    expect(intervalContext(soc).endPoles.size).toBe(0);
  });
});
