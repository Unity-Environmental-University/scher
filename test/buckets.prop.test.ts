// ─────────────────────────────────────────────────────────────────────────────
// buckets.prop.test.ts — property tests for bucketsOf's interior partition
// (drawer-contents.md item 10; the membership law lives in
// membership-topology.red.test.ts, UNCHANGED by this file). Plain generative loops (no
// fast-check import here — the society shapes this read needs are small graphs with a
// few structural knobs, easier to hand-generate than to fc.arbitrary into a valid
// grounding DAG) over a handful of randomized societies.
//
// TWO CORRECTIONS landed here in one sitting (see society.ts's own trace comments above
// bucketsOf/intervalSet for the full history):
//   round 1 — interior's domain is the INTERVAL SET (groundedCone), not membersOf: an
//     open event's members are ALWAYS past under the fence's law (gatherFrom is `now`),
//     so partitioning membersOf could never show future/present on a live card.
//   round 2 — a scripted future is modeled as an ordinary NOW-PREHENDING edge (m
//     ~because~ now, item 9's exact shape), never as an edge laid FROM the End node —
//     the address law makes any q-grounding edge out of a designated End-pole read as
//     THE closing, so "scripted onto the End, not yet actual" is not house-legal data.
//     intervalSet never reads the End at all; future = prehends Now, past = gathered by
//     Now, present = neither (the straddler, includes anything that merely grounds in
//     Once with no further relation to Now yet — a sublime's forever-open stories land
//     here too, perpetually unresolved, which is a fitting reading).
//
// INVARIANTS CHECKED:
//   1. interior partition is TOTAL and DISJOINT over the interval set.
//   2. a sublime's members are still empty (membersOf, unchanged) even though its
//      interior is NOT (its stories land in present) — the two reads have different
//      domains by design; this test pins that they don't secretly coincide.
//   3. crossing the Now (the lay gathering edge) moves an event future→past
//      monotonically — it never regresses past→future once the Now has gathered it.
//   4. CONVERGENCE (coordinator's ask, round 2): closing a story does not, by itself,
//      change any interior bucket — the Now-prehending edge was already the whole
//      story; only a NEW gathering edge (Now grounds in the member) moves it to past,
//      whether the story is open or has since closed. Closing alone is a no-op on
//      interior.
//   5. ~holds~ edges never change any bucket — the exact dead ink membership-topology's
//      own fence pins for membersOf; bucketsOf is built on the same grounding walks, so
//      this checks the inheritance actually holds, not just the law in prose.
//   6. THE LURE LAW (Hallie, grooming minutes 2026-07-17, 09:38): a sublime's grip is
//      appetition (a CHARGE at its designated node), never grounding. A charge from a
//      direct-after event onto a designated sublime-pole surfaces that sublime in
//      after.sublimesTree; an ordinary grounding edge toward the same node does NOT (the
//      old sublimesTree filter tested isSublimePole on a q-grounding-reached node, which
//      was structurally impossible to ever fire — nothing reaches a designated pole via
//      grounding — so this property also guards against that dead-code regression).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society,
  unpackPoles,
  closePole,
  bucketsOf,
  countsOf,
  membersOf,
} from "../src/society.js";

function lay(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}
function grounds(s: Society, later: string, earlier: string) {
  lay(s, later); lay(s, earlier);
  s.layP(`${later}~because~${earlier}`, "grounds in", later, earlier, "q-grounding");
}

/** a randomized "day" with N todos, each grounded in the day's Once. A pseudo-random
 *  third PREHENDS the day's Now (item 9's future shape); of those, a further
 *  pseudo-random half are ALSO gathered by Now (past — gathering always wins over merely
 *  prehending, since gathering is the stronger, later relation). The remainder are
 *  plain interval members with no Now-relation yet: present, the straddler. */
function randomDay(seed: number): { s: Society; day: ReturnType<typeof unpackPoles>; todos: string[]; gathered: Set<string>; prehendsNow: Set<string> } {
  const s = new Society();
  lay(s, "the-day");
  const day = unpackPoles(s, "the-day");
  const n = 3 + (seed % 4); // 3..6 todos
  const todos: string[] = [];
  const gathered = new Set<string>();
  const prehendsNow = new Set<string>();
  for (let i = 0; i < n; i++) {
    const todo = `todo-${seed}-${i}`;
    todos.push(todo);
    grounds(s, todo, "the-day");
    if ((seed + i) % 3 === 0) {
      grounds(s, todo, day.now); // todo prehends the day's Now: item 9's future
      prehendsNow.add(todo);
      if ((seed + i) % 6 === 0) {
        grounds(s, day.now, todo); // ALSO gathered: past
        gathered.add(todo);
      }
    } else if ((seed + i) % 3 === 1) {
      grounds(s, day.now, todo); // gathered directly, no prior prehends-now edge: past
      gathered.add(todo);
    }
    // the remaining third: plain interval member, no Now-relation — present.
  }
  return { s, day, todos, gathered, prehendsNow };
}

describe("bucketsOf — property 1: interior partition is total and disjoint over the interval set", () => {
  for (let seed = 0; seed < 12; seed++) {
    it(`seed ${seed}`, () => {
      const { s, todos } = randomDay(seed);
      const b = bucketsOf(s, "the-day");
      const { future, present, past } = b.interior;
      const all = [...future, ...present, ...past];
      expect(new Set(all)).toEqual(new Set(todos)); // total: every todo lands somewhere
      expect(all.length).toBe(new Set(all).size); // disjoint: no todo in more than one bucket
    });
  }
});

describe("bucketsOf — property 2: a sublime's members are empty, but its interior is not", () => {
  it("q-sublime-pole event: membersOf stays [] (unchanged fence law); interior stories land in present", () => {
    const s = new Society();
    lay(s, "the-sublime");
    unpackPoles(s, "the-sublime"); // ordinary unpack — its Now never gathers anything
    grounds(s, "story-x", "the-sublime");
    grounds(s, "story-y", "the-sublime");
    expect(membersOf(s, "the-sublime")).toEqual([]); // the red fence's own guarantee, untouched
    const b = bucketsOf(s, "the-sublime");
    expect(b.interior.future).toEqual([]);
    expect(new Set(b.interior.present)).toEqual(new Set(["story-x", "story-y"])); // perpetually unresolved
    expect(b.interior.past).toEqual([]);
  });
});

describe("bucketsOf — property 3: crossing the Now moves future→past, never back", () => {
  it("a todo that prehends the Now is future; once Now also gathers it, it's past — and stays past", () => {
    const s = new Society();
    lay(s, "the-day");
    const day = unpackPoles(s, "the-day");
    grounds(s, "todo-a", "the-day");
    grounds(s, "todo-a", day.now); // todo-a prehends the Now: future
    const before = bucketsOf(s, "the-day");
    expect(before.interior.future).toContain("todo-a");
    expect(before.interior.past).not.toContain("todo-a");

    grounds(s, day.now, "todo-a"); // the Now gathers it — append-only, no undo
    const after = bucketsOf(s, "the-day");
    expect(after.interior.past).toContain("todo-a");
    expect(after.interior.future).not.toContain("todo-a");
    // append-only: there is no operation that could move it back to future from here.
    expect(bucketsOf(s, "the-day").interior.past).toContain("todo-a");
  });

  for (let seed = 20; seed < 26; seed++) {
    it(`seed ${seed}: gathered todos are never in future`, () => {
      const { s, gathered } = randomDay(seed);
      const b = bucketsOf(s, "the-day");
      for (const g of gathered) {
        expect(b.interior.future).not.toContain(g);
        expect(b.interior.past).toContain(g);
      }
    });
  }
});

describe("bucketsOf — property 4: closing alone does not change any interior bucket (convergence)", () => {
  for (let seed = 40; seed < 46; seed++) {
    it(`seed ${seed}`, () => {
      const { s, day } = randomDay(seed);
      const before = JSON.stringify(bucketsOf(s, "the-day").interior);
      grounds(s, day.end, day.now); // the End gathers everything the Now held…
      closePole(s, "the-day"); // …then the pole actually closes.
      const after = JSON.stringify(bucketsOf(s, "the-day").interior);
      expect(after).toBe(before); // closing is a no-op on interior by itself
    });
  }
});

describe("bucketsOf — property 5: ~holds~ edges never change any bucket", () => {
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

describe("bucketsOf — property 6: THE LURE LAW — sublimes climb by charge, not grounding", () => {
  it("a charge from a direct-after event onto a designated sublime surfaces it in sublimesTree", () => {
    const s = new Society();
    lay(s, "the-day");
    unpackPoles(s, "the-day");
    grounds(s, "tomorrow", "the-day"); // tomorrow is directly after the-day
    lay(s, "star-of-hope");
    s.layP("tomorrow~sublime~star", "oriented to a star", "tomorrow", "star-of-hope", "q-sublime-pole");
    // a bare charge FROM tomorrow ONTO the star — appetition, THE LURE LAW's shape.
    s.lay({ slug: "tomorrow~because~star", content: "tomorrow sails under the star", subject: "tomorrow", object: "star-of-hope" });
    const b = bucketsOf(s, "the-day");
    expect(b.after.direct).toContain("tomorrow");
    expect(b.after.sublimesTree).toContain("star-of-hope");
  });

  it("an ordinary GROUNDING edge toward the same node does NOT surface it in sublimesTree", () => {
    const s = new Society();
    lay(s, "the-day");
    unpackPoles(s, "the-day");
    grounds(s, "tomorrow", "the-day");
    lay(s, "star-of-hope");
    s.layP("tomorrow~sublime~star", "oriented to a star", "tomorrow", "star-of-hope", "q-sublime-pole");
    // a q-grounding edge (quality-carrying) toward the star instead of a bare charge —
    // this is NOT appetition under THE LURE LAW, and must not appear in sublimesTree.
    s.layP("tomorrow~because~star-grounded", "a grounding edge, not a charge", "tomorrow", "star-of-hope", "q-grounding");
    const b = bucketsOf(s, "the-day");
    expect(b.after.direct).toContain("tomorrow");
    expect(b.after.sublimesTree).not.toContain("star-of-hope");
  });

  it("indirectSublimesTree finds stars charged from indirect-after events, closest-first dedup", () => {
    const s = new Society();
    lay(s, "the-day");
    unpackPoles(s, "the-day");
    grounds(s, "tomorrow", "the-day");
    grounds(s, "day-after-tomorrow", "tomorrow"); // indirect-after the-day
    lay(s, "star-of-hope");
    s.layP("d~sublime~star", "oriented to a star", "day-after-tomorrow", "star-of-hope", "q-sublime-pole");
    s.lay({ slug: "dat~because~star", content: "charges the star", subject: "day-after-tomorrow", object: "star-of-hope" });
    const b = bucketsOf(s, "the-day");
    expect(b.after.indirect).toContain("day-after-tomorrow");
    expect(b.after.sublimesTree).not.toContain("star-of-hope"); // not charged from a DIRECT member
    expect(b.after.indirectSublimesTree).toContain("star-of-hope");
  });

  it("bucketsOf and countsOf agree on sublimesTree cardinality with a real charge present", () => {
    const s = new Society();
    lay(s, "the-day");
    unpackPoles(s, "the-day");
    grounds(s, "tomorrow", "the-day");
    lay(s, "star-of-hope");
    s.layP("tomorrow~sublime~star", "oriented to a star", "tomorrow", "star-of-hope", "q-sublime-pole");
    s.lay({ slug: "tomorrow~because~star", content: "charges the star", subject: "tomorrow", object: "star-of-hope" });
    const b = bucketsOf(s, "the-day");
    const c = countsOf(s, "the-day");
    expect(c.after.sublimesTree).toBe(b.after.sublimesTree.length);
    expect(c.after.indirectSublimesTree).toBe(b.after.indirectSublimesTree.length);
  });
});

describe("bucketsOf and countsOf agree on cardinality", () => {
  for (let seed = 0; seed < 6; seed++) {
    it(`seed ${seed}`, () => {
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
