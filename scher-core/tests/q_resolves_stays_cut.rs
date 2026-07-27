//! q-resolves was drama-cut 2026-07-15 (society.ts, wire.ts, model.test.ts,
//! api/tests/wire_contract.rs all pin the write-side absence). This crate's own
//! line-77 prose repeated the prohibition without anything checking it. This test
//! is that check, scoped to what this crate can actually prove:
//!
//! 1. SOURCE TRIPWIRE — lib.rs never spells "q-resolves" as a live quality
//!    constant/literal. Reintroducing `pub const Q_RESOLVES` (or any read
//!    hardcoding the string) trips this.
//! 2. BEHAVIORAL PROOF — even if some caller lays a q-resolves edge anyway
//!    (nothing stops it; qualities are open strings, not a closed enum), it
//!    reads as inert here: no kernel read in this crate treats it specially.
//!    That is the honest kernel-surface claim for an open-string grammar —
//!    there is no closed enum to guard structurally, only a promise that
//!    nothing here NAMES the string. Reads elsewhere (society.ts, wire.ts,
//!    the API layer) enforce their own write-side bans separately.

use scher_core::*;
use std::fs;

#[test]
fn lib_rs_never_names_q_resolves_as_a_live_quality() {
    let src = fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/src/lib.rs"))
        .expect("scher-core/src/lib.rs must be readable from its own test");

    let offending_lines: Vec<&str> = src
        .lines()
        .filter(|line| line.contains("q-resolves"))
        .filter(|line| !line.trim_start().starts_with("///") && !line.trim_start().starts_with("//"))
        .collect();

    assert!(
        offending_lines.is_empty(),
        "lib.rs names \"q-resolves\" outside a comment — it was drama-cut 2026-07-15 \
         and this crate's reads must never hardcode it back in: {offending_lines:?}"
    );
}

#[test]
fn a_stray_q_resolves_edge_is_inert_to_every_named_quality_read() {
    let mut soc = Society::new();
    soc.lay(EventRow::node(
        "resolve-js-in-rust-by-the-montessori-plug",
        "the montessori plug",
    ));
    soc.lay(EventRow::node(
        "trub-js-in-a-rust-string-fought-back",
        "js fought back",
    ));
    soc.lay_p(
        "resolve-js-in-rust-by-the-montessori-plug~resolves~trub-js-in-a-rust-string-fought-back",
        "resolves",
        "resolve-js-in-rust-by-the-montessori-plug",
        "trub-js-in-a-rust-string-fought-back",
        "q-resolves",
    )
    .expect("lay_p does not structurally refuse q-resolves — qualities are open strings");

    let slug = "resolve-js-in-rust-by-the-montessori-plug~resolves~trub-js-in-a-rust-string-fought-back";

    // None of this crate's named quality reads recognize q-resolves as their quality.
    assert!(!prehends_as(&soc, slug, Q_FIXES, None));
    assert!(!prehends_as(&soc, slug, Q_ANSWERS, None));
    assert!(!prehends_as(&soc, slug, Q_GROUNDING, None));
    assert!(!prehends_as(&soc, slug, Q_SETTLES, None));
    assert!(!prehends_as(&soc, slug, Q_BLOCKED_BY, None));

    // And the object of that edge does not read as trub-fixed or answered by it.
    assert!(!is_trub_log(
        &soc,
        "trub-js-in-a-rust-string-fought-back",
        None
    ));
    assert!(!is_answered(
        &soc,
        "trub-js-in-a-rust-string-fought-back",
        None
    ));
}
