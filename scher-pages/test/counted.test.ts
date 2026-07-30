import { describe, it, expect } from "vitest";
import { Society } from "../../src/society.js";
import { count, valueOf, place, sectionOf, readCounted, bySection,
         totalOf, undo, countedOf } from "../src/counted.js";
import { type BagSpec, addToBag, slotOf, firstFreeSlot, isFull, putInSlot } from "../src/bag.js";

const setup = () => {
  const soc = new Society();
  for (const [s, t] of [["lamp","Lamp"],["chart","Moon Chart"],["bolt","Bolt"]] as const)
    soc.lay({ slug: s, content: t, title: t, subject: null, object: null });
  return soc;
};
const SPEC = { holder: "moth-01" };

describe("Counted — the value is folded, never stored", () => {
  it("folds deltas into a value", () => {
    const soc = setup();
    count(soc, SPEC, "lamp", 3);
    count(soc, SPEC, "lamp", -1);
    expect(valueOf(soc, SPEC, "lamp")).toBe(2);
  });

  it("never goes below zero", () => {
    const soc = setup();
    count(soc, SPEC, "lamp", 1);
    expect(count(soc, SPEC, "lamp", -5)).toBeNull();
    expect(valueOf(soc, SPEC, "lamp")).toBe(1);
  });

  it("REFUSES over cap rather than clamping", () => {
    const soc = setup();
    const capped = { ...SPEC, cap: 20 };
    count(soc, capped, "lamp", 20);
    expect(count(soc, capped, "lamp", 1)).toBeNull();
    expect(valueOf(soc, capped, "lamp")).toBe(20);
  });

  it("per-key caps via a function", () => {
    const soc = setup();
    const spec = { ...SPEC, cap: (k: string) => (k === "lamp" ? 2 : 99) };
    expect(count(soc, spec, "lamp", 3)).toBeNull();
    expect(count(soc, spec, "bolt", 3)).not.toBeNull();
  });

  it("undo re-folds the value (occlusion, no undo stack)", () => {
    const soc = setup();
    const a = count(soc, SPEC, "lamp", 5)!;
    count(soc, SPEC, "lamp", 2);
    expect(valueOf(soc, SPEC, "lamp")).toBe(7);
    undo(soc, a, "miscounted");
    expect(valueOf(soc, SPEC, "lamp")).toBe(2);
  });

  it("as-of reads the past", () => {
    const soc = setup();
    count(soc, SPEC, "lamp", 1);
    const t = soc.get(soc.all().find(r => r.slug.startsWith("count-"))!.slug)!.witnessed!;
    count(soc, SPEC, "lamp", 9);
    expect(valueOf(soc, SPEC, "lamp")).toBe(10);
    expect(valueOf(soc, SPEC, "lamp", { asOf: t })).toBe(1);
  });
});

describe("Counted — sections are read, not stored", () => {
  const S = { ...SPEC, sections: ["bag", "bank"], defaultSection: "bag" };

  it("a new key lands in the default section", () => {
    const soc = setup();
    count(soc, S, "lamp", 1);
    expect(sectionOf(soc, S, "lamp")).toBe("bag");
  });

  it("moving is an APPEND; the newest placement wins", () => {
    const soc = setup();
    count(soc, S, "lamp", 1);
    place(soc, S, "lamp", "bank");
    expect(sectionOf(soc, S, "lamp")).toBe("bank");
    place(soc, S, "lamp", "bag");
    expect(sectionOf(soc, S, "lamp")).toBe("bag");
  });

  it("the old placement is still in history (as-of proves it)", () => {
    const soc = setup();
    count(soc, S, "lamp", 1);
    const p = place(soc, S, "lamp", "bank")!;
    const t = soc.get(p)!.witnessed!;
    place(soc, S, "lamp", "bag");
    expect(sectionOf(soc, S, "lamp")).toBe("bag");
    expect(sectionOf(soc, S, "lamp", { asOf: t })).toBe("bank");
  });

  it("refuses an undeclared section", () => {
    const soc = setup();
    count(soc, S, "lamp", 1);
    expect(place(soc, S, "lamp", "the-moon")).toBeNull();
  });

  it("groups by section in declared order", () => {
    const soc = setup();
    count(soc, S, "lamp", 1);
    count(soc, S, "chart", 2);
    place(soc, S, "chart", "bank");
    const g = bySection(soc, S);
    expect(g.map(x => x.section)).toEqual(["bag", "bank"]);
    expect(g[0].items.map(i => i.key)).toEqual(["lamp"]);
    expect(g[1].items.map(i => i.key)).toEqual(["chart"]);
  });
});

describe("Counted — inventory re-expressed on it (the abstraction test)", () => {
  it("does everything stack-inventory did", () => {
    const soc = setup();
    const INV = { ...SPEC, cap: 20 };
    count(soc, INV, "chart", 1, "gran");
    count(soc, INV, "chart", 2, "gran");
    expect(valueOf(soc, INV, "chart")).toBe(3);          // stacks
    count(soc, INV, "chart", -2);
    expect(valueOf(soc, INV, "chart")).toBe(1);          // spends
    expect(count(soc, INV, "chart", -5)).toBeNull();     // refuses overspend
    expect(totalOf(soc, INV)).toBe(1);                   // encumbrance
    const by = countedOf(soc, INV, "chart")!.from.map(f => f.by);
    expect(by).toContain("gran");                        // provenance
  });

  it("two holders do not share", () => {
    const soc = setup();
    count(soc, { holder: "a" }, "lamp", 2);
    count(soc, { holder: "b" }, "lamp", 7);
    expect(valueOf(soc, { holder: "a" }, "lamp")).toBe(2);
    expect(valueOf(soc, { holder: "b" }, "lamp")).toBe(7);
  });
});

describe("bag — a WoW bag over a Counted", () => {
  const BAG: BagSpec = { holder: "moth-01", bag: "bag-main", slots: 4, cap: 20 };

  it("places into the first free slot", () => {
    const soc = setup();
    addToBag(soc, BAG, "lamp", 1);
    addToBag(soc, BAG, "chart", 1);
    expect(slotOf(soc, BAG, "lamp")).toBe(0);
    expect(slotOf(soc, BAG, "chart")).toBe(1);
  });

  it("stacks in place instead of taking a second slot", () => {
    const soc = setup();
    addToBag(soc, BAG, "lamp", 1);
    addToBag(soc, BAG, "lamp", 4);
    expect(valueOf(soc, BAG, "lamp")).toBe(5);
    expect(firstFreeSlot(soc, BAG)).toBe(1);
  });

  it("a FULL bag refuses the drop rather than eating it", () => {
    const soc = setup();
    const tiny: BagSpec = { ...BAG, slots: 2 };
    addToBag(soc, tiny, "lamp", 1);
    addToBag(soc, tiny, "chart", 1);
    expect(isFull(soc, tiny)).toBe(true);
    expect(addToBag(soc, tiny, "bolt", 1)).toBeNull();
    expect(valueOf(soc, tiny, "bolt")).toBe(0);
  });

  it("rearranging is an append — the old arrangement stays readable", () => {
    const soc = setup();
    addToBag(soc, BAG, "lamp", 1);
    const p = putInSlot(soc, BAG, "lamp", 3)!;
    expect(slotOf(soc, BAG, "lamp")).toBe(3);
    const before = soc.get(p)!.witnessed! - 1;
    expect(slotOf(soc, BAG, "lamp", { asOf: before })).toBe(0);
  });
});
