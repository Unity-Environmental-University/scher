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
// RESOLVED SEAM (Hallie's ruling, 2026-07-21): members_of / buckets_of used to be
// ported inline in this file. They are PENELOPE-LEVEL epistemology, not scher-core
// algebra, so they moved out to their own crate, scher-epistemology — this file now
// only calls in. The wasm boundary's own job stays narrow and honest: construct a
// Society from a batch of rows, cross the boundary coarsely, ship as one compiled
// package. (Reads still ship inside this same installable package; only the source
// crate changed.)
//
// SEAMS (open, for Hallie's eye):
//   • the boundary speaks JSON strings both ways. serde-wasm-bindgen would shave a
//     serialize/parse copy per call; JSON won for the muslin because the conformance
//     corpus is JSON and the numbers below stay honest either way.
//   • as_of crosses as f64 (JS number), cast to u64 — witnessed clocks in canon are
//     small integers; a fractional or negative as_of is truncated, not refused.

use scher_core::{
    is_occluded, prehensions_from, quality_subjects_onto, reaches_set, EventRow, Society,
};
use scher_epistemology::{buckets_of, members_of};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

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

/// A row on the way back out — what an event SAYS, so a JS caller does not need a
/// second source of truth for content/name/witnessed alongside the kernel's reads.
#[derive(Serialize)]
struct RowOut {
    slug: String,
    content: String,
    name: Option<String>,
    subject: Option<String>,
    object: Option<String>,
    witnessed: Option<u64>,
    /// Who laid it. Dropped from the first cut of this struct by oversight — provenance
    /// reads ("who proposed this, who accepted it") are unanswerable without it.
    laid_by: Option<String>,
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

    /// prehensionsFrom, one call → JSON array of {slug, subject, object} for every
    /// un-occluded prehension FROM `event` co-prehending `quality`, as of a moment.
    /// The outward half of an axis read: "what does this prehend along q-contains?"
    #[wasm_bindgen(js_name = qualityObjectsFrom)]
    pub fn quality_objects_from(&self, event: &str, quality: &str, as_of: Option<f64>) -> String {
        let t = as_of.map(|t| t as u64);
        let v: Vec<String> = prehensions_from(&self.soc, event, quality, t)
            .iter()
            .filter(|p| !is_occluded(&self.soc, &p.slug, t))
            .filter_map(|p| p.object.clone())
            .collect();
        serde_json::to_string(&v).expect("Vec<String> serializes")
    }

    /// qualitySubjectsOnto, one call → JSON array of slugs. The inward half: "what
    /// prehends this along q-after?" Already occlusion-filtered in scher-core.
    #[wasm_bindgen(js_name = qualitySubjectsOnto)]
    pub fn quality_subjects_onto_js(&self, row: &str, quality: &str, as_of: Option<f64>) -> String {
        let v = quality_subjects_onto(&self.soc, row, quality, as_of.map(|t| t as u64));
        serde_json::to_string(&v).expect("Vec<String> serializes")
    }

    /// reachesSet, one call → JSON array of every node reachable from `from` along
    /// un-occluded prehensions co-prehending `quality`. One walk instead of N.
    #[wasm_bindgen(js_name = reachesSet)]
    pub fn reaches_set_js(&self, from: &str, quality: &str, as_of: Option<f64>) -> String {
        let mut v: Vec<String> =
            reaches_set(&self.soc, from, quality, as_of.map(|t| t as u64)).into_iter().collect();
        v.sort(); // HashSet order is not stable; a UI reading this wants determinism.
        serde_json::to_string(&v).expect("Vec<String> serializes")
    }

    /// The row itself, as JSON, or "null" — so a caller can read content/name/witnessed
    /// without a second source of truth for what an event says.
    #[wasm_bindgen(js_name = rowOf)]
    pub fn row_of(&self, slug: &str) -> String {
        match self.soc.all().find(|b| b.slug == slug) {
            Some(r) => serde_json::to_string(&RowOut {
                slug: r.slug.clone(),
                content: r.content.clone(),
                name: r.name.clone(),
                subject: r.subject.clone(),
                object: r.object.clone(),
                witnessed: r.witnessed,
                laid_by: r.laid_by.clone(),
            })
            .expect("RowOut serializes"),
            None => "null".to_string(),
        }
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
