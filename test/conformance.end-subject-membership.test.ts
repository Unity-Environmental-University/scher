// ─────────────────────────────────────────────────────────────────────────────
// conformance.end-subject-membership.test.ts — the TS half of the twin
// conformance corpus for the 2026-07-20 ruling ("The End prehends the capture").
// Replays conformance/end-subject-membership.json — NEUTRAL GROUND, owned by
// neither twin. scher-core/tests/end_subject_membership_fixture.rs replays the
// SAME file.
//
// This fixture exists because interval-occlusion.json could not see the law: it
// has no edge whose subject is a designated End-pole, so it blessed a real
// divergence for eight days. If either side fails here, the engines disagree on
// STORY MEMBERSHIP — not on shape.
//
// Follows conformance.interval-occlusion.test.ts's shape.
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

const fixturePath = fileURLToPath(new URL("../conformance/end-subject-membership.json", import.meta.url));
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

function replay(rows: FixtureRow[]): Society {
  const soc = new Society();
  for (const r of rows) {
    // rows verbatim via the one write — mode-beats (~q) included, no layP
    // constructor, so the Rust harness lays byte-identical state.
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
