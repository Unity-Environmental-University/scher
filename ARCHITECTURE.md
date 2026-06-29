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

## Process-shaped tests (the Trajectory harness)

A substance test asserts about a *final state*: set up, act, snapshot, expect. Its unit
is a value. But scher's claim is that the reality is *becoming*, not the snapshot — so
the deeper test asserts about a **trajectory**, with the witnessing-axis preserved:

| substance test | process test |
|---|---|
| final state equals X | the *trajectory passed through* X (`everReached`) |
| `f(input) === output` | the read is correct **for every moment t**, not just now (`asOf`) |
| idempotent | **monotone** — the reading only moves in allowed directions |
| order doesn't matter | order doesn't matter *for the settled reading*, **but witnessing order is itself observable** |

`test/support/trajectory.ts` is a harness whose unit is the trajectory: it records each
lay with the clock the society assigned, so it can replay the society *as of* any past
moment and read it there. Crucially, the harness is **tested as a trajectory itself**
(`test/trajectory.harness.test.ts`) — replay-as-of-the-last-moment must reproduce the
live society — because a test framework trusted on its own endpoint is the substance
cheat it's meant to escape.

This is also a *design* tool, not just a checking tool. The process-shaped assertion
`asOf(past).reads(beat)` was written **before** the library could satisfy it; the red
test was the spec for the time-relative read (`modeAt(soc, beat, asOf?)`), and making it
green surfaced a latent clock-monotonicity bug (explicit seed stamps didn't advance the
auto-stamp clock, so `asOf` reads could lie). A substance test would never have found
it. The witnessing-axis reads (`asOf`) are the first of several the harness is meant to
drive out; standpoint-relative reads (`from?`) and satisfaction/settledness come next.

## "Frame" means three different things — and none of them is a user

The word *frame* is overloaded across the public surface. Hold the distinction, because
conflating them is how a consumer accidentally couples this library to an auth provider:

1. **Reference frame** (`frames.ts`) — a reader's timezone/locale, a delta from the
   system default. Pure see-data: `timeFrame(userZone?)`, `localeFrame(userLocale?)`. No
   identity, ever.
2. **Standpoint** (occlusion, `society.ts`) — an **event reading from where it sits**. A
   frame is event-as-standpoint: the occasion (the **subject** of a prehension — `frame
   --q-grounding--> beat`, `E --q-occludes--> X`) that reads from its own position. A
   `Society` is not a different kind of thing here: **a society IS an event, read at the
   scale where its members are also events** — field to its members, standpoint to what
   prehends it. "Field" and "standpoint" are not two categories; they are which *direction*
   you read the same occasion. (Hallie, a personal society, is the event of Hallie Larsson.
   For a documented case of the theory applied, process theology — Whitehead's heirs,
   Cobb/Griffin/Hartshorne — works the *event of Jesus* this way: an event whose reality is in
   *how it is prehended*, not in a substance behind the readings — witnessed by the gospel-
   events, their translations, Paul, Fox, each *from the frame of that reading society*. A worked
   historical example, nothing more: witness is prehension, frame-relative, no view from nowhere.)
   So occlusion is standpoint-relative
   ("occluded HERE, full light THERE") because *here* means *from this event's vantage*, not
   "in a container." There is **no `Frame` type** — the standpoint is an event (an opaque
   beat-slug naming an occasion), never a constructed thing.
3. **`FrameStory`** (`stories.ts`) — an unrelated UI leaf (a Story that visually contains
   its beats). A naming collision; ignore it here.

The load-bearing rule (named by a clearness committee on the gen4 auth seam, 2026-06-29):
**a "frame" is a standpoint, never a person.** Authenticating *who* a reader is — verifying
a token, an LTI/Canvas launch, a JWT — belongs entirely at the *application's* edge, where
the outside becomes a reading-position. It resolves an identity *into* a standpoint and
hands the library a standpoint built only of see-concepts. The library must stay auth-blind:
no JWT, no token, no `deriveFrame(credential)` may ever enter it. The guard is structural,
not a feature to add — there is no `Frame` type that *could* grow a credential-taking
constructor, because the standpoint is an **event** (a beat that ingressed and now reads),
not a thing you build from a token. `deriveFrame` at the app's edge is exactly the *ingression*:
the outside becomes an occasion, and that occasion is the frame. If you ever find you can't
name a reading-position without a token, the coupling has already leaked into the library —
pull it back out to the app.
