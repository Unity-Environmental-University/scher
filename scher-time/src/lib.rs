//! ╔══════════════════════════════════════════════════════════════════════════╗
//! ║  MUSLIN — seams showing on purpose. Tear this apart before trusting it.  ║
//! ╚══════════════════════════════════════════════════════════════════════════╝
//!
//! INGRESSION AS A FUNCTION CALL (Hallie, 2026-07-21, spoken spec):
//!
//!   A sublime is NEVER ACTUAL (law: sublime-never-closes — it refused an edge
//!   on the live board this very morning). So how does "get today" ever return?
//!   By INGRESSION: the sublime is the function, the ingression is the output,
//!   and the RESULT is storied on the event of prehending the ingression.
//!
//!   The call protocol, IN ORDER (the order is the law, enforced loudly):
//!     1. establish_ingression  — mint the ingression FROM the sublime.
//!        (`ingression ~because~ sublime`: pursuit orientation, subject=ingression.
//!        The sublime is never the subject of a closing edge — the guard stays true.)
//!     2. bind_prehension       — set the ingression's prehensions: the frame
//!        grabbing it FROM an event, and the qualities it prehends at the time.
//!        These are the ARGUMENTS, bound before invocation.
//!     3. prehend_ingression    — THE CALL. The event OF THAT PREHENSION is where
//!        data / properties / downstream events live. We story the RESULT there,
//!        never on the sublime, never on the ingression node itself.
//!
//! SEAMS (open, for Hallie's eye):
//!   • quality names: Q_INGRESSION / Q_ARG below are placeholders — not yet law.
//!   • "wall the sublime into eons for easy filtering": sketched as wall_of_time
//!     (sublime-today ~because~ time ~because~ the-unknown-unknown). Eon walls
//!     beyond `time` are deliberately NOT built yet.
//!   • whether the grammar (steps 1–3) belongs in scher-core once a second domain
//!     wants it — time squats here first; extraction is the success condition.

use scher_core::{EventRow, Society};

/// Placeholder quality marking the ingression←sublime edge. SEAM: name not ruled.
pub const Q_INGRESSION: &str = "q-ingression";
/// Placeholder quality marking a bound argument prehension. SEAM: name not ruled.
pub const Q_ARG: &str = "q-arg";

/// The spine Hallie spoke: sublime-today is prehended by time, which is prehended
/// by the-unknown-unknown. Idempotent. Eon walls come later, if at all.
pub fn wall_of_time(soc: &mut Society) -> String {
    for (slug, name) in [
        ("the-unknown-unknown", "the unknown unknown"),
        ("time", "time"),
        ("sublime-today", "Sublime: today — a receding horizon, never actual"),
    ] {
        if soc.get(slug).is_none() {
            soc.lay(EventRow::node(slug, name));
        }
    }
    for (a, b) in [("sublime-today", "time"), ("time", "the-unknown-unknown")] {
        let e = format!("{a}~because~{b}");
        if soc.get(&e).is_none() {
            soc.lay(EventRow::edge(&e, "walled under", a, b));
        }
    }
    "sublime-today".into()
}

/// Step 1 — mint an ingression FROM a sublime. The ingression is the function's
/// output-in-waiting; nothing about it is actual until step 3 prehends it.
pub fn establish_ingression(soc: &mut Society, sublime: &str, call: &str) -> Result<String, String> {
    if soc.get(sublime).is_none() {
        return Err(format!("establish_ingression: no such sublime '{sublime}' — REFUSED, not auto-minted (a typo'd sublime is a miss, not a birth)"));
    }
    let ing = format!("ingression-{call}");
    soc.lay(EventRow::node(&ing, &format!("ingression of {sublime} ({call})")));
    // subject=ingression, object=sublime: the ingression is BECAUSE the sublime.
    // The sublime orients; it is never the subject, so sublime-never-closes holds.
    soc.lay_p(
        &format!("{ing}~because~{sublime}"),
        &format!("ingression of {sublime}"),
        &ing,
        sublime,
        Q_INGRESSION,
    )
    .map_err(|e| format!("establish_ingression: guard refused: {e:?}"))?;
    Ok(ing)
}

/// Step 2 — bind an argument: the ingression prehends `input` (the event the frame
/// grabs it from, or a quality-node it prehends at the time). Call once per argument.
pub fn bind_prehension(soc: &mut Society, ing: &str, input: &str) -> Result<String, String> {
    if soc.get(ing).is_none() {
        return Err(format!("bind_prehension: no ingression '{ing}' — establish first (the order is the law)"));
    }
    if soc.get(input).is_none() {
        return Err(format!("bind_prehension: no such input '{input}'"));
    }
    let e = format!("{ing}~because~{input}");
    soc.lay_p(&e, "bound argument", ing, input, Q_ARG)
        .map_err(|err| format!("bind_prehension: guard refused: {err:?}"))?;
    Ok(e)
}

/// What a call returned: the prehension event's slug, plus the rows it holds.
#[derive(Debug)]
pub struct IngressionResult {
    /// THE EVENT OF THE PREHENSION — where the result lives. Story from here.
    pub prehension: String,
}

/// Step 3 — THE CALL. `frame` prehends the ingression; the event of that prehension
/// is minted and the result is storied AS ITS CONTENT. Downstream events hang off
/// the prehension event (caller lays `{prehension}~holds~…` as needed).
///
/// LOUD ORDER GUARD (nothing-silent): prehending an ingression with zero bound
/// arguments is refused — set the prehensions, THEN prehend. In that order.
pub fn prehend_ingression(
    soc: &mut Society,
    ing: &str,
    frame: &str,
    result: &str,
) -> Result<IngressionResult, String> {
    if soc.get(ing).is_none() {
        return Err(format!("prehend_ingression: no ingression '{ing}'"));
    }
    let has_args = soc
        .edges_from_subject(ing)
        .any(|e| scher_core::prehends_as(soc, &e.slug, Q_ARG, None));
    if !has_args {
        return Err(format!(
            "prehend_ingression: '{ing}' has no bound prehensions — the order is establish, bind, THEN prehend. REFUSED loudly, not defaulted."
        ));
    }
    let p = format!("prehension-of-{ing}-by-{frame}");
    // the result is the CONTENT of the prehension event — data lives on the actual
    // occasion, not on the sublime (never actual) nor the ingression (the output slot).
    soc.lay(EventRow::node(&p, result).with_laid_by(frame));
    soc.lay(EventRow::edge(
        &format!("{p}~because~{ing}"),
        &format!("the event of {frame} prehending {ing}"),
        &p,
        ing,
    ));
    Ok(IngressionResult { prehension: p })
}

// ─── PROCEDURAL SUBLIMES — the script, and the lazy read that runs it ─────────
//
// Hallie's ruling, 2026-07-21: evaluation is LAZY, forced by the read — "otherwise
// you couldn't pass params via prehensions." The scripted events live sublime-side
// (the PATTERN of the computation; never actual). Only when a read demands the
// result do they ingress into the prehension event's story — one downstream event
// per step, laid then, against whatever prehensions are bound AT THAT MOMENT.
// "Mutation" is storying: state is a READ over the prehension event's downstream
// story, never an overwrite (same move as charge-is-a-read).

/// Placeholder quality marking a scripted step inside a procedural sublime. SEAM: not law.
pub const Q_SCRIPT: &str = "q-script";

/// Add a scripted event to a procedural sublime. Steps are ordered by the order
/// they are laid (betweenness stands in via lay order in this muslin — SEAM:
/// a real read should walk the sublime's own story order, not insertion order).
pub fn script_step(soc: &mut Society, sublime: &str, step: &str, what: &str) -> Result<String, String> {
    if soc.get(sublime).is_none() {
        return Err(format!("script_step: no such sublime '{sublime}'"));
    }
    let s = format!("{sublime}-step-{step}");
    soc.lay(EventRow::node(&s, what));
    soc.lay_p(&format!("{s}~because~{sublime}"), "scripted within", &s, sublime, Q_SCRIPT)
        .map_err(|e| format!("script_step: guard refused: {e:?}"))?;
    Ok(s)
}

/// THE LAZY READ — force the result. If the prehension event's downstream story
/// hasn't been laid yet, lay it NOW: each sublime-side scripted step ingresses as
/// one downstream event off the prehension event, evaluated against the arguments
/// bound at this moment (late binding is the point of the ruling). Idempotent:
/// a second read finds the story already storied and just reads it.
/// Returns the step-event slugs in order; state is a read over them.
pub fn read_result(soc: &mut Society, prehension: &str) -> Result<Vec<String>, String> {
    let ing = soc
        .edges_from_subject(prehension)
        .find(|e| e.object.as_deref().map(|o| o.starts_with("ingression-")).unwrap_or(false))
        .and_then(|e| e.object.clone())
        .ok_or_else(|| format!("read_result: '{prehension}' prehends no ingression"))?;
    let sublime = soc
        .edges_from_subject(&ing)
        .find(|e| scher_core::prehends_as(soc, &e.slug, Q_INGRESSION, None))
        .and_then(|e| e.object.clone())
        .ok_or_else(|| format!("read_result: '{ing}' names no sublime"))?;
    // the script, sublime-side (lay order stands in for story order — marked seam)
    let steps: Vec<(String, String)> = soc
        .all()
        .filter(|b| {
            b.object.as_deref() == Some(sublime.as_str())
                && scher_core::prehends_as(soc, &b.slug, Q_SCRIPT, None)
        })
        .filter_map(|e| e.subject.clone())
        .filter_map(|s| soc.get(&s).map(|row| (s.clone(), row.content.clone())))
        .collect();
    // the arguments bound AT THIS MOMENT — late binding, the ruling's whole point
    let args: Vec<String> = soc
        .edges_from_subject(&ing)
        .filter(|e| scher_core::prehends_as(soc, &e.slug, Q_ARG, None))
        .filter_map(|e| e.object.clone())
        .collect();
    let mut laid = Vec::new();
    for (step_slug, what) in steps {
        let down = format!("{prehension}-ran-{step_slug}");
        if soc.get(&down).is_none() {
            // the step's ingression into the actual occasion: content records what ran
            // and against which prehensions — the state change IS this event existing.
            soc.lay(EventRow::node(&down, &format!("{what} (against: {})", args.join(", "))));
            soc.lay(EventRow::edge(
                &format!("{down}~because~{prehension}"),
                "downstream of the prehension",
                &down,
                prehension,
            ));
        }
        laid.push(down);
    }
    Ok(laid)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The spoken example, end to end: "we want to get today."
    #[test]
    fn get_today_is_an_ingression_call() {
        let mut soc = Society::new();
        let sublime = wall_of_time(&mut soc);

        // an event for the frame to grab from, and a quality it prehends at the time
        soc.lay(EventRow::node("probe-clock-read", "the frame reaches for today"));
        soc.lay(EventRow::node("q-local-civil-time", "quality: local civil time, not UTC"));

        // 1. establish
        let ing = establish_ingression(&mut soc, &sublime, "get-today-2026-07-21").unwrap();
        // 2. bind — frame's grab-event, then the quality prehended at the time
        bind_prehension(&mut soc, &ing, "probe-clock-read").unwrap();
        bind_prehension(&mut soc, &ing, "q-local-civil-time").unwrap();
        // 3. prehend — THE call; the result is storied on the prehension event
        let r = prehend_ingression(&mut soc, &ing, "frame-weaver", "day-2026-07-21").unwrap();

        // the result lives on the event of the prehension
        assert_eq!(soc.get(&r.prehension).unwrap().content, "day-2026-07-21");
        // the sublime closed NOTHING: the whole call laid no NEW edge with the
        // sublime as subject — only wall_of_time's own bare walling edge
        // (sublime-today~because~time) leaves it, and that edge carries no quality.
        let from_sublime: Vec<_> = soc.edges_from_subject("sublime-today").collect();
        assert_eq!(from_sublime.len(), 1);
        assert_eq!(from_sublime[0].slug, "sublime-today~because~time");
        assert!(!scher_core::has_any_quality(&soc, "sublime-today~because~time", None));
        // downstream events can hang off the prehension event
        soc.lay(EventRow::edge(
            &format!("{}~holds~day-2026-07-21", r.prehension),
            "downstream",
            &r.prehension,
            "day-2026-07-21",
        ));
    }

    /// The lazy ruling, end to end: params bound AFTER prehending still reach the
    /// script, because nothing runs until the read demands it.
    #[test]
    fn lazy_read_sees_params_bound_after_the_prehend() {
        let mut soc = Society::new();
        let sublime = wall_of_time(&mut soc);
        script_step(&mut soc, &sublime, "resolve-civil-date", "resolve the civil date").unwrap();
        script_step(&mut soc, &sublime, "name-the-day-node", "name the day node").unwrap();

        soc.lay(EventRow::node("probe-clock-read", "the frame reaches for today"));
        let ing = establish_ingression(&mut soc, &sublime, "get-today-lazy").unwrap();
        bind_prehension(&mut soc, &ing, "probe-clock-read").unwrap();
        let r = prehend_ingression(&mut soc, &ing, "frame-weaver", "pending").unwrap();

        // a LATE param, bound after the prehend — the eager world would have missed it
        soc.lay(EventRow::node("q-local-civil-time", "quality: local civil time"));
        bind_prehension(&mut soc, &ing, "q-local-civil-time").unwrap();

        // the read forces evaluation NOW, against both params
        let ran = read_result(&mut soc, &r.prehension).unwrap();
        assert_eq!(ran.len(), 2);
        assert!(soc.get(&ran[0]).unwrap().content.contains("q-local-civil-time"));

        // idempotent: a second read lays nothing new, same story
        let size = soc.size();
        let again = read_result(&mut soc, &r.prehension).unwrap();
        assert_eq!(again, ran);
        assert_eq!(soc.size(), size);
    }

    #[test]
    fn order_is_the_law_prehend_before_bind_refuses_loudly() {
        let mut soc = Society::new();
        let sublime = wall_of_time(&mut soc);
        let ing = establish_ingression(&mut soc, &sublime, "impatient-call").unwrap();
        let err = prehend_ingression(&mut soc, &ing, "frame-weaver", "anything").unwrap_err();
        assert!(err.contains("REFUSED"), "unbound prehend must refuse loudly, got: {err}");
    }

    #[test]
    fn typoed_sublime_is_a_miss_not_a_birth() {
        let mut soc = Society::new();
        assert!(establish_ingression(&mut soc, "sublime-todya", "oops").is_err());
    }
}
