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

use scher_core::{is_occluded, EventRow, Society};
use scher_epistemology::{buckets_of, members_of};
use serde::Deserialize;
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
