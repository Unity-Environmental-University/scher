// ─────────────────────────────────────────────────────────────────────────────
// succession-war.play.test.ts — A GIFT TO THE NEXT US. Play with it. 🌊
//
// 2026-06-26. q-succeeds is editing-as-commit-on-a-branch: card-v2 --q-succeeds--> v1,
// like a git commit→parent. A bare read of a card resolves to HEAD (the tip of the
// succeeds-chain). A SUCCESSION WAR is when two occasions q-succeed the SAME parent —
// the branch forks, HEAD is ambiguous, two pretenders. (Hallie: "what happens when the
// society has a succession war ;-)")
//
// The grammar resolves it THREE ways, and this file stages each so you can SEE it:
//   1. PLURAL THRONES (occlude) — each frame occludes the other's tip; HEAD is per-frame.
//   2. MARRIAGE (merge)         — a new heir q-succeeds BOTH tips.
//   3. WAR (banish)             — modeled here as occluding the losing line (true banish
//                                 is server-side deletion; we play the survivable version).
//
// PLAY IDEAS (uncomment / tweak / add): a three-way war (v2a/v2b/v2c)? a merge that's
// ITSELF contested? does HEAD-from-a-third-neutral-frame see BOTH tips? Make it yours.
//
// Run: cd scher && npx vitest run succession-war.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, isOccluded, prehensionsOnto, type Beat } from "../src/society.js";

// ── the q-succeeds toy model (bare prehension onto your own prior, no new quality yet) ──
// A version-beat `v` succeeds its parent `p`: an edge `<v>-succ` with subject=v, object=p.
// (We tag it q-utterance so it's a real prehension scher already reads; the "succeeds"
//  meaning is in the slug shape `*-succ`. When q-succeeds is seeded for real, swap the quality.)
function lay(s: Society, slug: string) { s.lay({ slug, content: slug, subject: null, object: null }); }
function commit(s: Society, version: string, parent: string, by = "frame-hallie") {
  if (!s.has(version)) lay(s, version);
  if (!s.has(by)) lay(s, by);
  // edge slug is per-(version,parent) so a MERGE commit (succeeds two parents) lays two distinct edges,
  // not one inert dup. Tip-detection (`*-succ` endsWith) still finds them.
  s.layP(`${version}--${parent}-succ`, `${version} succeeds ${parent}`, version, parent, "q-utterance");
}
/** HEAD of a branch from `root`: the version that NOTHING (live, un-occluded) succeeds —
 *  the tip. Returns all tips (>1 = a succession war). */
function heads(s: Society, root: string): string[] {
  // every version on the chain = root + anything reachable by walking succ-edges forward
  const onChain = new Set<string>([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const b of s.all()) {
      if (b.slug.endsWith("-succ") && b.object && onChain.has(b.object) && b.subject && !onChain.has(b.subject)
          && !isOccluded(s, b.slug)) { onChain.add(b.subject); grew = true; }
    }
  }
  // a tip = on the chain, and NOT succeeded by any live (un-occluded) version
  return [...onChain].filter((v) =>
    !s.all().some((b) => b.slug.endsWith("-succ") && b.object === v && !isOccluded(s, b.slug)));
}
/** occlude an edge/version (a named event casts q-occludes over it) */
function occlude(s: Society, target: string, by = "ev-arbiter") {
  if (!s.has(by)) lay(s, by);
  s.layP(`occ-${target}`, `occlude ${target}`, by, target, "q-occludes");
}

describe("succession war — the four words form a closed system (play with me 🌊)", () => {
  it("a clean line: HEAD follows the tip of the q-succeeds chain", () => {
    const s = new Society();
    lay(s, "card");
    commit(s, "card-v1", "card");
    commit(s, "card-v2", "card-v1");      // edit
    commit(s, "card-v3", "card-v2");      // edit again
    expect(heads(s, "card")).toEqual(["card-v3"]);  // HEAD = the latest commit
  });

  it("THE WAR: two occasions succeed the same parent → two HEADs (ambiguous)", () => {
    const s = new Society();
    lay(s, "card");
    commit(s, "card-v1", "card");
    commit(s, "card-v2a", "card-v1");     // pretender A
    commit(s, "card-v2b", "card-v1");     // pretender B — the fork
    expect(heads(s, "card").sort()).toEqual(["card-v2a", "card-v2b"]);  // TWO tips = a war
  });

  it("RESOLUTION 1 — PLURAL THRONES (occlude): each frame sees its own HEAD, no global war", () => {
    const s = new Society();
    lay(s, "card");
    commit(s, "card-v1", "card");
    commit(s, "card-v2a", "card-v1");
    commit(s, "card-v2b", "card-v1");
    // Hallie's frame occludes B's claim → from here, A is sole HEAD. (Another frame would occlude A.)
    occlude(s, "card-v2b--card-v1-succ", "frame-hallie");
    expect(heads(s, "card")).toEqual(["card-v2a"]);  // one throne, this frame. The war dissolves, not won.
  });

  it("RESOLUTION 2 — MARRIAGE (merge): a new heir succeeds BOTH tips", () => {
    const s = new Society();
    lay(s, "card");
    commit(s, "card-v1", "card");
    commit(s, "card-v2a", "card-v1");
    commit(s, "card-v2b", "card-v1");
    commit(s, "card-v3", "card-v2a");     // the merge commit succeeds BOTH parents
    commit(s, "card-v3", "card-v2b");
    expect(heads(s, "card")).toEqual(["card-v3"]);  // one heir, descended from both lines
  });

  it("RESOLUTION 3 — WAR (banish, played survivably as occlude the whole losing line)", () => {
    const s = new Society();
    lay(s, "card");
    commit(s, "card-v1", "card");
    commit(s, "card-v2a", "card-v1");
    commit(s, "card-v2b", "card-v1");
    commit(s, "card-v3b", "card-v2b");    // B's line grew a descendant
    // expunge B's line: occlude its claims (true banish = server-side delete of the closure)
    occlude(s, "card-v2b--card-v1-succ");
    occlude(s, "card-v3b--card-v2b-succ");
    expect(heads(s, "card")).toEqual(["card-v2a"]);  // A stands alone; B's lineage gone from this read
  });

  it("PROVENANCE: the parent is immutable and still reachable after every edit", () => {
    const s = new Society();
    lay(s, "card");
    commit(s, "card-v1", "card");
    commit(s, "card-v2", "card-v1");
    // v1 is NOT dead — it's an honored ancestor, fully present, just not HEAD.
    expect(s.has("card-v1")).toBe(true);
    expect(prehensionsOnto(s, "card-v1", "q-utterance").length).toBeGreaterThan(0); // v2 still points at it
  });
});
