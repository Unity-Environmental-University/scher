// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MUSLIN — seams showing on purpose. Tear this apart before trusting it.  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// scher-epistemology — the PENELOPE-LEVEL reads over scher-core's pure algebra
// (Hallie's ruling, 2026-07-21). scher-core is the metaphysical substrate:
// events, the one edge, poles, succession, occlusion — algebra with no opinion
// about what a "member" or a "bucket" is. membersOf, bucketsOf, and their
// helper grounded_cone/interval_set are a DESIGNED EPISTEMOLOGY on top of that
// data model: they interpret the substrate's events/poles/occlusion into
// taxonomy (todo/wish/sublime-shaped buckets). That interpretation is not
// metaphysics and does not belong inside scher-core, and it does not belong
// squatting inside scher-core-wasm either — that was the muslin's confessed
// seam (see scher-core-wasm's own banner, "members_of / buckets_of are PORTED
// HERE... squats in the wasm crate"), and this crate is that seam being paid
// down.
//
// NOT HERE: the lure law. sublimes_charged_from (a sublime's grip is
// APPETITION — a bare, quality-free prehension whose subject is the sublime
// pole) is scher-core's, not this crate's (Hallie's correction, 2026-07-21,
// same day: "the sublime section and lure law are still metaphysicsy enough.
// Sublime is my answer to Whitehead's God so it's gotta be in the
// metaphysics"). buckets_of below merely CALLS that substrate read, the same
// way it calls is_occluded or reaches — it doesn't own the sublime, it just
// asks the substrate about it.
//
// SHIP SHAPE: this crate is NOT published or shipped on its own. scher-core-wasm
// is still the one installable compiled package (Hallie's hard constraint) —
// scher-core-wasm depends on this crate privately and re-exports what it needs
// across the wasm boundary. If you're looking for the wasm-bindgen surface,
// it isn't here; it's one level up.
//
// GROWTH SEAM (not built yet, just given a home): scratch/visual-taxonomy.md
// sketches TODO/WISH/SUBLIME/WONDER as reads over this same substrate. This
// crate is where those reads would live once someone builds them — a place
// for the taxonomy to grow, not a foundation poured for it today. Don't add
// stubs for the unbuilt modes; the home existing is the whole ask right now.
//
// SEAMS (open, for Hallie's eye):
//   • serde is a dependency of THIS crate now, not just of scher-core-wasm:
//     Buckets/After/Before/Interior serialize at the crate boundary that
//     scher-core-wasm re-exports, so the derive has to live where the structs do.

use scher_core::{
    end_actual, end_of, is_occluded, prehensions_from, prehensions_onto, reaches, story_now,
    sublimes_charged_from, Society, Q_GROUNDING,
};
use serde::Serialize;
use std::collections::HashSet;

// ── the ported reads (mirror society.ts membersOf/bucketsOf line-for-line) ────────

/// groundedCone (society.ts): everything reaching `once` through un-occluded
/// q-grounding prehensions, walked object→subject.
fn grounded_cone(soc: &Society, once: &str, as_of: Option<u64>) -> HashSet<String> {
    let mut seen: HashSet<String> = HashSet::new();
    let mut stack = vec![once.to_string()];
    while let Some(n) = stack.pop() {
        for p in prehensions_onto(soc, &n, Q_GROUNDING, as_of) {
            if is_occluded(soc, &p.slug, as_of) {
                continue;
            }
            let m = p.subject.clone().expect("edges carry both ends");
            if seen.insert(m.clone()) {
                stack.push(m);
            }
        }
    }
    seen
}

/// membersOf (society.ts, verbatim port): the derived membership read.
pub fn members_of(soc: &Society, event: &str, as_of: Option<u64>) -> Vec<String> {
    let end = end_of(soc, event);
    let now = story_now(event);
    let has_now = soc.has(&now); // storyNow is a pure address — existence means the unpack ran
    if end.is_none() && !has_now {
        return vec![]; // never unpacked: nothing gathers, nothing is inside
    }
    let gather_from = match &end {
        Some(e) if end_actual(soc, e, as_of) => e.clone(),
        _ => now.clone(),
    };
    let cone = grounded_cone(soc, event, as_of);
    let mut out = vec![];
    for m in cone {
        if Some(&m) == end.as_ref() || m == now {
            continue; // the pole/Now machinery is not itself a member
        }
        if reaches(soc, &gather_from, &m, Q_GROUNDING, as_of) {
            out.push(m);
        }
    }
    out
}

/// intervalSet (society.ts): the INTERIOR's domain — groundedCone minus pole/Now infra.
fn interval_set(soc: &Society, event: &str, as_of: Option<u64>) -> HashSet<String> {
    let Some(end) = end_of(soc, event) else {
        return HashSet::new();
    };
    let now = story_now(event);
    let mut out = grounded_cone(soc, event, as_of);
    out.remove(&end);
    out.remove(&now);
    out
}

/// Buckets (society.ts, drawer-contents.md item 10) — the whole structure, one call.
#[derive(Serialize)]
pub struct Buckets {
    pub after: After,
    pub before: Before,
    pub interior: Interior,
}
#[derive(Serialize)]
pub struct After {
    pub direct: Vec<String>,
    #[serde(rename = "sublimesTree")]
    pub sublimes_tree: Vec<String>,
    pub indirect: Vec<String>,
    #[serde(rename = "indirectSublimesTree")]
    pub indirect_sublimes_tree: Vec<String>,
}
#[derive(Serialize)]
pub struct Before {
    pub direct: Vec<String>,
    pub indirect: Vec<String>,
}
#[derive(Serialize)]
pub struct Interior {
    pub future: Vec<String>,
    pub present: Vec<String>,
    pub past: Vec<String>,
}

/// bucketsOf (society.ts, verbatim port — see its trace comments there for the two
/// rounds of interior correction and THE LURE LAW; none of that history is re-argued
/// here, only mirrored).
pub fn buckets_of(soc: &Society, event: &str, as_of: Option<u64>) -> Buckets {
    let now = story_now(event);
    let has_now = soc.has(&now);
    let end = end_of(soc, event);
    let is_infra = |n: &str| n == now || Some(n) == end.as_deref();

    // AFTER: what prehends this event — one grounding hop onto `event`.
    let direct_after: Vec<String> = prehensions_onto(soc, event, Q_GROUNDING, as_of)
        .iter()
        .map(|p| p.subject.clone().unwrap())
        .filter(|n| !is_infra(n))
        .collect();
    let mut sublimes_seen: HashSet<String> = HashSet::new();
    let mut sublimes_tree = vec![];
    for m in &direct_after {
        for star in sublimes_charged_from(soc, m, as_of) {
            if sublimes_seen.insert(star.clone()) {
                sublimes_tree.push(star);
            }
        }
    }
    let mut indirect_after_seen: HashSet<String> = direct_after.iter().cloned().collect();
    let mut indirect_after = vec![];
    for m in &direct_after {
        for p in prehensions_onto(soc, m, Q_GROUNDING, as_of) {
            let n = p.subject.clone().unwrap();
            if is_infra(&n) || !indirect_after_seen.insert(n.clone()) {
                continue;
            }
            indirect_after.push(n);
        }
    }
    let mut indirect_sublimes_seen: HashSet<String> = sublimes_tree.iter().cloned().collect();
    let mut indirect_sublimes_tree = vec![];
    for m in &indirect_after {
        for star in sublimes_charged_from(soc, m, as_of) {
            if indirect_sublimes_seen.insert(star.clone()) {
                indirect_sublimes_tree.push(star);
            }
        }
    }

    // BEFORE: what this event prehends — one grounding hop out of `event`.
    let direct_before: Vec<String> = prehensions_from(soc, event, Q_GROUNDING, as_of)
        .iter()
        .map(|p| p.object.clone().unwrap())
        .filter(|n| !is_infra(n))
        .collect();
    let mut indirect_before_seen: HashSet<String> = direct_before.iter().cloned().collect();
    let mut indirect_before = vec![];
    for m in &direct_before {
        for p in prehensions_from(soc, m, Q_GROUNDING, as_of) {
            let n = p.object.clone().unwrap();
            if is_infra(&n) || !indirect_before_seen.insert(n.clone()) {
                continue;
            }
            indirect_before.push(n);
        }
    }

    // INTERIOR: partition the interval set by relation to E's OWN Now (item 9 verbatim:
    // future = prehends-the-Now; past = gathered-by-Now ≡ membersOf; present = straddler).
    let (mut future, mut present, mut past) = (vec![], vec![], vec![]);
    for m in interval_set(soc, event, as_of) {
        if has_now && reaches(soc, &now, &m, Q_GROUNDING, as_of) {
            past.push(m);
        } else if has_now && reaches(soc, &m, &now, Q_GROUNDING, as_of) {
            future.push(m);
        } else {
            present.push(m);
        }
    }

    Buckets {
        after: After {
            direct: direct_after,
            sublimes_tree,
            indirect: indirect_after,
            indirect_sublimes_tree,
        },
        before: Before {
            direct: direct_before,
            indirect: indirect_before,
        },
        interior: Interior { future, present, past },
    }
}
