// ─────────────────────────────────────────────────────────────────────────────
// conformance.membership-buckets.test.ts — the TS half of the membership/buckets
// conformance corpus (2026-07-16/17). Replays conformance/membership-buckets.json —
// NEUTRAL GROUND, owned by neither twin — and asserts its expected readings.
// No Rust twin exists yet for membersOf/bucketsOf (see the fixture's own TODO header);
// this file proves the fixture replays correctly against the TS kernel today, so a
// future scher-core port has neutral ground to port against unedited.
//
// DELIBERATELY MINIMAL harness, same shape as conformance.bare-closing.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Society, membersOf, bucketsOf, type EventRow } from "../src/society.js";

interface FixtureRow {
  slug: string;
  content: string;
  subject?: string;
  object?: string;
  witnessed: number;
}
interface FixtureSociety {
  id: string;
  rows: FixtureRow[];
}
interface Expectation {
  society: string;
  read: "membersOf" | "bucketsOf.interior.past" | "bucketsOf.interior.future" |
    "bucketsOf.interior.present" | "bucketsOf.after.direct";
  event: string;
  value: string[];
}
interface Fixture {
  name: string;
  societies: FixtureSociety[];
  expect: Expectation[];
}

const fixturePath = fileURLToPath(new URL("../conformance/membership-buckets.json", import.meta.url));
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

function replay(rows: FixtureRow[]): Society {
  const soc = new Society();
  for (const r of rows) {
    // verbatim via the one write — mode-beats (~q) included, no layP/unpackPoles/closePole
    // constructor, so a future Rust harness (no TS guards, no live-object helpers) can lay
    // byte-identical state from the same rows.
    soc.lay({
      slug: r.slug,
      content: r.content,
      subject: r.subject ?? null,
      object: r.object ?? null,
      witnessed: r.witnessed,
    } as EventRow);
  }
  return soc;
}

function readValue(soc: Society, e: Expectation): string[] {
  switch (e.read) {
    case "membersOf": return membersOf(soc, e.event).sort();
    case "bucketsOf.interior.past": return bucketsOf(soc, e.event).interior.past.sort();
    case "bucketsOf.interior.future": return bucketsOf(soc, e.event).interior.future.sort();
    case "bucketsOf.interior.present": return bucketsOf(soc, e.event).interior.present.sort();
    case "bucketsOf.after.direct": return bucketsOf(soc, e.event).after.direct.sort();
  }
}

describe(`conformance corpus: ${fixture.name}`, () => {
  const societies = new Map(fixture.societies.map((s) => [s.id, replay(s.rows)]));
  for (const e of fixture.expect) {
    it(`${e.society}: ${e.read}(${e.event})`, () => {
      const soc = societies.get(e.society);
      if (!soc) throw new Error(`fixture has no society '${e.society}'`);
      expect(readValue(soc, e)).toEqual([...e.value].sort());
    });
  }
});
