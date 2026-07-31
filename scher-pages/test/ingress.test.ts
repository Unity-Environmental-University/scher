import { describe, it, expect } from "vitest";
import { Society } from "../../src/society.js";
import { ingressWrapper, ingress, egress, type Shape } from "../src/ingress.js";

type Incident = { id: string; title: string; desc: string; keys: Record<string, number> };
const SHAPE: Shape<Incident> = {
  kind: "incident",
  id: (o) => o.id,
  title: (o) => o.title,
  content: (o) => o.desc,
};
const ITEMS: Incident[] = [
  { id: "ev1", title: "Watched the moon", desc: "age 3, from the porch", keys: { "🌙": 2 } },
  { id: "ev2", title: "Paper rocket", desc: "it did not fly", keys: { "🔧": 2 } },
];
const P = { by: "frame-threshold", source: "editor export" };

describe("ingress — the outside BECOMES a society", () => {
  it("lays the beats", () => {
    const soc = new Society();
    const r = ingress(soc, SHAPE, ITEMS, P);
    expect(r.laid).toContain("incident-ev1");
    expect(soc.get("incident-ev1")!.title).toBe("Watched the moon");
  });

  it("records the import ITSELF as an event", () => {
    const soc = new Society();
    const r = ingress(soc, SHAPE, ITEMS, P);
    const imp = soc.get(r.slug)!;
    expect(imp.content).toContain("editor export");
    expect(imp.laid_by).toBe("frame-threshold");
  });

  it("laid_by is the IMPORTER, never a forged original author", () => {
    const soc = new Society();
    ingress(soc, SHAPE, ITEMS, P);
    expect(soc.get("incident-ev1")!.laid_by).toBe("frame-threshold");
  });

  it("every beat can answer where it came from", () => {
    const soc = new Society();
    const w = ingressWrapper(soc, SHAPE);
    const r = w.in(ITEMS, P);
    expect(w.provenanceOf("incident-ev1")).toBe(r.slug);
  });

  it("re-import is INERT, and says which were already there", () => {
    const soc = new Society();
    const w = ingressWrapper(soc, SHAPE);
    w.in(ITEMS, P);
    const again = w.in(ITEMS, P);
    expect(again.laid).toEqual([]);
    expect(again.inert).toContain("incident-ev1");
  });
});

describe("egress — and the asymmetry that is correct", () => {
  it("round-trips the declared fields", () => {
    const soc = new Society();
    const w = ingressWrapper(soc, SHAPE);
    w.in(ITEMS, P);
    const dump = w.out();
    const titles = dump.beats.filter(b => b.title).map(b => b.title);
    expect(titles).toContain("Watched the moon");
    expect(titles).toContain("Paper rocket");
  });

  it("carries the society's OWN clock, not wall time", () => {
    const soc = new Society();
    ingress(soc, SHAPE, ITEMS, P);
    const dump = egress(soc, "incident");
    const max = Math.max(...soc.all().map(b => b.witnessed ?? 0));
    expect(dump.atWitnessed).toBe(max);
  });

  it("a rehydrated society KNOWS it was imported (asymmetry is the truth)", () => {
    const a = new Society();
    ingress(a, SHAPE, ITEMS, P);
    const before = a.all().length;
    const b = new Society();
    ingress(b, SHAPE, ITEMS, { by: "frame-other", source: "a dump" });
    // the second society carries its own import record — it is NOT identical,
    // and erasing that difference to look tidy would be a lie.
    expect(b.all().some(r => r.content.includes("a dump"))).toBe(true);
    expect(a.all().some(r => r.content.includes("a dump"))).toBe(false);
    expect(before).toBeGreaterThan(0);
  });
});
