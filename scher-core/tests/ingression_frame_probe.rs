//! F4 + F5 PROBE — the two falsification criteria the JS harness could not reach.
//! See plugins/FALSIFICATION.md. MUSLIN: a probe, not a law. Touches no database.
//!
//! F4: can a plugin frame be a real EVENT with its own poles, laid by ITSELF?
//!     Hallie's spec: "These events are their own implicit laid by events."
//!     Today 71 of 72 authoring frames exist only as strings in a laid_by column.
//! F5: does a q-settles edge onto a laying-act stay invisible to doneness?
//!     Traced safe (established_to hardcodes Q_GROUNDING). A trace is an argument;
//!     this is the proof.

use scher_core::*;

const Q_AUTHORSHIP: &str = "q-authorship";
const Q_SETTLES_PROBE: &str = "q-settles";

/// F4 · a self-laying frame does not trip lay_p and does not hang the walks.
#[test]
fn f4_a_plugin_frame_can_be_a_self_laying_event() {
    let mut soc = Society::new();

    // the frame as an EVENT, not a string
    soc.lay(EventRow::node("frame-git", "the git ingression frame"));

    // its own laying-act, which it lays ITSELF (the implicit self-laying)
    soc.lay(EventRow::node("laid-frame-git-by-frame-git", "frame-git laid itself"));
    let self_lay = soc.lay_p(
        "laid-frame-git-by-frame-git~lays~frame-git",
        "authorship",
        "laid-frame-git-by-frame-git",
        "frame-git",
        Q_AUTHORSHIP,
    );
    assert!(
        self_lay.is_ok(),
        "F4 FIRED: lay_p refuses a self-laying frame: {self_lay:?}"
    );

    // the walks must terminate over the self-reference
    let _ = reaches(&soc, "frame-git", "frame-git", Q_AUTHORSHIP, None);
    let _ = reaches_set(&soc, "laid-frame-git-by-frame-git", Q_AUTHORSHIP, None);

    // a frame-event is NOT a sublime pole, so it cannot trip the sublime guard
    assert!(
        !is_sublime_pole(&soc, "frame-git", None),
        "a plugin frame must not read as a sublime pole"
    );
}

/// F4b · the tightest possible cycle: an act that lays itself.
/// If the walks survive this, they survive any frame self-laying.
#[test]
fn f4b_the_tightest_self_reference_terminates() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("laid-self", "an act that lays itself"));
    let r = soc.lay_p("laid-self~lays~laid-self", "authorship", "laid-self", "laid-self", Q_AUTHORSHIP);
    assert!(r.is_ok(), "F4 FIRED: a self-laying act is refused: {r:?}");

    // the real question: does the seen-set actually stop it?
    let _ = reaches(&soc, "laid-self", "anything-else", Q_AUTHORSHIP, None);
    let set = reaches_set(&soc, "laid-self", Q_AUTHORSHIP, None);
    assert!(set.contains("laid-self"), "the self-reference should be reachable from itself");
}

/// F5 · a q-settles edge onto a laying-act must NOT make the event done-to its author.
/// This is the hazard authorship_rides_the_lay.rs guards for q-grounding, checked for
/// the new quality.
#[test]
fn f5_a_settles_edge_does_not_leak_into_doneness() {
    let mut soc = Society::new();

    soc.lay(EventRow::node("now-frame-git", "the frame's Now"));
    soc.lay(EventRow::node("git-commit-abc", "a commit"));
    soc.lay(EventRow::node("laid-git-commit-abc-by-frame-git", "the laying-act"));

    soc.lay_p(
        "laid-git-commit-abc-by-frame-git~lays~git-commit-abc",
        "authorship",
        "laid-git-commit-abc-by-frame-git",
        "git-commit-abc",
        Q_AUTHORSHIP,
    )
    .expect("authorship edge must land");

    // THE NEW EDGE: the event settles its own laying
    let settles = soc.lay_p(
        "git-commit-abc~settles~laid-git-commit-abc-by-frame-git",
        "settles its own laying",
        "git-commit-abc",
        "laid-git-commit-abc-by-frame-git",
        Q_SETTLES_PROBE,
    );
    assert!(settles.is_ok(), "F5 FIRED: lay_p refuses the settles edge: {settles:?}");

    // THE HAZARD: established_to walks Q_GROUNDING only. A settles edge must be
    // invisible to it, or doneness collapses into authorship.
    assert!(
        !established_to(&soc, "now-frame-git", "git-commit-abc", None),
        "F5 FIRED: the settles edge leaked into the doneness read"
    );

    // and the edge IS walkable in its own quality — it must not be inert either
    assert!(
        reaches(
            &soc,
            "git-commit-abc",
            "laid-git-commit-abc-by-frame-git",
            Q_SETTLES_PROBE,
            None
        ),
        "the settles edge must be walkable as q-settles"
    );
}

/// F5b · day-membership on a laying-act must be BARE, and bare membership must not
/// feed doneness. Pins the 2026-07-13 regression shape (day_feel flipped 1->32).
#[test]
fn f5b_bare_day_membership_on_an_act_does_not_feed_doneness() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("now-frame-git", "the frame's Now"));
    soc.lay(EventRow::node("day-2026-07-27", "a day"));
    soc.lay(EventRow::node("laid-x-by-frame-git", "the laying-act"));

    // BARE, both halves — never q-grounding
    soc.lay(EventRow::edge(
        "day-2026-07-27~holds~laid-x-by-frame-git",
        "inside the day",
        "day-2026-07-27",
        "laid-x-by-frame-git",
    ));

    assert!(
        !established_to(&soc, "now-frame-git", "laid-x-by-frame-git", None),
        "F5b FIRED: bare day-membership fed the doneness read"
    );
}
