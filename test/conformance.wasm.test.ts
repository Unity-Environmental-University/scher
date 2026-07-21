// ─────────────────────────────────────────────────────────────────────────────
// conformance.wasm.test.ts — MUSLIN (2026-07-21 wasm first slice): the THIRD replay
// target for the conformance corpus. The same neutral-ground fixtures the two twins
// replay (scher-core/tests/*.rs, test/conformance.*.test.ts) are replayed here
// against the COMPILED kernel — scher-core built to wasm via scher-core-wasm — so
// the shipped artifact, not just the source twins, provably agrees on the grammar.
//
// Covers the reads the wasm boundary exposes: membersOf + bucketsOf, i.e. the
// membership-buckets fixture (the other two fixtures exercise reads the slice
// deliberately does not expose yet).
//
// SKIPS LOUDLY when scher-core-wasm/pkg is absent — the package is a build
// artifact (`cd scher-core-wasm && wasm-pack build --target web --release`), and
// a checkout without the Rust toolchain must not go red for it. A skip is a
// signal, not a pass: CI that wants this proof must build the pkg first.
//
// Node + `--target web` init: the web target's default loader fetch()es the .wasm;
// under Node we read the bytes ourselves and hand them to init — the one-await
// startup the README documents.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface FixtureRow {
  slug: string;
  content: string;
  subject?: string;
  object?: string;
  witnessed: number;
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
  societies: { id: string; rows: FixtureRow[] }[];
  expect: Expectation[];
}

const pkgJs = fileURLToPath(new URL("../scher-core-wasm/pkg/scher_core_wasm.js", import.meta.url));
const pkgWasm = fileURLToPath(new URL("../scher-core-wasm/pkg/scher_core_wasm_bg.wasm", import.meta.url));
const built = existsSync(pkgJs) && existsSync(pkgWasm);
if (!built) {
  // eslint-disable-next-line no-console
  console.warn(
    "[conformance.wasm] SKIPPED — scher-core-wasm/pkg not built. " +
      "Run: cd scher-core-wasm && wasm-pack build --target web --release",
  );
}

const fixturePath = fileURLToPath(new URL("../conformance/membership-buckets.json", import.meta.url));
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

describe.skipIf(!built)(`conformance corpus (wasm replay): ${fixture.name}`, () => {
  // one society per fixture id, constructed by ONE boundary call each (rows as a batch)
  const societies = new Map<string, { bucketsOf(e: string): string; membersOf(e: string): string }>();

  beforeAll(async () => {
    const mod = await import(pkgJs);
    await mod.default({ module_or_path: readFileSync(pkgWasm) }); // the one-await init
    for (const s of fixture.societies) {
      societies.set(s.id, new mod.WasmSociety(JSON.stringify(s.rows)));
    }
  });

  function readValue(soc: { bucketsOf(e: string): string; membersOf(e: string): string }, e: Expectation): string[] {
    if (e.read === "membersOf") return (JSON.parse(soc.membersOf(e.event)) as string[]).sort();
    const buckets = JSON.parse(soc.bucketsOf(e.event));
    switch (e.read) {
      case "bucketsOf.interior.past": return [...buckets.interior.past].sort();
      case "bucketsOf.interior.future": return [...buckets.interior.future].sort();
      case "bucketsOf.interior.present": return [...buckets.interior.present].sort();
      case "bucketsOf.after.direct": return [...buckets.after.direct].sort();
    }
  }

  for (const e of fixture.expect) {
    it(`${e.society}: ${e.read}(${e.event})`, () => {
      const soc = societies.get(e.society);
      if (!soc) throw new Error(`fixture has no society '${e.society}'`);
      expect(readValue(soc, e)).toEqual([...e.value].sort());
    });
  }
});
