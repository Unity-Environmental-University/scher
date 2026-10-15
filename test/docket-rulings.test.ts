// ─────────────────────────────────────────────────────────────────────────────
// docket-rulings.test.ts — Hallie's rulings on the scher kernel docket, 2026-10-15
// (~/repos/scher-docket/DOCKET.md). One describe per ruling, each pinned against the
// shape that broke: two replicas laying concurrently, then merged.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, unpackPoles, storyNow, layCharge, chargesOn, closePole, reopenTask, endOf, endActual,
  voltageOf, closingsOf, standingClosings, lawBreaches, diamond, type EventRow,
} from "../src/index.js";

const capture = (s: Society, slug: string) => s.lay({ slug, content: slug, subject: null, object: null });

/** what gossip does at its simplest: each side lays every row the other has that it lacks. */
function merge(a: Society, b: Society): Society {
  const seen = new Set<string>();
  const rows: EventRow[] = [];
  for (const r of [...a.all(), ...b.all()]) if (!seen.has(r.slug)) { seen.add(r.slug); rows.push(r); }
  return new Society(rows);
}

/** two replicas that both hold `base`'s rows. */
function fork(base: Society): [Society, Society] {
  return [new Society(base.all()), new Society(base.all())];
}

describe("ruling 1 — a charge IS the noticing edge, named per act", () => {
  it("End → noticer's frame, laid_by the noticer; re-noticing is another act, so another charge", () => {
    const s = new Society();
    capture(s, "buy-milk");
    const c1 = layCharge(s, "buy-milk", "frame-hallie");
    const c2 = layCharge(s, "buy-milk", "frame-hallie", "noticed again at the fridge");
    expect(c1).not.toBe(c2);
    const end = endOf(s, "buy-milk")!;
    expect(s.get(c1)).toMatchObject({ subject: end, object: "frame-hallie", laid_by: "frame-hallie" });
    expect(chargesOn(s, end)).toHaveLength(2);
  });

  it("two replicas charging one story at once never collide — the merge holds both charges", () => {
    const base = new Society();
    capture(base, "s");
    unpackPoles(base, "s");
    const [a, b] = fork(base);
    const ca = layCharge(a, "s", "alice");
    const cb = layCharge(b, "s", "bob");
    expect(ca).not.toBe(cb); // was: both `s~hea~charge-0`, different objects
    const m = merge(a, b);
    expect(chargesOn(m, "s~hea").map((c) => c.object).sort()).toEqual(["alice", "bob"]);
    expect(voltageOf(m, "s")).toBe(3); // strike + two noticings
  });

  it("an explicit act names the noticing: the same act laid twice is one row, honestly", () => {
    const base = new Society();
    capture(base, "s");
    const [a, b] = fork(base);
    const ca = layCharge(a, "s", "alice", "charge", { act: "capture-17" });
    const cb = layCharge(b, "s", "alice", "charge", { act: "capture-17" });
    expect(ca).toBe(cb);
    expect(chargesOn(merge(a, b), "s~hea")).toHaveLength(1);
  });
});

describe("ruling 5 — one End; open or closed is a read of its connections", () => {
  it("done = a closing that no later charge points back at; a plain charge after done doesn't reopen", () => {
    const s = new Society();
    capture(s, "s");
    const p = unpackPoles(s, "s");
    closePole(s, "s");
    layCharge(s, "s", "hallie", "noticed after it was done"); // points at nothing
    expect(endActual(s, p.end)).toBe(true);
    reopenTask(s, "s", "hallie"); // points back at the closing
    expect(endActual(s, p.end)).toBe(false);
  });

  it("the read is ordered by because-structure, never `witnessed` — scrambled stamps read the same", () => {
    const s = new Society();
    capture(s, "s");
    unpackPoles(s, "s");
    closePole(s, "s");
    reopenTask(s, "s", "hallie");
    const scrambled = new Society(s.all().map((r, i, all) => ({ ...r, witnessed: all.length - i })).reverse());
    expect(endActual(scrambled, "s~hea")).toBe(endActual(s, "s~hea"));
    expect(voltageOf(scrambled, "s")).toBe(voltageOf(s, "s"));
  });

  it("reopening an open story is refused — there is no closing to point back at", () => {
    const s = new Society();
    capture(s, "s");
    unpackPoles(s, "s");
    expect(() => reopenTask(s, "s", "hallie")).toThrowError(/REOPEN.*already reads open/s);
  });

  it("a reopen in another frame is invisible to it until it establishes there (discharge propagates both ways)", () => {
    const s = new Society();
    capture(s, "s");
    unpackPoles(s, "s");
    capture(s, "now-bob");
    s.layP("now-bob~because~s", "bob saw the story", "now-bob", "s", "q-grounding");
    const closing = closePole(s, "s");
    s.layP(`now-bob~because~${closing}`, "bob saw it close", "now-bob", closing, "q-grounding");
    expect(voltageOf(s, "s", "now-bob")).toBe(0);
    const r = reopenTask(s, "s", "hallie");
    expect(voltageOf(s, "s")).toBe(2); // the story's own frame sees its reopen
    expect(voltageOf(s, "s", "now-bob")).toBe(0); // Bob hasn't seen it: still done for him
    s.layP(`now-bob~because~${r}`, "bob saw the reopen", "now-bob", r, "q-grounding");
    expect(voltageOf(s, "s", "now-bob")).toBe(2);
  });
});

describe("ruling 2 — two people reopening at once strike ONE differential", () => {
  it("one End, one strike; each noticing still its own charge", () => {
    const base = new Society();
    capture(base, "s");
    unpackPoles(base, "s");
    closePole(base, "s");
    const [a, b] = fork(base);
    reopenTask(a, "s", "alice");
    reopenTask(b, "s", "bob");
    const m = merge(a, b);
    expect(endOf(m, "s")).toBe("s~hea"); // no second End minted (was `s~hea-1` on each side)
    expect(endActual(m, "s~hea")).toBe(false);
    expect(voltageOf(m, "s")).toBe(1 + 2); // one strike + two reopening charges
    expect(lawBreaches(m)).toEqual([]);
  });
});

describe("ruling 3 — laws guarded at lay AND surfaced at read, never thrown there", () => {
  it("one-closing at lay: no second closing without a reopening between", () => {
    const s = new Society();
    capture(s, "s");
    capture(s, "other");
    const p = unpackPoles(s, "s");
    const other = unpackPoles(s, "other");
    closePole(s, "s");
    expect(() => s.layBareP("rival", "a rival closing", p.end, other.now)).toThrowError(/ONE-CLOSING.*reopening between/s);
    reopenTask(s, "s", "hallie");
    expect(() => s.layBareP("rival", "a closing after the reopen", p.end, other.now)).not.toThrow();
    expect(standingClosings(s, p.end).map((c) => c.slug)).toEqual(["rival"]);
  });

  it("closePole goes through the guard too: another frame's standing closing refuses it", () => {
    const s = new Society();
    capture(s, "s");
    capture(s, "other");
    const p = unpackPoles(s, "s");
    const other = unpackPoles(s, "other");
    s.layBareP("other-closed-it", "closed in another frame", p.end, other.now);
    expect(() => closePole(s, "s")).toThrowError(/ONE-CLOSING/);
    expect(closePole(new Society(s.all().filter((r) => r.slug !== "other-closed-it")), "s")).toBeTruthy();
  });

  it("one-closing at read: two concurrent closings merge into a visible breach, and reading it never throws", () => {
    const base = new Society();
    capture(base, "s");
    capture(base, "other");
    unpackPoles(base, "s");
    unpackPoles(base, "other");
    const [a, b] = fork(base);
    a.layBareP("close-by-a", "a closes", "s~hea", storyNow("s"));
    b.layBareP("close-by-b", "b closes", "s~hea", storyNow("other"));
    const m = merge(a, b);
    expect(lawBreaches(m)).toEqual([{ law: "one-closing", at: "s~hea", rows: ["close-by-a", "close-by-b"] }]);
    expect(endActual(m, "s~hea")).toBe(true); // still reads, coherently: done
    reopenTask(m, "s", "hallie"); // one reopen answers both: it points back at every standing closing
    expect(closingsOf(m, "s~hea")).toHaveLength(2);
    expect(standingClosings(m, "s~hea")).toEqual([]);
    expect(lawBreaches(m)).toEqual([]);
  });

  it("naked-pole at read: a labelled edge that reached an open End by bare lay shows", () => {
    const s = new Society();
    capture(s, "s");
    const p = unpackPoles(s, "s");
    s.lay({ slug: "cmt", content: "a comment", subject: "someone", object: p.end }); // bare lay: no guard
    s.lay({ slug: "cmt~q", content: "[q-feel]", subject: "cmt", object: "q-feel" });
    expect(lawBreaches(s)).toEqual([{ law: "naked-pole", at: p.end, rows: ["cmt"] }]);
    closePole(s, "s");
    expect(lawBreaches(s)).toEqual([]); // a closed End may be referenced
  });

  it("one-end at read: canon with two Ends for one story in one frame shows, and nothing picks", () => {
    const s = new Society();
    capture(s, "s");
    unpackPoles(s, "s");
    // laid by bare lay, as pre-2026-10-15 reopens and old canon did — the guard never saw it
    s.lay({ slug: "s~end-pole~s~hea-1", content: "a second End", subject: "s", object: "s~hea-1" });
    s.lay({ slug: "s~end-pole~s~hea-1~q", content: "[q-end-pole]", subject: "s~end-pole~s~hea-1", object: "q-end-pole" });
    expect(lawBreaches(s)).toEqual([{ law: "one-end", at: "s", frame: "s", rows: ["s~end-pole~s~hea", "s~end-pole~s~hea-1"] }]);
  });

  it("one-end at lay: one End per (story, frame) — the frame defaults to the story (Hallie, 2026-10-15)", () => {
    const s = new Society();
    capture(s, "s");
    unpackPoles(s, "s"); // s~hea, in s's own frame
    expect(() => s.layP("s~why~aim", "a second End, own frame", "s", "aim", "q-end-pole")).toThrowError(/ONE-END LAW.*frame 's'/s);
    s.layP("s~why~aim", "the skeptic's End for s", "s", "aim", "q-end-pole", { frame: "skeptic" });
    expect(endOf(s, "s")).toBe("s~hea"); // the story's own frame
    expect(endOf(s, "s", "skeptic")).toBe("aim");
    expect(() => s.layP("s~why~other", "a second skeptic End", "s", "other", "q-end-pole", { frame: "skeptic" }))
      .toThrowError(/ONE-END LAW.*frame 'skeptic'/s);
    expect(lawBreaches(s)).toEqual([]);
  });

  it("PINNED for Hallie: this-day's chunk-the-dolls (one chunk, two aims, own frame) is refused", () => {
    const s = new Society();
    s.layP("n32-why", "chunk-the-dolls so that hea-we-enjoy-our-work", "chunk-the-dolls", "hea-we-enjoy-our-work", "q-end-pole");
    expect(() => s.layP("n33-why", "chunk-the-dolls so that hea-we-test-mechanics-on-real-history",
      "chunk-the-dolls", "hea-we-test-mechanics-on-real-history", "q-end-pole")).toThrowError(/ONE-END LAW/);
  });

  it("two stories sharing one End is not a breach (this-day's 'two readings')", () => {
    const s = new Society();
    s.layP("r1", "", "reading-fix-a-bug", "ev-this-session", "q-end-pole");
    s.layP("r2", "", "reading-hold-frames-plural", "ev-this-session", "q-end-pole");
    expect(lawBreaches(s)).toEqual([]);
  });

});

describe("docket item 3 — one act, one wave", () => {
  it("a reader woken by layP sees the whole act, once", () => {
    const s = new Society();
    const seen: number[] = [];
    s.rev.subscribe(() => seen.push(s.all().length));
    s.layP("x~because~y", "x because y", "x", "y", "q-grounding");
    expect(seen).toEqual([0, 2]); // subscribe reads once at once; was [0, 1, 2] — the edge before its ~q, readable with no error
  });
});

describe("docket item 4 — layP takes laid_by", () => {
  it("both the edge and its mode-beat say who spoke", () => {
    const s = new Society();
    s.layP("x~because~y", "x because y", "x", "y", "q-grounding", { laid_by: "hallie" });
    expect(s.get("x~because~y")!.laid_by).toBe("hallie");
    expect(s.get("x~because~y~q")!.laid_by).toBe("hallie");
  });
});

describe("docket item 6 — the diamond along one quality", () => {
  it("only nodes on a `quality` path between the two, occlusion-aware", () => {
    const s = new Society();
    s.layP("b~because~a", "", "b", "a", "q-grounding");
    s.layP("c~because~b", "", "c", "b", "q-grounding");
    s.layP("d~because~a", "", "d", "a", "q-grounding");
    s.layP("c~perceives~d", "", "c", "d", "q-perceives"); // another quality: not walked
    expect(diamond(s, "c", "a", "q-grounding")).toEqual(["a", "b", "c"]);
    expect(diamond(s, "a", "c", "q-grounding")).toEqual([]); // not reached
    s.layP("x~occludes~b", "", "x", "c~because~b", "q-occludes");
    expect(diamond(s, "c", "a", "q-grounding")).toEqual([]);
  });
});
