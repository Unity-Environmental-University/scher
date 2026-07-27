//! ADVERSARY PROBE — seven attacks on the ruled model, 2026-07-27.
//! MUSLIN: a probe, not a law. Touches no database. Companion to
//! scratch/kalpa-2026-07-27/experiments/adversary/RESULTS.md.
//!
//! Every test here asserts CHARACTERIZED behavior — what the kernel actually does
//! under attack, not what the spec hopes. Where an attack found a silent lie, the
//! assertion pins the lie so a future fix turns this file red.

use scher_core::*;

const Q_AUTHORSHIP: &str = "q-authorship";
const Q_LAYS: &str = "q-authorship";

/// Lay a node plus the laying-act that lays it, wired with q-authorship.
fn lay_with_act(soc: &mut Society, slug: &str, act: &str) {
    soc.lay(EventRow::node(slug, slug));
    soc.lay(EventRow::node(act, act));
    soc.lay_p(&format!("{act}~lays~{slug}"), "laying", act, slug, Q_LAYS)
        .expect("laying act must land");
}

/// Designate `now` as the Now-pole of `frame`.
fn designate_now(soc: &mut Society, frame: &str, now: &str) {
    soc.lay(EventRow::node(now, now));
    soc.lay_p(
        &format!("{frame}~now-pole~{now}"),
        "the frame's Now",
        frame,
        now,
        Q_NOW_POLE,
    )
    .expect("now designation must land");
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK 1 · THE MIRROR — two Penelopes ingress each other.
// A is a frame in B; B is a frame in A. Both are their own Now.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn attack1_the_mirror_terminates() {
    let mut soc = Society::new();

    soc.lay(EventRow::node("frame-a", "Penelope A"));
    soc.lay(EventRow::node("frame-b", "Penelope B"));
    designate_now(&mut soc, "frame-a", "now-frame-a");
    designate_now(&mut soc, "frame-b", "now-frame-b");

    // A ingresses B: B enters A by a laying act authored in A.
    lay_with_act(&mut soc, "b-as-seen-by-a", "laid-b-in-a");
    // B ingresses A: symmetric.
    lay_with_act(&mut soc, "a-as-seen-by-b", "laid-a-in-b");

    // close the mirror: each image points back at the other frame's image
    soc.lay_p(
        "b-as-seen-by-a~because~a-as-seen-by-b",
        "the mirror",
        "b-as-seen-by-a",
        "a-as-seen-by-b",
        Q_AUTHORSHIP,
    )
    .expect("mirror edge must land");
    soc.lay_p(
        "a-as-seen-by-b~because~b-as-seen-by-a",
        "the mirror back",
        "a-as-seen-by-b",
        "b-as-seen-by-a",
        Q_AUTHORSHIP,
    )
    .expect("mirror edge back must land");

    // THE QUESTION: does the walk terminate over a 2-cycle?
    let set = reaches_set(&soc, "b-as-seen-by-a", Q_AUTHORSHIP, None);
    assert!(
        set.contains("a-as-seen-by-b"),
        "A must be able to read B's reading of A"
    );
    assert!(
        set.contains("b-as-seen-by-a"),
        "the mirror must be reachable from itself"
    );

    // and the reverse walk agrees — no standpoint asymmetry in a symmetric mirror
    let back = reaches_set(&soc, "a-as-seen-by-b", Q_AUTHORSHIP, None);
    assert_eq!(
        set, back,
        "a symmetric mirror must read symmetrically from both sides"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK 3 · THE SELF-INGRESSING FRAME — a frame ingresses itself.
// Its Now prehends its own laying, which is its own laying.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn attack3_self_ingressing_frame_terminates() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("frame-ouroboros", "a frame that ingresses itself"));
    designate_now(&mut soc, "frame-ouroboros", "now-ouroboros");

    // the frame's own laying act, which lays the frame
    soc.lay(EventRow::node("laid-ouroboros", "the self-laying"));
    soc.lay_p(
        "laid-ouroboros~lays~frame-ouroboros",
        "lays itself",
        "laid-ouroboros",
        "frame-ouroboros",
        Q_LAYS,
    )
    .expect("self-laying must land");

    // the Now prehends the laying
    soc.lay_p(
        "now-ouroboros~because~laid-ouroboros",
        "the Now reads its own laying",
        "now-ouroboros",
        "laid-ouroboros",
        Q_LAYS,
    )
    .expect("now->laying must land");

    // and the frame is its own Now's subject — closing the loop
    soc.lay_p(
        "frame-ouroboros~because~now-ouroboros",
        "the frame is its Now",
        "frame-ouroboros",
        "now-ouroboros",
        Q_LAYS,
    )
    .expect("frame->now must land");

    let set = reaches_set(&soc, "now-ouroboros", Q_LAYS, None);
    assert!(set.contains("frame-ouroboros"), "the loop must close");
    assert!(
        set.contains("laid-ouroboros"),
        "the self-laying must be reachable"
    );
    // 3-cycle terminates: the seen-set is the whole guard, and it holds.
    assert_eq!(set.len(), 3, "the walk must saturate at exactly the cycle");
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK 4 · THE BLOCKED NOW — block the thing a Now must read to be a Now.
// The law: "blocked events cannot be read past; the check fires when a Now
// would reach them." If the check does NOT fire in the walk, blocking is
// decorative and the law is a claim nothing enforces.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn attack4_blocking_does_not_stop_the_walk() {
    let mut soc = Society::new();

    designate_now(&mut soc, "frame-victim", "now-victim");
    soc.lay(EventRow::node("gate", "the event the Now must read"));
    soc.lay(EventRow::node("beyond", "what lies past the gate"));
    soc.lay(EventRow::node("blocker", "an unsatisfied validation"));

    // the Now reads the gate; the gate reaches beyond
    soc.lay_p("now-victim~because~gate", "reads", "now-victim", "gate", Q_GROUNDING)
        .expect("now->gate");
    soc.lay_p("gate~because~beyond", "reaches", "gate", "beyond", Q_GROUNDING)
        .expect("gate->beyond");

    // NOW BLOCK THE GATE. blocker is never established, so the block is live.
    soc.lay_p(
        "gate~blocked-by~blocker",
        "the gate is blocked",
        "gate",
        "blocker",
        Q_BLOCKED_BY,
    )
    .expect("block must land");

    assert!(
        is_blocked(&soc, "gate", None),
        "precondition: the gate must read as blocked"
    );

    // THE ATTACK: the law says a Now cannot read PAST a blocked event.
    // Does established_to honor the block?
    let read_past = established_to(&soc, "now-victim", "beyond", None);

    assert!(
        read_past,
        "ATTACK 4 CHARACTERIZED: established_to reads straight past a live block. \
         `reaches` consults occlusion only — it never calls is_blocked. The block \
         is a SEPARATE read no walk consults. This pins the current behavior; if a \
         future commit makes blocking gate the walk, this assertion flips and this \
         test must be rewritten to assert !read_past."
    );

    // The Now itself survives — a frame cannot be denied a Now by blocking.
    assert!(
        is_any_pole(&soc, "now-victim", None),
        "a blocked read must not destroy the Now designation"
    );
}

/// 4b · the same shape, checked from the honest read. is_blocked KNOWS. Nothing asks it.
#[test]
fn attack4b_the_block_is_loud_only_if_you_ask() {
    let mut soc = Society::new();
    designate_now(&mut soc, "frame-v", "now-v");
    soc.lay(EventRow::node("gate", "gate"));
    soc.lay(EventRow::node("blocker", "blocker"));
    soc.lay_p("now-v~because~gate", "reads", "now-v", "gate", Q_GROUNDING)
        .expect("now->gate");
    soc.lay_p("gate~blocked-by~blocker", "blocked", "gate", "blocker", Q_BLOCKED_BY)
        .expect("block");

    // two reads, same rows, opposite answers — and neither knows about the other
    assert!(is_blocked(&soc, "gate", None), "the block read says: blocked");
    assert!(
        established_to(&soc, "now-v", "gate", None),
        "the doneness read says: established. Two reads disagree with no arbiter."
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK 5 · THE UNREACHABLE PROBLEM — a primordial with no laying.
// Per the law it can never be reached, exactly like the 20 sublimes with 0 inbound.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn attack5_a_pole_without_a_laying_is_unreachable_and_silent() {
    let mut soc = Society::new();
    designate_now(&mut soc, "frame-r", "now-r");

    // a sublime pole with NO laying act and NO inbound edge
    soc.lay(EventRow::node("sublime-orphan", "the good, unreachable"));
    soc.lay_p(
        "sublime-orphan~sublime-pole~sublime-orphan",
        "designation",
        "sublime-orphan",
        "sublime-orphan",
        Q_SUBLIME_POLE,
    )
    .expect("sublime designation must land");

    // a work item that wants to reach it
    soc.lay(EventRow::node("wish-x", "a wish aimed at the orphan"));

    assert!(
        !reaches(&soc, "wish-x", "sublime-orphan", Q_GROUNDING, None),
        "an unlaid pole must be unreachable"
    );

    // THE FINDING: nothing anywhere reports this. No error, no diagnostic, no read
    // that says "this pole has no laying." The failure mode is silence.
    let inbound = soc.edges_onto_object("sublime-orphan").count();
    assert_eq!(
        inbound, 1,
        "only its own designation points at it — the severed-joint shape exactly"
    );

    // and the wish reads no differently from a wish that IS grounded, to any
    // read the kernel offers except a bespoke walk nobody runs.
    assert!(
        !is_established(&soc, "wish-x", None),
        "the wish is un-established — but so is every fresh wish; the read does \
         not distinguish 'aimed at nothing' from 'not yet done'"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK 6 · STANDPOINT DISAGREEMENT — doneness is frame-relative,
// occlusion is GLOBAL (is_occluded takes no frame). Probe the seam.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn attack6_occlusion_is_global_while_doneness_is_frame_relative() {
    let mut soc = Society::new();
    designate_now(&mut soc, "frame-one", "now-one");
    designate_now(&mut soc, "frame-two", "now-two");
    soc.lay(EventRow::node("shared", "an event both frames read"));

    // frame-one reaches it; frame-two does not
    soc.lay_p("now-one~because~shared", "one reads it", "now-one", "shared", Q_GROUNDING)
        .expect("one->shared");

    assert!(
        established_to(&soc, "now-one", "shared", None),
        "frame one says done"
    );
    assert!(
        !established_to(&soc, "now-two", "shared", None),
        "frame two says open — both correct, no single truth. The model SURVIVES this."
    );

    // NOW THE SEAM: frame-two occludes the edge frame-one depends on.
    soc.lay(EventRow::node("occ-by-two", "frame two's occlusion"));
    soc.lay_p(
        "occ-by-two~occludes~now-one~because~shared",
        "two occludes one's edge",
        "occ-by-two",
        "now-one~because~shared",
        Q_OCCLUDES,
    )
    .expect("occlusion must land");

    // frame-two's private act just changed frame-one's doneness.
    assert!(
        !established_to(&soc, "now-one", "shared", None),
        "ATTACK 6 CHARACTERIZED: an occlusion laid from ANY standpoint silently \
         revokes doneness in EVERY other standpoint. is_occluded takes no frame \
         parameter, so there is no standpoint at which the occluded edge still \
         reads. Frame-relative doneness sits on a frame-blind primitive."
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK 7 · THE CHEAP INFINITY — occlusion is O(inbound) per edge, and
// `reaches` calls it per edge traversed. Characterize the cost shape.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn attack7_one_ingression_implies_a_quadratic_read() {
    let mut soc = Society::new();
    designate_now(&mut soc, "frame-repo", "now-repo");
    soc.lay(EventRow::node("repo", "a repo ingression"));

    // one ingression implying N commits — a chain, as a git history actually is
    const N: usize = 400;
    let mut prev = "repo".to_string();
    for i in 0..N {
        let c = format!("commit-{i}");
        soc.lay(EventRow::node(&c, &c));
        soc.lay_p(
            &format!("{prev}~because~{c}"),
            "parent",
            &prev,
            &c,
            Q_GROUNDING,
        )
        .expect("commit edge");
        prev = c;
    }
    soc.lay_p("now-repo~because~repo", "reads", "now-repo", "repo", Q_GROUNDING)
        .expect("now->repo");

    // the walk terminates and is correct
    let set = reaches_set(&soc, "now-repo", Q_GROUNDING, None);
    assert!(
        set.contains(&format!("commit-{}", N - 1)),
        "the far end of the chain must be reachable"
    );
    assert_eq!(
        set.len(),
        N + 2,
        "every commit, the repo, and the Now — nothing lost, nothing doubled"
    );

    // THE HONEST LIMIT: the read is correct at this scale. It is the per-edge
    // is_occluded call (an inbound scan + a `~q` hashmap lookup per candidate)
    // that makes the constant factor real. Correctness survives; cost is the story.
}

/// 7b · the fan-out shape: one ingression, one Now, N siblings. The Now must
/// read all of them, and occlusion is consulted once per sibling per walk.
#[test]
fn attack7b_fanout_terminates_without_loss() {
    let mut soc = Society::new();
    designate_now(&mut soc, "frame-canvas", "now-canvas");
    soc.lay(EventRow::node("assignment", "one assignment"));
    soc.lay_p(
        "now-canvas~because~assignment",
        "reads",
        "now-canvas",
        "assignment",
        Q_GROUNDING,
    )
    .expect("now->assignment");

    const N: usize = 500;
    for i in 0..N {
        let s = format!("submission-{i}");
        soc.lay(EventRow::node(&s, &s));
        soc.lay_p(
            &format!("assignment~because~{s}"),
            "submission",
            "assignment",
            &s,
            Q_GROUNDING,
        )
        .expect("submission edge");
    }

    let set = reaches_set(&soc, "now-canvas", Q_GROUNDING, None);
    assert_eq!(set.len(), N + 2, "every submission reachable, exactly once");
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK 4c · THE DEEPEST FORM — can a frame be DENIED a Now outright?
// Not by blocking (attack 4 showed blocking is inert) but by occluding the
// designation itself. If yes: a denial-of-service in the metaphysics.
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn attack4c_occluding_the_designation_denies_a_frame_its_now() {
    let mut soc = Society::new();
    designate_now(&mut soc, "frame-target", "now-target");
    assert!(
        is_any_pole(&soc, "now-target", None),
        "precondition: the frame has a Now"
    );

    // an unrelated frame occludes the DESIGNATION edge
    soc.lay(EventRow::node("hostile", "another frame entirely"));
    soc.lay_p(
        "hostile~occludes~frame-target~now-pole~now-target",
        "deny the Now",
        "hostile",
        "frame-target~now-pole~now-target",
        Q_OCCLUDES,
    )
    .expect("hostile occlusion must land");

    assert!(
        !is_any_pole(&soc, "now-target", None),
        "ATTACK 4c CONFIRMED: any frame can strip any other frame of its Now by \
         occluding the designation. is_occluded is frame-blind, so there is no \
         standpoint from which the Now survives. A metaphysical denial-of-service."
    );
}

/// 4d · and the un-occlusion is only ONE level deep — so the victim CAN fight back,
/// but a third occlusion re-denies, and the parity game has no fixed point.
#[test]
fn attack4d_occlusion_parity_is_a_tug_of_war_not_a_law() {
    let mut soc = Society::new();
    designate_now(&mut soc, "frame-t", "now-t");
    let desig = "frame-t~now-pole~now-t";

    soc.lay(EventRow::node("occ1", "first strike"));
    soc.lay_p("occ1~occludes~d", "strike", "occ1", desig, Q_OCCLUDES)
        .expect("occ1");
    assert!(!is_any_pole(&soc, "now-t", None), "denied at depth 1");

    // the victim occludes the occluder — un-occlusion, one level
    soc.lay(EventRow::node("occ2", "counter-strike"));
    soc.lay_p("occ2~occludes~occ1~occludes~d", "counter", "occ2", "occ1~occludes~d", Q_OCCLUDES)
        .expect("occ2");
    assert!(is_any_pole(&soc, "now-t", None), "restored at depth 2");

    // a third occlusion should re-deny — but is_occluder is ONE LEVEL ONLY.
    soc.lay(EventRow::node("occ3", "third strike"));
    soc.lay_p(
        "occ3~occludes~occ2~occludes~occ1~occludes~d",
        "third",
        "occ3",
        "occ2~occludes~occ1~occludes~d",
        Q_OCCLUDES,
    )
    .expect("occ3");

    assert!(
        is_any_pole(&soc, "now-t", None),
        "ATTACK 4d CONFIRMED: at depth 3 the read STOPS UPDATING. is_occluder \
         checks one level only, so occ3 neutralising occ2 (which should restore \
         occ1's shadow and re-deny the Now) is never seen. Beyond depth 2 the \
         occlusion read silently diverges from 'the absence of a LIVE occluder'."
    );
}
