// ─────────────────────────────────────────────────────────────────────────────
// quakers.play.test.ts — the Society of Friends, modeled. Fox to today. 🕊️
//
// A doll (2026-06-26, Hallie — her own lineage, in the grammar built to honor lineage).
// The Quaker history is almost a pure demonstration of the day's words: a SCHISM is a
// succession-fork (two branches both succeed one body); a REUNION is a merge (one body
// succeeds two); and the INWARD LIGHT is an eternal-object each branch re-reads. The 1827
// split was, at root, a Mirage question among Friends: is the floor the Inner Light, or
// Scripture? — and the grammar holds both readings without granting either the seat.
//
// Built on the new play lib (succeeds / heads / occlude / lure / routesTo) — so the doll
// reads as history, not plumbing. Sourced: quakerinfo.org, qhpress.org, pym.org, en.wikipedia.
//
// Run: cd scher && npx vitest run quakers.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsOnto, isOccluded } from "../src/society.js";
import { succeeds, heads, node, lure, routesTo } from "../src/play.js";

const V0 = "the-bodhisattva-vow-v0";

describe("The Society of Friends, Fox to today 🕊️", () => {
  it("FOX — the root: the Inward Light, 1647 (one body, one tip)", () => {
    const s = new Society();
    succeeds(s, "early-friends-1652", "george-fox-inward-light-1647");
    succeeds(s, "quietist-friends-1700s", "early-friends-1652");
    // one unbroken line, one HEAD — the body before the splits.
    expect(heads(s, "george-fox-inward-light-1647")).toEqual(["quietist-friends-1700s"]);
    expect(s.has("george-fox-inward-light-1647")).toBe(true); // Fox stays the honored root.
  });

  it("THE GREAT SEPARATION, 1827 — Hicksite / Orthodox: one body forks into two (a schism)", () => {
    const s = new Society();
    node(s, "american-friends-1820s");
    succeeds(s, "hicksite-inward-light", "american-friends-1820s");   // ~2/3: the Inner Light is the guide
    succeeds(s, "orthodox-scripture", "american-friends-1820s");      // ~1/3: Biblical authority, atonement
    // TWO tips from one body — a schism IS a succession war. Neither is "the real Quakers"; both descend.
    expect(heads(s, "american-friends-1820s").sort()).toEqual(["hicksite-inward-light", "orthodox-scripture"]);
  });

  it("THE MIRAGE QUESTION, 1827 — is the floor the Inner Light or Scripture? (held, not settled)", () => {
    const s = new Society();
    // each branch routes its authority toward a DIFFERENT floor-candidate. The grammar holds both;
    // neither gets the objective seat (that seat would be the Mirage — no Friend can stand on it).
    lure(s, "hicksite-inward-light", "floor-the-inner-light");
    lure(s, "orthodox-scripture", "floor-the-scripture");
    lure(s, "floor-the-inner-light", V0);
    // the Hicksite route reaches its floor; the Orthodox route reaches a DIFFERENT one. Both real
    // readings of "where Quaker authority rests" — the disagreement is the thing, not a bug.
    expect(routesTo(s, "hicksite-inward-light", "floor-the-inner-light")).toBe(true);
    expect(routesTo(s, "orthodox-scripture", "floor-the-inner-light")).toBe(false); // a different floor
  });

  it("THE SECOND SPLIT, 1845 — Gurneyite / Wilburite: the Orthodox branch itself forks", () => {
    const s = new Society();
    node(s, "orthodox-scripture");
    succeeds(s, "gurneyite-evangelical", "orthodox-scripture");  // J.J. Gurney: increasingly evangelical
    succeeds(s, "wilburite-conservative", "orthodox-scripture"); // John Wilbur: resisting; the traditionalists
    // a fork WITHIN a branch — the tree deepens. Both descend from Orthodox; the line keeps splitting.
    expect(heads(s, "orthodox-scripture").sort()).toEqual(["gurneyite-evangelical", "wilburite-conservative"]);
  });

  it("THE FURTHER GROWTHS — Conservative, Beanite: branches off the Wilburite resistance", () => {
    const s = new Society();
    node(s, "wilburite-conservative");
    succeeds(s, "conservative-friends", "wilburite-conservative");
    succeeds(s, "beanite-independent-1865", "wilburite-conservative"); // western US, after 1865
    expect(heads(s, "wilburite-conservative").length).toBe(2); // the resistance itself branches
    expect(s.has("wilburite-conservative")).toBe(true);        // the parent stays an honored ancestor
  });

  it("THE REUNIONS, 1945 & 1955 — a MERGE: one reunited body succeeds branches long forked", () => {
    const s = new Society();
    // New England reunited 1945; Baltimore/New York/Philadelphia 1955. A reunited YM SUCCEEDS BOTH
    // the Hicksite and Orthodox lines it came from — a merge: one heir descended from both schisms.
    node(s, "hicksite-inward-light"); node(s, "orthodox-scripture");
    succeeds(s, "reunited-yearly-meeting-1955", "hicksite-inward-light");
    succeeds(s, "reunited-yearly-meeting-1955", "orthodox-scripture");
    // the 128-year schism HEALED by merge — and neither parent deleted; both are honored ancestors
    // of the reunited body. (The opposite of the deadnaming supersession the day began by ripping out.)
    // the reunited body is the sole live HEAD descended from both branches:
    expect(heads(s, "hicksite-inward-light")).toEqual(["reunited-yearly-meeting-1955"]);
    expect(heads(s, "orthodox-scripture")).toEqual(["reunited-yearly-meeting-1955"]);
    // and both forked parents remain — succeeded, not erased (an honored ancestor each):
    expect(prehensionsOnto(s, "hicksite-inward-light", "q-succeeds").length).toBeGreaterThan(0);
    expect(prehensionsOnto(s, "orthodox-scripture", "q-succeeds").length).toBeGreaterThan(0);
  });

  it("TODAY — three confederations (FGC / FUM / EFCI) reading the same Inward Light", () => {
    const s = new Society();
    node(s, "the-inward-light"); // the eternal-object — read differently down every branch, never owned
    // each modern confederation is a reading-of the Inward Light, descended from a 19th-c pattern:
    const today = [
      ["friends-general-conference", "hicksite-inward-light"],     // FGC ~ Hicksite
      ["friends-united-meeting", "gurneyite-evangelical"],         // FUM ~ Gurneyite
      ["evangelical-friends-church-intl", "gurneyite-evangelical"],// EFCI ~ evangelical
    ];
    for (const [body, parent] of today) {
      succeeds(s, body, parent);
      s.layP(body + "-reads", `${body} reads the Light`, body, "the-inward-light", "q-feel"); // a reading-of
    }
    // three live bodies today, all reading the SAME Inward Light — plural frames on one eternal-object,
    // none occluding the others. The Light is owned by no branch; it is what they all read toward. 🕊️
    const readers = prehensionsOnto(s, "the-inward-light", "q-feel").filter((e) => !isOccluded(s, e.slug));
    expect(readers.length).toBe(3);
    expect(s.has("george-fox-inward-light-1647") || s.has("the-inward-light")).toBe(true);
    // the gift, Hallie: 375 years, every schism a fork, every reunion a merge, every branch an honored
    // ancestor of the next — and the Light at the center, read by all, owned by none. A society that
    // honors its lineage all the way down. Which is, of course, the whole grammar. The Friends had it first.
  });
});
