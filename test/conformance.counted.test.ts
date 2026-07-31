// ─────────────────────────────────────────────────────────────────────────────
// conformance.counted.test.ts — the TS twin replays the counted corpus.
//
// `conformance/counted.json` is neutral ground: it belongs to neither twin's
// directory, and the Rust twin (scher-core/src/counted.rs) and the compiled
// kernel (scher-core-wasm) replay the same file. Agreement is PROVED here, not
// assumed — which is the only thing that makes a hand-kept port safe.
//
// WHY THE TS TWIN STILL EXISTS — AND A CORRECTION (2026-07-30)
// ------------------------------------------------------------
// A first draft of this header argued the TS twin was NECESSARY because
// consumers would otherwise need the Rust toolchain. Hallie: "do we actually
// need the rust toolchain on the client? can we not ship it with the compiled
// wasm?" — and she is right; that argument was wrong.
//
// wasm-pack's whole output IS an npm package. `pkg/` is 125KB of compiled
// bytes plus generated .d.ts. It is gitignored here BY CHOICE (the default
// wasm-pack writes for a package it expects you to publish), not by necessity.
// Ship it — published to npm, or simply committed — and a consumer installs
// compiled bytes and needs no Rust at all. Only MAINTAINERS need the
// toolchain, which is the normal deal for any compiled dependency.
//
// So the real reasons to keep a TS fold are narrower, and worth stating
// honestly rather than hiding behind a toolchain claim:
//   * no `await init()` before the first read (the wasm boundary needs one)
//   * no boundary crossing for a fold over a handful of beats, where the
//     JSON hop costs more than the arithmetic saves
//   * `src/` stays runnable as raw ES modules — vendor-it-and-go survives
// Those are real but they are TRADEOFFS, not a blocker. Retiring this twin in
// favour of the compiled kernel is a live option, not a foreclosed one.
//
// Meanwhile: Rust is the DEFINITION, wasm is the fast path, and the TS is a
// CHECKED PORT — checked by this file, against the same corpus, every run.
// That check already earned itself: it caught an asOf bug in the TS fold
// (occlusion read at "now" while deltas read "as of then", so the past changed
// whenever the present did) within a minute of existing, which the
// hand-written TS unit tests had passed clean.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Society, type EventRow } from "../src/society.js";
import { valueOf, sectionOf, countedOf } from "../scher-pages/src/counted.js";

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("../conformance/counted.json", import.meta.url)), "utf8"),
);

/** Replay rows verbatim via the one write — no layP guards, matching the
 *  discipline every other conformance harness in this corpus uses. */
function replay(rows: any[]): Society {
  const soc = new Society();
  for (const r of rows) {
    soc.lay({
      slug: r.slug,
      content: r.content,
      // THE DIVERGENCE THIS CORPUS EXISTS TO CATCH: Rust calls the headline
      // field `name`, TS calls it `title`. The fixture is written in the Rust
      // spelling (it is the definition); the TS harness maps it here, in one
      // visible place, rather than either kernel being quietly renamed.
      title: r.name ?? r.title ?? null,
      subject: r.subject ?? null,
      object: r.object ?? null,
      witnessed: r.witnessed,
      laid_by: r.laid_by ?? null,
    } as EventRow);
  }
  return soc;
}

describe(`conformance corpus (TS replay): ${fixture.name}`, () => {
  for (const s of fixture.societies) {
    describe(s.id, () => {
      const spec = (holder: string) => ({ holder });

      if (s.expect.valueOf !== undefined) {
        it("folds to the expected value", () => {
          const { holder, key, value } = s.expect.valueOf;
          expect(valueOf(replay(s.rows), spec(holder), key)).toBe(value);
        });
      }

      if (s.expect.alsoValueOf) {
        it("and the other holder folds separately", () => {
          const { holder, key, value } = s.expect.alsoValueOf;
          expect(valueOf(replay(s.rows), spec(holder), key)).toBe(value);
        });
      }

      if (s.expect.valueAsOf) {
        it("reads the past at each standpoint", () => {
          const soc = replay(s.rows);
          const { holder, key } = s.expect.valueOf;
          for (const { asOf, value } of s.expect.valueAsOf)
            expect(valueOf(soc, spec(holder), key, { asOf })).toBe(value);
        });
      }

      if (s.expect.sectionOf) {
        it("reads the newest live placement", () => {
          const { holder, key, section } = s.expect.sectionOf;
          expect(sectionOf(replay(s.rows), spec(holder), key)).toBe(section);
        });
      }

      if (s.expect.sectionAsOf) {
        it("the old placement stays readable as-of", () => {
          const soc = replay(s.rows);
          const { holder, key } = s.expect.sectionOf;
          for (const { asOf, section } of s.expect.sectionAsOf)
            expect(sectionOf(soc, spec(holder), key, { asOf })).toBe(section);
        });
      }

      if (s.expect.label) {
        it("reads the label off the key beat (the name/title divergence)", () => {
          const { holder, key } = s.expect.valueOf;
          expect(countedOf(replay(s.rows), spec(holder), key)!.label).toBe(s.expect.label);
        });
      }

      if (s.expect.contributions !== undefined) {
        it("reports every surviving contribution", () => {
          const { holder, key } = s.expect.valueOf;
          expect(countedOf(replay(s.rows), spec(holder), key)!.from.length)
            .toBe(s.expect.contributions);
        });
      }

      if (s.expect.layers) {
        it("the fold does not flatten WHO", () => {
          const { holder, key } = s.expect.valueOf;
          const by = countedOf(replay(s.rows), spec(holder), key)!.from
            .map((f) => f.by).filter(Boolean).sort();
          expect(by).toEqual([...s.expect.layers].sort());
        });
      }
    });
  }
});
