// ─────────────────────────────────────────────────────────────────────────────
// conformance.one-end-reopen.test.ts — the TS half of the one-End fixture (Hallie's
// rulings, 2026-10-15). Replays conformance/one-end-reopen.json — NEUTRAL GROUND —
// and asserts its readings. scher-core/tests/one_end_reopen_fixture.rs replays the
// SAME file; if either side fails, the twins have diverged on what "done" means.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  Society, endActual, voltageOf, standingClosings, lawBreaches, diamond, type Quality,
} from "../src/society.js";

interface FixtureRow { slug: string; content: string; subject?: string; object?: string; witnessed: number; laid_by?: string }
interface Expectation {
  read: "endActual" | "voltageOf" | "standingClosings" | "lawBreaches" | "diamond";
  asOf?: number;
  value: unknown;
  node?: string;
  story?: string;
  from?: string;
  to?: string;
  quality?: string;
}

const fixturePath = fileURLToPath(new URL("../conformance/one-end-reopen.json", import.meta.url));
const fixture: { name: string; rows: FixtureRow[]; expect: Expectation[] } = JSON.parse(readFileSync(fixturePath, "utf8"));

const soc = new Society();
for (const r of fixture.rows) {
  soc.lay({
    slug: r.slug, content: r.content, subject: r.subject ?? null, object: r.object ?? null,
    witnessed: r.witnessed, ...(r.laid_by !== undefined ? { laid_by: r.laid_by } : {}),
  });
}

describe(`conformance corpus: ${fixture.name}`, () => {
  for (const e of fixture.expect) {
    const at = e.asOf === undefined ? "now" : `asOf=${e.asOf}`;
    it(`${e.read}(${e.node ?? e.story ?? e.from ?? ""}) @ ${at}`, () => {
      switch (e.read) {
        case "endActual": expect(endActual(soc, e.node!, e.asOf)).toBe(e.value); break;
        case "voltageOf": expect(voltageOf(soc, e.story!, undefined, e.asOf)).toBe(e.value); break;
        case "standingClosings": expect(standingClosings(soc, e.node!, e.asOf).map((c) => c.slug).sort()).toEqual(e.value); break;
        case "lawBreaches": expect(lawBreaches(soc, e.asOf)).toEqual(e.value); break;
        case "diamond": expect(diamond(soc, e.from!, e.to!, e.quality! as Quality, e.asOf)).toEqual(e.value); break;
      }
    });
  }
});
