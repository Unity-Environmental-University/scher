import { describe, it, expect } from "vitest";
import { Society } from "../../src/society.js";
import { acquire, spend, stackOf, inventoryOf, carriedCount } from "../src/stack-inventory.js";

const P = { holder: "moth-01" };
const setup = () => {
  const soc = new Society();
  soc.lay({ slug: "moon-chart", content: "a moon chart", title: "Moon Chart", subject: null, object: null });
  soc.lay({ slug: "lamp", content: "a lamp", title: "Lamp", subject: null, object: null });
  return soc;
};

describe("stack-inventory: a count is folded, never stored", () => {
  it("stacks rather than making a row per item", () => {
    const soc = setup();
    acquire(soc, P, "moon-chart", 1, "gran");
    acquire(soc, P, "moon-chart", 2, "gran");
    const inv = inventoryOf(soc, P);
    expect(inv.length).toBe(1);
    expect(inv[0].count).toBe(3);
  });

  it("spending re-folds; it does not decrement a field", () => {
    const soc = setup();
    acquire(soc, P, "lamp", 5);
    spend(soc, P, "lamp", 2);
    expect(stackOf(soc, P, "lamp")!.count).toBe(3);
  });

  it("refuses to spend what you do not have (the fold is the authority)", () => {
    const soc = setup();
    acquire(soc, P, "lamp", 1);
    expect(spend(soc, P, "lamp", 2)).toBeNull();
    expect(stackOf(soc, P, "lamp")!.count).toBe(1);
  });

  it("refuses loudly at maxStack instead of silently clamping", () => {
    const soc = setup();
    const capped = { ...P, maxStack: 3 };
    acquire(soc, capped, "lamp", 3);
    expect(acquire(soc, capped, "lamp", 1)).toBeNull();
    expect(stackOf(soc, capped, "lamp")!.count).toBe(3);
  });

  it("as-of reads what you carried in the past", () => {
    const soc = setup();
    acquire(soc, P, "lamp", 1);
    const first = soc.all().find(r => r.slug.startsWith("hold-"))!;
    const t = first.witnessed!;
    acquire(soc, P, "lamp", 4);
    expect(stackOf(soc, P, "lamp")!.count).toBe(5);
    expect(stackOf(soc, { ...P, asOf: t }, "lamp")!.count).toBe(1);
  });

  it("keeps provenance: who gave you each one", () => {
    const soc = setup();
    acquire(soc, P, "moon-chart", 1, "gran");
    acquire(soc, P, "moon-chart", 1, "the-foreman");
    const by = stackOf(soc, P, "moon-chart")!.from.map(f => f.by).sort();
    expect(by).toEqual(["gran", "the-foreman"]);
  });

  it("two holders do not share a bag", () => {
    const soc = setup();
    acquire(soc, P, "lamp", 2);
    acquire(soc, { holder: "moth-02" }, "lamp", 7);
    expect(stackOf(soc, P, "lamp")!.count).toBe(2);
    expect(stackOf(soc, { holder: "moth-02" }, "lamp")!.count).toBe(7);
  });

  it("carriedCount sums the stacks", () => {
    const soc = setup();
    acquire(soc, P, "lamp", 2);
    acquire(soc, P, "moon-chart", 3);
    expect(carriedCount(soc, P)).toBe(5);
  });
});
