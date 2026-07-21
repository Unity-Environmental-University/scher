// ─────────────────────────────────────────────────────────────────────────────
// poles.rs — the End / Now / Sublime pole-designation reads, split out of lib.rs
// (Hallie's ruling, 2026-07-21: "sublime law is core enough to the ontology that
// that needs to be in scher[-core]" — confirming/extending the earlier same-day
// 09:54 ruling that landed `sublimes_charged_from` here; this split is the
// house's ~500-line law being paid down on an already-oversize file, done under
// explicit permission ["i gave explicit permission to split out files as
// needed"], not a speculative refactor).
//
// WHAT LIVES HERE: is a node a designated End/Now/Sublime pole (structural
// designation reads, never slug-parsed); what counts as a CLOSING vs a CHARGE
// out of an End (closing_edges_from/end_actual/charges_on — the address-law
// disambiguation the naked-pole guard depends on); and THE LURE LAW itself
// (sublimes_charged_from, is_sublime_pole) plus the sublime-bearing reads
// (bearings_of, voltage_toward_sublime, service_chain_of, reached_sublimes_of).
// This is the SAME order of claim throughout: what a pole IS and how it behaves
// — metaphysics, not the penelope-level bucket/taxonomy epistemology that lives
// in the separate scher-epistemology crate (membersOf/bucketsOf and friends).
//
// WHAT STAYS IN lib.rs: Society/EventRow, the basic reads (visible_at,
// prehends_as, is_occluded, reaches, established_to…), dependency reads, and
// the voltage/algedonic-channel reads (voltage_of, floating_charge, overload,
// distance_to_hea) — those read ACROSS a story's differentials using these
// pole facts as ingredients, but are not themselves pole-designation reads.
// They call back into this module's pub fns (is_now_pole, closing_edges_from,
// end_actual, story_now, is_sublime_pole, sublimes_charged_from) same as any
// other caller — no special-casing across the boundary.
// ─────────────────────────────────────────────────────────────────────────────

use crate::{
    has_any_quality, is_occluded, prehends_as, prehensions_from, prehensions_onto, visible_at,
    EventRow, Society, Q_END_POLE, Q_GROUNDING, Q_NOW_POLE, Q_SUBLIME_POLE,
};

/// is_designated_end_pole: is `node` the object of an un-occluded Q_END_POLE designation —
/// structural End-hood, regardless of whether it has since closed? Factored out of
/// is_open_end_pole (bare-closing conformance port, 2026-07-16; the TS twin factored it
/// 2026-07-15) because the closing-recognition read below needs this same structural test
/// on a node that IS actual (a closed End is still an End; only is_open_end_pole cares
/// whether it's still naked). Mirrors `isDesignatedEndPole` in society.ts.
pub(crate) fn is_designated_end_pole(soc: &Society, node: &str, as_of: Option<u64>) -> bool {
    soc.edges_onto_object(node).any(|b| {
        b.subject.is_some()
            && prehends_as(soc, &b.slug, Q_END_POLE, as_of)
            && !is_occluded(soc, &b.slug, as_of)
    })
}

/// is_now_pole: is `node` the object of an un-occluded Q_NOW_POLE designation — structural
/// Now-hood (story-designate-now-poles ruling, Hallie, 2026-07-20 second sitting). Mirrors
/// is_designated_end_pole/is_sublime_pole exactly: designation lives on an edge, never
/// parsed from the node's slug (opaque-slug law). This is the disambiguator
/// closing_edges_from and charges_on now both depend on to tell a closing from a charge —
/// both are bare edges FROM a designated End; only the OBJECT's now-pole-hood tells them
/// apart.
fn is_now_pole(soc: &Society, node: &str, as_of: Option<u64>) -> bool {
    soc.edges_onto_object(node).any(|b| {
        b.subject.is_some()
            && prehends_as(soc, &b.slug, Q_NOW_POLE, as_of)
            && !is_occluded(soc, &b.slug, as_of)
    })
}

/// closing_edges_from: the edges that CLOSE this End-pole — un-occluded, as of a moment.
/// BARE-CLOSING RULING, MECHANIZED (Hallie, 2026-07-15: "yes its edge direction"; "schedule
/// it and feel free to act on it" — landed in the TS twin 2026-07-15, ported here
/// 2026-07-16): a closing is EITHER a legacy quality-carrying Q_GROUNDING edge FROM `end`
/// (the migration-era spelling — honored forever, append-only) OR a bare edge (no quality
/// at all) FROM `end` — recognized as a closing SOLELY because `end` is a designated
/// End-pole (is_designated_end_pole) and the edge left it: no quality-marker is read; per
/// the address law, edge-direction alone carries the meaning. This is the one place that
/// structural fact gets turned into a read — every caller that needs "is this End closed"
/// or "walk through a closing" goes through here, so the bare/legacy union lives in ONE
/// place, not re-derived at each call site. Mirrors `closingEdgesFrom` in society.ts
/// (the bare scan is adjacency-indexed here, same rows the twin's full scan yields).
///
/// NOW-POLE SPLIT (Hallie, 2026-07-20 second sitting, story-designate-now-poles): since
/// the end-prehends-the-capture ruling (same day, first sitting) made charges ALSO bare
/// edges FROM a designated End, a bare edge leaving `end` is no longer unambiguously a
/// closing — it could be either. Nows are now designated poles (Q_NOW_POLE, mirroring
/// Q_END_POLE/Q_SUBLIME_POLE), so a BARE closing is narrowed to: a bare edge FROM `end`
/// whose OBJECT IS a designated now-pole (is_now_pole). Legacy Q_GROUNDING closings are
/// unaffected — that union member was never ambiguous, it carries its own quality marker.
pub(crate) fn closing_edges_from<'a>(soc: &'a Society, end: &str, as_of: Option<u64>) -> Vec<&'a EventRow> {
    let quality = prehensions_from(soc, end, Q_GROUNDING, as_of);
    if !is_designated_end_pole(soc, end, as_of) {
        return quality
            .into_iter()
            .filter(|p| !is_occluded(soc, &p.slug, as_of))
            .collect();
    }
    let bare = soc.edges_from_subject(end).filter(|b| {
        b.object.is_some()
            && visible_at(b, as_of)
            && !has_any_quality(soc, &b.slug, as_of)
            && is_now_pole(soc, b.object.as_deref().unwrap(), as_of)
    });
    quality
        .into_iter()
        .chain(bare)
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        .collect()
}

/// end_actual: is this End-pole ACTUAL — is it because something (per the pole law, the
/// Now of its closing: `end ~because~ now`)? Reads the un-occluded outgoing closing edges
/// FROM the End — a bare edge out (the current closePole shape) or a legacy
/// quality-carrying Q_GROUNDING edge out (both-spellings window, same law as the
/// dependency rename: the ink stays). Mirrors `endActual` in society.ts.
pub fn end_actual(soc: &Society, end: &str, as_of: Option<u64>) -> bool {
    !closing_edges_from(soc, end, as_of).is_empty()
}

/// story_now: the story's own frame's Now — the `{story}~now` constructor convention (an
/// ADDRESS, the lay_p/`~hea` shape — reads never parse it). Under SOFD this Now's lineage
/// head is voltage's default ground. Mirrors `storyNow` in society.ts.
pub fn story_now(story: &str) -> String {
    format!("{story}~now")
}

/// is_open_end_pole: is `node` a designated End-pole (object of an un-occluded
/// Q_END_POLE edge) not yet actual? The address law guards exactly these.
pub fn is_open_end_pole(soc: &Society, node: &str, as_of: Option<u64>) -> bool {
    is_designated_end_pole(soc, node, as_of) && !end_actual(soc, node, as_of)
}

/// is_sublime_pole: is `node` a designated sublime-pole (object of an un-occluded
/// Q_SUBLIME_POLE edge)? Unlike an End-pole, a sublime is NEVER ACTUAL — its openness
/// is eternal. (2026-07-06 sublimes-store design.) Mirrors `isSublimePole` in society.ts.
pub fn is_sublime_pole(soc: &Society, node: &str, as_of: Option<u64>) -> bool {
    soc.all().any(|b| {
        b.object.as_deref() == Some(node)
            && b.subject.is_some()
            && prehends_as(soc, &b.slug, Q_SUBLIME_POLE, as_of)
            && !is_occluded(soc, &b.slug, as_of)
    })
}

/// sublimesChargedFrom (society.ts): THE LURE LAW — a sublime's grip is APPETITION,
/// a bare (quality-free) prehension whose SUBJECT is the sublime-pole. Ported home to
/// scher-core (Hallie's ruling, 2026-07-21, 09:54: "the sublime section and lure law
/// are still metaphysicsy enough — sublime is my answer to Whitehead's God so it's
/// gotta be in the metaphysics"). This function briefly lived in scher-epistemology
/// (a private copy, same LURE LAW logic, born under an earlier charter that read all
/// of membersOf/bucketsOf's helpers as penelope-level epistemology); that crate's own
/// helpers (grounded_cone, interval_set) stay there — they interpret the substrate into
/// todo/wish/sublime-shaped BUCKET taxonomy, which is a designed epistemology, not
/// metaphysics. THE LURE LAW itself is different: it's the reading of what a sublime-pole
/// IS (never-actual, never-closing, its grip is bare appetition, never grounding) — the
/// same order of claim as is_sublime_pole/is_designated_end_pole above it, so it comes
/// home to sit beside them. scher-epistemology now calls this pub fn instead of holding
/// its own copy (single source of THE LURE LAW, no duplicate to keep in conformance sync).
pub fn sublimes_charged_from(soc: &Society, node: &str, as_of: Option<u64>) -> Vec<String> {
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

/// charges_on: the charges on a differential — a PURE ADDRESS READ (the naked-pole law's
/// payoff): the un-occluded BARE prehensions the End itself makes onto the charged event.
/// No charge quality exists; the charge is a property of the EDGE, never node-contents
/// (Hallie, 2026-07-06). RULING (2026-07-20 first sitting): the End prehends the capture —
/// charge edges are subject=End-pole, object=charged event.
///
/// NOW-POLE SPLIT (Hallie, 2026-07-20 second sitting, story-designate-now-poles): a bare
/// edge FROM `end` is ALSO the shape a closing takes (closing_edges_from) now that Nows
/// are designated poles (Q_NOW_POLE). The two bare-edge laws share a subject and disagree
/// only on the object: a closing's object is a designated now-pole, a charge's is not.
/// So a charge is a bare edge with subject==end AND whose object is NOT a now-pole.
/// Mirrors `chargesOn` in society.ts.
pub fn charges_on<'a>(soc: &'a Society, end: &str, as_of: Option<u64>) -> Vec<&'a EventRow> {
    soc.all()
        .filter(|b| {
            b.subject.as_deref() == Some(end)
                && b.object.is_some()
                && visible_at(b, as_of)
                && !has_any_quality(soc, &b.slug, as_of)
                && !is_occluded(soc, &b.slug, as_of)
                && !is_now_pole(soc, b.object.as_deref().unwrap(), as_of)
        })
        .collect()
}

// ── SUBLIME READS (2026-07-06 sublimes-store design) ─────────────────────────────
// Sublimes are never-closing poles that ORGANIZE pursuit without luring. They orient
// events via because-edges (bearings). The reads here measure voltage-toward and
// trace inherited bearings through story membership.

/// bearings_of: all because-edges FROM any sublime-pole TO this event, as of a moment —
/// the bearings (orientations) the event sails under. DIRECTION FLIPPED (Hallie,
/// 2026-07-20, ruling correction: "sublimes prehend the user stories charged toward
/// them — subject=sublime, object=story/event, uniformly"; the earlier exemption was
/// circular, reading pre-ruling code as normative). A bare because-edge
/// (`sublime ~because~ event`) is pure orientation, not establishment. Occluded bearings
/// are filtered out. Reads edges ONTO `event` now, filtered to a sublime SUBJECT — the
/// same read serves both an ordinary event and a sublime-as-event (sublime chaining
/// below). Mirrors `bearingsOf` in society.ts.
pub fn bearings_of<'a>(soc: &'a Society, event: &str, as_of: Option<u64>) -> Vec<&'a EventRow> {
    prehensions_onto(soc, event, "because", as_of)
        .into_iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of) && is_sublime_pole(soc, p.subject.as_deref().unwrap_or(""), as_of))
        .collect()
}

/// voltage_toward_sublime: count of non-occluded bare prehensions FROM this sublime, as
/// of a moment. This is the sublime's "charge" — attraction without actualization.
/// Unlike charge on an End-pole (which discharges when the pole closes), a sublime's
/// voltage accumulates forever, never exhausted. DIRECTION FLIPPED (Hallie, 2026-07-20,
/// ruling correction): sublimes prehend the user stories charged toward them —
/// subject=sublime, object=story/event, uniformly. Reads FROM the sublime now. Mirrors
/// `voltageTowardSublime` in society.ts.
pub fn voltage_toward_sublime(soc: &Society, sublime: &str, as_of: Option<u64>) -> usize {
    prehensions_from(soc, sublime, "because", as_of)
        .into_iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        .count()
}

/// service_chain_of: the sublimes this sublime serves, transitively — every sublime-pole
/// reachable UP the because-graph from this one (the why-behind-the-why). Excludes the
/// sublime itself. Cycle-safe (seen-set — REQUIRED now that sublime→sublime cycles are
/// LAWFUL, 2026-07-20 companion ruling 2, not merely theoretical); occlusion-aware via
/// bearings_of. Mirrors `serviceChainOf` in society.ts. (Hallie's chaining extension,
/// 2026-07-06; direction flipped 2026-07-20.)
pub fn service_chain_of(soc: &Society, sublime: &str, as_of: Option<u64>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    seen.insert(sublime.to_string());
    let mut out = Vec::new();
    let mut stack = vec![sublime.to_string()];
    while let Some(n) = stack.pop() {
        for b in bearings_of(soc, &n, as_of) {
            let Some(next) = b.subject.as_deref() else { continue };
            if seen.insert(next.to_string()) {
                out.push(next.to_string());
                stack.push(next.to_string());
            }
        }
    }
    out
}

/// reached_sublimes_of: every sublime-pole an event ultimately sails under — its DIRECT
/// bearings PLUS everything those bearings transitively serve up the graph (the full
/// why-behind-the-why). Deduplicated; cycle-safe. Mirrors `reachedSublimesOf` in society.ts.
pub fn reached_sublimes_of(soc: &Society, event: &str, as_of: Option<u64>) -> Vec<String> {
    let direct: Vec<String> = bearings_of(soc, event, as_of)
        .into_iter()
        .filter_map(|b| b.subject.clone())
        .collect();
    let mut all: std::collections::HashSet<String> = direct.iter().cloned().collect();
    for s in &direct {
        for up in service_chain_of(soc, s, as_of) {
            all.insert(up);
        }
    }
    all.into_iter().collect()
}
