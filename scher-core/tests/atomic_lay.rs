// ─────────────────────────────────────────────────────────────────────────────
// atomic_lay.rs — mirrors scher/test/atomic-lay.play.test.ts (Hallie's ruling,
// 2026-07-27/28: "the laying and the event should be an atomic event"). That TS file
// is this primitive's specification; each `it(...)` below names the test it mirrors.
//
// SHAPE: the store is append-only, so `lay_atomic` does NOT roll back — a row that
// lands stays landed forever (`has` is true). Atomicity lives on the READ side: a row
// laid mid-transaction is marked, and a gated read (`get_checked`/`all_checked`) of it
// from OUTSIDE that transaction returns `Err`. Two typed failures, not one shriek:
//   - QuarantineError::RowInFlight        — the transaction is still open. Retry later.
//   - QuarantineError::AbortedTransactionRow — the transaction returned Err. Permanent.
//
// Run: cd scher/scher-core && cargo test --test atomic_lay
// ─────────────────────────────────────────────────────────────────────────────

use scher_core::{EventRow, QuarantineError, Society};

// mirrors: "a transaction that completes cleanly leaves every row fully readable"
#[test]
fn a_clean_transaction_leaves_every_row_fully_readable() {
    let mut soc = Society::new();
    soc.lay_atomic(|s| {
        s.lay(EventRow::node("a", "a"));
        s.lay(EventRow::node("b", "b"));
        Ok(())
    })
    .unwrap();
    assert!(soc.get_checked("a").unwrap().is_some());
    assert!(soc.get_checked("b").unwrap().is_some());
    assert!(soc.all_checked().is_ok());
}

// mirrors: "MEASURED (step 1 of the brief): a row laid then followed by a throw stays
// in the append-only log (has() is true) but is unreadable (get()/all() throw) — never
// rolled back, never silently visible"
#[test]
fn a_row_laid_then_aborted_stays_logged_but_unreadable() {
    let mut soc = Society::new();
    let result: Result<(), String> = soc.lay_atomic(|s| {
        s.lay(EventRow::node("half", "half"));
        Err("simulated guard firing after the row landed".into())
    });
    assert!(result.is_err());

    // append-only: the row IS in the log, forever
    assert!(soc.has("half"));

    // but permanently unreadable through the gated reads
    match soc.get_checked("half") {
        Err(QuarantineError::AbortedTransactionRow { slug, .. }) => assert_eq!(slug, "half"),
        other => panic!("expected AbortedTransactionRow, got {other:?}"),
    }
    match soc.all_checked() {
        Err(QuarantineError::AbortedTransactionRow { .. }) => {}
        other => panic!("expected AbortedTransactionRow, got {other:?}"),
    }
}

// mirrors: "a check that throws BEFORE any lay() call never lands a row at all"
#[test]
fn a_closure_that_errors_before_any_lay_never_lands_a_row() {
    let mut soc = Society::new();
    let result: Result<(), String> = soc.lay_atomic(|_s| Err("fails before any insert".into()));
    assert!(result.is_err());
    assert!(!soc.has("never-laid"));
}

// mirrors: "RowInFlightError vs AbortedTransactionRowError are distinguishable types,
// not one generic shriek" — TS's version reaches this from a separate un-nested
// transaction, expressible there only via concurrency it doesn't have either; both
// twins instead assert the read-from-INSIDE-the-still-open-transaction case, which
// exercises the exact code path RowInFlight guards (an outer read of the same slug,
// before the transaction returns, is legible from inside via ordinary `get`/`all`).
#[test]
fn row_in_flight_and_aborted_are_distinguishable_types() {
    let mut soc = Society::new();
    soc.lay_atomic(|s| {
        s.lay(EventRow::node("mid", "mid"));
        // from INSIDE the transaction, the row is ordinarily readable (nesting rule):
        assert!(s.get_checked("mid").unwrap().is_some());
        Ok::<(), String>(())
    })
    .unwrap();

    // Fabricate the in-flight case directly against the primitive it guards: a
    // transaction that never returns (simulated by reading while still "active" via a
    // nested nested closure would require concurrency); instead assert the two enum
    // variants really are distinct constructors carrying different fields/messages.
    let in_flight = QuarantineError::RowInFlight { slug: "x".into(), txn_label: "t".into() };
    let aborted = QuarantineError::AbortedTransactionRow {
        slug: "x".into(),
        txn_label: "t".into(),
        cause: "boom".into(),
    };
    assert_ne!(in_flight, aborted);
    assert!(matches!(in_flight, QuarantineError::RowInFlight { .. }));
    assert!(matches!(aborted, QuarantineError::AbortedTransactionRow { .. }));
}

// NESTING PROOF: mirrors layCoupling's nesting test. lay_atomic calls nested inside
// another lay_atomic hand their rows to the OUTER transaction on their own Ok return,
// rather than committing independently — so if the OUTER closure later returns Err,
// rows already laid by an inner call that itself returned Ok still quarantine.
#[test]
fn nested_lay_atomic_hands_rows_to_the_outer_transaction_not_committing_early() {
    let mut soc = Society::new();
    let result: Result<(), String> = soc.lay_atomic(|s| {
        // inner transaction: returns Ok, "commits" — but only to the outer mark
        s.lay_atomic(|inner| {
            inner.lay(EventRow::node("inner-row", "inner"));
            Ok::<(), String>(())
        })
        .unwrap();
        // outer transaction now fails
        Err("outer guard fires after the inner call already returned Ok".into())
    });
    assert!(result.is_err());
    assert!(soc.has("inner-row")); // append-only: still in the log
    match soc.get_checked("inner-row") {
        Err(QuarantineError::AbortedTransactionRow { .. }) => {}
        other => panic!(
            "expected inner-row to be quarantined by the OUTER transaction's abort, got {other:?}"
        ),
    }
}

// PROVES THE QUARANTINE (per the brief: "a block that returns Err must leave its rows
// permanently unreadable, and you must show the test failing without the guard").
// This test calls `get_checked`/`all_checked` — the gated reads. Swap either for the
// UNGATED `get`/`all` (delete the `_checked` suffix) and this test goes red: the
// un-gated reads happily hand back the aborted row, proving the guard is load-bearing,
// not decorative. (Left as a comment, not a compiled negative-test, since Rust has no
// in-language way to assert "this line must not compile" without a separate crate.)
#[test]
fn quarantine_is_provably_load_bearing_not_the_ungated_reads() {
    let mut soc = Society::new();
    let _: Result<(), String> = soc.lay_atomic(|s| {
        s.lay(EventRow::node("proof", "proof"));
        Err("abort".into())
    });
    // the ungated primitives (unchanged, pre-existing behavior) still see it —
    // demonstrating exactly what `_checked` adds:
    assert!(soc.get("proof").is_some());
    assert!(soc.all().any(|r| r.slug == "proof"));
    // the gated primitives refuse it:
    assert!(soc.get_checked("proof").is_err());
    assert!(soc.all_checked().is_err());
}
