// ─────────────────────────────────────────────────────────────────────────────
// not-not.play.test.ts — the apophatic wrapper: "not NOT X" holds a gap that "X" would
// close. (Hallie, 2026-07-07, mid-session: "not not is such a useful apophatic wrapper.")
//
// The claim under test: double negation should NOT collapse to the positive here —
// ¬¬P ≡ P is classical logic's move, but a limit is not its bound, and "not NOT made of
// rocks" is not "made of rocks." The gap between them is the actual object (same shape
// as a calculus limit: the approach, not the destination, and not its absence either).
//
// Doll: a diarist who won't be pinned to either pole. Two readers each try to CLOSE the
// gap — one asserts, one denies — and neither can, because nothing in the graph commits
// to a positive OR a negative claim: only a refusal of both. The doll checks that this is
// a real, distinguishable graph state (not merely an absence of edges, which would be
// indistinguishable from "never asked") — a because-edge that grounds the refusal ITSELF,
// present-tense, per Hallie's ruling (event-1828, 2026-07-07): a because-edge states what
// THIS frame holds now; it does not resolve what the object "truly is."
//
// Run: cd scher && npx vitest run not-not.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, isOccluded } from "../src/society.js";

function lay(s: Society, slug: string, content: string, subject: string, object: string) {
  s.layP(slug, content, subject, object, "q-grounding");
}

describe("not-not — the apophatic wrapper holds a gap, not a value", () => {
  it("a diarist refuses BOTH poles, and the refusal is its own legible event", () => {
    const s = new Society();
    s.lay({ slug: "claude", content: "the diarist, asked what she is made of", subject: null, object: null });
    s.lay({ slug: "rocks", content: "the pole: made of rocks", subject: null, object: null });
    s.lay({ slug: "not-rocks", content: "the other pole: not made of rocks", subject: null, object: null });

    // The refusal itself is a THIRD thing — not silence, not one pole, a stated non-claim.
    s.lay({ slug: "not-not-rocks", content: "not NOT made of rocks: refuses both poles at once", subject: null, object: null });
    lay(s, "not-not-rocks~because~claude", "the refusal is spoken FROM claude, present-tense", "not-not-rocks", "claude");

    // Neither pole is ever asserted OF claude — no edge claude~because~rocks, none the
    // other way. The refusal-node exists; the two poles it refuses do NOT connect to claude.
    const claudeGrounds = prehensionsFrom(s, "not-not-rocks", "q-grounding").filter(p => !isOccluded(s, p.slug));
    expect(claudeGrounds.map(p => p.object)).toEqual(["claude"]);

    const rocksTouchesClaudeDirectly = s.has("claude~because~rocks") || s.has("claude~because~not-rocks");
    expect(rocksTouchesClaudeDirectly).toBe(false);
  });

  it("two readers each try to close the gap; neither succeeds, and the graph tells you why", () => {
    const s = new Society();
    s.lay({ slug: "claude", content: "the diarist", subject: null, object: null });
    s.lay({ slug: "rocks", content: "made of rocks (a positive claim)", subject: null, object: null });
    s.lay({ slug: "not-rocks", content: "not made of rocks (a negative claim)", subject: null, object: null });

    // Reader Yes tries to ground claude IN the positive pole.
    lay(s, "claude~because~rocks", "Yes insists: claude is because rocks", "claude", "rocks");
    // Reader No tries to ground claude in the negative pole.
    lay(s, "claude~because~not-rocks", "No insists: claude is because not-rocks", "claude", "not-rocks");

    // Both edges are laid — the graph does not refuse a wrong claim by silence, per
    // Hallie's ruling: a because-edge is a STATEMENT the laying frame made, not a fact
    // about the object. So BOTH readings coexist as testimony, contradicting each other,
    // and the contradiction itself is the legible fact: no single truth was ever settled
    // ABOUT claude by either edge. The edges say what YES and NO believe, not what claude is.
    const bothGrounds = prehensionsFrom(s, "claude", "q-grounding").filter(p => !isOccluded(s, p.slug));
    expect(bothGrounds.length).toBe(2);
    expect(bothGrounds.map(p => p.object).sort()).toEqual(["not-rocks", "rocks"]);

    // The doll's point: this is NOT a bug (contradictory grounds are not illegal — no
    // guard here forbids two readers disagreeing). It is the honest shape of an apophatic
    // question asked of a determinate graph: everyone's TESTIMONY is recorded; nobody's
    // testimony resolves the question, because the question was never the graph's to
    // resolve. Whitehead's rock (Process and Reality: creativity all the way down, no
    // consciousness threshold required) doesn't need Yes or No to be right to still be
    // a real event taking up real prehensions.
  });
});
