// ─────────────────────────────────────────────────────────────────────────────
// conformance.counted.wasm.test.ts — the THIRD replay target for the counted
// corpus: the COMPILED kernel.
//
// Three implementations now replay `conformance/counted.json`:
//   1. scher-core/src/counted.rs        (cargo test — the definition)
//   2. scher-pages/src/counted.ts       (conformance.counted.test.ts — the port)
//   3. scher-core-wasm/pkg              (THIS FILE — the shipped artifact)
//
// The third matters because the artifact is what actually runs. Source twins
// agreeing proves nothing about bytes that were built from an older source —
// and `pkg/` is now COMMITTED (2026-07-30), which makes staleness a real
// failure mode rather than a hypothetical one. This file is what catches it.
//
// WHY COMMITTED BYTES ARE WORTH THE STALENESS RISK
// -----------------------------------------------
// A fresh checkout gets the compiled kernel with no Rust toolchain. Only
// maintainers need rustup + wasm-pack, which is the normal deal for any
// compiled dependency. The cost is that `pkg/` can lag its source; the
// mitigation is this replay, which goes red when it does.
//
// AND WHAT IT UNLOCKS (Hallie, 2026-07-30): "also lets us get the game engine
// things writing in bytecode." Once the kernel is compiled, the parts of a
// game engine that want speed can be Rust — physics stepping, a deck's
// constraint solve, appetition counts over large cones, a collision broad
// phase — each crossing the boundary once per read, each with the naive fold
// as a correctness oracle. Same argument as git's storage layer: the model
// stays honest, the storage gets to be clever, and the definition is what you
// check the cleverness against.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkgJs = fileURLToPath(new URL("../scher-core-wasm/pkg/scher_core_wasm.js", import.meta.url));
const pkgWasm = fileURLToPath(new URL("../scher-core-wasm/pkg/scher_core_wasm_bg.wasm", import.meta.url));
const built = existsSync(pkgJs) && existsSync(pkgWasm);
if (!built) {
  // eslint-disable-next-line no-console
  console.warn(
    "[conformance.counted.wasm] SKIPPED — scher-core-wasm/pkg not built. " +
      "Run: cd scher-core-wasm && wasm-pack build --target web --release",
  );
}

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("../conformance/counted.json", import.meta.url)), "utf8"),
);

let WasmSociety: any;

beforeAll(async () => {
  if (!built) return;
  // `--target web` fetches the .wasm by default; under Node we hand it the
  // bytes ourselves. The one await the README documents.
  const mod = await import(pkgJs);
  await mod.default({ module_or_path: readFileSync(pkgWasm) });
  WasmSociety = mod.WasmSociety;
});

describe.skipIf(!built)(`conformance corpus (wasm replay): ${fixture.name}`, () => {
  for (const s of fixture.societies) {
    describe(s.id, () => {
      // ONE crossing: the whole society in, per the crate's design law.
      const soc = () => new WasmSociety(JSON.stringify(s.rows));

      if (s.expect.valueOf) {
        it("the compiled fold agrees", () => {
          const { holder, key, value } = s.expect.valueOf;
          expect(soc().valueOf(holder, key, undefined)).toBe(value);
        });
      }

      if (s.expect.alsoValueOf) {
        it("and holders stay separate in the kernel too", () => {
          const { holder, key, value } = s.expect.alsoValueOf;
          expect(soc().valueOf(holder, key, undefined)).toBe(value);
        });
      }

      if (s.expect.valueAsOf) {
        it("as-of agrees at every standpoint", () => {
          const w = soc();
          const { holder, key } = s.expect.valueOf;
          for (const { asOf, value } of s.expect.valueAsOf)
            expect(w.valueOf(holder, key, asOf)).toBe(value);
        });
      }

      if (s.expect.sectionOf) {
        it("placement agrees", () => {
          const { holder, key, section } = s.expect.sectionOf;
          expect(soc().sectionOf(holder, key, undefined)).toBe(section);
        });
      }

      if (s.expect.sectionAsOf) {
        it("past placement agrees", () => {
          const w = soc();
          const { holder, key } = s.expect.sectionOf;
          for (const { asOf, section } of s.expect.sectionAsOf)
            expect(w.sectionOf(holder, key, asOf)).toBe(section);
        });
      }

      if (s.expect.label) {
        it("the label crosses the name/title divergence correctly", () => {
          const { holder, key } = s.expect.valueOf;
          const c = JSON.parse(soc().countedOf(holder, key, undefined));
          expect(c.label).toBe(s.expect.label);
        });
      }

      if (s.expect.layers) {
        it("provenance survives the boundary", () => {
          const { holder, key } = s.expect.valueOf;
          const c = JSON.parse(soc().countedOf(holder, key, undefined));
          const by = c.from.map((f: any) => f.by).filter(Boolean).sort();
          expect(by).toEqual([...s.expect.layers].sort());
        });
      }
    });
  }
});
