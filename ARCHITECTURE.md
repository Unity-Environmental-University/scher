# Things we've learned

Not rulings. Notes with pointers to whatever makes them true, so a line that goes stale gets
caught by the thing it points at rather than sitting here sounding authoritative.

**Read the pointer, not this file.** If a note and the code disagree, the code is right.

---

- **The library builds with plain `tsc`, zero runtime deps** → `package.json`. `tsc` does not
  rewrite import specifiers, which is why `src/` says `./cell.js` while the file is
  `cell.ts` — under `tsc` alone that specifier is the one that survives the build. It is a
  build constraint, not a preference. **Hallie prefers `.ts` imports** (readability, working
  linters) and consumers should use them: `allowImportingTsExtensions` +
  `moduleResolution: "bundler"`, worked example in `penelope-course/specs/muslins-and-examples/`.
  Whether the library itself should move is open.

- **Time/locale use native `Intl`** → `src/frames.ts:20-26`, which says this better and is
  next to the code. Temporal was skipped for Safari/mobile support in mid-2026. That has
  moved; **we could use Temporal now** and the surface was kept small so it can be swapped
  with no caller-visible change. Nobody has checked what it costs today.

- **A frame is a standpoint, not a person** → `src/society.ts` (occlusion), `src/frames.ts`
  (reference frames), `src/stories.ts` (`FrameStory`, an unrelated UI leaf — naming
  collision). Three different things called "frame"; conflating them is how an auth-blind
  library gets accidentally coupled to an identity provider. A clearness committee reached
  this on gen4's auth seam, 2026-06-29 — **minutes not in this repo**, so treat what follows
  as a good idea rather than a ruling: resolve identity into a standpoint at the app's edge,
  hand the library see-concepts. Standpoints are being packaged; this may change shape.

- **Some tests are property-based** → `test/` + `fast-check`. 8 files of 78 as of 2026-08-07.
  The claim used to be that this was the testing philosophy; it describes about a tenth of
  the suite. The rest are dolls (`test/PLAY.md`) and example tests, deliberately.

- **The trajectory harness** → `test/support/trajectory.ts` (169 lines). Records each lay with
  the society's clock so a society can be replayed *as of* a past moment. It earned its keep
  once: `asOf(past).reads(beat)` was written before the library could satisfy it, and going
  green surfaced a clock-monotonicity bug a final-state test would not have found.

  **Dormant, and worth a decision.** Written 2026-06-23; last real work 2026-07-02 (a
  repo-wide rename, not the harness). Two callers — `fisheye.test.ts` and its own
  `trajectory.harness.test.ts`, both quiet since July 10. 145 commits since then touched
  neither. The design intent was that `asOf` was the first of several witnessing-axis reads
  it would drive out (`from?`, satisfaction/settledness came next); those did not arrive.
  So: revive it against the reads it was meant to drive, or let it shrink to what
  `fisheye.test.ts` actually uses. Nobody has decided, and it has been costing nothing
  either way, which is why nobody has had to.

---

## FUNERAL: this file, as an authority (2026-06-23 – 2026-08-07)

It was five sections of load-bearing-sounding prose, all Claude-written and committed under
Hallie's name (`0a335f1` carries the `Co-Authored-By` trailer; the rest share the voice).
Checked on 2026-08-07:

- One section had already been buried on 2026-08-04 for forbidding bundlers — cited back at
  Hallie twice in one session as a reason she could not have something she had never asked
  not to have. Her ruling then: *"a doc that has to be overruled repeatedly is not recording
  a decision, it is manufacturing one."*
- The property-test section had gone **false** and was still stated in the present tense.
- The Temporal section had gone **stale** and duplicated a comment already in `frames.ts`.
- The frame section's authority rested on **minutes that are not in this repo**, so a Claude's
  elaboration had become the only record — and was quoted back at Hallie all afternoon as
  though a committee had said it.

The mechanism, from the 2026-08-04 funeral in `penelope-course/docs/funerals/`: *"a doc
sitting in a file named ARCHITECTURE.md acquires the authority of the directory it's in.
Nothing checked whether it had ever been ruled."* Checking authorship with
`git log -1 --format=%an` returns the committer and answers the wrong question; the body is
where the trailer lives.

Kept as notes-with-pointers instead. A note whose pointer disagrees with it is wrong, and
that is checkable by anyone.
