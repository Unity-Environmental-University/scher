# Architecture notes

Short notes on decisions that look like warts but are load-bearing. If you're tempted
to "fix" one of these, read here first.

## Why imports say `.js`, not `.ts` — and why there's no build layer

You'll see `import { … } from "./society.js"` in `.ts` files. This is correct and
deliberate, not a leftover.

- **`tsc` does not rewrite import specifiers.** It type-checks `./society.js` against
  `society.ts` and emits the import *unchanged*, so the emitted `.js` resolves natively
  in Node and the browser. Importing `./society.ts` either errors or can't be emitted to
  runnable JS.
- **scher is `tsc`-only, on purpose.** The pitch is: zero runtime deps, raw ES modules
  served static, the source *is* the artifact (modulo type erasure). No bundler, no
  alias resolver, no virtual modules. `npm run build` is one `tsc` invocation.

A build layer (esbuild/vite/rollup) *could* let us write `./society.ts` or extensionless
imports — bundlers don't care about the extension. We don't, for two reasons:

1. **Honesty about what runs.** A bundler trades "the source is the artifact" for "the
   source compiles to the artifact." For a library whose value is legibility and
   no-magic, that's a real loss. (See the scar-comment in `frames.ts`: a bare specifier
   that didn't resolve in the browser blanked a page in the parent project.)
2. **AST/crawler friendliness.** The `.js`-pointing-at-`.ts` convention keeps the
   *source* import graph identical to the *runtime* import graph. A naive crawler reads
   `from "./society.js"`, maps it to `society.ts`, and is done — no resolver config to
   replicate. Add aliases or extensionless imports behind a bundler and any tool walking
   the graph must now reimplement your resolver. The ugly-looking convention is the
   crawler-friendly one.

If you want nicer imports, do it in an *app* or a bundled consumer — places where a
bundler already earns its keep. Keep this library bare.

## Why time/locale use native `Intl`, not Temporal

`frames.ts` models a timezone/locale as a reference frame. The TC39 Temporal API is the
natural substrate for this (`Temporal.PlainDate` is exactly "a calendar date that can't
zone-shift"). We don't use it yet: as of mid-2026 Temporal ships in Chrome 144+ and is
ES2026, but Safari and most mobile browsers still lack stable support, so adopting it
would force a ~200KB polyfill and break the zero-dep promise. The time surface
(`timeFrame` / `clockLabel`) is kept deliberately small so it can be reimplemented over
Temporal — with no caller-visible API change — once it's Baseline.

## Why the tests are property-based

The process core (`society.ts`, `fact.ts`) is an append-only model: state changes only
by appending, values are read not stored. For that shape, the *invariants are the spec*
— so the tests generate arbitrary histories and assert laws (monotonicity, order-
independence of reads, undo-is-append, `Fact.get()` tracks the last `set()`) rather than
checking hand-picked examples. See `test/`.
