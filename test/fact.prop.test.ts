// ─────────────────────────────────────────────────────────────────────────────
// fact.prop.test.ts — property tests for the positivist porcelain (Fact).
//
// A Fact is a get/set(boolean) handle over an append-only establishment. Its whole
// promise is that the laminar surface stays HONEST about the process underneath:
//
//   • round-trip — after any sequence of set(b), get() equals the last set value.
//   • intent-idempotence — set(x) when already x appends nothing.
//   • append-only undo — the underlying log NEVER shrinks, not even on set(false).
//
// These are exactly the claims that, if false, resurrect the toggle-desync bug. So we
// throw arbitrary boolean sequences at the handle and assert they hold over all of them.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Society, type Beat } from "../src/society.js";
import { fact } from "../src/fact.js";

const TARGET = "the-task";
const FRAME = "me";

function freshSociety(): Society {
  return new Society([
    { slug: TARGET, content: "a task", subject: null, object: null },
    { slug: FRAME, content: "the actor", subject: null, object: null },
  ] as Beat[]);
}

describe("Fact — the laminar surface stays honest", () => {
  it("get() always equals the last set() value, for any boolean sequence", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 30 }), (moves) => {
        const soc = freshSociety();
        const f = fact(soc, TARGET, { by: FRAME });
        let last = false; // starts ungrounded → false
        for (const m of moves) {
          f.set(m);
          last = m;
          expect(f.get()).toBe(last);
        }
        expect(f.get()).toBe(last);
      }),
    );
  });

  it("set(x) when already x is inert — appends nothing", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 30 }), (moves) => {
        const soc = freshSociety();
        const f = fact(soc, TARGET, { by: FRAME });
        for (const m of moves) {
          const before = soc.size;
          const wasAlready = f.get() === m;
          f.set(m);
          if (wasAlready) expect(soc.size).toBe(before); // no needless append
        }
      }),
    );
  });

  it("the log is monotone non-decreasing — set(false) supersedes, never erases", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 30 }), (moves) => {
        const soc = freshSociety();
        const f = fact(soc, TARGET, { by: FRAME });
        let prev = soc.size;
        for (const m of moves) {
          f.set(m);
          expect(soc.size).toBeGreaterThanOrEqual(prev);
          prev = soc.size;
        }
      }),
    );
  });

  it("get() agrees with the reactive read after every move", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 30 }), (moves) => {
        const soc = freshSociety();
        const f = fact(soc, TARGET, { by: FRAME });
        for (const m of moves) {
          f.set(m);
          expect(f.read.get()).toBe(f.get());
        }
      }),
    );
  });

  it("history() is monotone and only ever grows — the seam is never erased", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 30 }), (moves) => {
        const soc = freshSociety();
        const f = fact(soc, TARGET, { by: FRAME });
        let prev = 0;
        for (const m of moves) {
          f.set(m);
          const h = f.history().length;
          expect(h).toBeGreaterThanOrEqual(prev);
          prev = h;
        }
      }),
    );
  });
});
