//! The EDGE is what gets settled, not the blocker beat (Hallie's ruling, 2026-07-28).
//!
//! `blocked_on_now` answers the DISPLAY question — "which of my blockers are undone?"
//! This answers the CLOSING question — "which of my blocking edges has nobody settled?"
//! Two questions, two reads; the ruling keys closing on the second.

use scher_core::{
    unsettled_blocking_edges, EventRow, Society, Q_BLOCKED_BY, Q_DEPENDS_ON, Q_SETTLES,
};

fn block(soc: &mut Society, subject: &str, object: &str, quality: &str) -> String {
    let edge = format!("{subject}~blocked-by~{object}");
    soc.lay_p(&edge, "relate", subject, object, quality)
        .expect("a blocking edge never trips the sublime guards");
    edge
}

fn settle(soc: &mut Society, settler: &str, edge: &str) -> String {
    let slug = format!("{settler}~settles~{edge}");
    soc.lay_p(&slug, "relate", settler, edge, Q_SETTLES)
        .expect("a settle edge never trips the sublime guards");
    slug
}

fn occlude(soc: &mut Society, occluder: &str, target: &str) {
    soc.lay_p(
        &format!("occ~{target}~by~{occluder}"),
        "occludes",
        occluder,
        target,
        "q-occludes",
    )
    .expect("an occlusion never trips the sublime guards");
}

#[test]
fn an_unsettled_blocking_edge_stands() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("granting", "the granting"));
    soc.lay(EventRow::node("problem", "the problem"));
    let edge = block(&mut soc, "granting", "problem", Q_BLOCKED_BY);

    assert_eq!(
        unsettled_blocking_edges(&soc, "granting", None),
        vec![edge],
        "nobody settled the edge, so it stands"
    );
}

#[test]
fn settling_the_edge_clears_it_even_though_the_blocker_beat_is_untouched() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("granting", "the granting"));
    soc.lay(EventRow::node("problem", "the problem"));
    soc.lay(EventRow::node("pm-decision", "we ship anyway"));
    let edge = block(&mut soc, "granting", "problem", Q_BLOCKED_BY);
    settle(&mut soc, "pm-decision", &edge);

    assert!(
        unsettled_blocking_edges(&soc, "granting", None).is_empty(),
        "the EDGE is the object of the settling — the blocker beat is never consulted"
    );
}

/// The bug the doll's local helper carries: it reads raw prehensions and would let an
/// occluded (retracted) settle-edge keep clearing the block — settle, retract, still open.
#[test]
fn an_occluded_settle_edge_does_not_clear_the_block() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("granting", "the granting"));
    soc.lay(EventRow::node("problem", "the problem"));
    soc.lay(EventRow::node("pm-decision", "we ship anyway"));
    soc.lay(EventRow::node("retraction", "on reflection, no"));
    let edge = block(&mut soc, "granting", "problem", Q_BLOCKED_BY);
    let settle_edge = settle(&mut soc, "pm-decision", &edge);
    occlude(&mut soc, "retraction", &settle_edge);

    assert_eq!(
        unsettled_blocking_edges(&soc, "granting", None),
        vec![edge],
        "a retracted settling settles nothing"
    );
}

/// The mirror: a retracted BLOCK stops blocking. Correction is occlusion.
#[test]
fn an_occluded_blocking_edge_does_not_stand() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("granting", "the granting"));
    soc.lay(EventRow::node("problem", "the problem"));
    soc.lay(EventRow::node("retraction", "that never blocked us"));
    let edge = block(&mut soc, "granting", "problem", Q_BLOCKED_BY);
    occlude(&mut soc, "retraction", &edge);

    assert!(
        unsettled_blocking_edges(&soc, "granting", None).is_empty(),
        "an occluded block is a withdrawn block"
    );
}

/// The one legacy violator of `ruling-a-wish-cannot-be-blocked-by-a-sublime` is spelled
/// q-depends-on. If this read skipped the legacy spelling, that row would be the single
/// row the closing rule cannot reach.
#[test]
fn the_legacy_depends_on_spelling_still_blocks() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("granting", "the granting"));
    soc.lay(EventRow::node("problem", "the problem"));
    let edge = format!("granting~depends-on~problem");
    soc.lay_p(&edge, "relate", "granting", "problem", Q_DEPENDS_ON)
        .expect("legacy spelling never trips the sublime guards");

    assert_eq!(
        unsettled_blocking_edges(&soc, "granting", None),
        vec![edge],
        "the both-spellings window is open; the legacy row is not exempt from the rule"
    );
}

#[test]
fn every_edge_must_be_settled_not_merely_one() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("granting", "the granting"));
    soc.lay(EventRow::node("problem-a", "one problem"));
    soc.lay(EventRow::node("problem-b", "another problem"));
    soc.lay(EventRow::node("settler", "the settler"));
    let edge_a = block(&mut soc, "granting", "problem-a", Q_BLOCKED_BY);
    let edge_b = block(&mut soc, "granting", "problem-b", Q_BLOCKED_BY);
    settle(&mut soc, "settler", &edge_a);

    assert_eq!(
        unsettled_blocking_edges(&soc, "granting", None),
        vec![edge_b],
        "settling one edge leaves the other standing, and names which"
    );
}

/// The read that has teeth must not be confusable with the read that does not.
/// `blocked_on_now` returns BEAT slugs; this returns EDGE slugs. Marking the blocker
/// beat done clears the display read and leaves the closing read standing.
#[test]
fn marking_the_blocker_beat_done_does_not_settle_the_edge() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("granting", "the granting"));
    soc.lay(EventRow::node("problem", "the problem"));
    soc.lay(EventRow::node("now-frame", "a Now"));
    let edge = block(&mut soc, "granting", "problem", Q_BLOCKED_BY);

    soc.lay_p("now-frame~because~problem", "done", "now-frame", "problem", "q-grounding")
        .expect("a Now-subject is never a sublime-pole");

    assert!(
        scher_core::blocked_on_now(&soc, "granting", None).is_empty(),
        "the DISPLAY read clears: the blocker beat is established"
    );
    assert_eq!(
        unsettled_blocking_edges(&soc, "granting", None),
        vec![edge],
        "the CLOSING read stands: settling is a separate, deliberate, authored act"
    );
}
