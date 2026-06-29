# scher-core

The pure, append-only **Society** and its **reads** from [scher](../), in Rust. The grammar
only — **no view layer** (no DOM, no story constructors). A faithful port of the load-bearing
parts of `../src/society.ts`.

## Why this exists

Not for speed. Two reasons:

1. **Conformance.** The same invariants scher's TypeScript suite proves in `fast-check`
   (`../test/society.prop.test.ts`, `../test/occlusion.prop.test.ts`) are proved here in
   `proptest` (`tests/conformance.rs`). Each test names the TS law it mirrors. If a law here
   drifts from the law it cites, the two engines have diverged — that is what this catches.
   It matters because the canon will carry student data, and the TS and Rust paths must never
   disagree about what is occluded (occlusion is access control).

2. **The scalpel needs the reads.** The architecture (`../../ithaca/ENGINE-CUTOVER-DEBT-MAP.md`)
   gives Rust one job: **banishment** (irreversible delete). Banishing X has to ask "what does
   removing X orphan?" — that is `dependents_of` / interval reads. The scalpel needs a faithful
   read-layer regardless, so the honest thing to port is the grammar, not the UI.

## What's here

- `Society` — append-only: the only write is `lay` (first-write-wins, ON CONFLICT DO NOTHING),
  plus `lay_p` (a prehension + its `~q` mode-beat), `lay_all`, and a monotone witnessing clock.
- The reads, pure over the log: `prehends_as`, `prehensions_onto`/`_from`, `is_occluded`
  (with one-level emergent un-occlusion), `is_established`, `mode_at`, `confidence`, the
  dependency reads (`depends_on`, `dependents_of`, `blocked_on_now`, `is_blocked`,
  `parallelizable`, `stress_of`), and `content_beats`.
- Every read takes an `as_of: Option<u64>` — a read "from a moment," the log truncated at a
  witnessed-clock value. `None` means "now."

## What's deliberately NOT here

The view layer (cells, `el`, `cardStory`/`dropStory`/projection). That value is "a view is a
reading, re-observed" in the browser — Rust doesn't render the DOM, and porting it would fight
scher's zero-build, source-is-the-artifact thesis. Keep the UI in TS; keep the grammar shared.

## Run

```bash
cargo test     # the conformance suite
```
