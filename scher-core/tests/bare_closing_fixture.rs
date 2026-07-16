// ─────────────────────────────────────────────────────────────────────────────
// bare_closing_fixture.rs — the Rust half of the twin conformance corpus
// (2026-07-16, bare-closing conformance port). Replays ../conformance/bare-closing.json
// — NEUTRAL GROUND, owned by neither twin — and asserts its expected readings.
// scher/test/conformance.bare-closing.test.ts replays the SAME file; if either side
// fails, the engines have diverged on the bare-closing semantics (Hallie's
// 2026-07-15 ruling: edge direction alone carries the closing).
//
// DELIBERATELY MINIMAL harness: one fixture, a tiny read-dispatcher, simple enough
// to extend. The full corpus is a later sitting's work — this proves the shape.
// ─────────────────────────────────────────────────────────────────────────────

use scher_core::{end_actual, reaches, voltage_of, EventRow, Society};
use serde_json::Value;

fn fixture() -> Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../conformance/bare-closing.json");
    let raw = std::fs::read_to_string(path).expect("read conformance/bare-closing.json");
    serde_json::from_str(&raw).expect("parse conformance/bare-closing.json")
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
fn bare_closing_fixture_replays_identically() {
    let fx = fixture();
    let soc = replay(fx["rows"].as_array().expect("rows"));
    for e in fx["expect"].as_array().expect("expect") {
        let as_of = e.get("asOf").and_then(Value::as_u64);
        match e["read"].as_str().expect("read") {
            "endActual" => {
                let node = e["node"].as_str().unwrap();
                assert_eq!(
                    end_actual(&soc, node, as_of),
                    e["value"].as_bool().unwrap(),
                    "end_actual({node}) @ {as_of:?}"
                );
            }
            "voltageOf" => {
                let story = e["story"].as_str().unwrap();
                assert_eq!(
                    voltage_of(&soc, story, None, as_of),
                    e["value"].as_u64().unwrap(),
                    "voltage_of({story}) @ {as_of:?}"
                );
            }
            "reaches" => {
                let (from, to) = (e["from"].as_str().unwrap(), e["to"].as_str().unwrap());
                let quality = e["quality"].as_str().unwrap();
                assert_eq!(
                    reaches(&soc, from, to, quality, as_of),
                    e["value"].as_bool().unwrap(),
                    "reaches({from} -> {to}, {quality}) @ {as_of:?}"
                );
            }
            other => panic!("unknown read in fixture: {other}"),
        }
    }
}
