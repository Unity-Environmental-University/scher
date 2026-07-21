// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MUSLIN — seams showing on purpose. Tear this apart before trusting it.  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// scher-core-wasm — the wasm-bindgen boundary around scher-core (Hallie's ruling,
// 2026-07-21: ship wasm-compiled Rust so the project stops maintaining two kernel
// codebases — approved AS LONG AS it lives in scher and ships as a compiled, easily
// installable package). This slice PROVES the toolchain, the package shape, and the
// boundary cost. It does not port the whole kernel and it deletes no TS.
//
// DESIGN LAW OF THIS BOUNDARY: COARSE CALLS ONLY. One call constructs a whole
// Society from a batch of rows; one call returns the whole bucket structure. The
// per-slug probes at the bottom (`has`, `is_occluded`) exist ONLY so the benchmark
// can quantify how much a chatty boundary costs — they are the cautionary tale,
// not the API. Do not grow this surface one small getter at a time.
//
// SEAMS (open, for Hallie's eye):
//   • members_of / buckets_of are PORTED HERE, not in scher-core — scher-core has no
//     Rust twin for them yet (the fixture's own TODO(rust-port) header says the port
//     happens against membership-buckets.json when the twin is built; this is that
//     port, but it squats in the wasm crate so scher-core stays untouched this
//     slice). Extraction into scher-core, with an advocate for lib.rs, is the
//     obvious next move once this shape survives review.
//   • the boundary speaks JSON strings both ways. serde-wasm-bindgen would shave a
//     serialize/parse copy per call; JSON won for the muslin because the conformance
//     corpus is JSON and the numbers below stay honest either way.
//   • as_of crosses as f64 (JS number), cast to u64 — witnessed clocks in canon are
//     small integers; a fractional or negative as_of is truncated, not refused.

use scher_core::{
    end_actual, end_of, has_any_quality, is_occluded, is_sublime_pole, prehensions_from,
    prehensions_onto, reaches, story_now, EventRow, Society, Q_GROUNDING,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

// ── the ported reads (mirror society.ts membersOf/bucketsOf line-for-line) ────────

fn visible_at(b: &EventRow, as_of: Option<u64>) -> bool {
    // private in scher-core; re-stated here verbatim (3 lines) rather than opening
    // scher-core's surface for the muslin. SEAM: unify when the port moves home.
    match as_of {
        None => true,
        Some(t) => b.witnessed.unwrap_or(0) <= t,
    }
}

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

/// sublimesChargedFrom (society.ts): THE LURE LAW — a sublime's grip is APPETITION,
/// a bare (quality-free) prehension whose SUBJECT is the sublime-pole.
fn sublimes_charged_from(soc: &Society, node: &str, as_of: Option<u64>) -> Vec<String> {
    soc.edges_onto_object(node)
        .filter(|b| {
            b.subject.is_some()
                && visible_at(b, as_of)
                && !has_any_quality(soc, &b.slug, as_of)
                && !is_occluded(soc, &b.slug, as_of)
                && is_sublime_pole(soc, b.subject.as_deref().unwrap(), as_of)
        })
        .map(|b| b.subject.clone().unwrap())
        .collect()
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

// ── the boundary itself ──────────────────────────────────────────────────────────

/// A fixture row as the conformance corpus (and any JS caller) spells it.
#[derive(Deserialize)]
struct RowIn {
    slug: String,
    content: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    subject: Option<String>,
    #[serde(default)]
    object: Option<String>,
    #[serde(default)]
    witnessed: Option<u64>,
    #[serde(default)]
    laid_by: Option<String>,
    #[serde(default)]
    voltage: Option<String>,
}

/// A Society held on the wasm side. Constructed ONCE from a whole batch of rows
/// (one boundary crossing); read via coarse calls that return whole structures.
#[wasm_bindgen]
pub struct WasmSociety {
    soc: Society,
}

#[wasm_bindgen]
impl WasmSociety {
    /// The coarse constructor: one call, a whole canon. `rows_json` is a JSON array
    /// of EventRow objects (the conformance corpus's exact row spelling). Rows are
    /// laid verbatim via the one write — ~q mode-beats included, no layP guards run
    /// (mirrors the conformance harnesses' replay discipline).
    #[wasm_bindgen(constructor)]
    pub fn new(rows_json: &str) -> Result<WasmSociety, JsError> {
        console_error_panic_hook::set_once(); // kernel panics become real messages
        let rows: Vec<RowIn> =
            serde_json::from_str(rows_json).map_err(|e| JsError::new(&format!("rows_json: {e}")))?;
        let mut soc = Society::new();
        for r in rows {
            soc.lay(EventRow {
                slug: r.slug,
                content: r.content,
                name: r.name,
                subject: r.subject,
                object: r.object,
                witnessed: r.witnessed,
                laid_by: r.laid_by,
                voltage: r.voltage,
            });
        }
        Ok(WasmSociety { soc })
    }

    pub fn size(&self) -> usize {
        self.soc.size()
    }

    /// membersOf, one call → JSON array of slugs.
    #[wasm_bindgen(js_name = membersOf)]
    pub fn members_of(&self, event: &str, as_of: Option<f64>) -> String {
        let v = members_of(&self.soc, event, as_of.map(|t| t as u64));
        serde_json::to_string(&v).expect("Vec<String> serializes")
    }

    /// bucketsOf, one call → the WHOLE bucket structure as JSON. This is the design
    /// law: the boundary is crossed once per read, not once per member.
    #[wasm_bindgen(js_name = bucketsOf)]
    pub fn buckets_of(&self, event: &str, as_of: Option<f64>) -> String {
        let b = buckets_of(&self.soc, event, as_of.map(|t| t as u64));
        serde_json::to_string(&b).expect("Buckets serializes")
    }

    // ── CAUTIONARY PROBES — benchmark instrumentation, NOT the API ────────────────
    // These exist so bench/bench.mjs can measure the per-call boundary tax of a
    // chatty design honestly. If you find yourself calling these in a loop from app
    // code, you are rebuilding the mistake this crate exists to measure.

    /// (cautionary) one slug, one crossing.
    pub fn has(&self, slug: &str) -> bool {
        self.soc.has(slug)
    }

    /// (cautionary) one occlusion read, one crossing.
    #[wasm_bindgen(js_name = isOccluded)]
    pub fn is_occluded(&self, target: &str, as_of: Option<f64>) -> bool {
        is_occluded(&self.soc, target, as_of.map(|t| t as u64))
    }
}
