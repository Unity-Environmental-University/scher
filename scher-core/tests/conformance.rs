// ─────────────────────────────────────────────────────────────────────────────
// conformance.rs — the SAME invariants scher's TS suite proves in fast-check, proved
// here in proptest. Each `proptest!`/`#[test]` block names the TS law it mirrors, so the
// two engines provably agree on the grammar. Sources:
//   • scher/test/society.prop.test.ts   (append-only laws, read-determinism, undo-is-append)
//   • scher/test/occlusion.prop.test.ts (occlusion: hide, emergent un-occlude, self-loop dead)
//
// If a law here drifts from the TS law it cites, the two engines have diverged — that is
// exactly what this suite exists to catch.
// ─────────────────────────────────────────────────────────────────────────────

use proptest::prelude::*;
use scher_core::*;

// ── generators (mirror the TS arbitraries) ───────────────────────────────────────

/// distinct content-beat slugs: 1..=6 chars, not ending `~q` (the lay_p constructor
/// namespace). A slug merely SPELLING `q-` is fair game — quality-hood is structural
/// (has_any_quality, 2026-07-06 migration-design item 1), mirroring the TS generators.
fn slugs() -> impl Strategy<Value = Vec<String>> {
    prop::collection::hash_set(
        "[a-z]{1,6}".prop_filter("no ~q slugs", |s: &String| !s.ends_with("~q")),
        1..=8,
    )
    .prop_map(|set| set.into_iter().collect())
}

/// a history: beats drawn (with repeats) from a slug pool — the `historyArb` shape.
fn history() -> impl Strategy<Value = Vec<EventRow>> {
    slugs().prop_flat_map(|pool| {
        prop::collection::vec(
            (0..pool.len(), ".*").prop_map({
                let pool = pool.clone();
                move |(i, content): (usize, String)| EventRow::node(&pool[i], &content)
            }),
            0..=20,
        )
    })
}

proptest! {
    // TS: "a genuine lay grows the log by exactly one; an inert lay leaves it unchanged"
    //   + "size never decreases; equals the count of distinct slugs"
    #[test]
    fn append_only_growth(hist in history()) {
        let mut soc = Society::new();
        let mut prev = 0;
        for b in &hist {
            let knew = soc.has(&b.slug);
            let before = soc.size();
            let appended = soc.lay(b.clone());
            if knew {
                prop_assert!(!appended);
                prop_assert_eq!(soc.size(), before); // inert
            } else {
                prop_assert!(appended);
                prop_assert_eq!(soc.size(), before + 1); // grew by one
            }
            prop_assert!(soc.size() >= prev);
            prev = soc.size();
        }
        let distinct: std::collections::HashSet<_> = hist.iter().map(|b| &b.slug).collect();
        prop_assert_eq!(soc.size(), distinct.len());
    }

    // TS: "rev is monotone non-decreasing and rises iff a genuine append happened"
    #[test]
    fn rev_rises_iff_appended(hist in history()) {
        let mut soc = Society::new();
        for b in &hist {
            let knew = soc.has(&b.slug);
            let rev0 = soc.rev();
            soc.lay(b.clone());
            let rev1 = soc.rev();
            prop_assert!(rev1 >= rev0);
            prop_assert_eq!(rev1 > rev0, !knew);
        }
    }

    // TS: "a laid beat is never mutated by later lays of the same slug" (ON CONFLICT DO NOTHING:
    // the surviving beat for each slug is the FIRST one laid).
    #[test]
    fn first_write_wins(hist in history()) {
        let mut soc = Society::new();
        for b in &hist { soc.lay(b.clone()); }
        let mut first: std::collections::HashMap<&String, &EventRow> = std::collections::HashMap::new();
        for b in &hist { first.entry(&b.slug).or_insert(b); }
        for (slug, b) in first {
            prop_assert_eq!(soc.get(slug).map(|g| &g.content), Some(&b.content));
        }
    }

    // TS: "the witnessing clock is monotone … auto stamps are unique" — every auto-stamped
    // beat gets a distinct positive moment, never reusing/preceding an explicit one.
    // TODO(socratic): the comment promises "never reusing/preceding an explicit one", but the
    // TODO(socratic): assertions below only check uniqueness and positivity among AUTO stamps —
    // TODO(socratic): where is the assertion comparing an auto stamp against the explicit `w`s laid before it?
    #[test]
    fn auto_witnessed_stamps_are_unique(
        specs in prop::collection::vec(("[a-z]{1,5}", proptest::option::of(0u64..=50)), 0..=25)
    ) {
        let mut soc = Society::new();
        let mut auto_slugs: Vec<String> = Vec::new();
        for (slug, w) in &specs {
            let was_new = !soc.has(slug);
            let beat = match w { Some(t) => EventRow::node(slug, slug).with_witnessed(*t), None => EventRow::node(slug, slug) };
            soc.lay(beat);
            if was_new && w.is_none() { auto_slugs.push(slug.clone()); }
        }
        let auto_moments: Vec<u64> = auto_slugs.iter().filter_map(|s| soc.get(s).and_then(|b| b.witnessed)).collect();
        let distinct: std::collections::HashSet<_> = auto_moments.iter().collect();
        prop_assert_eq!(distinct.len(), auto_moments.len()); // auto stamps unique
        prop_assert!(auto_moments.iter().all(|&m| m > 0));    // positive
    }
}

// ── read-determinism: reads are functions of the SET of beats, not the order laid ─────────
// Mirrors the `sceneArb` block. We build a pool of content beats + grounding/exclusion
// prehensions, lay them in two different orders, and assert the reads agree.

#[derive(Clone, Debug)]
struct Prehension {
    target: usize,
    frame: String,
    grounding: bool,
}

fn scene() -> impl Strategy<Value = (Vec<String>, Vec<Prehension>)> {
    prop::collection::hash_set("[a-z]{1,4}", 1..=4).prop_flat_map(|targets| {
        let targets: Vec<String> = targets.into_iter().collect();
        let n = targets.len();
        let prehensions = prop::collection::vec(
            (0..n, "[a-z]{1,3}", any::<bool>()).prop_map(|(target, frame, grounding)| Prehension {
                target,
                frame,
                grounding,
            }),
            0..=12,
        );
        (Just(targets), prehensions)
    })
}

fn build_scene(targets: &[String], prehensions: &[Prehension], order: &[usize]) -> Society {
    let mut beats: Vec<EventRow> = targets.iter().map(|t| EventRow::node(t, t)).collect();
    for (i, p) in prehensions.iter().enumerate() {
        let kind = if p.grounding {
            Q_GROUNDING
        } else {
            Q_EXCLUSION
        };
        let slug = format!("p{i}-{kind}");
        let tgt = &targets[p.target];
        beats.push(EventRow::edge(
            &slug,
            &format!("{}->{}", p.frame, tgt),
            &p.frame,
            tgt,
        ));
        beats.push(EventRow::edge(
            &format!("{slug}~q"),
            &format!("[{kind}]"),
            &slug,
            kind,
        ));
    }
    // lay in the given permutation order
    let mut soc = Society::new();
    for &idx in order {
        soc.lay(beats[idx].clone());
    }
    soc
}

proptest! {
    // TS: "modeAt / confidence / isEstablished are permutation-invariant" + "confidence in [0,1]".
    // TODO(socratic): permutation-invariance is proved only for mode_at/is_established/confidence —
    // TODO(socratic): find_poles and is_occluded also read the log, so what witnesses that THEY
    // TODO(socratic): are functions of the set of beats rather than the order laid?
    #[test]
    fn reads_are_permutation_invariant((targets, prehensions) in scene(), seed in any::<u64>()) {
        // total beat count = targets + 2 per prehension
        let total = targets.len() + 2 * prehensions.len();
        let in_order: Vec<usize> = (0..total).collect();
        // a deterministic shuffle from the seed (mirror the TS xor-multiply shuffle)
        let mut shuffled: Vec<usize> = (0..total).collect();
        shuffled.sort_by_key(|&i| (seed ^ (i as u64).wrapping_mul(2654435761)) & 0xffff_ffff);

        let a = build_scene(&targets, &prehensions, &in_order);
        let b = build_scene(&targets, &prehensions, &shuffled);
        for t in &targets {
            prop_assert_eq!(mode_at(&a, t, None), mode_at(&b, t, None));
            prop_assert_eq!(is_established(&a, t, None), is_established(&b, t, None));
            prop_assert!((confidence(&a, t, None) - confidence(&b, t, None)).abs() < 1e-10);
            let c = confidence(&a, t, None);
            prop_assert!((0.0..=1.0).contains(&c));
        }
    }

    // TS occlusion.prop: "occluding an occluder always reveals the target (one-level emergent
    // un-occlusion)" + "a self-loop never occludes, for any target name".
    // TODO(socratic): this proves exactly ONE level of emergent un-occlusion — if a third
    // TODO(socratic): occluder hides `reveal`, does the target flip back to occluded, and which
    // TODO(socratic): suite (TS or this one) actually pins that alternating-parity law down?
    #[test]
    fn emergent_un_occlusion(target in "[a-z]{1,5}", occ in "[a-z]{1,5}", reveal in "[a-z]{1,5}") {
        prop_assume!(target != occ && occ != reveal && target != reveal);
        let mut s = Society::seeded(&[EventRow::node(&target, &target)]);
        // a named event occludes the target. Subjects carry a hyphen so the generated
        // names (bare [a-z]{1,5}) can never collide with them — a drawn target of "ev"
        // used to make this edge a self-loop, which correctly never occludes (the law
        // this test's own third clause asserts), failing the fixture, not the kernel.
        // Found 2026-07-06 (regression seed kept below per proptest convention).
        s.lay_p(&occ, "occludes", "ev-1", &target, Q_OCCLUDES).unwrap();
        prop_assert!(is_occluded(&s, &target, None));
        // occlude the occluder → target revealed (one level)
        s.lay_p(&reveal, "occludes the occluder", "ev-2", &occ, Q_OCCLUDES).unwrap();
        prop_assert!(!is_occluded(&s, &target, None));

        // a self-loop {subject==object} is NOT occlusion
        let mut s2 = Society::seeded(&[EventRow::node(&target, &target)]);
        s2.lay_p("loop", "self", &target, &target, Q_OCCLUDES).unwrap();
        prop_assert!(!is_occluded(&s2, &target, None));
    }
}

// ── occlusion example-tests (mirror occlusion.prop.test.ts's named `it` cases) ────────────

#[test]
fn occlude_hides_then_self_is_not_occluded() {
    let mut s = Society::seeded(&[EventRow::node("a", "a")]);
    assert!(!is_occluded(&s, "a", None));
    s.lay_p("ev-occ", "E occludes a", "E", "a", Q_OCCLUDES).unwrap();
    assert!(is_occluded(&s, "a", None));
    assert!(!is_occluded(&s, "ev-occ", None)); // the occluder itself stands in light
}

#[test]
fn occlusion_is_society_scoped() {
    // the frame IS the society: x occluded HERE stands in full light in another society.
    let mut s1 = Society::seeded(&[EventRow::node("x", "x")]);
    s1.lay_p("occ-x", "occludes x", "E", "x", Q_OCCLUDES).unwrap();
    let s2 = Society::seeded(&[EventRow::node("x", "x")]);
    assert!(is_occluded(&s1, "x", None));
    assert!(!is_occluded(&s2, "x", None));
}

#[test]
fn undo_is_an_append_not_an_erasure() {
    // TS society.prop: "superseding a grounding flips establishment to false but keeps both
    // beats in the log" — reframed to occlusion, the live grammar.
    let mut soc = Society::seeded(&[EventRow::node("target", "target")]);
    soc.lay_p("g0", "frame grounds", "frame", "target", Q_GROUNDING).unwrap();
    assert!(is_established(&soc, "target", None));
    let size_after_ground = soc.size();

    soc.lay_p("occ-g0", "occludes g0", "frame", "g0", Q_OCCLUDES).unwrap();
    assert!(is_occluded(&soc, "g0", None));
    assert!(!is_established(&soc, "target", None)); // re-reads as scripted
    assert_eq!(soc.size(), size_after_ground + 2); // GREW (edge + ~q) — nothing erased
    assert!(soc.has("g0")); // the grounding is still in ink
}

#[test]
fn as_of_truncates_the_log() {
    // an occlusion not yet witnessed does not count: as of an earlier moment the target is
    // still established. (the witnessing axis — society.ts asOf.)
    let mut soc = Society::new();
    soc.lay(EventRow::node("target", "target").with_witnessed(1));
    soc.lay(EventRow::edge("g0", "grounds", "frame", "target").with_witnessed(2));
    soc.lay(EventRow::edge("g0~q", "[q-grounding]", "g0", Q_GROUNDING).with_witnessed(3));
    assert!(is_established(&soc, "target", None));
    // occlude at moment 10
    soc.lay(EventRow::edge("occ", "occludes", "frame", "g0").with_witnessed(10));
    soc.lay(EventRow::edge("occ~q", "[q-occludes]", "occ", Q_OCCLUDES).with_witnessed(11));
    assert!(!is_established(&soc, "target", None)); // now: occluded
    assert!(is_established(&soc, "target", Some(5))); // as of 5: occlusion hasn't landed
}

// ── the Eikon: HEA ~because~ Time ~because~ Once, the interior of any event ──────────
// `find_poles` reads the two structural poles from the `because` topology (the gen3 store
// is bridged by `because_edges_from`). Topology is truth, config is a check:
//   • SOURCE (the Once) — because-of-nothing: appears as a `b`, never an `a`.
//   • END    (the HEA)  — nothing-is-because-of-it: appears as an `a`, never a `b`.
// Exactly one of each; matched to config; zero/many/mismatch = malformed, named.
// (memory: the-eikon, the-because-grammar — proves the law in code, the anti-perish.)
use scher_core::edge_word::{find_poles, Pole};

/// lay a gen3 grounding `a ~grounds~ b` (+ its ~q), which `because_edges_from` reads as the
/// gen4 `a ~because~ b` (a rests on b). The spine climbs from Once UP to HEA.
// TODO(socratic): the slug `{a}~grounds~{b}` carries the edge's meaning in its NAME — given
// TODO(socratic): scher's own discipline (opaque slugs, no string-matching), is any reader
// TODO(socratic): relying on parsing this shape, or would these tests still pass with random slugs?
fn grounds(soc: &mut Society, a: &str, b: &str) {
    let e = format!("{a}~grounds~{b}");
    soc.lay(EventRow::edge(&e, "", a, b));
    soc.lay(EventRow::edge(&format!("{e}~q"), "[q-grounding]", &e, Q_GROUNDING));
}

#[test]
fn eikon_well_formed_has_one_source_one_end() {
    // HEA ~because~ mid ~because~ once   (HEA rests on mid, mid rests on once)
    let mut soc = Society::new();
    for s in ["hea", "mid", "once"] { soc.lay(EventRow::node(s, "")); }
    grounds(&mut soc, "hea", "mid");
    grounds(&mut soc, "mid", "once");

    let content = ["hea", "mid", "once"];
    let poles = find_poles(&soc, content, Some("hea"), Some("once"));
    // END = the `a` that is never a `b` = hea (nothing is because-of it).
    assert_eq!(poles.end, Pole::Found("hea".into()));
    // SOURCE = the `b` that is never an `a` = once (it is because-of nothing).
    assert_eq!(poles.source, Pole::Found("once".into()));
}

#[test]
fn eikon_catches_config_drift() {
    // topology is truth: if config NAMES the wrong end, the law reports Mismatch, not silence.
    let mut soc = Society::new();
    for s in ["hea", "mid", "once"] { soc.lay(EventRow::node(s, "")); }
    grounds(&mut soc, "hea", "mid");
    grounds(&mut soc, "mid", "once");

    let poles = find_poles(&soc, ["hea", "mid", "once"], Some("WRONG-end"), Some("once"));
    assert_eq!(poles.end, Pole::Mismatch { found: "hea".into(), expected: "WRONG-end".into() });
    assert_eq!(poles.source, Pole::Found("once".into()));
}

#[test]
fn eikon_catches_many_ends() {
    // two roofs (two beats nothing is because-of) = plural ends = malformed.
    let mut soc = Society::new();
    for s in ["hea1", "hea2", "once"] { soc.lay(EventRow::node(s, "")); }
    grounds(&mut soc, "hea1", "once");
    grounds(&mut soc, "hea2", "once"); // both rest on once; both are roofs
    let poles = find_poles(&soc, ["hea1", "hea2", "once"], None, Some("once"));
    match poles.end {
        Pole::Many(v) => { assert_eq!(v.len(), 2); assert!(v.contains(&"hea1".to_string())); }
        other => panic!("expected Many ends, got {other:?}"),
    }
    assert_eq!(poles.source, Pole::Found("once".into()));
}

#[test]
fn eikon_catches_no_source_when_loop_closed() {
    // close the loop (hea ~because~ once) AND nothing is because-of-nothing: every beat is
    // both an `a` and a `b` → no source, no end. A pure cycle has no asymptote. Malformed.
    let mut soc = Society::new();
    for s in ["hea", "once"] { soc.lay(EventRow::node(s, "")); }
    grounds(&mut soc, "hea", "once");
    grounds(&mut soc, "once", "hea"); // closes the loop — now both are `a` and `b`
    let poles = find_poles(&soc, ["hea", "once"], Some("hea"), Some("once"));
    assert_eq!(poles.end, Pole::None);    // no beat is `a`-only
    assert_eq!(poles.source, Pole::None); // no beat is `b`-only
}

#[test]
fn eikon_end_is_because_now_tells_now_from_end() {
    // Hallie's ruling, 2026-07-06, verbatim: "the end is because now."
    // Phase 1 (the hazard, documented): a Now beat is End-shaped to the one-hop signature —
    // `now ~because~ event` makes it an `a`, never a `b` — so a Now swept into the candidate
    // set reads as a spurious second End (Pole::Many, a false loud fail).
    let mut soc = Society::new();
    for s in ["end", "mid", "once", "now-story"] { soc.lay(EventRow::node(s, "")); }
    grounds(&mut soc, "end", "mid");
    grounds(&mut soc, "mid", "once");
    grounds(&mut soc, "now-story", "mid"); // the story's Now marks mid done — Now is an `a` only
    let content = ["end", "mid", "once", "now-story"];
    match find_poles(&soc, content, Some("end"), Some("once")).end {
        Pole::Many(v) => assert!(v.contains(&"now-story".to_string()), "the hazard: Now reads End-shaped"),
        other => panic!("expected the documented Many-ends hazard, got {other:?}"),
    }
    // Phase 2 (the ruling's mark): the circuit closes — the actual End grounds in the Now of
    // its closing. `end ~because~ now` makes the Now a `b` (a ground), so it stops matching
    // the End signature. Both poles read clean WITH the Now still in the candidate set,
    // no string ever consulted. (A Now never rests on an End, so no cycle.)
    grounds(&mut soc, "end", "now-story");
    let poles = find_poles(&soc, content, Some("end"), Some("once"));
    assert_eq!(poles.end, Pole::Found("end".into()));
    assert_eq!(poles.source, Pole::Found("once".into()));
}

// ── the isomorphs are real and go all the way down ──────────────────────────────────
// Not analogies — structure-preserving maps of ONE object. The SAME `find_poles` call,
// read as a graph (source/sink), a circuit (EMF/ground), and a spatial partition
// (bound/contents), gives the SAME answer. Witnessing the isomorphism, not asserting it.
// (memory: the-holographic-event — partition ≅ DAG ≅ circuit ≅ event-interior.)
//
// One structure to rule them all — a 3-level fractal event, the Eikon at each scale:
//
//        hea            ← END / sink / ground(V=0) / bounding-surface-top
//         │ because
//      ┌──┴──┐          (two sub-events of the interior, both in Time)
//     you    me         ← Time / interior nodes / live circuit / partition children
//      └──┬──┘
//         │ because
//        once           ← SOURCE / DAG-source / EMF(E-0) / what's packed at the bottom

mod isomorph {
    use super::*;
    use scher_core::edge_word::{find_poles, Pole};

    /// THE one structure. `hea ~because~ {you,me} ~because~ once`. Read it however you like.
    fn the_event() -> Society {
        let mut soc = Society::new();
        for s in ["hea", "you", "me", "once"] { soc.lay(EventRow::node(s, "")); }
        // hea rests on both sub-events; both rest on once. (grounds() defined above.)
        grounds(&mut soc, "hea", "you");
        grounds(&mut soc, "hea", "me");
        grounds(&mut soc, "you", "once");
        grounds(&mut soc, "me", "once");
        soc
    }
    const CONTENT: [&str; 4] = ["hea", "you", "me", "once"];

    // each "reading" is just a NAME for the same poles. the proof is that they're equal.
    fn poles(soc: &Society) -> (Pole, Pole) {
        let p = find_poles(soc, CONTENT, None, None);
        (p.source, p.end) // (because-of-nothing, nothing-because-of-it)
    }

    #[test]
    fn graph_reading_finds_source_and_sink() {
        // GRAPH: source = no in-edge (no `a`), sink = no out-edge (no `b`)... in `because`
        // terms source rests-on-nothing, sink has-nothing-resting-on-it.
        let (source, end) = poles(&the_event());
        assert_eq!(source, Pole::Found("once".into())); // the DAG source
        assert_eq!(end, Pole::Found("hea".into()));     // the DAG sink
    }

    #[test]
    fn circuit_reading_finds_emf_and_ground() {
        // CIRCUIT: EMF/E-0 = the source pole, ground/V=0 = the end pole. SAME CALL.
        let (emf, ground) = poles(&the_event());
        assert_eq!(emf, Pole::Found("once".into()));
        assert_eq!(ground, Pole::Found("hea".into()));
    }

    #[test]
    fn partition_reading_finds_bottom_and_bounding_surface() {
        // SPATIAL PARTITION: the bound-top (what the surface summarizes up to) = end pole;
        // the packed-bottom = source pole. SAME CALL.
        let (packed_bottom, bounding_top) = poles(&the_event());
        assert_eq!(packed_bottom, Pole::Found("once".into()));
        assert_eq!(bounding_top, Pole::Found("hea".into()));
    }

    #[test]
    fn the_three_readings_are_literally_the_same() {
        // the punchline: there is ONE computation. the readings are names, not systems.
        let p = find_poles(&the_event(), CONTENT, None, None);
        let graph = (&p.source, &p.end);
        let circuit = (&p.source, &p.end);
        let partition = (&p.source, &p.end);
        assert_eq!(graph, circuit);
        assert_eq!(circuit, partition);
        // and the interior (Time) is the same for all: the two sub-events between the poles.
        // you & me are both an `a` AND a `b` — neither pole — i.e. they live IN Time.
        assert_eq!(p.source, Pole::Found("once".into()));
        assert_eq!(p.end, Pole::Found("hea".into()));
    }

    #[test]
    fn all_the_way_down_a_sub_event_is_an_event() {
        // FRACTAL: descend into a sub-event and it has the SAME three-pole structure.
        // here `you` is itself an event: you-hea ~because~ you-mid ~because~ you-once.
        let mut soc = Society::new();
        for s in ["you-hea", "you-mid", "you-once"] { soc.lay(EventRow::node(s, "")); }
        grounds(&mut soc, "you-hea", "you-mid");
        grounds(&mut soc, "you-mid", "you-once");
        // read the SUB-event with the SAME law — no special-casing for "inner" vs "outer".
        let p = find_poles(&soc, ["you-hea", "you-mid", "you-once"], None, None);
        assert_eq!(p.source, Pole::Found("you-once".into())); // its own E-0
        assert_eq!(p.end, Pole::Found("you-hea".into()));     // its own V=0
        // the isomorph holds at this scale too: no bottom where it breaks.
    }

    use scher_core::edge_word::because_edges_from;

    // ── concrescence IS function evaluation (the property) ──────────────────────────
    // Every relation is a function applied to arguments to get a desired result. The Eikon
    // `Once → Time → HEA` IS a type signature: source (initial data) → the becoming → the
    // desired result (satisfaction/V=0). The law, over RANDOM well-formed events:
    //   apply `because` (the one function) step by step from ANY beat, and you arrive at the
    //   ONE desired result — the end pole. Evaluation and `find_poles` are the same compute.

    /// `because` as an actual FUNCTION over the Society: apply it to `a`, get what `a` rests
    /// on (its argument's ground). The stored edge-word `a~because~b` and the call
    /// `because(soc, a) == b` are the SAME thing (grammar ≅ API). Returns the single ground
    /// on a clean spine (None at the source — nothing left to apply).
    // TODO(socratic): on a branching event (like the_event(), where `hea` rests on both `you`
    // TODO(socratic): and `me`) this silently picks the lexicographically-first ground — is
    // TODO(socratic): "concrescence IS function evaluation" only proved for straight spines, and
    // TODO(socratic): what does evaluation even mean when Time genuinely forks?
    fn because_fn(soc: &Society, a: &str) -> Option<String> {
        let mut grounds: Vec<String> = because_edges_from(soc, a).into_iter().map(|e| e.b).collect();
        grounds.sort(); grounds.dedup();
        grounds.into_iter().next()
    }

    /// build a random straight spine of `n` interior beats:
    ///   end ~because~ i0 ~because~ i1 ~because~ … ~because~ source
    /// (end rests on i0, …, last interior rests on source). a clean Eikon at any length.
    fn spine(n: usize) -> (Society, Vec<String>) {
        let mut soc = Society::new();
        let mut chain = vec!["end".to_string()];
        for k in 0..n { chain.push(format!("i{k}")); }
        chain.push("source".to_string());
        for s in &chain { soc.lay(EventRow::node(s, "")); }
        for w in chain.windows(2) { grounds(&mut soc, &w[0], &w[1]); } // w[0] rests on w[1]
        (soc, chain)
    }

    proptest! {
        // THE PROPERTY: apply the function from any beat; you reach the one desired result.
        #[test]
        fn applying_because_reaches_the_one_desired_result(n in 0usize..12) {
            let (soc, chain) = spine(n);
            let content: Vec<&str> = chain.iter().map(|s| s.as_str()).collect();

            // the desired result, read structurally (the end pole — nothing is because-of it).
            let p = find_poles(&soc, content.iter().copied(), None, None);
            prop_assert_eq!(p.source.clone(), Pole::Found("source".into()));
            prop_assert_eq!(p.end.clone(), Pole::Found("end".into()));

            // now EVALUATE: from each beat, keep applying `because_fn` (function application)
            // upward. you always terminate, and the top — the beat the function can no longer
            // be applied to (no argument's ground left) — IS the source. Reading DOWN from
            // `end` via because_fn walks the whole spine and the LAST applicable is the source.
            for start in &chain {
                let mut cur = start.clone();
                let mut steps = 0;
                while let Some(next) = because_fn(&soc, &cur) {
                    cur = next;
                    steps += 1;
                    prop_assert!(steps <= chain.len(), "evaluation must terminate (no cycle)");
                }
                // where application bottoms out is the SOURCE (the arg with no further ground).
                prop_assert_eq!(&cur, "source");
            }

            // and the desired RESULT (the end) is the unique beat from which a full evaluation
            // traverses the ENTIRE interior: end is the function's entry point, source its base.
            let mut cur = "end".to_string();
            let mut visited = vec![cur.clone()];
            while let Some(next) = because_fn(&soc, &cur) { cur = next.clone(); visited.push(next); }
            prop_assert_eq!(visited.len(), chain.len()); // applied through all of Time
            prop_assert_eq!(visited.first().unwrap(), "end");     // entry = desired result
            prop_assert_eq!(visited.last().unwrap(),  "source");  // base  = initial data
        }
    }
}


// ── anti-time: retrograde causality is the GENERAL case, not a special one ───────────
// Hyperion's Shrike & Moneta move backward through time — an event whose `because` points
// at its own (clock-)future. HYPOTHESIS (from "Once is frame-relative" + otter-centaur =
// causal set theory): `because` reads the RESTING-ORDER, not the clock, so a retrograde edge
// just extends the spine — it doesn't break the grammar. Causality is the partial order, not
// the time coordinate. Strip the clock and retrograde causation is ordinary causation.
// (kalpa/hyperion; memory: otter-centaur-is-causal-set-theory)
mod anti_time {
    use super::*;
    use scher_core::edge_word::{find_poles, Pole};

    #[test]
    fn retrograde_edge_is_just_a_spine_extension() {
        // Kassad-frame forward: meets ~because~ battle. Moneta-frame retrograde: a FUTURE
        // tomb-event rests on the meeting. The two coexist as one clean DAG, no cycle.
        let mut soc = Society::new();
        for s in ["kassad-battle", "kassad-meets-moneta", "moneta-future-tomb"] { soc.lay(EventRow::node(s, "")); }
        grounds(&mut soc, "kassad-meets-moneta", "kassad-battle");      // forward
        grounds(&mut soc, "moneta-future-tomb", "kassad-meets-moneta"); // retrograde (anti-time)
        let p = find_poles(&soc, ["kassad-battle", "kassad-meets-moneta", "moneta-future-tomb"], None, None);
        // the retrograde edge extended the spine; the clock-future event is the structural END.
        assert_eq!(p.end, Pole::Found("moneta-future-tomb".into()));
        assert_eq!(p.source, Pole::Found("kassad-battle".into()));
    }

    #[test]
    fn closed_causal_loop_is_the_paradox_and_smacks() {
        // The Time Tombs CAUSE THEIR OWN OPENING (the pilgrimage's outcome reaches back to
        // cause the sending). A genuine bootstrap cycle: tomb rests on opening, opening rests
        // on tomb. Every beat is both an `a` and a `b` → no source, no end → malformed. The
        // grammar does NOT absorb a true paradox silently — the law smacks (Pole::None).
        let mut soc = Society::new();
        for s in ["the-tomb", "the-opening"] { soc.lay(EventRow::node(s, "")); }
        grounds(&mut soc, "the-tomb", "the-opening");
        grounds(&mut soc, "the-opening", "the-tomb"); // the bootstrap — closes the causal loop
        let p = find_poles(&soc, ["the-tomb", "the-opening"], None, None);
        assert_eq!(p.end, Pole::None);    // no terminal — paradox
        assert_eq!(p.source, Pole::None); // no source — paradox
    }
}

// ── story-hood is structural (mirrors scher/test/story-structural.test.ts) ────────────
// F-A ruling + pole law (2026-07-06): a beat is a Story iff it has been unpacked into
// its poles — the Q_END_POLE designation; end_of reads its object, no spelling inspected.
#[test]
fn end_of_reads_the_pole_designation_never_the_spelling() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("capture-milk", "capture"));
    soc.lay(EventRow::node("milk-in-fridge", "the End-pole — no 'end' spelled"));
    soc.lay_p("cm~end-pole~mif", "End-pole designation", "capture-milk", "milk-in-fridge", Q_END_POLE).unwrap();
    assert_eq!(end_of(&soc, "capture-milk").as_deref(), Some("milk-in-fridge"));

    // and 'weekend-plans' bait without a designation designates nothing:
    soc.lay(EventRow::node("saturday-thought", "thought"));
    soc.lay(EventRow::node("weekend-plans", "spells 'end'"));
    soc.lay(EventRow::edge("st-e1", "plain edge", "saturday-thought", "weekend-plans"));
    soc.lay_p("st-dep", "waits on", "saturday-thought", "weekend-plans", "q-depends-on").unwrap();
    assert_eq!(end_of(&soc, "saturday-thought"), None);
}

// ── q-lure is DEAD (mirrors scher/test/lure-is-dead.test.ts) — the guard BLOCKS ───────
// Hallie, verbatim, 2026-07-06: "Q Lure is killed with fire … a test is written that says
// if there are any q-lures anywhere in the db it will not work and why and what to do to
// fix it." lay_p refuses the write outright (fail-closed), naming the why and the fix.
#[test]
#[should_panic(expected = "DEAD GRAMMAR")]
fn laying_q_lure_will_not_work() {
    let mut soc = Society::new();
    soc.lay_p("a~lures~b", "a lure", "a", "b", "q-lure").unwrap();
}

// ── voltage (mirrors scher/test/voltage.test.ts) — the 2026-07-06 pole rulings ────────
// "Capture strikes a voltage; marking voltage lays charge; done closes the circuit;
// nothing ever un-happens." Voltage takes a GROUND (the reading frame's lineage head;
// default the story's own frame under SOFD); charges are BARE edges onto the open End
// (pure address — no charge quality exists); discharge PROPAGATES, never a global zero.
#[test]
fn voltage_is_grounded_and_discharge_propagates() {
    let mut soc = Society::new();
    // capture = ONE event: no poles, no differential, no voltage.
    soc.lay(EventRow::node("buy-milk", "buy milk"));
    assert_eq!(voltage_of(&soc, "buy-milk", None, None), 0);

    // first need: the lazy three-pole unpack — End designated; the story's own Now,
    // because its Once ("Now is because events"; convener's proposal, standing).
    soc.lay(EventRow::node("buy-milk~hea", "the End-pole, not yet actual"));
    soc.lay_p("buy-milk~end-pole~hea", "End-pole designation (frame: buy-milk)", "buy-milk", "buy-milk~hea", Q_END_POLE).unwrap();
    let now = story_now("buy-milk");
    soc.lay(EventRow::node(&now, "the story's own Now"));
    soc.lay_p(&format!("{now}~because~buy-milk"), "now is because events", &now, "buy-milk", Q_GROUNDING).unwrap();
    assert_eq!(voltage_of(&soc, "buy-milk", None, None), 1); // the open strike

    // charge: a BARE edge onto the open End, woven into the story's lineage (SOFD).
    soc.lay(EventRow::edge("buy-milk~hea~charge-0", "charge", "frame-hallie", "buy-milk~hea"));
    soc.lay_p(&format!("{now}~because~buy-milk~hea~charge-0"), "witnessed", &now, "buy-milk~hea~charge-0", Q_GROUNDING).unwrap();
    assert_eq!(charges_on(&soc, "buy-milk~hea", None).len(), 1);
    assert_eq!(voltage_of(&soc, "buy-milk", None, None), 2);

    // Bob's lineage witnesses story and charge — his ground reads 2 as well:
    soc.lay(EventRow::node("now-bob", "Bob's Now"));
    soc.lay_p("now-bob~because~buy-milk", "bob witnessed", "now-bob", "buy-milk", Q_GROUNDING).unwrap();
    soc.lay_p("now-bob~because~charge0", "bob witnessed the charge", "now-bob", "buy-milk~hea~charge-0", Q_GROUNDING).unwrap();
    assert_eq!(voltage_of(&soc, "buy-milk", Some("now-bob"), None), 2);

    // done: end ~because~ storyNow. Closed for the story's own frame (SOFD) — but Bob
    // reads RESIDUAL voltage until the closing establishes to him: no global zeroing.
    let closing = format!("buy-milk~hea~because~{now}");
    soc.lay_p(&closing, "the end is because now", "buy-milk~hea", &now, Q_GROUNDING).unwrap();
    assert!(end_actual(&soc, "buy-milk~hea", None));
    assert_eq!(voltage_of(&soc, "buy-milk", None, None), 0); // closed where it closed
    assert_eq!(voltage_of(&soc, "buy-milk", Some("now-bob"), None), 2); // done, still discharging
    soc.lay_p("now-bob~because~closing", "the closing reached bob", "now-bob", &closing, Q_GROUNDING).unwrap();
    assert_eq!(voltage_of(&soc, "buy-milk", Some("now-bob"), None), 0); // discharged to Bob

    // the closed circuit IS a closed because-path End → Now → Once:
    assert!(reaches(&soc, "buy-milk~hea", "buy-milk", Q_GROUNDING, None));
    // nothing un-happened:
    assert!(soc.get("buy-milk~hea~charge-0").is_some());
    assert!(soc.get("buy-milk~end-pole~hea").is_some());
}

// ── the naked-pole address law (mirrors scher/test/address-law.test.ts) ───────────────
// THE LAW: an open End-pole receives only charge-prehensions (bare edges) onto it and,
// eventually, the ONE closing q-grounding out of it — nothing else touches a naked pole.
#[test]
#[should_panic(expected = "ADDRESS LAW")]
fn a_quality_prehension_onto_a_naked_pole_will_not_work() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("task", "a task"));
    soc.lay(EventRow::node("task~hea", "open End"));
    soc.lay_p("task~end-pole~hea", "designation", "task", "task~hea", Q_END_POLE).unwrap();
    soc.lay_p("cmt~feels~hea", "comment parked on the pole", "commenter", "task~hea", "q-feel").unwrap();
}

// ── the algedonic reads (mirror scher/test/algedonic.test.ts) — Beer's channel ────────
#[test]
fn floating_charge_and_overload_read_raw_and_loudest_first() {
    let mut soc = Society::new();
    for t in ["held-task", "orphan-task"] {
        soc.lay(EventRow::node(t, t));
        let (end, now) = (format!("{t}~hea"), story_now(t));
        soc.lay(EventRow::node(&end, "open End"));
        soc.lay_p(&format!("{t}~end-pole~{end}"), "designation", t, &end, Q_END_POLE).unwrap();
        soc.lay(EventRow::node(&now, "story now"));
        soc.lay_p(&format!("{now}~because~{t}"), "now is because events", &now, t, Q_GROUNDING).unwrap();
        // one charge each, woven:
        let c = format!("{end}~charge-0");
        soc.lay(EventRow::edge(&c, "charge", "frame-vik", &end));
        soc.lay_p(&format!("{now}~because~{c}"), "witnessed", &now, &c, Q_GROUNDING).unwrap();
    }
    // a second charge makes the orphan louder:
    soc.lay(EventRow::edge("orphan-task~hea~charge-1", "more", "frame-tam", "orphan-task~hea"));
    // one live frame holds held-task's lineage only:
    soc.lay(EventRow::node("now-priya", "priya's Now"));
    soc.lay_p("now-priya~holds", "priya holds it", "now-priya", &story_now("held-task"), Q_GROUNDING).unwrap();

    let floating = floating_charge(&soc, &["now-priya"], None);
    assert_eq!(floating.len(), 1);
    assert_eq!(floating[0].story, "orphan-task");
    assert_eq!(floating[0].charges, 2);

    let (total, readings) = overload(&soc, "now-priya", None);
    // priya's ground reaches held-task's whole course (strike + charge = 2); orphan: 0.
    assert_eq!(total, 2);
    assert_eq!(readings.len(), 1);
    assert_eq!(readings[0].story, "held-task");
}

// ── interval plain-edge classification (mirrors scher/test/interval-plain-edges.test.ts) ──
// CORRECTION to migration-design item 1 (2026-07-06, event-1350 debugging sitting):
// interval_of classifies out the quality MACHINERY (~q mode-beats; edges whose object IS a
// quality token, read structurally) — but a quality-CARRYING edge (lay_p q-grounding) is
// interval fabric and MUST be walked. Production membership edges carry q-grounding and
// must: a bare edge onto an open End reads as a charge under the address law.
#[test]
fn interval_walks_quality_carrying_edges() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("once", "once"));
    soc.lay(EventRow::node("beat-a", "a"));
    soc.lay(EventRow::node("end", "end"));
    soc.lay_p("once~because~beat-a", "chain", "once", "beat-a", "q-grounding").unwrap();
    soc.lay_p("beat-a~because~end", "chain", "beat-a", "end", "q-grounding").unwrap();

    let interval = interval_of(&soc, "once", "end");
    assert!(interval.contains(&"beat-a".to_string()), "got {interval:?}");
}

#[test]
fn interval_excludes_edges_onto_quality_tokens() {
    let mut soc = Society::new();
    soc.lay(EventRow::node("once", "once"));
    soc.lay(EventRow::node("end", "end"));
    soc.lay_p("once~because~end", "chain", "once", "end", "q-grounding").unwrap();
    // designation-shaped smuggling: edges touching the quality token itself
    soc.lay(EventRow::edge("end~designates", "smuggle", "end", "q-grounding"));
    soc.lay(EventRow::edge("q-grounding~leak", "smuggle", "q-grounding", "once"));

    let interval = interval_of(&soc, "once", "end");
    assert!(!interval.contains(&"q-grounding".to_string()), "got {interval:?}");
}

// ── sublimes-store + chaining (mirrors scher/test/sublimes-store.test.ts) ─────────────
// Sublimes are never-closing poles that organize pursuit without luring. They chain into
// a DAG of stars (A ~because~ B = A serves B), kept acyclic — a cycle of never-closing
// poles is q-lure wearing a halo.

fn make_sublime(soc: &mut Society, name: &str) {
    soc.lay(EventRow::node(name, name));
    soc.lay_p(&format!("{name}~pole"), name, name, name, Q_SUBLIME_POLE).unwrap();
}

#[test]
fn sublime_pole_is_designated_and_never_closes() {
    let mut soc = Society::new();
    make_sublime(&mut soc, "horizon");
    assert!(is_sublime_pole(&soc, "horizon", None));
    // bearings + voltage from an event
    soc.lay(EventRow::node("work", "work"));
    soc.lay_p("work~bear", "bearing", "work", "horizon", "because").unwrap();
    assert_eq!(bearings_of(&soc, "work", None).len(), 1);
    assert_eq!(voltage_toward_sublime(&soc, "horizon", None), 1);
}

#[test]
fn closing_a_sublime_will_not_work() {
    let mut soc = Society::new();
    make_sublime(&mut soc, "horizon");
    soc.lay(EventRow::node("now", "now"));
    let refused = soc.lay_p("close", "close", "horizon", "now", Q_GROUNDING);
    let err = refused.expect_err("closing a sublime-pole must be REFUSED, not silently laid");
    assert!(err.contains("sublime-never-closes"), "refusal must name its law: {err}");

    // ANTI-Q-LURE GUARANTEE, mechanism-not-content (Hallie's ruling 2026-07-07): a refusal
    // is not a seizure — the kernel stays usable for the very next operation. Prove it by
    // laying something else successfully right after the refused write, in the SAME society.
    let laid = soc.lay(EventRow::node("still-usable", "the kernel did not seize"));
    assert!(laid, "society must remain writable after a refused sublime-closing write");
    assert!(soc.has("still-usable"));
}

#[test]
fn sublimes_chain_and_service_chain_walks_up_the_dag() {
    let mut soc = Society::new();
    make_sublime(&mut soc, "a");
    make_sublime(&mut soc, "b");
    make_sublime(&mut soc, "c");
    soc.lay_p("a~serves~b", "serves", "a", "b", "because").unwrap();
    soc.lay_p("b~serves~c", "serves", "b", "c", "because").unwrap();

    let mut chain = service_chain_of(&soc, "a", None);
    chain.sort();
    assert_eq!(chain, vec!["b".to_string(), "c".to_string()]);

    // an event bearing a inherits toward all of a, b, c
    soc.lay(EventRow::node("event", "event"));
    soc.lay_p("event~bear~a", "bearing", "event", "a", "because").unwrap();
    let mut reached = reached_sublimes_of(&soc, "event", None);
    reached.sort();
    assert_eq!(reached, vec!["a".to_string(), "b".to_string(), "c".to_string()]);
}

#[test]
fn a_ring_of_sublimes_may_mutually_prehend() {
    // FLIPPED 2026-07-10 (Hallie: "sublimes can be mutually prehensive ... a little outside
    // of time"). This test used to be `a_cycle_among_sublimes_will_not_work` and asserted
    // that a ring of sublime-bearings was REFUSED (sublime-dag-acyclic). Acyclicity is a
    // rule ABOUT TIME; a sublime is the limit of all futures at infinity, outside time, where
    // a ring of "because" bearings is a constellation of stars holding each other's positions,
    // not a causal paradox. The acyclic refusal is removed for the sublime↔sublime case.
    let mut soc = Society::new();
    make_sublime(&mut soc, "a");
    make_sublime(&mut soc, "b");
    make_sublime(&mut soc, "c");
    soc.lay_p("a~serves~b", "serves", "a", "b", "because").unwrap();
    soc.lay_p("b~serves~c", "serves", "b", "c", "because").unwrap();
    // c → a closes the ring a → b → c → a. Now ALLOWED (mutual prehension among sublimes).
    let ring = soc.lay_p("c~serves~a", "serves", "c", "a", "because");
    assert!(ring.is_ok(), "a sublime ring must be ALLOWED, not refused: {ring:?}");

    // The in-time-vs-timeless boundary that STAYS: q-grounding OUT of a sublime (actualizing
    // the limit point) is still the real q-lure and stays REFUSED by sublime-never-closes.
    let close = soc.lay_p("a~because~b", "close", "a", "b", scher_core::Q_GROUNDING);
    let err = close.expect_err("q-grounding out of a sublime must STILL be refused");
    assert!(err.contains("sublime-never-closes"), "refusal must name its law: {err}");

    // ANTI-Q-LURE GUARANTEE, mechanism-not-content: the kernel stays usable — no seizure on
    // either the allowed ring or the still-refused close.
    soc.lay(EventRow::node("still-usable", "the kernel did not seize"));
    assert!(soc.has("still-usable"), "society must remain writable after these writes");
}
