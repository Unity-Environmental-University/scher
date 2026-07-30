import { describe, it, expect } from "vitest";
import { type BoardSpec } from "../src/match3.js";
import {
  ROCKET_DAN, SEARCHER_GREG, GENERALIST_MAB, MOON_MOTH,
  FLY_ME_TO_THE_MOON, affinityOf, pGem, edgeOn, drawFor, distribution,
  playerAt, pCompletes, stanceBetween, regard, nearRunValue, teamValue,
  bestConverter, chargesOf, cooldownProgress, canPlay, emptyRecord, winners, mostOf, starIn,
  COMPETITIVE, COOPERATIVE, COOPETITIVE, type Match, type MatchRecord,
} from "../src/match3-players.js";

const SPEC: BoardSpec = { id: "b", w: 8, h: 8, kinds: 6, seed: 42 };
const K = 6, ROCKET = 4, MOON = 3, GLASS = 2;

describe("affinity is READ from stars, not authored", () => {
  it("a star tilts the gem it is told in", () => {
    const dan = ROCKET_DAN();
    // NOT exactly 2x: adding magnitude 1 to one weight makes the total 7, so
    // the rocket goes 2/7 (~1.71x uniform) and everything else 1/7 (~0.86x).
    // A star does not just raise its own gem, it CROWDS OUT the others — which
    // is the right behaviour (wanting one thing more means wanting others
    // less) and worth asserting rather than fudging to a round number.
    expect(edgeOn(dan, ROCKET, K)).toBeGreaterThan(1.6);
    expect(edgeOn(dan, GLASS, K)).toBeLessThan(1);
    expect(pGem(affinityOf(dan, K), ROCKET))
      .toBeCloseTo(2 * pGem(affinityOf(dan, K), GLASS), 5);   // exactly 2:1
  });

  it("no stars reads uniform — not a special case", () => {
    const nobody = { id: "x", name: "x", stars: [] };
    expect(distribution(affinityOf(nobody, K)))
      .toEqual(new Array(K).fill(1 / K));
  });

  it("changing the star changes the board — no second place for the number", () => {
    const dan = ROCKET_DAN();
    const brighter = { ...dan, stars: [starIn(ROCKET, "…", 5)] };
    expect(pGem(affinityOf(brighter, K), ROCKET))
      .toBeGreaterThan(pGem(affinityOf(dan, K), ROCKET));
  });

  it("two stars split the pull", () => {
    const mab = GENERALIST_MAB();
    expect(edgeOn(mab, ROCKET, K)).toBeGreaterThan(1);
    expect(edgeOn(mab, GLASS, K)).toBeGreaterThan(1);
    expect(edgeOn(mab, ROCKET, K)).toBeLessThan(edgeOn(ROCKET_DAN(), ROCKET, K));
  });
});

describe("whose turn it is changes what falls", () => {
  it("the same cell fills differently per player — deterministically", () => {
    const dan = ROCKET_DAN(), greg = SEARCHER_GREG();
    const a = drawFor(SPEC, dan, 1, 7);
    expect(drawFor(SPEC, dan, 1, 7)).toBe(a);            // stable
    const draws = (p: any) => Array.from({ length: 600 }, (_, i) => drawFor(SPEC, p, i, 1));
    const rockets = (p: any) => draws(p).filter((g) => g === ROCKET).length;
    // Dan really does pull more rockets than Greg, over a run
    expect(rockets(dan)).toBeGreaterThan(rockets(greg));
  });

  it("turn order decides who fills", () => {
    const m: Match = { players: [ROCKET_DAN(), SEARCHER_GREG()] };
    expect(playerAt(m, 0).id).toBe("rocket-dan");
    expect(playerAt(m, 1).id).toBe("searcher-greg");
    expect(playerAt(m, 2).id).toBe("rocket-dan");
  });

  it("p(gap completes) depends on WHO fills it", () => {
    const dan = ROCKET_DAN(), greg = SEARCHER_GREG();
    expect(pCompletes(dan, ROCKET, 1, K)).toBeGreaterThan(pCompletes(greg, ROCKET, 1, K));
    expect(pCompletes(greg, GLASS, 1, K)).toBeGreaterThan(pCompletes(dan, GLASS, 1, K));
  });
});

describe("stance is read from star overlap", () => {
  it("shared stars → collaborators BY CONSTRUCTION", () => {
    const a = ROCKET_DAN(), b = { ...ROCKET_DAN(), id: "dan2", name: "Dan 2" };
    expect(stanceBetween(a, b, K).ally).toBeCloseTo(1, 5);
  });

  it("different stars → indifferent, not hostile", () => {
    expect(stanceBetween(ROCKET_DAN(), SEARCHER_GREG(), K).ally).toBeCloseTo(0, 5);
  });

  it("partial overlap → the coopetitive middle", () => {
    const s = stanceBetween(ROCKET_DAN(), GENERALIST_MAB(), K).ally;
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it("hostility must be DECLARED — shared stars cannot explain malice", () => {
    expect(COMPETITIVE.ally).toBe(-1);
    expect(regard(COMPETITIVE, ROCKET_DAN(), SEARCHER_GREG())).toBe(-1);
    expect(regard(COMPETITIVE, ROCKET_DAN(), ROCKET_DAN())).toBe(1);  // still mine
  });
});

describe("competitive / cooperative / coopetitive", () => {
  const m: Match = { players: [ROCKET_DAN(), SEARCHER_GREG()] };

  it("a setup my OPPONENT closes scores negative", () => {
    // move 1 is Greg's turn; Dan evaluating it competitively should hate it
    const v = nearRunValue(m, ROCKET_DAN(), 1, COMPETITIVE, GLASS, 1, 3, K);
    expect(v).toBeLessThan(0);
  });

  it("…and positive when we are cooperating", () => {
    const v = nearRunValue(m, ROCKET_DAN(), 1, COOPERATIVE, GLASS, 1, 3, K);
    expect(v).toBeGreaterThan(0);
  });

  it("coopetitive is partial — feeds a colleague, but not at full weight", () => {
    const coop = nearRunValue(m, ROCKET_DAN(), 1, COOPERATIVE, GLASS, 1, 3, K);
    const mid = nearRunValue(m, ROCKET_DAN(), 1, COOPETITIVE, GLASS, 1, 3, K);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(coop);
  });

  it("cooperation is a real optimisation: hand rockets to Dan", () => {
    expect(bestConverter(m, ROCKET, 1, K).id).toBe("rocket-dan");
    expect(bestConverter(m, GLASS, 1, K).id).toBe("searcher-greg");
    expect(teamValue(m, ROCKET, 1, 3, K)).toBeGreaterThan(0);
  });
});

describe("cards: moves plus victory conditions", () => {
  // the card is the MOTH's (Hallie: "rocket dan and moon moth have the same
  // card") — Dan was the example of its shape, not a second holder.
  const dan = MOON_MOTH(ROCKET, MOON);
  const m: Match = { players: [dan, SEARCHER_GREG()] };
  const fresh = () => emptyRecord(m, K);

  it("Fly Me To The Moon is shaped as specified", () => {
    const c = FLY_ME_TO_THE_MOON(ROCKET, MOON);
    expect(c.name).toBe("Fly Me To The Moon");
    expect(c.effect).toEqual({ kind: "transmute", into: ROCKET, count: 5 });
    expect(c.victory!.says).toMatch(/most Moons and Rocket Ships/);
    expect(c.recharge).toEqual({ gem: MOON, per: 3 });
  });

  it("SCORES on rockets but RELOADS on moons — the gap is the strategy", () => {
    const c = FLY_ME_TO_THE_MOON(ROCKET, MOON);
    expect(c.effect).toMatchObject({ into: ROCKET });     // makes rockets
    expect(c.recharge!.gem).toBe(MOON);                   // fuelled by moons
    expect(c.recharge!.gem).not.toBe(ROCKET);             // …which are not the points
  });

  // RECHARGE IS A COOLDOWN, NOT A PURCHASE (Hallie's correction). The card
  // arrives full; spending empties it; fuel refills it — never past capacity.
  it("arrives READY, not empty", () => {
    const c = dan.hand![0];
    expect(chargesOf(c, fresh(), dan)).toBe(1);
  });

  it("spending empties it; fuel refills it", () => {
    const r = fresh();
    const c = dan.hand![0];
    r.played![dan.id][c.id] = 1;
    expect(chargesOf(c, r, dan)).toBe(0);                 // on cooldown
    r.cleared[dan.id][MOON] = 3;                          // three moons per charge
    expect(chargesOf(c, r, dan)).toBe(1);                 // back up
  });

  it("does NOT bank fuel above capacity — a cooldown, not a stockpile", () => {
    const r = fresh();
    const c = dan.hand![0];
    r.cleared[dan.id][MOON] = 30;                         // ten charges' worth
    expect(chargesOf(c, r, dan)).toBe(1);                 // still just full
    r.played![dan.id][c.id] = 1;
    expect(chargesOf(c, r, dan)).toBe(1);                 // and refills instantly
  });

  it("cooldown progress fills toward the next charge", () => {
    const r = fresh();
    const c = dan.hand![0];
    r.played![dan.id][c.id] = 1;                          // empty
    expect(cooldownProgress(c, r, dan)).toBe(0);
    r.cleared[dan.id][MOON] = 2;                          // 2 of 3
    expect(cooldownProgress(c, r, dan)).toBeCloseTo(2/3, 5);
  });

  it("an empty card cannot be played", () => {
    const r = fresh();
    const c = dan.hand![0];
    r.played![dan.id][c.id] = 1;                          // burned the free use
    expect(canPlay(c, r, dan)).toBe(false);
    r.cleared[dan.id][MOON] = 3;                          // refuel
    expect(canPlay(c, r, dan)).toBe(true);
  });

  it("'get the MOST' cannot be met alone — it is comparative", () => {
    const r = fresh();
    r.cleared[dan.id][ROCKET] = 5;
    expect(winners(m, r).map((p) => p.id)).toContain("moon-moth");
    r.cleared["searcher-greg"][ROCKET] = 99;              // Greg surges
    expect(winners(m, r)).toHaveLength(0);
  });

  // A REAL FINDING the first version of this test hid: the moth's stars are
  // 🌙 and ❤️, but her card scores 🌙 AND 🚀 — and she has no rocket star.
  // That is not incoherence, it is the character: rockets are her MEANS, not
  // her want. She is not a person who loves rockets, she is a person who wants
  // the moon badly enough to build them.
  it("her star names the WANT; the card's other gem is the MEANS", () => {
    const c = dan.hand![0];
    const starKeys = dan.stars.flatMap((s) => s.keys);
    expect(starKeys).toContain(MOON);          // what she is reaching for
    expect(starKeys).not.toContain(ROCKET);    // …and rockets are only how
    expect(c.victory!.id).toContain(String(MOON));
    expect(c.effect).toMatchObject({ into: ROCKET });
  });

  it("progress is readable for a bar", () => {
    const r = fresh();
    const v = mostOf([ROCKET], "most rockets");
    r.cleared[dan.id][ROCKET] = 2;
    expect(v.progress!(r, dan)).toBeGreaterThan(0);
    expect(v.progress!(r, dan)).toBeLessThanOrEqual(1);
  });
});
