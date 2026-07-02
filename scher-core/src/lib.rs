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

// Qualities are passed as `&str` — the reads only ever compare for equality, and an unknown
// quality is simply one no read matches (the same openness the TS `Quality` string union has
// at runtime, with no enum to edit when the grammar grows a word). The known words used by the
// reads here are named as consts for call-site legibility; the grammar's full set lives in
// society.ts (a string the core never needs to enumerate).
pub const Q_GROUNDING: &str = "q-grounding";
pub const Q_EXCLUSION: &str = "q-exclusion";
pub const Q_OCCLUDES: &str = "q-occludes";
pub const Q_DEPENDS_ON: &str = "q-depends-on";

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
        let witnessed = b.witnessed.unwrap_or(self.clock + 1);
        self.clock = self.clock.max(witnessed);
        b.witnessed = Some(witnessed);
        self.rows.insert(b.slug.clone(), b);
        true
    }

    /// Lay a beat (the only write). Returns true on a genuine append, false if inert.
    pub fn lay(&mut self, b: EventRow) -> bool {
        let appended = self.insert(b);
        if appended {
            self.rev += 1;
        }
        appended
    }

    /// Lay a prehension co-prehending a quality: the edge and its `~q` mode-beat. Mirrors
    /// `layP`. Returns true if either the edge or its `~q` was a genuine append.
    pub fn lay_p(
        &mut self,
        slug: &str,
        content: &str,
        subject: &str,
        object: &str,
        quality: &str,
    ) -> bool {
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
fn visible_at(b: &EventRow, as_of: Option<u64>) -> bool {
    match as_of {
        None => true,
        Some(t) => b.witnessed.unwrap_or(0) <= t,
    }
}

/// Does prehension P co-prehend the given quality, as of a moment? Both the prehension and
/// its `~q` mode-beat must be visible — a grounding doesn't count before its quality landed.
pub fn prehends_as(soc: &Society, pslug: &str, quality: &str, as_of: Option<u64>) -> bool {
    let q_slug = format!("{pslug}~q");
    match soc.get(&q_slug) {
        Some(q) => q.object.as_deref() == Some(quality) && visible_at(q, as_of),
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
                && b.object.is_some()
                && visible_at(b, as_of)
                && prehends_as(soc, &b.slug, quality, as_of)
        })
        .collect()
}

/// Is this occlusion-prehension itself occluded (its occluder occluded)? One level only —
/// un-occlusion is the absence of a LIVE occluder, read fresh; no deep recursion.
fn is_occluder(soc: &Society, occlude_edge: &str, as_of: Option<u64>) -> bool {
    soc.all().any(|b| {
        b.object.as_deref() == Some(occlude_edge)
            && b.subject.is_some()
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
            && !is_occluder(soc, &b.slug, as_of)
    })
}

/// is_established, as of a moment: established iff some non-occluded grounding-prehension
/// reaches it.
pub fn is_established(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    prehensions_onto(soc, row, Q_GROUNDING, as_of)
        .iter()
        .any(|p| !is_occluded(soc, &p.slug, as_of))
}

/// The mode a beat reads as — derived, not stored.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Established,
    Scripted,
}

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
        .filter_map(|p| p.object.clone())
        .collect()
}

/// dependentsOf: the beats waiting on THIS one — the backward read (this beat as object).
pub fn dependents_of(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    prehensions_onto(soc, row, Q_DEPENDS_ON, as_of)
        .iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        .filter_map(|p| p.subject.clone())
        .collect()
}

/// blockedOnNow: of this beat's dependencies, the ones NOT yet established — the live blockers.
pub fn blocked_on_now(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    depends_on(soc, row, as_of)
        .into_iter()
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

pub fn stress_of(soc: &Society, row: &str, as_of: Option<u64>) -> Stress {
    let dependents = dependents_of(soc, row, as_of);
    let weight = dependents.iter().fold(0u64, |w, d| {
        w + if is_established(soc, d, as_of) {
            3
        } else if is_blocked(soc, d, as_of) {
            2
        } else {
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
        .collect()
}

// ── reads pulled in for penelope-gen4 (its interface_contract.rs is the pull-spec) ────────
// Three reads gen4's /bujo/today slice needs, ported faithfully from society.ts.

/// grounded_by: WHO grounded this beat — the subject (frame) of each grounding prehension.
/// The because-base: "hea, because a". Mirrors `groundedBy` in society.ts.
pub fn grounded_by(soc: &Society, row: &str) -> Vec<String> {
    prehensions_onto(soc, row, Q_GROUNDING, None)
        .iter()
        .filter_map(|p| p.subject.clone())
        .collect()
}

/// interval_of: the beats BETWEEN `once` and `end` — members of a story by betweenness, never a
/// stored containment. A beat is in the interval iff it is forward-reachable from `once` AND
/// backward-reachable from `end` over plain edges (object not a `q-*`, slug not `~q`). Mirrors
/// `intervalOf` in society.ts.
pub fn interval_of(soc: &Society, once: &str, end: &str) -> Vec<String> {
    let edges: Vec<&EventRow> = soc
        .all()
        .filter(|b| {
            b.subject.is_some()
                && b.object.is_some()
                && !b.object.as_deref().unwrap().starts_with("q-")
                && !b.slug.ends_with("~q")
        })
        .collect();

    fn reach(edges: &[&EventRow], from: &str, fwd: bool) -> std::collections::HashSet<String> {
        let mut seen = std::collections::HashSet::new();
        seen.insert(from.to_string());
        let mut stack = vec![from.to_string()];
        while let Some(n) = stack.pop() {
            for e in edges {
                let next = if fwd {
                    if e.subject.as_deref() == Some(&n) { e.object.clone() } else { None }
                } else if e.object.as_deref() == Some(&n) {
                    e.subject.clone()
                } else {
                    None
                };
                if let Some(next) = next {
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
    fwd.into_iter().filter(|n| bwd.contains(n)).collect()
}

/// end_of: the End a story lures toward — the object of the story's `q-lure` edge whose object
/// names an "end". Mirrors `endOf` in society.ts. (Seam for gen4: gen4 retires q-lure — "the lure
/// is read" — so gen4 will likely pass `end` explicitly to distance_to_hea rather than rely on
/// this. Ported faithfully to scher's grammar, where q-lure still names the End.)
pub fn end_of(soc: &Society, story: &str) -> Option<String> {
    soc.all()
        .find(|b| {
            b.subject.as_deref() == Some(story)
                && b.object.as_deref().is_some_and(|o| o.contains("end"))
                && prehends_as(soc, &b.slug, "q-lure", None)
        })
        .and_then(|b| b.object.clone())
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
        .or_else(|| end_of(soc, frame_once))
        .unwrap_or_else(|| format!("{frame_once}-end"));
    let interior: Vec<String> = interval_of(soc, frame_once, &the_end)
        .into_iter()
        .filter(|b| b != frame_once && b != &the_end)
        .collect();
    let remaining = interior.iter().filter(|b| !is_established(soc, b, None)).count();
    HeaDistance {
        realized: is_established(soc, &the_end, None),
        remaining,
        total: interior.len(),
    }
}
