//! Bare grounding OUT OF a Now-pole is walked, same as a bare closing INTO one.
//! Pins the second shape the doors lay (`{story}~now ~because~ {story}`, open_story;
//! `now-{frame} ~because~ {closing-edge}`, mark_done) surviving q-grounding's death:
//! no quality on the edge, recognized because it LEAVES a designated Now-pole.

use scher_core::{
    established_to, grounded_for_any_frame, reaches, EventRow, Society, Q_END_POLE, Q_GROUNDING,
    Q_NOW_POLE,
};

/// A story, its Now designated a Now-pole, and a BARE edge from the Now onto the story.
fn story_with_bare_now_grounding() -> Society {
    let mut soc = Society::new();
    soc.lay(EventRow::node("story", "the story"));
    soc.lay(EventRow::node("story~now", "the story's Now"));
    soc.lay_p("story~now-pole", "designation", "story", "story~now", Q_NOW_POLE)
        .expect("designate the Now-pole");
    soc.lay(EventRow::edge("g", "now because story", "story~now", "story"));
    soc
}

#[test]
fn bare_edge_out_of_a_now_pole_is_walked_as_grounding() {
    let soc = story_with_bare_now_grounding();
    assert!(
        reaches(&soc, "story~now", "story", Q_GROUNDING, None),
        "a bare edge leaving a designated Now-pole is a grounding — nothing else leaves a Now"
    );
    assert!(established_to(&soc, "story~now", "story", None));
}

/// The adjacency read must agree with the walk on the bare-out-of-a-Now arm.
#[test]
fn grounded_for_any_frame_sees_a_bare_grounding_out_of_a_now_pole() {
    let soc = story_with_bare_now_grounding();
    assert!(
        established_to(&soc, "story~now", "story", None),
        "the walk sees it (this arm already passes)"
    );
    assert!(
        grounded_for_any_frame(&soc, "story", None),
        "adjacency and the walk read the same edge; one grounding step apart cannot disagree"
    );
}

/// The adjacency read must agree with the walk on the bare-closing arm (End -> Now).
#[test]
fn grounded_for_any_frame_sees_a_bare_closing_onto_a_now_pole() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("beat", "the beat"));
    soc.lay(EventRow::node("hea-beat", "the beat's End"));
    soc.lay(EventRow::node("beat~now", "the beat's Now"));
    soc.lay_p("beat~end-pole", "designation", "beat", "hea-beat", Q_END_POLE)
        .expect("designate the End-pole");
    soc.lay_p("beat~now-pole", "designation", "beat", "beat~now", Q_NOW_POLE)
        .expect("designate the Now-pole");
    soc.lay(EventRow::edge("c", "end closes into now", "hea-beat", "beat~now"));
    assert!(
        reaches(&soc, "hea-beat", "beat~now", Q_GROUNDING, None),
        "the walk sees the bare closing"
    );
    assert!(
        grounded_for_any_frame(&soc, "beat~now", None),
        "a bare closing grounds its Now for this society, same as the walk reads it"
    );
}

/// An occluded bare grounding grounds nothing — the shadow gates adjacency too.
#[test]
fn an_occluded_bare_grounding_does_not_ground() {
    let mut soc = story_with_bare_now_grounding();
    soc.lay_p("shade", "occlude the grounding", "story", "g", scher_core::Q_OCCLUDES)
        .expect("occlude the grounding edge");
    assert!(
        !grounded_for_any_frame(&soc, "story", None),
        "an occluded grounding casts no establishment"
    );
}

/// A bare edge onto an ordinary node from an ordinary node is NOT a grounding.
#[test]
fn a_bare_edge_from_an_undesignated_node_is_not_a_grounding() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("a", "a"));
    soc.lay(EventRow::node("b", "b"));
    soc.lay(EventRow::edge("e", "a because b", "a", "b"));
    assert!(
        !grounded_for_any_frame(&soc, "b", None),
        "grounding is designated, never merely adjacent"
    );
}

#[test]
fn legacy_q_grounding_out_of_a_now_pole_still_walks() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("story", "the story"));
    soc.lay(EventRow::node("story~now", "the story's Now"));
    soc.lay_p("story~now-pole", "designation", "story", "story~now", Q_NOW_POLE)
        .expect("designate the Now-pole");
    soc.lay_p("g", "legacy kalpa spelling", "story~now", "story", Q_GROUNDING)
        .expect("lay the legacy grounding");
    assert!(
        established_to(&soc, "story~now", "story", None),
        "4,392 kalpa rows carry q-grounding; the legacy arm is honored forever"
    );
}
