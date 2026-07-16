// ─────────────────────────────────────────────────────────────────────────────
// conformance.interval-occlusion.test.ts — the TS half of the twin conformance
// corpus (2026-07-16, occlusion-aware intervalOf). Replays
// conformance/interval-occlusion.json — NEUTRAL GROUND, owned by neither twin —
// and asserts its expected readings. scher-core/tests/interval_occlusion_fixture.rs
// replays the SAME file; if either side fails, the engines have diverged on
// whether intervalOf's walk honors occlusion (the app-side placement-laws law 7
// fence this fixture answers).
//
// Follows conformance.bare-closing.test.ts's shape: one fixture, a tiny
// read-dispatcher, simple enough to extend.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Society, intervalOf } from "../src/society.js";

interface FixtureRow {
  slug: string;
  content: string;
  subject?: string;
  object?: string;
  witnessed: number;
}
interface Expectation {
  read: "intervalOf";
  once: string;
  end: string;
  contains: string[];
  excludes: string[];
}
interface Fixture {
  name: string;
  rows: FixtureRow[];
  expect: Expectation[];
}

const fixturePath = fileURLToPath(new URL("../conformance/interval-occlusion.json", import.meta.url));
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
  return `intervalOf(${e.once} → ${e.end})`;
}

describe(`conformance corpus: ${fixture.name}`, () => {
  const soc = replay(fixture.rows);
  for (const e of fixture.expect) {
    it(label(e), () => {
      const interval = intervalOf(soc, e.once, e.end);
      for (const slug of e.contains) expect(interval).toContain(slug);
      for (const slug of e.excludes) expect(interval).not.toContain(slug);
    });
  }
});
