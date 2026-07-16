// ─────────────────────────────────────────────────────────────────────────────
// interval_occlusion_fixture.rs — the Rust half of the twin conformance corpus
// (2026-07-16, occlusion-aware intervalOf). Replays
// ../conformance/interval-occlusion.json — NEUTRAL GROUND, owned by neither twin —
// and asserts its expected readings. scher/test/conformance.interval-occlusion.test.ts
// replays the SAME file; if either side fails, the engines have diverged on whether
// interval_of's walk honors occlusion (the app-side placement-laws law 7 fence this
// fixture answers).
//
// Follows bare_closing_fixture.rs's shape: one fixture, a tiny read-dispatcher,
// simple enough to extend.
// ─────────────────────────────────────────────────────────────────────────────

use scher_core::{interval_of, EventRow, Society};
use serde_json::Value;

fn fixture() -> Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../conformance/interval-occlusion.json");
    let raw = std::fs::read_to_string(path).expect("read conformance/interval-occlusion.json");
    serde_json::from_str(&raw).expect("parse conformance/interval-occlusion.json")
}

fn replay(rows: &[Value]) -> Society {
    let mut soc = Society::new();
    for r in rows {
        // rows verbatim via the one write — mode-beats (~q) included, no lay_p
        // constructor, so the TS harness lays byte-identical state.
        let mut b = match (r.get("subject").and_then(Value::as_str), r.get("object").and_then(Value::as_str)) {
            (Some(s), Some(o)) => EventRow::edge(r["slug"].as_str().unwrap(), r["content"].as_str().unwrap(), s, o),
            _ => EventRow::node(r["slug"].as_str().unwrap(), r["content"].as_str().unwrap()),
        };
        b.witnessed = r.get("witnessed").and_then(Value::as_u64);
        soc.lay(b);
    }
    soc
}

#[test]
fn interval_occlusion_fixture_replays_identically() {
    let fx = fixture();
    let soc = replay(fx["rows"].as_array().expect("rows"));
    for e in fx["expect"].as_array().expect("expect") {
        match e["read"].as_str().expect("read") {
            "intervalOf" => {
                let once = e["once"].as_str().unwrap();
                let end = e["end"].as_str().unwrap();
                let interval = interval_of(&soc, once, end);
                for slug in e["contains"].as_array().expect("contains") {
                    let slug = slug.as_str().unwrap();
                    assert!(
                        interval.iter().any(|s| s == slug),
                        "interval_of({once} -> {end}) should contain {slug}, got {interval:?}"
                    );
                }
                for slug in e["excludes"].as_array().expect("excludes") {
                    let slug = slug.as_str().unwrap();
                    assert!(
                        !interval.iter().any(|s| s == slug),
                        "interval_of({once} -> {end}) should NOT contain {slug}, got {interval:?}"
                    );
                }
            }
            other => panic!("unknown read in fixture: {other}"),
        }
    }
}
