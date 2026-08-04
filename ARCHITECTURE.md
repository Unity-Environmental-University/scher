# Architecture notes

Short notes on decisions that look like warts but are load-bearing. If you're tempted
to "fix" one of these, read here first.

## Why the library's own imports say `.js`

The library builds with plain `tsc`, and `tsc` does not rewrite import specifiers: it
type-checks `./society.js` against `society.ts` and emits the import unchanged, so the
emitted `.js` resolves natively in Node and the browser. Under `tsc` alone, `.js` is not
a style choice — it is the only specifier that survives the build.

That is a fact about **this package's own build**, and it stops there. How a consumer
imports scher is a separate question, answered in `IMPORTING.md`: bundle the app, leave
the library bare. Both are true at once.

### FUNERAL: "and why there's no build layer" (2026-06-23 – 2026-08-04)

This section used to carry a second half forbidding bundlers — *"No bundler, no alias
resolver, no virtual modules… Keep this library bare"* — on two grounds: honesty about
what runs, and crawler-friendliness. It also framed `.js` imports as a positive good
rather than as a `tsc` constraint.

**Hallie's ruling, 2026-08-04**, in two parts:

> *"I don't actually mind a bundler, haven't for a while, have had this conversation
> multiple times."*
>
> *"I don't want to be importing .js files, I want to be importing .ts for human
> readability and linter functionality."*

The repetition is the finding. A doc that has to be overruled repeatedly is not recording
a decision; it is manufacturing one. This section was cited back to her twice in one
session as a reason she couldn't have something she had never asked not to have.

It was already answered before it was buried. `IMPORTING.md` (2026-07-30, `88ae67d`) takes
both arguments apart on the merits — sourcemaps already buy the legibility that "the
source IS the artifact" was defending; crawler-friendliness has teeth only if something
actually crawls — and names the conflation directly: *"That is an argument about scher's
dist. It is not an argument about how your app consumes scher. Those got conflated, and
the conflation cost this repo some ergonomics it did not need to pay for."* That analysis
stands; this is the section it was about, now removed rather than left to be re-litigated.

One detail worth recording, because it is what made the prose persuasive: it cited "the
scar-comment in `frames.ts` — a bare specifier that didn't resolve in the browser blanked
a page." `grep` for `blanked` or `bare specifier` across `src/` returns nothing, in either
checkout. The measured-sounding detail was decoration.

**Measured, 2026-08-04** — both halves of the ruling work in a vite consumer:

- **`.ts` imports:** `allowImportingTsExtensions: true` with `moduleResolution: "bundler"`.
  `tsc --noEmit` passes, vite builds, and no `.ts` specifier survives into the output
  (verified by grep on the emitted bundle) — the bundler resolves and inlines them.
  Requires `noEmit`/`emitDeclarationOnly`, which is the right shape for an app anyway.
- **JSX:** `el(tag, props, ...children)` is already the classic JSX factory signature, so
  JSX needs *no library change* — a `jsx.d.ts` mapping `JSX.IntrinsicElements` to
  `ElOptions`, plus `jsxFactory: "el"`. Verified type-level (red on a bad tag and a bad
  prop) and at runtime under jsdom (real DOM, live event handler). Implementer's note:
  vite 6+/vitest 4.x transform with **oxc**, which silently ignores `esbuild.jsxFactory`
  and then fails resolving `react/jsx-dev-runtime`; the working key is
  `oxc: { jsx: { runtime: "classic", pragma: "el" } }`.

A worked example of both is in `penelope-course/specs/muslins-and-examples/`.

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
