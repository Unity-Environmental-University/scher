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
        // a named event occludes the target
        s.lay_p(&occ, "occludes", "ev", &target, Q_OCCLUDES);
        prop_assert!(is_occluded(&s, &target, None));
        // occlude the occluder → target revealed (one level)
        s.lay_p(&reveal, "occludes the occluder", "ev2", &occ, Q_OCCLUDES);
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
