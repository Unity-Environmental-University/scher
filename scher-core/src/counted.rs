//! counted.rs — the ONE implementation of the counted fold.
//!
//! MUSLIN — seams showing on purpose.
//!
//! WHY THIS FILE EXISTS
//! --------------------
//! `scher-pages/src/counted.ts` folds typed key/value over an event chain in
//! TypeScript. `scher-state/src/lib.rs` rasterizes typed key/value over a
//! succession chain in Rust. Those are the same operation, written twice, and
//! two hand-kept twins drift — which is the exact problem `scher-core-wasm`
//! was built to end ("one compiled kernel instead of two hand-kept twins",
//! Hallie's ruling 2026-07-21).
//!
//! So the fold lives HERE, compiles to wasm, and the TS becomes a caller
//! rather than a second implementation. The conformance corpus
//! (`conformance/counted.json`) is neutral ground both replay against, so
//! agreement is PROVED rather than assumed.
//!
//! THE LAW THIS ENCODES
//! --------------------
//!   * a value is FOLDED from delta-beats, never stored. There is no field to
//!     drift from its history because there is no field.
//!   * occlusion re-folds: undo is not a stack, it is a beat that stops
//!     counting.
//!   * as-of is free: the past is a read, not a snapshot anyone kept.
//!   * over-cap is REFUSED, never clamped — a clamped write is a lie the
//!     history cannot show. (Refusal lives at the write, which is caller-side;
//!     this module reads, and reports the cap so a caller can refuse.)
//!   * section membership is read from the newest live placement, never a
//!     field on the key.
//!
//! WHAT THE COMPILED KERNEL ACTUALLY BUYS (Hallie, 2026-07-30)
//! ----------------------------------------------------------
//! Not just "one implementation instead of two." The bigger prize:
//!
//!   "using much simpler and more optimal storage and code and folding it into
//!    our state. Like how Git actually theoretically keeps track of the entire
//!    code base at every commit but the storage layer optimizations end up
//!    handling it as diffs."
//!
//! That is the whole argument for a compiled kernel under a process ontology.
//! Git's MODEL is a full tree per commit; its STORAGE is packfiles and deltas.
//! Nobody using git thinks in packfiles, and no packfile optimization is
//! allowed to change what a commit means. The model stays honest; the storage
//! gets to be clever.
//!
//! Same split here. The MODEL is "every value is folded from its whole
//! history, always, at any standpoint" — which is the honest thing and also,
//! naively, O(history) per read. The STORAGE is free to be a raster cache, a
//! packed suffix, a memoized fold, a columnar array of deltas — whatever is
//! fast — because none of it is allowed to change what a read RETURNS.
//!
//! Two things follow that are easy to miss:
//!
//!   1. The optimization has a CORRECTNESS ORACLE. The naive fold is the
//!      definition, so any clever storage can be checked against it directly
//!      (scher-state already does this: `rasterize` memoizes, `rasterize_at`
//!      stays pure and uncached as the truth-check). Optimizations you cannot
//!      check against a definition are how caches go quietly wrong.
//!   2. It only works in a COMPILED kernel. In two hand-kept twins, every
//!      storage optimization has to be written twice and agree twice — which
//!      is where the drift comes from, and why the clever version never gets
//!      built. One kernel means the storage layer can get as smart as it likes
//!      without multiplying the risk.
//!
//! So the wasm boundary is not overhead paid for tidiness. It is what makes it
//! safe to optimize the storage at all.

use crate::{is_occluded, EventRow, Society};

/// The quality marking a delta beat.
pub const Q_COUNTS: &str = "q-counts";
/// The quality marking a section placement.
pub const Q_IN_SECTION: &str = "q-in-section";

/// One delta that contributed to a value.
#[derive(Debug, Clone, PartialEq)]
pub struct Contribution {
    pub slug: String,
    pub delta: i64,
    pub by: Option<String>,
    pub at: u64,
}

/// One counted key, fully read.
#[derive(Debug, Clone, PartialEq)]
pub struct Counted {
    pub key: String,
    pub label: String,
    pub value: i64,
    pub section: Option<String>,
    pub from: Vec<Contribution>,
}

fn delta_prefix(holder: &str, key: &str) -> String {
    format!("count-{holder}-{key}-")
}

fn place_prefix(holder: &str, key: &str) -> String {
    format!("place-{holder}-{key}-")
}

/// Beats that are deltas for holder+key, oldest first.
fn delta_beats<'a>(soc: &'a Society, holder: &str, key: &str) -> Vec<&'a EventRow> {
    let p = delta_prefix(holder, key);
    let mut v: Vec<&EventRow> = soc
        .edges_onto_object(key)
        .filter(|r| r.subject.as_deref().is_some_and(|s| s.starts_with(&p)))
        .filter_map(|r| soc.get(r.subject.as_deref().unwrap_or("")))
        .collect();
    v.sort_by_key(|r| r.witnessed.unwrap_or(0));
    v
}

fn placement_beats<'a>(soc: &'a Society, holder: &str, key: &str) -> Vec<&'a EventRow> {
    let p = place_prefix(holder, key);
    let mut v: Vec<&EventRow> = soc
        .edges_onto_object(key)
        .filter(|r| r.subject.as_deref().is_some_and(|s| s.starts_with(&p)))
        .filter_map(|r| soc.get(r.subject.as_deref().unwrap_or("")))
        .collect();
    v.sort_by_key(|r| r.witnessed.unwrap_or(0));
    v
}

/// THE FOLD. A key's value at a standpoint — read, never stored.
pub fn value_of(soc: &Society, holder: &str, key: &str, as_of: Option<u64>) -> i64 {
    contributions(soc, holder, key, as_of).iter().map(|c| c.delta).sum()
}

/// The deltas that survive to this standpoint, oldest first.
pub fn contributions(
    soc: &Society,
    holder: &str,
    key: &str,
    as_of: Option<u64>,
) -> Vec<Contribution> {
    delta_beats(soc, holder, key)
        .into_iter()
        .filter(|b| as_of.is_none_or(|t| b.witnessed.unwrap_or(0) <= t))
        // an occluded delta stops counting — this IS undo, with no undo stack.
        .filter(|b| !is_occluded(soc, &b.slug, as_of))
        .map(|b| Contribution {
            slug: b.slug.clone(),
            // the delta is the beat's own content: self-describing, so the fold
            // never has to consult a second place.
            delta: b.content.parse::<i64>().unwrap_or(0),
            by: b.laid_by.clone(),
            at: b.witnessed.unwrap_or(0),
        })
        .collect()
}

/// Which section a key sits in — the newest live placement, read.
pub fn section_of(
    soc: &Society,
    holder: &str,
    key: &str,
    as_of: Option<u64>,
) -> Option<String> {
    placement_beats(soc, holder, key)
        .into_iter()
        .filter(|b| as_of.is_none_or(|t| b.witnessed.unwrap_or(0) <= t))
        .filter(|b| !is_occluded(soc, &b.slug, as_of))
        .next_back()
        .map(|b| b.content.clone())
}

/// One key, fully read.
pub fn counted_of(
    soc: &Society,
    holder: &str,
    key: &str,
    as_of: Option<u64>,
) -> Option<Counted> {
    let from = contributions(soc, holder, key, as_of);
    if delta_beats(soc, holder, key).is_empty() {
        return None;
    }
    let label = soc
        .get(key)
        .map(|b| {
            // NOTE: the Rust twin calls this field `name`; the TS twin calls
            // it `title`. Same slot, two names — a live divergence the
            // conformance corpus is what catches. Not renaming either here.
            b.name
                .clone()
                .unwrap_or_else(|| b.content.clone())
        })
        .unwrap_or_else(|| key.to_string());
    Some(Counted {
        key: key.to_string(),
        label,
        value: from.iter().map(|c| c.delta).sum(),
        section: section_of(soc, holder, key, as_of),
        from,
    })
}

/// Every key this holder counts.
pub fn keys_of(soc: &Society, holder: &str) -> Vec<String> {
    let p = format!("count-{holder}-");
    let mut keys: Vec<String> = soc
        .all()
        .filter(|r| {
            r.subject.as_deref().is_some_and(|s| s.starts_with(&p)) && r.object.is_some()
        })
        .filter_map(|r| r.object.clone())
        .collect();
    keys.sort();
    keys.dedup();
    keys
}

/// THE READ: everything this holder counts, sorted by label.
pub fn read_counted(
    soc: &Society,
    holder: &str,
    as_of: Option<u64>,
    keep_empty: bool,
) -> Vec<Counted> {
    let mut out: Vec<Counted> = keys_of(soc, holder)
        .into_iter()
        .filter_map(|k| counted_of(soc, holder, &k, as_of))
        .filter(|c| keep_empty || c.value > 0)
        .collect();
    out.sort_by(|a, b| a.label.cmp(&b.label));
    out
}

/// Sum of every value — encumbrance, total points, hand size.
pub fn total_of(soc: &Society, holder: &str, as_of: Option<u64>) -> i64 {
    read_counted(soc, holder, as_of, false).iter().map(|c| c.value).sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::EventRow;

    fn seeded() -> Society {
        let mut s = Society::new();
        s.lay(EventRow::node("lamp", "Lamp"));
        s.lay(EventRow::node("chart", "Moon Chart"));
        s
    }

    /// lay a delta the way the TS twin does, so both replay identically.
    fn delta(s: &mut Society, holder: &str, key: &str, n: usize, d: i64, by: &str, t: u64) {
        let slug = format!("count-{holder}-{key}-{n}");
        s.lay(
            EventRow::node(&slug, &d.to_string())
                .with_witnessed(t)
                .with_laid_by(by),
        );
        s.lay(
            EventRow::edge(&format!("{slug}~c"), "counts", &slug, key).with_witnessed(t),
        );
    }

    #[test]
    fn folds_deltas_into_a_value() {
        let mut s = seeded();
        delta(&mut s, "moth", "lamp", 0, 3, "gran", 1);
        delta(&mut s, "moth", "lamp", 1, -1, "gran", 2);
        assert_eq!(value_of(&s, "moth", "lamp", None), 2);
    }

    #[test]
    fn as_of_reads_the_past() {
        let mut s = seeded();
        delta(&mut s, "moth", "lamp", 0, 1, "gran", 1);
        delta(&mut s, "moth", "lamp", 1, 9, "gran", 5);
        assert_eq!(value_of(&s, "moth", "lamp", None), 10);
        assert_eq!(value_of(&s, "moth", "lamp", Some(1)), 1);
    }

    #[test]
    fn holders_do_not_share() {
        let mut s = seeded();
        delta(&mut s, "a", "lamp", 0, 2, "x", 1);
        delta(&mut s, "b", "lamp", 0, 7, "x", 2);
        assert_eq!(value_of(&s, "a", "lamp", None), 2);
        assert_eq!(value_of(&s, "b", "lamp", None), 7);
    }

    #[test]
    fn provenance_survives_the_fold() {
        let mut s = seeded();
        delta(&mut s, "moth", "chart", 0, 1, "gran", 1);
        delta(&mut s, "moth", "chart", 1, 1, "the-foreman", 2);
        let by: Vec<Option<String>> =
            counted_of(&s, "moth", "chart", None).unwrap().from.iter().map(|c| c.by.clone()).collect();
        assert!(by.contains(&Some("gran".into())));
        assert!(by.contains(&Some("the-foreman".into())));
    }
}
