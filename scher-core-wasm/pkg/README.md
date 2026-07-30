# scher-core-wasm

> **MUSLIN — seams showing on purpose. Tear this apart before trusting it.**

The wasm-bindgen boundary around `scher-core`: one compiled kernel instead of two
hand-kept twins (Hallie's ruling, 2026-07-21 — approved as long as it lives in scher
and ships as a compiled, easily installable package). This first slice proves the
toolchain, the package shape, and the boundary cost. It does **not** port the whole
kernel and it deletes no TS.

## Build

```sh
# one-time toolchain: rustup target add wasm32-unknown-unknown && cargo install wasm-pack
cd scher-core-wasm
wasm-pack build --target web --release
```

`pkg/` is then a normal npm package: `scher_core_wasm_bg.wasm` (the compiled kernel),
`scher_core_wasm.js` (the loader/glue), `scher_core_wasm.d.ts` (generated types —
consumers get them for free, no hand-written declarations), and its own `package.json`.

## Install (npm `file:` dep)

```sh
npm install ./scher-core-wasm/pkg
# or in package.json: "scher-core-wasm": "file:../scher/scher-core-wasm/pkg"
```

## Startup: the one await

`--target web` makes init explicit — you await it once, then everything is sync:

```js
import init, { WasmSociety } from "scher-core-wasm";

await init();                          // browser: fetches the .wasm next to the JS
const soc = new WasmSociety(JSON.stringify(rows));  // ONE call, the whole canon
const buckets = JSON.parse(soc.bucketsOf("the-day")); // ONE call, the whole structure
```

Under Node (tests, benches) there is no fetch — hand init the bytes:

```js
import { readFileSync } from "node:fs";
await init({ module_or_path: readFileSync(pathToWasm) });
```

## No-bundler static serving (the penelope client)

The penelope client is tsc + static files, no bundler — that works: the loader
fetch()es `scher_core_wasm_bg.wasm` relative to its own URL, so just serve `pkg/`
as static files. **The server MUST send `Content-Type: application/wasm`** for
`.wasm` or `WebAssembly.instantiateStreaming` fails. (Most static servers do;
if yours doesn't, wasm-bindgen falls back to non-streaming instantiation with a
console warning — slower start, still correct.)

## The design law: coarse calls only

The boundary is crossed once per *read*, never once per *member*. Construct from a
batch; read whole structures (`bucketsOf` returns the entire `{after, before,
interior}` shape in one call). The `has`/`isOccluded` probes exist only so
`bench/bench.mjs` can quantify the chatty alternative — they are the cautionary
tale, not the API.

Measured (2026-07-21, M-series laptop, Node 25, 4507-row society, 1000 todos):

- one coarse `bucketsOf`: **wasm 252 ms vs TS twin 5613 ms — 22× faster**, JSON
  round-trip included; batch construction of the whole society: 6 ms.
- per-crossing tax on tiny probes: ~103 ns/call wasm vs ~57 ns/call TS (~2×).
  Cheap probes survive chattiness; a fanned-out read pays the tax thousands of
  times — hence the law.

## Conformance

`test/conformance.wasm.test.ts` (in scher's own suite) replays the neutral-ground
corpus (`conformance/membership-buckets.json`) against this compiled kernel — the
third replay target beside the two source twins. It skips loudly if `pkg/` isn't
built.

## Seams

- `members_of`/`buckets_of` are ported in *this* crate, not `scher-core` — the
  fixture's TODO(rust-port) port, squatting here so scher-core stayed untouched
  this slice. Extraction home (with an advocate for lib.rs) is the next move.
- JSON strings both ways; `serde-wasm-bindgen` would shave a copy per call.
- `as_of` crosses as a JS number, truncated to u64.
