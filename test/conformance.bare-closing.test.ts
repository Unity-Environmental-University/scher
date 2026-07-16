// ─────────────────────────────────────────────────────────────────────────────
// conformance.bare-closing.test.ts — the TS half of the twin conformance corpus
// (2026-07-16, bare-closing conformance port). Replays conformance/bare-closing.json
// — NEUTRAL GROUND, owned by neither twin — and asserts its expected readings.
// scher-core/tests/bare_closing_fixture.rs replays the SAME file; if either side
// fails, the engines have diverged on the bare-closing semantics (Hallie's
// 2026-07-15 ruling: edge direction alone carries the closing).
//
// DELIBERATELY MINIMAL harness: one fixture, a tiny read-dispatcher, simple enough
// to extend. The full corpus is a later sitting's work — this proves the shape.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Society, endActual, voltageOf, reaches, type Quality } from "../src/society.js";

interface FixtureRow {
  slug: string;
  content: string;
  subject?: string;
  object?: string;
  witnessed: number;
}
interface Expectation {
  read: "endActual" | "voltageOf" | "reaches";
  asOf?: number;
  value: boolean | number;
  node?: string;
  story?: string;
  from?: string;
  to?: string;
  quality?: string;
}
interface Fixture {
  name: string;
  rows: FixtureRow[];
  expect: Expectation[];
}

const fixturePath = fileURLToPath(new URL("../conformance/bare-closing.json", import.meta.url));
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

function replay(rows: FixtureRow[]): Society {
  const soc = new Society();
  for (const r of rows) {
    // rows verbatim via the one write — mode-beats (~q) included, no layP constructor,
    // so the Rust harness (which has no TS guards) lays byte-identical state.
    soc.lay({
      slug: r.slug,
      content: r.content,
      subject: r.subject ?? null,
      object: r.object ?? null,
      witnessed: r.witnessed,
    });
  }
  return soc;
}

function label(e: Expectation): string {
  const at = e.asOf === undefined ? "now" : `asOf=${e.asOf}`;
  switch (e.read) {
    case "endActual": return `endActual(${e.node}) @ ${at}`;
    case "voltageOf": return `voltageOf(${e.story}) @ ${at}`;
    case "reaches": return `reaches(${e.from} → ${e.to}, ${e.quality}) @ ${at}`;
  }
}

describe(`conformance corpus: ${fixture.name}`, () => {
  const soc = replay(fixture.rows);
  for (const e of fixture.expect) {
    it(label(e), () => {
      switch (e.read) {
        case "endActual":
          expect(endActual(soc, e.node!, e.asOf)).toBe(e.value);
          break;
        case "voltageOf":
          expect(voltageOf(soc, e.story!, undefined, e.asOf)).toBe(e.value);
          break;
        case "reaches":
          expect(reaches(soc, e.from!, e.to!, e.quality! as Quality, e.asOf)).toBe(e.value);
          break;
      }
    });
  }
});
