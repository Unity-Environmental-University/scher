// ─────────────────────────────────────────────────────────────────────────────
// scher-core — the append-only Society + its reads, in Rust. A faithful port of the
// load-bearing grammar in scher's `src/society.ts`: NO view layer (no DOM, no stories),
// the model only. A value is not stored — it is READ from the log; state changes only
// by appending; readers re-derive.
//
// This exists for two reasons, not for speed:
//   1. CONFORMANCE — the same invariants the TS suite proves in fast-check are proved
//      here in proptest, so the two engines provably agree on the grammar.
//   2. The Rust scalpel (banishment) needs a faithful read-layer regardless: "what does
//      removing X orphan?" is `dependents_of` / interval reads. Build the grammar it needs.
//
// Faithfulness note: the TS `Society` exposes a reactive `rev` Cell; here `rev` is a plain
// counter (no view subscribers in core). Everything else mirrors society.ts line-for-line.
// ─────────────────────────────────────────────────────────────────────────────

use std::collections::HashMap;

// the gen4 edge grammar (one verb: `because`). A pure string⇄struct module, proved inverse.
// Not yet wired into Society — it exists so reads stop slug-searching `{slug}~q`.
pub mod edge_word;

// the contraction plugin seam (merged sitting 2026-07-03): consumer-owned contraction rules
// over the because-grammar. scher ships the trait, the collision-refusing registry, and the
// law-checker; the RULES stay consumer-side (Hallie's ruling) and never live here.
pub mod contraction;

// Qualities are passed as `&str` — the reads only ever compare for equality, and an unknown
// quality is simply one no read matches. This is genuinely open, with no enum to edit when the
// grammar grows a word. TS's `Quality` (society.ts) used to be a closed compile-time union and
// was NOT actually a mirror of this openness — that was this comment's own error, caught and
// fixed by committee 2026-07-03 (docs/committees/2026-07-03-quality-extensibility.md). society.ts
// now splits `KernelQuality` (the handful of words a real kernel read branches on, matching the
// consts below) from an open `Quality` that also accepts any other string, which is the honest
// TS-side match for this file's actual behavior. The known words used by the reads here are
// named as consts for call-site legibility; the grammar's full set lives in society.ts.
// N4 (Hallie, 2026-07-03): under the universal-grounding ruling the explicit q-grounding
// mode-beat is BEGINNING DEPRECATION — every because-edge grounds relative to its laying
// frame, so the marker trends redundant. Still fully usable until a future roadmap point;
// reads keep honoring it. New writers should know the stock is scheduled, not eternal.
pub const Q_GROUNDING: &str = "q-grounding";
pub const Q_EXCLUSION: &str = "q-exclusion";
pub const Q_OCCLUDES: &str = "q-occludes";
pub const Q_DEPENDS_ON: &str = "q-depends-on";
/// The structural End-pole designation the lazy three-pole unpack lays (2026-07-06).
/// q-lure is DEAD — killed with fire (Hallie, same ruling): it smuggled an agent and
/// could not state its own direction. `lay_p` REFUSES it (panic, fail-closed).
pub const Q_END_POLE: &str = "q-end-pole";
/// The structural sublime-pole designation (2026-07-06 sublimes-store design): a
/// never-closing pole that ORGANIZES pursuit without luring. Sublimes are inert — they
/// never close, never beckon, never actualize. `lay_p` REFUSES attempts to close them.
pub const Q_SUBLIME_POLE: &str = "q-sublime-pole";

/// A beat. With subject+object it is a prehension (an edge). A quality beat (slug ending
/// `~q`, object a `q-*`) carries mode. Mirrors the `EventRow` interface in society.ts.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EventRow {
    pub slug: String,
    pub content: String,
    /// the BULLET — a short human headline, distinct from content. Optional.
    pub title: Option<String>,
    pub subject: Option<String>,
    pub object: Option<String>,
    /// when the local society witnessed this beat (the client's own db_witnessed). Set by
    /// `lay` if absent — readers should treat `Some(_)` as authoritative.
    pub witnessed: Option<u64>,
}

impl EventRow {
    /// A content beat (a node): subject and object null.
    pub fn node(slug: &str, content: &str) -> Self {
        EventRow {
            slug: slug.into(),
            content: content.into(),
            title: None,
            subject: None,
            object: None,
            witnessed: None,
        }
    }

    /// A prehension (an edge) from `subject` to `object`.
    pub fn edge(slug: &str, content: &str, subject: &str, object: &str) -> Self {
        EventRow {
            slug: slug.into(),
            content: content.into(),
            title: None,
            subject: Some(subject.into()),
            object: Some(object.into()),
            witnessed: None,
        }
    }

    /// `with_witnessed(t)` — set an explicit witnessing moment.
    pub fn with_witnessed(mut self, t: u64) -> Self {
        self.witnessed = Some(t);
        self
    }
}

/// An append-only society of beats. The only write is `lay`. `rev` rises on every genuine
/// append. Beats are never overwritten — to undo, occlude with a new beat.
#[derive(Clone, Debug, Default)]
pub struct Society {
    rows: HashMap<String, EventRow>,
    rev: u64,
    clock: u64,
}

impl Society {
    pub fn new() -> Self {
        Society::default()
    }

    /// Seed a society from a slice of beats (constructor-equivalent to `new Society(seed)`).
    pub fn seeded(seed: &[EventRow]) -> Self {
        let mut s = Society::new();
        for b in seed {
            s.insert(b.clone());
        }
        s
    }

    // the one write. `lay` of an existing slug is inert (ON CONFLICT DO NOTHING). Beats are
    // never overwritten. The witnessing clock is monotone across BOTH explicit stamps and
    // auto-stamps: an explicitly-witnessed beat advances the clock so a later auto-stamp
    // never reuses or precedes a moment already witnessed.
    fn insert(&mut self, mut b: EventRow) -> bool {
        if self.rows.contains_key(&b.slug) {
            return false;
        }
        // TODO(socratic): why `clock + 1` instead of `clock` when no explicit witnessed is given — does each auto-stamp need daylight from the previous, or is incrementing a safety margin?
        // ANSWERED(walk 2026-07-02): daylight — each auto-stamp gets a moment strictly later than everything already seen, so successive un-witnessed lays stay ordered; only explicit witnesses may tie. — code fact (the clock ratchets via max on the next line)
        let witnessed = b.witnessed.unwrap_or(self.clock + 1);
        // TODO(socratic): `.max()` here ratchets the clock forward; could an out-of-order explicit witness (earlier than current clock) break assumptions about monotone time, or is that guard alone insufficient?
        self.clock = self.clock.max(witnessed);
        b.witnessed = Some(witnessed);
        self.rows.insert(b.slug.clone(), b);
        true
    }

    /// Lay a beat (the only write). Returns true on a genuine append, false if inert.
    pub fn lay(&mut self, b: EventRow) -> bool {
        let appended = self.insert(b);
        // TODO(socratic): why bump rev only on genuine append, not on attempted lay of duplicate — is rev a count of "state-change moments" or "moment someone asked to write", and do readers need rev stable until something actually writes?
        // ANSWERED(walk 2026-07-02): rev counts state-change moments — lay of an existing slug is inert under the append-only law, so readers can trust rev unchanged means nothing appended. — see walk plan §A (append-only law)
        if appended {
            self.rev += 1;
        }
        appended
    }

    /// Lay a prehension co-prehending a quality: the edge and its `~q` mode-beat. Mirrors
    /// `layP`. Returns true if either the edge or its `~q` was a genuine append.
    // TODO(socratic): if the edge already exists but its `~q` doesn't (or vice versa), lay_p welds a fresh mode onto an old prehension — should re-laying with a DIFFERENT quality really return true while leaving the original quality standing, with no read to notice the disagreement?
    pub fn lay_p(
        &mut self,
        slug: &str,
        content: &str,
        subject: &str,
        object: &str,
        quality: &str,
    ) -> bool {
        // DEAD GRAMMAR GUARD (blocking — mirrors society.ts assertNoLure): q-lure is DEAD
        // (Hallie's ruling, 2026-07-06): it smuggled an agent and could not state its own
        // direction. An event is ONE event until lazily unpacked into its three poles
        // (Once / End / Now — "the end is because now"); End-hood is the structural
        // Q_END_POLE designation. Fix: lay the unpack (event ~end-pole~ end, Q_END_POLE)
        // and close with `end ~because~ now` (Q_GROUNDING).
        assert!(
            quality != "q-lure",
            "[DEAD GRAMMAR] '{slug}' tries to lay q-lure — dead since 2026-07-06 (it \
             smuggled an agent and could not state its own direction). Unpack the event \
             into its three poles instead: lay Q_END_POLE ('{subject} ~end-pole~ end') and \
             close with 'end ~because~ now' (Q_GROUNDING). (law: three-poles, no-luring-verb)"
        );
        // ADDRESS LAW (blocking — mirrors society.ts assertNakedPole; the law and its
        // guard born together per the 2026-07-06 meta-law): an open End-pole receives
        // ONLY charge-prehensions (bare edges) onto it and, eventually, the ONE closing
        // q-grounding out of it — nothing else touches a naked pole; comments/references
        // prehend the STORY, never its End. (q-end-pole itself is exempt structure: a
        // pole may itself be a story whose own End lies further in.)
        if quality != Q_END_POLE {
            assert!(
                !is_open_end_pole(self, object, None),
                "[ADDRESS LAW] '{slug}' lays a {quality} prehension ONTO the open End-pole \
                 '{object}'. A naked pole receives only charge-prehensions (bare edges) — \
                 comments/references prehend the STORY, never its End. Fix: point this \
                 edge at the story, or lay a bare edge if you mean a charge. (law: naked-pole)"
            );
            assert!(
                quality == Q_GROUNDING || !is_open_end_pole(self, subject, None),
                "[ADDRESS LAW] '{slug}' lays a {quality} prehension OUT of the open \
                 End-pole '{subject}'. The only edge that ever leaves a naked pole is its \
                 ONE closing q-grounding ('end ~because~ now'). Fix: close with \
                 q-grounding, or hang this relation on the story. (law: naked-pole)"
            );
        }
        // SUBLIME GUARD (blocking — mirrors society.ts assertSublimeNeverCloses,
        // 2026-07-06 sublimes-store design): a sublime-pole is NEVER ACTUAL. It is a
        // never-closing, receding horizon — a "star for navigation, not a destination to
        // land" (Hallie). Attempting to close it with q-grounding violates the anti-q-lure
        // guarantee. Q_SUBLIME_POLE designation itself is exempt (like Q_END_POLE).
        if quality != Q_SUBLIME_POLE {
            assert!(
                quality != Q_GROUNDING || !is_sublime_pole(self, subject, None),
                "[ANTI-Q-LURE GUARANTEE] '{slug}' tries to close the sublime-pole '{subject}' \
                 with q-grounding. A sublime is NEVER ACTUAL — it is a receding horizon, not a \
                 destination. Sublimes orient pursuit; they do not actualize. (law: \
                 sublime-never-closes)"
            );
        }
        // SUBLIME-DAG GUARD (blocking — mirrors society.ts assertSublimeAcyclic, Hallie's
        // 2026-07-06 chaining extension): sublimes may CHAIN (A ~because~ B = A serves B),
        // forming a DAG of stars — but the chain must stay ACYCLIC. A bearing that would
        // close a cycle among sublime-poles (A serves B serves ... serves A) is a closed
        // loop of mutual beckoning with no ground — q-lure wearing a halo. Detected via a
        // bounded reachability walk: if `object` already reaches `subject` through
        // sublime-poles, the new edge closes a cycle. A sublime points UP toward the
        // ever-receding, never back into a ring.
        if quality == "because" && is_sublime_pole(self, subject, None) && is_sublime_pole(self, object, None) {
            assert!(
                !reaches(self, object, subject, "because", None),
                "[ANTI-Q-LURE GUARANTEE] '{slug}' lays a sublime-bearing '{subject}' \
                 ~because~ '{object}' that would close a CYCLE among sublime-poles \
                 ('{object}' already serves '{subject}' transitively). A cycle of \
                 never-closing poles is a closed loop of mutual beckoning with no ground — \
                 q-lure wearing a halo. A sublime points UP toward the ever-receding, never \
                 back into a ring. Fix: re-aim the bearing UP the DAG (serve a HIGHER star). \
                 (law: sublime-dag-acyclic)"
            );
        }
        let a = self.lay(EventRow::edge(slug, content, subject, object));
        let q_slug = format!("{slug}~q");
        let q_content = format!("{content} [{quality}]");
        let q = self.lay(EventRow::edge(&q_slug, &q_content, slug, quality));
        a || q
    }

    /// Bulk-lay; one rev bump for the batch (matches `layAll`).
    pub fn lay_all(&mut self, rows: &[EventRow]) {
        let mut any = false;
        for b in rows {
            // TODO(socratic): iterating with `||` accumulates—is the order-independence of "did any row append" intentional (first-wins vs last-wins shouldn't matter), and does discarding per-row appended status lose information a caller might need?
            any = self.insert(b.clone()) || any;
        }
        if any {
            self.rev += 1;
        }
    }

    pub fn get(&self, slug: &str) -> Option<&EventRow> {
        self.rows.get(slug)
    }

    /// All beats (a snapshot; iteration order is unspecified, like a Map's values()).
    pub fn all(&self) -> impl Iterator<Item = &EventRow> {
        self.rows.values()
    }

    pub fn has(&self, slug: &str) -> bool {
        self.rows.contains_key(slug)
    }

    pub fn size(&self) -> usize {
        self.rows.len()
    }

    pub fn rev(&self) -> u64 {
        self.rev
    }
}

// ── the reads (pure functions over the log) ──────────────────────────────────────
// A read is "from a moment": `as_of` is a witnessed-clock value; a read AS OF t sees only
// beats witnessed at-or-before t. `None` means "now" — no filter.

/// Was beat `b` witnessed at-or-before moment `as_of`? (None ⇒ always visible.)
// TODO(socratic): an un-witnessed beat defaults to 0 here, i.e. visible from every moment — but `lay` promises witnessed is always Some after insert, so which frame produces the None this arm quietly forgives, and should a beat no moment witnessed really be visible AS OF every past?
// TODO(socratic): the post-insert promise means unwrap_or(0) only triggers if a beat wasn't laid via Society — are direct EventRow reads from external sources (snapshots, forks, replicated state) part of the model, or is Society the only gate?
// ANSWERED(walk 2026-07-02): Society is the only gate in this crate — insert back-fills witnessed, so the None arm is unreachable through the gate and forgives only hand-built rows in tests. — see walk plan §A (grammar facts) / lib.rs insert
fn visible_at(b: &EventRow, as_of: Option<u64>) -> bool {
    match as_of {
        None => true,
        Some(t) => b.witnessed.unwrap_or(0) <= t,
    }
}

/// Does prehension P co-prehend the given quality, as of a moment? Both the prehension and
/// its `~q` mode-beat must be visible — a grounding doesn't count before its quality landed.
// TODO(socratic): scher's CLAUDE.md says "opaque slugs, no string-matching" — yet every quality read here derives meaning from the `{slug}~q` naming convention; if edge_word exists so reads "stop slug-searching", why is the smuggled-substance path still the load-bearing one?
pub fn prehends_as(soc: &Society, pslug: &str, quality: &str, as_of: Option<u64>) -> bool {
    let q_slug = format!("{pslug}~q");
    match soc.get(&q_slug) {
        // TODO(socratic): the quality read checks both that the `~q` beat's object matches the given quality AND that the `~q` beat is visible — but shouldn't visibility of the PREHENSION (pslug itself) also gate whether it counts, or is "both visible" the right boundary?
        Some(q) => q.object.as_deref() == Some(quality) && visible_at(q, as_of),
        None => false,
    }
}

/// has_any_quality: does this prehension co-prehend ANY quality — i.e. does its `~q`
/// mode-beat exist? Structural: reads the mode-beat's PRESENCE (the lay_p constructor
/// convention), never the object's text. Mirrors `hasAnyQuality` in society.ts — the
/// existential prehends_as had no name for. Replaces the `q-` content-prefix sniff that
/// classified plain vs quality edges (2026-07-06 migration-design sitting, item 1).
pub fn has_any_quality(soc: &Society, pslug: &str, as_of: Option<u64>) -> bool {
    let q_slug = format!("{pslug}~q");
    match soc.get(&q_slug) {
        Some(q) => visible_at(q, as_of),
        None => false,
    }
}

/// Every prehension reaching `row` as object, co-prehending `quality`, as of a moment.
/// Returns the prehension beats (whose `subject` is the frame that laid it).
pub fn prehensions_onto<'a>(
    soc: &'a Society,
    row: &str,
    quality: &str,
    as_of: Option<u64>,
) -> Vec<&'a EventRow> {
    soc.all()
        .filter(|b| {
            b.object.as_deref() == Some(row)
                // TODO(socratic): why insist subject.is_some() — would a beat with no subject (a content beat) ever land here by accident, or is the check defensive against a grammar that forbids headless edges?
                // ANSWERED(walk 2026-07-02): definitional, not defensive — in the grammar an edge always carries both subject and object; a node is (None, None). The check selects edges. — see walk plan §A (grammar facts)
                && b.subject.is_some()
                && visible_at(b, as_of)
                && prehends_as(soc, &b.slug, quality, as_of)
        })
        .collect()
}

/// Every prehension reaching OUT of `row` as its SUBJECT, co-prehending `quality`. The
/// mirror of `prehensions_onto`: edges FROM a beat, legible only from the subject's side.
pub fn prehensions_from<'a>(
    soc: &'a Society,
    row: &str,
    quality: &str,
    as_of: Option<u64>,
) -> Vec<&'a EventRow> {
    soc.all()
        .filter(|b| {
            b.subject.as_deref() == Some(row)
                // TODO(socratic): why require object.is_some() — could an edge have no object (a subject-only beat), or is the grammar such that edges always have both?
                // ANSWERED(walk 2026-07-02): the grammar is such that edges always have both — a node is (None, None); there is no subject-only shape. — see walk plan §A (grammar facts)
                && b.object.is_some()
                && visible_at(b, as_of)
                && prehends_as(soc, &b.slug, quality, as_of)
        })
        .collect()
}

/// Is this occlusion-prehension itself occluded (its occluder occluded)? One level only —
/// un-occlusion is the absence of a LIVE occluder, read fresh; no deep recursion.
// TODO(socratic): "one level only" means an occluder whose own occluder is occluded still casts no shadow — is the depth-1 cutoff a claim of the metaphysics (un-occlusion is absence of a LIVE occluder, read fresh) or a convenience that silently diverges from "live" at chains of length three?
fn is_occluder(soc: &Society, occlude_edge: &str, as_of: Option<u64>) -> bool {
    soc.all().any(|b| {
        b.object.as_deref() == Some(occlude_edge)
            && b.subject.is_some()
            // TODO(socratic): the self-loop check `!= Some(occlude_edge)` rejects an edge occluding itself — but does the grammar elsewhere forbid self-loops, or is this the only place guarding against them, or is guarding here incomplete if a malformed edge could appear?
            // ANSWERED(walk 2026-07-02): the grammar has no self-occluding shape (an occlusion edge's subject names ANOTHER edge); this check just keeps the read total if a malformed row appears — edges always carry both subject and object. — see walk plan §A (grammar facts)
            && b.subject.as_deref() != Some(occlude_edge)
            && visible_at(b, as_of)
            && prehends_as(soc, &b.slug, Q_OCCLUDES, as_of)
    })
}

/// Is `target` OCCLUDED within this society, as of a moment? A member E casts a q-occludes
/// shadow over a member it prehends: E --q-occludes--> target. NAMES the occluder, is
/// STANDPOINT-RELATIVE (this society is the frame), and EMERGENT/REVERSIBLE: an occluder
/// that is itself occluded casts no shadow (one level, no cycle-guard needed). A self-loop
/// {subject==object} is NOT occlusion (the dead grammar is dead).
pub fn is_occluded(soc: &Society, target: &str, as_of: Option<u64>) -> bool {
    soc.all().any(|b| {
        b.object.as_deref() == Some(target)
            && b.subject.is_some()
            && b.subject.as_deref() != Some(target)
            && visible_at(b, as_of)
            && prehends_as(soc, &b.slug, Q_OCCLUDES, as_of)
            // TODO(socratic): an occlusion edge beats all comers if is_occluder(soc, b.slug) is false — but should the read ask "is ANY non-self-occluding edge occluding target" or "is THIS EDGE the active occluder", and does `.any()` short-circuit on the first non-occluded shadow or report all?
            && !is_occluder(soc, &b.slug, as_of)
    })
}

/// grounded_for_any_frame: the society-standpoint AGGREGATE read — does some un-occluded
/// grounding-prehension reach this beat, from ANY frame this store carries? Never "the"
/// frame. (N1, Hallie 2026-07-03: soc IS a frame — this is that frame's own existential
/// read, honestly named.) Under the every-event-is-done-to/by-its-author ruling this read
/// trends toward true for every authored event once authorship-establishment lands; its
/// honest use is occlusion-sensitive display, not doneness. For doneness, read
/// `established_to` (frame-relative reachability, below). Mirrors society.ts.
pub fn grounded_for_any_frame(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    prehensions_onto(soc, row, Q_GROUNDING, as_of)
        .iter()
        // TODO(socratic): the read asks "is any grounding edge itself non-occluded" — but shouldn't it also check "is the GROUNDED beat (row) itself non-occluded", or is establishment defined by the prehension's shadow, not the beat's?
        .any(|p| !is_occluded(soc, &p.slug, as_of))
}

/// DEPRECATED alias of `grounded_for_any_frame` — same behavior, dishonest name (it reads
/// as frame-free doneness, which the 2026-07-03 ruling made a malformed question). Migrate
/// reads that mean "done" to `established_to(reader_now, …)`; reads that mean "grounded for
/// someone" to `grounded_for_any_frame`. Perishes when no caller remains (the pathosOf
/// precedent — doc-deprecation only, no `#[deprecated]` attribute, so neighbor builds stay
/// warning-free through their own migration window). Mirrors society.ts's alias.
pub fn is_established(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    grounded_for_any_frame(soc, row, as_of)
}

// ── FRAME-RELATIVE ESTABLISHMENT (Hallie's ruling, 2026-07-03: "YES EVERY EVENT IS DONE
// to/by its author" — establishment is always relative to a standpoint; the frame-free
// question is malformed, and the old reads survive only as the society's OWN standpoint,
// per N1). Joint-sitting minutes:
// penelope-gen4/docs/committees/2026-07-03-q-grounding-joint-sitting.md ──────────────────

/// reaches: is `to` reachable from `from` along un-occluded prehensions co-prehending
/// `quality`, walking subject→object, as of a moment? The BFS that existed twice
/// (`interval_of`'s private walk here, `done_to` in gen4-policy) held once — the Now-pole
/// minutes' gift-channel extraction, landed. `from == to` reaches trivially.
pub fn reaches(soc: &Society, from: &str, to: &str, quality: &str, as_of: Option<u64>) -> bool {
    if from == to {
        return true;
    }
    let mut seen = std::collections::HashSet::new();
    seen.insert(from.to_string());
    let mut stack = vec![from.to_string()];
    while let Some(n) = stack.pop() {
        for p in prehensions_from(soc, &n, quality, as_of) {
            if is_occluded(soc, &p.slug, as_of) {
                continue;
            }
            let Some(next) = p.object.as_deref() else { continue };
            if next == to {
                return true;
            }
            if seen.insert(next.to_string()) {
                stack.push(next.to_string());
            }
        }
    }
    false
}

/// established_to: frame-relative establishment — is `row` behind the reader's Now on the
/// grounding topology? `reader_now` is the reader-event's Now NODE: locating it (gen4's
/// lazily-minted now-{frame}, or any future scheme) is POLICY and stays outside the kernel —
/// the kernel takes a node, never a slug convention (opaque-slugs law). The missing-Now
/// short-circuit ("no Now ⇒ nothing done-to-me") likewise lives with the caller, who knows
/// whether a Now exists.
///
/// DELIBERATELY ABSENT, pending Hallie's F-A ruling: the authorship clause (done to/by its
/// author from birth). Do not add it here without the ruling — the three-way fork
/// (forever-done / occurrence-vs-work split / occludable authorship) changes its shape.
pub fn established_to(soc: &Society, reader_now: &str, row: &str, as_of: Option<u64>) -> bool {
    reaches(soc, reader_now, row, Q_GROUNDING, as_of)
}

/// The mode a beat reads as — derived, not stored.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Established,
    Scripted,
}

// TODO(socratic): Mode is binary — but could a beat be neither (no grounding, no script), or is every beat that fails is_established classified Scripted by default?
// ANSWERED(walk 2026-07-02): yes — everything not established reads Scripted; the binary is the mechanism floor, and doneness proper is the frame-relative read because(Now, event), never a stored property. — see doneness-is-because-now.md / ruling 5

/// mode_at: the establishment-mode read of a beat, as of a moment.
pub fn mode_at(soc: &Society, row: &str, as_of: Option<u64>) -> Mode {
    if is_established(soc, row, as_of) {
        Mode::Established
    } else {
        Mode::Scripted
    }
}

/// confidence: groundings / (groundings + exclusions), in [0,1]. Every prehension counts 1.
/// (Faithful to society.ts: counts ALL groundings/exclusions, not only non-occluded ones —
/// occlusion gates establishment, not the confidence ratio.)
pub fn confidence(soc: &Society, row: &str, as_of: Option<u64>) -> f64 {
    let g = prehensions_onto(soc, row, Q_GROUNDING, as_of).len();
    let e = prehensions_onto(soc, row, Q_EXCLUSION, as_of).len();
    // TODO(socratic): confidence counts every grounding and exclusion, even occluded ones — is an occluded grounding still a vote for belief, or should occlusion silence it from this ratio?
    if g + e == 0 {
        return 0.0;
    }
    g as f64 / (g + e) as f64
}

// ── DEPENDENCY READS — one edge (q-depends-on), read in several directions. "blocked" is
// never stored; it is a READING of depends-on against establishment. ─────────────────────

/// dependsOn: the beats this one is waiting ON (its blockers) — non-occluded q-depends-on
/// edges FROM this beat.
pub fn depends_on(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    prehensions_from(soc, row, Q_DEPENDS_ON, as_of)
        .iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        // TODO(socratic): filter_map(|p| p.object.clone()) assumes every dependency edge has an object set; is that guaranteed by the grammar, or should a None-object edge be an error?
        // ANSWERED(walk 2026-07-02): guaranteed by the grammar — edges always carry both subject and object; filter_map is just the type-level unwrap of that fact. — see walk plan §A (grammar facts)
        .filter_map(|p| p.object.clone())
        .collect()
}

/// dependentsOf: the beats waiting on THIS one — the backward read (this beat as object).
pub fn dependents_of(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    prehensions_onto(soc, row, Q_DEPENDS_ON, as_of)
        .iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        // TODO(socratic): filter_map(|p| p.subject.clone()) assumes every dependency edge's subject is Some; if prehensions_onto already filters subject.is_some(), is the map redundant or does filter_map guard against a change to the grammar?
        // ANSWERED(walk 2026-07-02): redundant with prehensions_onto's filter — the same grammar fact (edges have both ends) unwrapped at the type level, not extra defense. — see walk plan §A (grammar facts)
        .filter_map(|p| p.subject.clone())
        .collect()
}

/// blockedOnNow: of this beat's dependencies, the ones NOT yet established — the live blockers.
pub fn blocked_on_now(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    depends_on(soc, row, as_of)
        .into_iter()
        // TODO(socratic): filtering by "not established" assumes a beat is either Established or live-blocking; is a Scripted beat (not established, no grounding but also not explicitly grounded) considered a blocker?
        // ANSWERED(walk 2026-07-02): yes — a Scripted dependency blocks; established/scripted is the mechanism floor, and the doneness read layered on it is because(Now), story-NOW default. — see doneness-is-because-now.md / ruling 5
        .filter(|d| !is_established(soc, d, as_of))
        .collect()
}

/// isBlocked: any live (unestablished) dependency remains.
pub fn is_blocked(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    !blocked_on_now(soc, row, as_of).is_empty()
}

/// parallelizable: not blocked AND not yet established — work that could start right now.
pub fn parallelizable(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    !is_blocked(soc, row, as_of) && !is_established(soc, row, as_of)
}

/// stressOf: a beat's blast-radius — how much waits on it, weighted by the dependents' own
/// commitment (established=3, blocked=2, merely scripted=1).
pub struct Stress {
    pub count: usize,
    pub weight: u64,
    pub dependents: Vec<String>,
}

// TODO(socratic): Stress weight is 3/2/1 for Established/blocked/Scripted — why those numbers, and does "weight" mean "priority" or "cost to lose", and should occluded dependents count toward stress?

pub fn stress_of(soc: &Society, row: &str, as_of: Option<u64>) -> Stress {
    let dependents = dependents_of(soc, row, as_of);
    let weight = dependents.iter().fold(0u64, |w, d| {
        w + if is_established(soc, d, as_of) {
            3
        } else if is_blocked(soc, d, as_of) {
            2
        } else {
            // TODO(socratic): the fallback weight for Scripted is 1 — but could a beat be occluded, and should an occluded dependent weigh 0?
            1
        }
    });
    Stress {
        count: dependents.len(),
        weight,
        dependents,
    }
}

/// contentBeats: exactly the nodes (subject null, slug not ending `~q`).
pub fn content_beats(soc: &Society) -> Vec<&EventRow> {
    soc.all()
        .filter(|b| b.subject.is_none() && !b.slug.ends_with("~q"))
        // TODO(socratic): content_beats filters by subject.is_none() to find nodes, but could a beat have a null subject by accident, or is the grammar such that every content beat has exactly subject=None?
        // ANSWERED(walk 2026-07-02): the grammar — a content beat (node) is exactly (subject=None, object=None) by construction; edges always have both. No accidental halves. — see walk plan §A (grammar facts)
        .collect()
}

// ── reads pulled in for penelope-gen4 (its interface_contract.rs is the pull-spec) ────────
// Three reads gen4's /bujo/today slice needs, ported faithfully from society.ts.

/// grounded_by: WHO grounded this beat — the subject (frame) of each grounding prehension.
/// The because-base: "hea, because a". Mirrors `groundedBy` in society.ts.
pub fn grounded_by(soc: &Society, row: &str) -> Vec<String> {
    prehensions_onto(soc, row, Q_GROUNDING, None)
        .iter()
        // TODO(socratic): filter_map assumes every grounding prehension has a subject; prehensions_onto already checked subject.is_some(), so is this map just a safety or does it defend against a grammar change?
        // ANSWERED(walk 2026-07-02): just the type-level unwrap of the same grammar fact prehensions_onto already filtered on (edges have both ends). — see walk plan §A (grammar facts)
        .filter_map(|p| p.subject.clone())
        .collect()
}

/// interval_of: the beats BETWEEN `once` and `end` — members of a story by betweenness, never a
/// stored containment. A beat is in the interval iff it is forward-reachable from `once` AND
/// backward-reachable from `end` over plain edges (carrying no quality — has_any_quality —
/// and not themselves `~q` mode-beats). Mirrors `intervalOf` in society.ts.
pub fn interval_of(soc: &Society, once: &str, end: &str) -> Vec<String> {
    let quality_tokens: std::collections::HashSet<&str> = soc
        .all()
        .filter(|b| b.slug.ends_with("~q") && visible_at(b, None))
        .filter_map(|b| b.object.as_deref())
        .collect();
    let edges: Vec<&EventRow> = soc
        .all()
        .filter(|b| {
            // TODO(socratic): interval edges must have both subject and object — what makes an edge with only one "plain"?
            // ANSWERED(walk 2026-07-02): an edge with only one end doesn't exist in the grammar (nodes are None,None); "plain" = both ends present, object not q-*, slug not ~q. Membership is this betweenness walk, never a stored containment edge — ~holds~ is settled-dead. — see clearness-holds-is-settled-debt.md
            b.subject.is_some()
                && b.object.is_some()
                // Interval edges: everything but the quality machinery. Excluded: ~q
                // mode-beats, and edges whose OBJECT is a quality token — structural
                // ("used as the object of a visible ~q beat"), never spelled.
                // CORRECTION (2026-07-06, event-1350 sitting): the first structural
                // replacement used !has_any_quality(edge) — the edge's OWN mode-beat —
                // which excluded every lay_p-ed (quality-CARRYING) edge and emptied
                // production intervals; membership edges must carry q-grounding or the
                // address law reads them as charges. Mirrors intervalOf in society.ts.
                && !quality_tokens.contains(b.object.as_deref().unwrap_or(""))
                && !b.slug.ends_with("~q")
        })
        .collect();

    fn reach(edges: &[&EventRow], from: &str, fwd: bool) -> std::collections::HashSet<String> {
        let mut seen = std::collections::HashSet::new();
        seen.insert(from.to_string());
        let mut stack = vec![from.to_string()];
        while let Some(n) = stack.pop() {
            for e in edges {
                // TODO(socratic): fwd=true walks forward (subject→object), fwd=false walks backward (object→subject) — but does "forward-reachable from once" mean subject→object or object→subject, and which direction is the story's "natural" flow?
                // ANSWERED(walk 2026-07-02): fwd steps subject→object, bwd the reverse; the interval is the fwd(once) ∩ bwd(end) intersection, so the read is order-free set reachability between the poles — the poles ARE the story, the interior is read, never stored. — see event-is-the-bounding-sphere.md (R3)
                let next = if fwd {
                    if e.subject.as_deref() == Some(&n) { e.object.clone() } else { None }
                } else if e.object.as_deref() == Some(&n) {
                    e.subject.clone()
                } else {
                    None
                };
                if let Some(next) = next {
                    // TODO(socratic): seen.insert() returns false if `next` was already in the set — so the stack skips revisiting; is the reachability graph acyclic, or does loop-avoidance silently hide cycles?
                    if seen.insert(next.clone()) {
                        stack.push(next);
                    }
                }
            }
        }
        seen
    }

    let fwd = reach(&edges, once, true);
    let bwd = reach(&edges, end, false);
    // TODO(socratic): intersection of forward-reachable and backward-reachable sets gives the interval — but is this symmetric, or could a beat be reachable fwd from `once` but not bwd from `end` (unreachable end), and should the interval include `once` and `end` themselves?
    // ANSWERED(walk 2026-07-02): a beat reachable from once but not reaching end lies outside the sphere — betweenness IS the intersection, by design. Both seed sets include their own start, so the poles appear here; readers that want only the interior (canon_of) filter them out — poles are boundary, interior is read. — see event-is-the-bounding-sphere.md (R3)
    fwd.into_iter().filter(|n| bwd.contains(n)).collect()
}

/// end_of: the story's End-pole — the object of its Q_END_POLE designation (laid by the
/// lazy three-pole unpack), structurally; no spelling is read (F-A ruling + pole law,
/// 2026-07-06; q-lure is dead — see the lay_p guard). Mirrors `endOf` in society.ts.
// TODO(socratic): find() returns the first match in an unordered map — what defines "first", and if two pole designations match (reopened differentials), should end_of pick one deterministically or error?
pub fn end_of(soc: &Society, story: &str) -> Option<String> {
    soc.all()
        .find(|b| {
            b.subject.as_deref() == Some(story) && prehends_as(soc, &b.slug, Q_END_POLE, None)
        })
        .and_then(|b| b.object.clone())
}

/// end_actual: is this End-pole ACTUAL — is it because something (per the pole law, the
/// Now of its closing: `end ~because~ now`)? Reads the un-occluded outgoing Q_GROUNDING
/// edges FROM the End. Mirrors `endActual` in society.ts.
pub fn end_actual(soc: &Society, end: &str, as_of: Option<u64>) -> bool {
    prehensions_from(soc, end, Q_GROUNDING, as_of)
        .iter()
        .any(|p| !is_occluded(soc, &p.slug, as_of))
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
    let designated = soc.all().any(|b| {
        b.object.as_deref() == Some(node)
            && b.subject.is_some()
            && prehends_as(soc, &b.slug, Q_END_POLE, as_of)
            && !is_occluded(soc, &b.slug, as_of)
    });
    designated && !end_actual(soc, node, as_of)
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

/// charges_on: the charges on a differential — a PURE ADDRESS READ (the naked-pole law's
/// payoff): the un-occluded BARE prehensions onto the End. No charge quality exists; the
/// charge is a property of the EDGE, never node-contents (Hallie, 2026-07-06). Mirrors
/// `chargesOn` in society.ts.
pub fn charges_on<'a>(soc: &'a Society, end: &str, as_of: Option<u64>) -> Vec<&'a EventRow> {
    soc.all()
        .filter(|b| {
            b.object.as_deref() == Some(end)
                && b.subject.is_some()
                && visible_at(b, as_of)
                && !has_any_quality(soc, &b.slug, as_of)
                && !is_occluded(soc, &b.slug, as_of)
        })
        .collect()
}

/// voltage_of: the scalar across the story's differentials, read RELATIVE TO A GROUND —
/// DERIVED, stored nowhere (Hallie, 2026-07-06 second sitting: the GROUND is the reading
/// frame's now-lineage head, "the last now that the user's now is because (or whatever
/// frame's now)"). `ground: None` ⇒ the story's OWN frame's Now (SOFD default). Locating
/// or walking lineage heads for other frames is POLICY (the kernel takes a node); no
/// structural now-succession exists yet, so a frame's single Now IS its head.
///
/// Per differential: CLOSED for this ground iff a closing is established to it (or the
/// ground IS the closing's Now, or the ground is the story's own frame — SOFD: a closing
/// on this story's End is an event in the story's own course). Discharge PROPAGATES; no
/// global zeroing — an unestablished frame honestly reads residual voltage ("done, still
/// discharging"). While open: the strike counts iff the story is established to the
/// ground; each charge (bare edge onto the End — pure address) counts iff established to
/// the ground. Simple sum, no decay this pass. Mirrors `voltageOf` in society.ts.
pub fn voltage_of(soc: &Society, story: &str, ground: Option<&str>, as_of: Option<u64>) -> u64 {
    let own = story_now(story);
    let ground = ground.unwrap_or(&own);
    let poles: Vec<EventRow> = prehensions_from(soc, story, Q_END_POLE, as_of)
        .into_iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        .cloned()
        .collect();
    let mut v = 0;
    for p in poles {
        let Some(end) = p.object.as_deref() else { continue };
        let closings: Vec<EventRow> = prehensions_from(soc, end, Q_GROUNDING, as_of)
            .into_iter()
            .filter(|c| !is_occluded(soc, &c.slug, as_of))
            .cloned()
            .collect();
        let closed_here = !closings.is_empty()
            && (ground == own
                || closings.iter().any(|c| {
                    c.object.as_deref() == Some(ground)
                        || established_to(soc, ground, &c.slug, as_of)
                }));
        if closed_here {
            continue; // discharged to this ground — this differential reads closed
        }
        if established_to(soc, ground, story, as_of) {
            v += 1; // the strike
        }
        for c in charges_on(soc, end, as_of) {
            if established_to(soc, ground, &c.slug, as_of) {
                v += 1;
            }
        }
    }
    v
}

/// one floating differential: charge nobody's lineage holds.
pub struct FloatingCharge {
    pub story: String,
    pub end: String,
    /// the story's own frame's Now — unreachable from every live ground given.
    pub now: String,
    /// raw un-occluded charge count on the open End (absolute — no ground can read it).
    pub charges: usize,
}

/// floating_charge: THE ALGEDONIC CHANNEL (Beer), read one — the dukkha nobody holds:
/// open differentials CARRYING CHARGE whose story-frame has no path from any live ground
/// (its now-lineage head unreachable from every active frame's head). `grounds` are the
/// live frames' lineage-head NODES (policy locates them). Sorted by charge, loudest
/// first. DON'T-PLUG-THE-CHANNEL LAW: never silently filter or threshold this in the
/// kernel — threshold policy is Hallie's. Mirrors `floatingCharge` in society.ts.
pub fn floating_charge(soc: &Society, grounds: &[&str], as_of: Option<u64>) -> Vec<FloatingCharge> {
    let mut out: Vec<FloatingCharge> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for b in soc.all() {
        let (Some(story), Some(end)) = (b.subject.as_deref(), b.object.as_deref()) else { continue };
        if !prehends_as(soc, &b.slug, Q_END_POLE, as_of) || is_occluded(soc, &b.slug, as_of) {
            continue;
        }
        if end_actual(soc, end, as_of) {
            continue; // closed — discharging normally, not floating
        }
        if !seen.insert((story.to_string(), end.to_string())) {
            continue;
        }
        let charges = charges_on(soc, end, as_of).len();
        if charges == 0 {
            continue; // an idle open differential is calm, not dukkha
        }
        let now = story_now(story);
        let held = grounds
            .iter()
            .any(|g| *g == now || reaches(soc, g, &now, Q_GROUNDING, as_of));
        if !held {
            out.push(FloatingCharge { story: story.to_string(), end: end.to_string(), now, charges });
        }
    }
    out.sort_by(|a, b| b.charges.cmp(&a.charges));
    out
}

/// one story's contribution to a lineage's load.
pub struct VoltageReading {
    pub story: String,
    pub voltage: u64,
}

/// overload: THE ALGEDONIC CHANNEL (Beer), read two — the total voltage grounded through
/// ONE lineage: the line over rating. Raw readings sorted loudest-first plus their sum;
/// NO threshold here — threshold policy stays Hallie's, and the don't-plug-the-channel
/// law forbids silent filtering. Mirrors `overload` in society.ts.
pub fn overload(soc: &Society, ground: &str, as_of: Option<u64>) -> (u64, Vec<VoltageReading>) {
    let mut stories = std::collections::HashSet::new();
    for b in soc.all() {
        if b.subject.is_some()
            && b.object.is_some()
            && prehends_as(soc, &b.slug, Q_END_POLE, as_of)
            && !is_occluded(soc, &b.slug, as_of)
        {
            stories.insert(b.subject.clone().unwrap());
        }
    }
    let mut total = 0;
    let mut readings: Vec<VoltageReading> = Vec::new();
    for story in stories {
        let voltage = voltage_of(soc, &story, Some(ground), as_of);
        total += voltage;
        if voltage > 0 {
            readings.push(VoltageReading { story, voltage });
        }
    }
    readings.sort_by(|a, b| b.voltage.cmp(&a.voltage));
    (total, readings)
}

/// distance_to_hea: the HEA as a gradient, READ (not a stored lure). For a story from
/// `frame_once` toward `end` (defaulting to `end_of`, then `{once}-end`), counts how many
/// interior beats remain unestablished. `realized` is true when the End is itself established.
/// Mirrors `distanceToHEA` in society.ts.
pub struct HeaDistance {
    pub realized: bool,
    pub remaining: usize,
    pub total: usize,
}

pub fn distance_to_hea(soc: &Society, frame_once: &str, end: Option<&str>) -> HeaDistance {
    let the_end = end
        .map(|e| e.to_string())
        // TODO(socratic): the fallback chain tries explicit end, then end_of(), then literal "{once}-end" — if none exist, the function happily uses a nonexistent End; should it error, or is reading a phantom-end an acceptable fact?
        .or_else(|| end_of(soc, frame_once))
        .unwrap_or_else(|| format!("{frame_once}-end"));
    let interior: Vec<String> = interval_of(soc, frame_once, &the_end)
        .into_iter()
        // TODO(socratic): filtering to exclude `once` and `the_end` — but does interval_of() include them already, and if the interval is empty after filtering, is that a valid story with zero interior beats?
        // ANSWERED(walk 2026-07-02): yes on both — interval_of's seed sets include the poles, so this filter strips them; and an empty interior is a valid extended event (an empty day and a point event differ only in pole-separation). — see event-is-the-bounding-sphere.md (R3)
        .filter(|b| b != frame_once && b != &the_end)
        .collect();
    let remaining = interior.iter().filter(|b| !is_established(soc, b, None)).count();
    HeaDistance {
        realized: is_established(soc, &the_end, None),
        remaining,
        total: interior.len(),
    }
}

// ── SUBLIME READS (2026-07-06 sublimes-store design) ─────────────────────────────
// Sublimes are never-closing poles that ORGANIZE pursuit without luring. They orient
// events via because-edges (bearings). The reads here measure voltage-toward and
// trace inherited bearings through story membership.

/// bearings_of: all because-edges FROM this event TO any sublime-pole, as of a moment.
/// These are the bearings (orientations) the event sails under. A bare because-edge
/// (`event ~because~ sublime`) is pure orientation, not establishment. Occluded bearings
/// are filtered out. Mirrors `bearingsOf` in society.ts.
pub fn bearings_of<'a>(soc: &'a Society, event: &str, as_of: Option<u64>) -> Vec<&'a EventRow> {
    prehensions_from(soc, event, "because", as_of)
        .into_iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of) && is_sublime_pole(soc, p.object.as_deref().unwrap_or(""), as_of))
        .collect()
}

/// voltage_toward_sublime: count of non-occluded bare prehensions onto this sublime,
/// as of a moment. This is the sublime's "charge" — attraction without actualization.
/// Unlike charge on an End-pole (which discharges when the pole closes), a sublime's
/// voltage accumulates forever, never exhausted. Mirrors `voltageTowardSublime` in society.ts.
pub fn voltage_toward_sublime(soc: &Society, sublime: &str, as_of: Option<u64>) -> usize {
    prehensions_onto(soc, sublime, "because", as_of)
        .into_iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        .count()
}

/// service_chain_of: the sublimes this sublime serves, transitively — every sublime-pole
/// reachable UP the because-DAG from this one (the why-behind-the-why). Excludes the
/// sublime itself. Cycle-safe (seen-set); occlusion-aware via bearings_of. Mirrors
/// `serviceChainOf` in society.ts. (Hallie's chaining extension, 2026-07-06.)
pub fn service_chain_of(soc: &Society, sublime: &str, as_of: Option<u64>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    seen.insert(sublime.to_string());
    let mut out = Vec::new();
    let mut stack = vec![sublime.to_string()];
    while let Some(n) = stack.pop() {
        for b in bearings_of(soc, &n, as_of) {
            let Some(next) = b.object.as_deref() else { continue };
            if seen.insert(next.to_string()) {
                out.push(next.to_string());
                stack.push(next.to_string());
            }
        }
    }
    out
}

/// reached_sublimes_of: every sublime-pole an event ultimately sails under — its DIRECT
/// bearings PLUS everything those bearings transitively serve up the DAG (the full
/// why-behind-the-why). Deduplicated; cycle-safe. Mirrors `reachedSublimesOf` in society.ts.
pub fn reached_sublimes_of(soc: &Society, event: &str, as_of: Option<u64>) -> Vec<String> {
    let direct: Vec<String> = bearings_of(soc, event, as_of)
        .into_iter()
        .filter_map(|b| b.object.clone())
        .collect();
    let mut all: std::collections::HashSet<String> = direct.iter().cloned().collect();
    for s in &direct {
        for up in service_chain_of(soc, s, as_of) {
            all.insert(up);
        }
    }
    all.into_iter().collect()
}
