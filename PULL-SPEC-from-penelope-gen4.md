# Pull-spec for scher-core — from penelope-gen4 (2026-06-29)

Handed over from `penelope-gen4` (the clean gen4 backend). gen4-policy is a THIN layer above
`scher-core`: it owns only policy (the Kalpa adapter, occlusion-as-wire-boundary, the
`/bujo/today` slice) and DELEGATES all grammar reads to scher-core. This spec is the consumer
stating what it needs — written as executable tests in
`penelope-gen4/gen4-policy/tests/interface_contract.rs`. Each ask is an `#[ignore]`'d test naming
the read; un-ignore it when scher-core ships the symbol and it goes green.

> Same channel as PULL-SPEC-from-ithaca-muslins.md. Treat it as a muslin-of-a-spec: cut it where
> it's wrong. The signatures are gen4's guess at the shape — scher owns the final form.

> **STATUS, re-checked 2026-07-03 (the gathered body's first sitting):** SPENT. All three asks
> ship in scher-core (`grounded_by`, `interval_of`/`end_of`, `distance_to_hea` — commit 8fcd347),
> and gen4's `interface_contract.rs` records the `#[ignore]`s removed and green. Kept for
> lineage as the record of the gift-forward channel working end-to-end.

## Already satisfied (gen4 builds on these now — green contract tests)

`prehends_as`, `prehensions_onto`, `prehensions_from`, `is_occluded`, `is_established`,
`mode_at`, `confidence`, the dependency lattice (`depends_on`/`dependents_of`/`blocked_on_now`/
`is_blocked`/`parallelizable`), `stress_of`, `content_beats`. The Society + append-only core.
**These cover gen4's occlusion-as-wire-boundary and the visible-beats slice today.** ✅

## The asks (the live remainder — what /bujo/today needs that scher-core lacks)

### 1. `grounded_by(soc, beat, as_of) -> Vec<&str>`  — the because-base  [HIGHEST LEVERAGE]
gen4 renders the **because-chain** (the base edge, rendered "because" — q-grounding). It needs:
*who grounds X?* gen4 can compose it from `prehensions_onto(.., "q-grounding")` + `.subject`, but
it's used everywhere (every card's "because"), so it belongs in the core as a named read.
Mirrors scher TS `groundedBy`. Pairs with `excluded_by` (q-exclusion) for symmetry.

### 2. `distance_to_hea(soc, frame_once, end?, as_of) -> { distance, reaches_hea }`  — the lure, READ
gen4's slice shows **distanceToHEA** — the lure-as-gradient, read from topology (never a stored
q-lure; q-lure is RETIRED 2026-06-29). scher-core has the dependency lattice but not the
HEA-distance walk. Shape: a struct reporting hop-distance to the nearest HEA along grounding
edges, and whether an HEA is reached at all (an UN-reached one = the "ungrounded why" gen4
surfaces). Mirrors scher TS `distanceToHEA`.

### 3. `interval_of(soc, once, end) -> Vec<&str>` + `end_of(soc, story) -> Option<&str>`  — membership-by-betweenness
gen4's `/bujo/today` groups beats BY DAY. Membership is **betweenness** — a beat is IN a story by
POSITION between its Once/End bounds, READ, never a stored containment edge (settled law). gen4
needs `interval_of` (the beats between two bounds) + `end_of` (a story's End-pole). NB the
scher-core commit "the Once never prehends, the End is never prehended" already guards the dipole
bounds — these reads sit right on top of that. Mirrors scher TS `intervalOf`/`endOf`/`isStory`.

## Note on q-lure (a decision to honor, not a read)

q-lure is RETIRED (penelope, 2026-06-29): the lure is a GRADIENT read from topology, never a
stored edge. scher-core's String-newtype Quality means there's nothing to remove from a type — the
retirement is a write-door POLICY (don't lay q-lure), which lives in gen4 / the API, not in
scher-core. Flagged here only so the two repos agree the word is dead-as-a-stored-edge.

— the gift-forward channel: gen4 states its need as a test; scher pulls it into the core; gen4's
test goes green; one grammar, one implementation, proved from both sides.
