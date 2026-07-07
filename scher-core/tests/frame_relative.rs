// frame-relative establishment — conformance twin of scher/test/frame-relative.test.ts.
// Guards the 2026-07-03 ruling's kernel landing: reaches / established_to / the honest
// aggregate rename, with the authorship clause DELIBERATELY absent pending F-A.
use scher_core::{
    established_to, grounded_for_any_frame, is_established, reaches, EventRow, Society,
    Q_GROUNDING,
};

/// A small canon: now-r ~grounds~ a ~grounds~ b, plus an ungrounded stray c.
fn seed() -> Society {
    let mut soc = Society::seeded(&[
        EventRow::node("now-r", "now-r"),
        EventRow::node("a", "a"),
        EventRow::node("b", "b"),
        EventRow::node("c", "c"),
    ]);
    soc.lay_p("e1", "now touches a", "now-r", "a", Q_GROUNDING).unwrap();
    soc.lay_p("e2", "a rests on b", "a", "b", Q_GROUNDING).unwrap();
    soc
}

#[test]
fn reaches_walks_chains_and_refuses_what_is_not_there() {
    let soc = seed();
    assert!(reaches(&soc, "now-r", "b", Q_GROUNDING, None)); // two hops
    assert!(reaches(&soc, "now-r", "now-r", Q_GROUNDING, None)); // trivial
    assert!(!reaches(&soc, "now-r", "c", Q_GROUNDING, None)); // stray
    assert!(!reaches(&soc, "b", "now-r", Q_GROUNDING, None)); // no backward walk
}

#[test]
fn occlusion_breaks_the_walk_and_unocclusion_restores_it() {
    let mut soc = seed();
    soc.lay_p("shadow", "retract e2", "retractor", "e2", "q-occludes").unwrap();
    assert!(!reaches(&soc, "now-r", "b", Q_GROUNDING, None));
    soc.lay_p("shadow2", "retract the retraction", "restorer", "shadow", "q-occludes").unwrap();
    assert!(reaches(&soc, "now-r", "b", Q_GROUNDING, None));
}

#[test]
fn reaches_is_as_of_threaded() {
    let mut soc = Society::seeded(&[EventRow::node("now-r", "now-r"), EventRow::node("a", "a")]);
    soc.lay(EventRow::edge("late", "", "now-r", "a").with_witnessed(10));
    soc.lay(EventRow::edge("late~q", "[q-grounding]", "late", Q_GROUNDING).with_witnessed(10));
    assert!(!reaches(&soc, "now-r", "a", Q_GROUNDING, Some(5)));
    assert!(reaches(&soc, "now-r", "a", Q_GROUNDING, None));
}

#[test]
fn established_to_is_reachability_from_the_readers_now() {
    let soc = seed();
    assert!(established_to(&soc, "now-r", "b", None));
    assert!(!established_to(&soc, "now-r", "c", None));
}

#[test]
fn composition_law_established_to_implies_aggregate() {
    let soc = seed();
    for beat in ["a", "b"] {
        assert!(established_to(&soc, "now-r", beat, None));
        assert!(grounded_for_any_frame(&soc, beat, None));
    }
}

#[test]
fn deprecated_alias_agrees_with_honest_name_everywhere() {
    let soc = seed();
    for beat in ["now-r", "a", "b", "c"] {
        assert_eq!(
            is_established(&soc, beat, None),
            grounded_for_any_frame(&soc, beat, None)
        );
    }
}

#[test]
fn aggregate_and_frame_relative_genuinely_differ() {
    // b is grounded (aggregate true) but NOT reachable from a stranger's Now with no edges —
    // the fourth-pass collision, pinned.
    let mut soc = seed();
    soc.lay(EventRow::node("now-stranger", "now-stranger"));
    assert!(grounded_for_any_frame(&soc, "b", None));
    assert!(!established_to(&soc, "now-stranger", "b", None));
}
