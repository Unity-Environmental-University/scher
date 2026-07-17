// ─────────────────────────────────────────────────────────────────────────────
// buckets.prop.test.ts — property tests for bucketsOf, built on membersOf's derivation
// (drawer-contents.md item 10; the membership law lives in
// membership-topology.red.test.ts). Plain generative loops (no fast-check import here —
// the society shapes this read needs are small graphs with a few structural knobs, easier
// to hand-generate than to fc.arbitrary into a valid grounding DAG) over a handful of
// randomized societies, checking invariants that must hold for ALL of them:
//
//   1. interior partition is TOTAL and DISJOINT over members — every member of E lands
//      in exactly one of future/present/past.
//   2. sublime interior is always empty — a q-sublime-pole event has no members at all
//      (membersOf already guarantees this; bucketsOf's interior inherits it for free).
//   3. crossing the Now (the lay gathering edge) moves a member future→past monotonically
//      — it never regresses past→future once the Now has gathered it.
//   4. ~holds~ edges never change any bucket — the exact dead ink membership-topology's
//      own fence pins for membersOf; bucketsOf is built on membersOf, so this checks the
//      inheritance actually holds, not just the law in prose.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  unpackPoles,
  closePole,
  bucketsOf,
  membersOf,
} from "../src/society.js";

function lay(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}
function grounds(s: Society, later: string, earlier: string) {
  lay(s, later); lay(s, earlier);
  s.layP(`${later}~because~${earlier}`, "grounds in", later, earlier, "q-grounding");
}

/** a randomized "day" with N todos, each independently gathered by Now or not yet. */
function randomDay(seed: number): { s: Society; day: ReturnType<typeof unpackPoles>; todos: string[]; gathered: Set<string> } {
  const s = new Society();
  lay(s, "the-day");
  const day = unpackPoles(s, "the-day");
  const n = 3 + (seed % 4); // 3..6 todos
  const todos: string[] = [];
  const gathered = new Set<string>();
  for (let i = 0; i < n; i++) {
    const todo = `todo-${seed}-${i}`;
    todos.push(todo);
    grounds(s, todo, "the-day");
    // a pseudo-random half gather; deterministic per seed so failures reproduce.
    if ((seed + i) % 2 === 0) {
      grounds(s, day.now, todo);
      gathered.add(todo);
    }
  }
  return { s, day, todos, gathered };
}

describe("bucketsOf — property 1: interior partition is total and disjoint", () => {
  for (let seed = 0; seed < 12; seed++) {
    it(`seed ${seed}`, () => {
      const { s, day } = randomDay(seed);
      const members = membersOf(s, "the-day");
      const b = bucketsOf(s, "the-day");
      const { future, present, past } = b.interior;
      const all = [...future, ...present, ...past];
      // total: every member appears somewhere in the interior partition.
      expect(new Set(all)).toEqual(new Set(members));
      // disjoint: no member appears in more than one bucket.
      expect(all.length).toBe(new Set(all).size);
    });
  }
});

describe("bucketsOf — property 2: a sublime's interior is always empty", () => {
  it("q-sublime-pole event has no members and an empty interior", () => {
    const s = new Society();
    lay(s, "the-sublime");
    unpackPoles(s, "the-sublime"); // ordinary unpack — its Now never gathers anything
    grounds(s, "story-x", "the-sublime");
    grounds(s, "story-y", "the-sublime");
    expect(membersOf(s, "the-sublime")).toEqual([]);
    const b = bucketsOf(s, "the-sublime");
    expect(b.interior.future).toEqual([]);
    expect(b.interior.present).toEqual([]);
    expect(b.interior.past).toEqual([]);
  });
});

describe("bucketsOf — property 3: crossing the Now moves future→past, never back", () => {
  it("an ungathered todo grounds in the day but isn't a member yet; once Now gathers it, it's past — and stays past", () => {
    const s = new Society();
    lay(s, "the-day");
    const day = unpackPoles(s, "the-day");
    grounds(s, "todo-a", "the-day");
    // grounds-in-Once alone isn't enough (the law's clause (2)): the Now hasn't reached it
    // yet, so it's not a member at all — not future, not anywhere in the interior yet.
    const before = bucketsOf(s, "the-day");
    expect(before.interior.future).not.toContain("todo-a");
    expect(before.interior.present).not.toContain("todo-a");
    expect(before.interior.past).not.toContain("todo-a");
    expect(membersOf(s, "the-day")).not.toContain("todo-a");

    grounds(s, day.now, "todo-a"); // the Now gathers it — append-only, no undo
    const after = bucketsOf(s, "the-day");
    expect(after.interior.past).toContain("todo-a");
    expect(after.interior.future).not.toContain("todo-a");
    // append-only: there is no operation that could move it back to future from here —
    // the log only grows, so re-reading at a LATER asOf can only ever agree with `after`.
    expect(bucketsOf(s, "the-day").interior.past).toContain("todo-a");
  });

  for (let seed = 20; seed < 26; seed++) {
    it(`seed ${seed}: gathered members are never in future`, () => {
      const { s, gathered } = randomDay(seed);
      const b = bucketsOf(s, "the-day");
      for (const g of gathered) {
        expect(b.interior.future).not.toContain(g);
      }
    });
  }
});

describe("bucketsOf — property 4: ~holds~ edges never change any bucket", () => {
  for (let seed = 30; seed < 34; seed++) {
    it(`seed ${seed}`, () => {
      const { s, todos } = randomDay(seed);
      const before = JSON.stringify(bucketsOf(s, "the-day"));
      // the exact dead ink membership-topology's fence pins: forged containment.
      lay(s, "smuggled");
      s.lay({ slug: "the-day~holds~smuggled", content: "containment as ink (dead)", subject: "the-day", object: "smuggled" });
      const after = JSON.stringify(bucketsOf(s, "the-day"));
      expect(after).toBe(before);
      expect(bucketsOf(s, "the-day").after.direct).not.toContain("smuggled");
      expect(todos.length).toBeGreaterThan(0); // sanity: the fixture actually built todos
    });
  }
});

describe("bucketsOf and countsOf agree on cardinality", () => {
  for (let seed = 0; seed < 6; seed++) {
    it(`seed ${seed}`, async () => {
      const { countsOf } = await import("../src/society.js");
      const { s } = randomDay(seed);
      const b = bucketsOf(s, "the-day");
      const c = countsOf(s, "the-day");
      expect(c.after.direct).toBe(b.after.direct.length);
      expect(c.after.indirect).toBe(b.after.indirect.length);
      expect(c.before.direct).toBe(b.before.direct.length);
      expect(c.before.indirect).toBe(b.before.indirect.length);
      expect(c.interior.future).toBe(b.interior.future.length);
      expect(c.interior.present).toBe(b.interior.present.length);
      expect(c.interior.past).toBe(b.interior.past.length);
    });
  }
});
