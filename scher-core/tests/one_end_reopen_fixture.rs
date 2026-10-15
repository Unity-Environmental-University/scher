// ─────────────────────────────────────────────────────────────────────────────
// one_end_reopen_fixture.rs — the Rust half of the one-End fixture (Hallie's rulings,
// 2026-10-15). Replays ../conformance/one-end-reopen.json — NEUTRAL GROUND — and
// asserts its readings. scher/test/conformance.one-end-reopen.test.ts replays the SAME
// file; if either side fails, the twins have diverged on what "done" means.
// ─────────────────────────────────────────────────────────────────────────────

use scher_core::{diamond, end_actual, law_breaches, standing_closings, voltage_of, EventRow, Society};
use serde_json::Value;

fn replay(rows: &[Value]) -> Society {
    let mut soc = Society::new();
    for r in rows {
        let s = |k: &str| r.get(k).and_then(Value::as_str);
        let mut b = match (s("subject"), s("object")) {
            (Some(sub), Some(obj)) => EventRow::edge(s("slug").unwrap(), s("content").unwrap(), sub, obj),
            _ => EventRow::node(s("slug").unwrap(), s("content").unwrap()),
        };
        b.witnessed = r.get("witnessed").and_then(Value::as_u64);
        if let Some(by) = s("laid_by") {
            b = b.with_laid_by(by);
        }
        soc.lay(b);
    }
    soc
}

fn strings(v: &Value) -> Vec<String> {
    v.as_array().expect("array").iter().map(|x| x.as_str().unwrap().to_string()).collect()
}

#[test]
fn one_end_reopen_fixture_replays_identically() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../conformance/one-end-reopen.json");
    let fx: Value = serde_json::from_str(&std::fs::read_to_string(path).expect("read fixture")).expect("parse fixture");
    let soc = replay(fx["rows"].as_array().expect("rows"));
    for e in fx["expect"].as_array().expect("expect") {
        let as_of = e.get("asOf").and_then(Value::as_u64);
        let s = |k: &str| e[k].as_str().unwrap();
        match s("read") {
            "endActual" => assert_eq!(end_actual(&soc, s("node"), as_of), e["value"].as_bool().unwrap(), "end_actual({}) @ {as_of:?}", s("node")),
            "voltageOf" => assert_eq!(voltage_of(&soc, s("story"), None, as_of), e["value"].as_u64().unwrap(), "voltage_of({}) @ {as_of:?}", s("story")),
            "standingClosings" => {
                let mut got: Vec<String> = standing_closings(&soc, s("node"), as_of).iter().map(|c| c.slug.clone()).collect();
                got.sort();
                assert_eq!(got, strings(&e["value"]), "standing_closings({}) @ {as_of:?}", s("node"));
            }
            "lawBreaches" => {
                let got: Vec<(String, String, Vec<String>)> = law_breaches(&soc, as_of)
                    .into_iter()
                    .map(|b| (b.law.to_string(), b.at, b.rows))
                    .collect();
                let want: Vec<(String, String, Vec<String>)> = e["value"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|b| (b["law"].as_str().unwrap().to_string(), b["at"].as_str().unwrap().to_string(), strings(&b["rows"])))
                    .collect();
                assert_eq!(got, want, "law_breaches @ {as_of:?}");
            }
            "diamond" => assert_eq!(diamond(&soc, s("from"), s("to"), s("quality"), as_of), strings(&e["value"]), "diamond @ {as_of:?}"),
            other => panic!("unknown read in fixture: {other}"),
        }
    }
}
