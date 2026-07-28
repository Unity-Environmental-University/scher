// ─────────────────────────────────────────────────────────────────────────────
// end_subject_membership_fixture.rs — the Rust half of the twin conformance
// corpus for the 2026-07-20 ruling ("The End prehends the capture"). Replays
// ../conformance/end-subject-membership.json — NEUTRAL GROUND, owned by neither
// twin — and asserts its expected readings.
// scher/test/conformance.end-subject-membership.test.ts replays the SAME file.
//
// This fixture exists because interval-occlusion.json could not see the law: it
// has no edge whose subject is a designated End-pole, so it blessed a real
// divergence for eight days. If either side fails here, the engines disagree on
// STORY MEMBERSHIP — not on shape.
//
// Follows interval_occlusion_fixture.rs's shape.
// ─────────────────────────────────────────────────────────────────────────────

use scher_core::{interval_of, EventRow, Society};
use serde_json::Value;

fn fixture() -> Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../conformance/end-subject-membership.json");
    let raw = std::fs::read_to_string(path).expect("read conformance/end-subject-membership.json");
    serde_json::from_str(&raw).expect("parse conformance/end-subject-membership.json")
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
fn end_subject_membership_fixture_replays_identically() {
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
