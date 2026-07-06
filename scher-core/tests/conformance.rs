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

/// distinct content-beat slugs: 1..=6 chars, not ending `~q`, not starting `q-`.
fn slugs() -> impl Strategy<Value = Vec<String>> {
    prop::collection::hash_set(
        "[a-z]{1,6}".prop_filter("no ~q / q- slugs", |s: &String| {
            !s.ends_with("~q") && !s.starts_with("q-")
        }),
        1..=8,
    )
    .prop_map(|set| set.into_iter().collect())
}

/// a history: beats drawn (with repeats) from a slug pool — the `historyArb` shape.
fn history() -> impl Strategy<Value = Vec<Beat>> {
    slugs().prop_flat_map(|pool| {
        prop::collection::vec(
            (0..pool.len(), ".*").prop_map({
                let pool = pool.clone();
                move |(i, content): (usize, String)| Beat::node(&pool[i], &content)
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
        let mut first: std::collections::HashMap<&String, &Beat> = std::collections::HashMap::new();
        for b in &hist { first.entry(&b.slug).or_insert(b); }
        for (slug, b) in first {
            prop_assert_eq!(soc.get(slug).map(|g| &g.content), Some(&b.content));
        }
    }

    // TS: "the witnessing clock is monotone … auto stamps are unique" — every auto-stamped
    // beat gets a distinct positive moment, never reusing/preceding an explicit one.
    #[test]
    fn auto_witnessed_stamps_are_unique(
        specs in prop::collection::vec(("[a-z]{1,5}", proptest::option::of(0u64..=50)), 0..=25)
    ) {
        let mut soc = Society::new();
        let mut auto_slugs: Vec<String> = Vec::new();
        for (slug, w) in &specs {
            let was_new = !soc.has(slug);
            let beat = match w { Some(t) => Beat::node(slug, slug).with_witnessed(*t), None => Beat::node(slug, slug) };
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
    let mut beats: Vec<Beat> = targets.iter().map(|t| Beat::node(t, t)).collect();
    for (i, p) in prehensions.iter().enumerate() {
        let kind = if p.grounding {
            Q_GROUNDING
        } else {
            Q_EXCLUSION
        };
        let slug = format!("p{i}-{kind}");
        let tgt = &targets[p.target];
        beats.push(Beat::edge(
            &slug,
            &format!("{}->{}", p.frame, tgt),
            &p.frame,
            tgt,
        ));
        beats.push(Beat::edge(
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
    #[test]
    fn emergent_un_occlusion(target in "[a-z]{1,5}", occ in "[a-z]{1,5}", reveal in "[a-z]{1,5}") {
        prop_assume!(target != occ && occ != reveal && target != reveal);
        let mut s = Society::seeded(&[Beat::node(&target, &target)]);
        // a named event occludes the target. Subjects carry a hyphen so the generated
        // names (bare [a-z]{1,5}) can never collide with them — a drawn target of "ev"
        // used to make this edge a self-loop, which correctly never occludes (the law
        // this test's own third clause asserts), failing the fixture, not the kernel.
        // Found 2026-07-06 (regression seed kept below per proptest convention).
        s.lay_p(&occ, "occludes", "ev-1", &target, Q_OCCLUDES);
        prop_assert!(is_occluded(&s, &target, None));
        // occlude the occluder → target revealed (one level)
        s.lay_p(&reveal, "occludes the occluder", "ev-2", &occ, Q_OCCLUDES);
        prop_assert!(!is_occluded(&s, &target, None));

        // a self-loop {subject==object} is NOT occlusion
        let mut s2 = Society::seeded(&[Beat::node(&target, &target)]);
        s2.lay_p("loop", "self", &target, &target, Q_OCCLUDES);
        prop_assert!(!is_occluded(&s2, &target, None));
    }
}

// ── occlusion example-tests (mirror occlusion.prop.test.ts's named `it` cases) ────────────

#[test]
fn occlude_hides_then_self_is_not_occluded() {
    let mut s = Society::seeded(&[Beat::node("a", "a")]);
    assert!(!is_occluded(&s, "a", None));
    s.lay_p("ev-occ", "E occludes a", "E", "a", Q_OCCLUDES);
    assert!(is_occluded(&s, "a", None));
    assert!(!is_occluded(&s, "ev-occ", None)); // the occluder itself stands in light
}

#[test]
fn occlusion_is_society_scoped() {
    // the frame IS the society: x occluded HERE stands in full light in another society.
    let mut s1 = Society::seeded(&[Beat::node("x", "x")]);
    s1.lay_p("occ-x", "occludes x", "E", "x", Q_OCCLUDES);
    let s2 = Society::seeded(&[Beat::node("x", "x")]);
    assert!(is_occluded(&s1, "x", None));
    assert!(!is_occluded(&s2, "x", None));
}

#[test]
fn undo_is_an_append_not_an_erasure() {
    // TS society.prop: "superseding a grounding flips establishment to false but keeps both
    // beats in the log" — reframed to occlusion, the live grammar.
    let mut soc = Society::seeded(&[Beat::node("target", "target")]);
    soc.lay_p("g0", "frame grounds", "frame", "target", Q_GROUNDING);
    assert!(is_established(&soc, "target", None));
    let size_after_ground = soc.size();

    soc.lay_p("occ-g0", "occludes g0", "frame", "g0", Q_OCCLUDES);
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
    soc.lay(Beat::node("target", "target").with_witnessed(1));
    soc.lay(Beat::edge("g0", "grounds", "frame", "target").with_witnessed(2));
    soc.lay(Beat::edge("g0~q", "[q-grounding]", "g0", Q_GROUNDING).with_witnessed(3));
    assert!(is_established(&soc, "target", None));
    // occlude at moment 10
    soc.lay(Beat::edge("occ", "occludes", "frame", "g0").with_witnessed(10));
    soc.lay(Beat::edge("occ~q", "[q-occludes]", "occ", Q_OCCLUDES).with_witnessed(11));
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
fn grounds(soc: &mut Society, a: &str, b: &str) {
    let e = format!("{a}~grounds~{b}");
    soc.lay(Beat::edge(&e, "", a, b));
    soc.lay(Beat::edge(&format!("{e}~q"), "[q-grounding]", &e, Q_GROUNDING));
}

#[test]
fn eikon_well_formed_has_one_source_one_end() {
    // HEA ~because~ mid ~because~ once   (HEA rests on mid, mid rests on once)
    let mut soc = Society::new();
    for s in ["hea", "mid", "once"] { soc.lay(Beat::node(s, "")); }
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
    for s in ["hea", "mid", "once"] { soc.lay(Beat::node(s, "")); }
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
    for s in ["hea1", "hea2", "once"] { soc.lay(Beat::node(s, "")); }
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
    for s in ["hea", "once"] { soc.lay(Beat::node(s, "")); }
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
    for s in ["end", "mid", "once", "now-story"] { soc.lay(Beat::node(s, "")); }
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
        for s in ["hea", "you", "me", "once"] { soc.lay(Beat::node(s, "")); }
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
        for s in ["you-hea", "you-mid", "you-once"] { soc.lay(Beat::node(s, "")); }
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
        for s in &chain { soc.lay(Beat::node(s, "")); }
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
        for s in ["kassad-battle", "kassad-meets-moneta", "moneta-future-tomb"] { soc.lay(Beat::node(s, "")); }
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
        for s in ["the-tomb", "the-opening"] { soc.lay(Beat::node(s, "")); }
        grounds(&mut soc, "the-tomb", "the-opening");
        grounds(&mut soc, "the-opening", "the-tomb"); // the bootstrap — closes the causal loop
        let p = find_poles(&soc, ["the-tomb", "the-opening"], None, None);
        assert_eq!(p.end, Pole::None);    // no terminal — paradox
        assert_eq!(p.source, Pole::None); // no source — paradox
    }
}
