// MUSLIN test — the read-trail claim, COUNTED not asserted.
// Companion to MUSLIN-one-file-card.ts. Torn prototype; not a lib contract.
import { describe, it, expect } from "vitest";
import { Society } from "../src/society.js";
import { prehensionsOnto, isOccluded } from "../src/society.js";
import {
  TitleCard, NeighborCard, CensusCard,
  mountOneFile, walkWithTrail, scopeStyle, assertTrailCoversSociety,
} from "./MUSLIN-one-file-card.js";

const beat = (slug: string, content: string) => ({ slug, subject: null, object: null, content, witnessed: 0 });
const edge = (slug: string, subject: string, object: string) =>
  ({ slug, subject, object, content: "e", witnessed: 0 });

function seeded(): Society {
  return new Society([
    beat("alpha", "Alpha the first"),
    beat("beta", "Beta the second"),
  ]);
}

describe("MUSLIN: the read-trail", () => {
  it("records exactly the slugs a walk touched", () => {
    const soc = seeded();
    const { trail } = walkWithTrail(soc, (s) => s.get("alpha"));
    expect([...trail.slugs]).toEqual(["alpha"]);
    expect(trail.readWholeSociety).toBe(false);
  });

  it("catches slugs read deep inside a society helper the walk never names", () => {
    // The walk calls prehensionsOnto; it never calls get()/edgesOntoObject itself.
    // If the trail sees "alpha" here, the lens is catching reads through the
    // library's own helpers — which is the whole granularity claim.
    const soc = seeded();
    soc.lay(edge("e1", "beta", "alpha"));
    soc.lay(beat("e1~q", "q-grounding"));
    const { trail } = walkWithTrail(soc, (s) => prehensionsOnto(s, "alpha", "q-grounding"));
    expect(trail.slugs.has("alpha")).toBe(true);
    expect(trail.slugs.has("e1")).toBe(true); // via the ~q strip
  });

  it("a deeper walk (isOccluded) still lands its reads in the trail", () => {
    const soc = seeded();
    const { trail } = walkWithTrail(soc, (s) => isOccluded(s, "alpha"));
    expect(trail.slugs.has("alpha")).toBe(true);
  });

  it("flags a whole-society read instead of pretending to be granular", () => {
    const soc = seeded();
    const { trail } = walkWithTrail(soc, (s) => s.all().length);
    expect(trail.readWholeSociety).toBe(true);
  });

  it("TRIPWIRE: society.ts growing an untrailed read fails loudly", () => {
    // Today this passes. The day someone adds a read method to Society and does
    // not teach the lens, this test goes red instead of a card silently freezing.
    expect(() => assertTrailCoversSociety()).not.toThrow();
  });
});

describe("MUSLIN: per-slug repaint — counted, not asserted", () => {
  it("repaints ONLY the card whose trail contains the changed slug", () => {
    const soc = seeded();
    const a = mountOneFile(TitleCard, soc, { slug: "alpha" });
    const b = mountOneFile(NeighborCard, soc, { slug: "beta" });
    expect(a.renders).toBe(1);
    expect(b.renders).toBe(1);

    // lay an edge ONTO alpha. Under today's global `rev`, BOTH cards would repaint.
    soc.lay(edge("e2", "beta", "alpha"));
    soc.lay(beat("e2~q", "q-grounding"));

    const aPainted = a.repaintIfTouched("alpha", soc, { slug: "alpha" });
    const bPainted = b.repaintIfTouched("alpha", soc, { slug: "beta" });

    expect(aPainted).toBe(true);
    expect(bPainted).toBe(false);
    expect(a.renders).toBe(2);
    expect(b.renders).toBe(1); // THE PROOF: the neighbor never re-ran its walk.
  });

  it("the count actually changes on the card that repainted", () => {
    const soc = seeded();
    const a = mountOneFile(TitleCard, soc, { slug: "alpha" });
    expect(a.html).toContain("0 edges point here");
    soc.lay(edge("e3", "beta", "alpha"));
    soc.lay(beat("e3~q", "q-grounding"));
    a.repaintIfTouched("alpha", soc, { slug: "alpha" });
    expect(a.html).toContain("1 edges point here");
  });

  it("a whole-society card repaints on ANY slug — honest, not granular", () => {
    const soc = seeded();
    const c = mountOneFile(CensusCard, soc, {});
    expect(c.repaintIfTouched("anything-at-all", soc, {})).toBe(true);
    expect(c.renders).toBe(2);
  });

  it("N cards, one lay: renders scale with DEPENDENCY, not with card count", () => {
    // The headline number. 20 cards, each reading its own slug; lay onto one.
    const rows = Array.from({ length: 20 }, (_, i) => beat(`n${i}`, `beat ${i}`));
    const soc = new Society(rows);
    const cards = rows.map((r) => mountOneFile(TitleCard, soc, { slug: r.slug }));
    const before = cards.reduce((n, c) => n + c.renders, 0);
    expect(before).toBe(20);

    soc.lay(edge("hit", "n0", "n7"));
    soc.lay(beat("hit~q", "q-grounding"));
    for (const [i, c] of cards.entries()) c.repaintIfTouched("n7", soc, { slug: `n${i}` });

    const after = cards.reduce((n, c) => n + c.renders, 0);
    expect(after).toBe(21); // 20 + exactly ONE repaint. Global rev would give 40.
  });
});

describe("MUSLIN: the single file", () => {
  it("scopes style to the card so a rule cannot leak", () => {
    const css = scopeStyle("muslin-title", ".title { color: red; }");
    expect(css).toContain('[data-card="muslin-title"] .title');
  });

  it("REFUSES @media loudly rather than scoping it wrong", () => {
    expect(() => scopeStyle("x", "@media (min-width: 5px) { .a { color: red } }"))
      .toThrow(/@media/);
  });

  it("renders holes as escaped text, never as markup", () => {
    const soc = new Society([beat("evil", "<script>alert(1)</script>")]);
    const c = mountOneFile(TitleCard, soc, { slug: "evil" });
    expect(c.html).not.toContain("<script>");
    expect(c.html).toContain("&lt;script&gt;");
  });

  it("an unfilled hole renders blank, never the word undefined", () => {
    const soc = seeded();
    const c = mountOneFile(
      { name: "t", style: "", walk: () => ({}), markup: "<p>{missing}</p>" },
      soc, {},
    );
    expect(c.html).toBe("<p></p>");
  });
});
