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
pub mod substance;

// End / Now / Sublime pole-designation reads (split out 2026-07-21, Hallie's ruling:
// "sublime law is core enough to the ontology" — pays down this file's pre-existing
// ~500-line-law overage while keeping the metaphysics/epistemology cut scher-epistemology
// already drew: pole-designation IS metaphysics, membersOf/bucketsOf-style taxonomy is not).
mod poles;
pub use poles::{
    bearings_of, charges_on, end_actual, is_any_pole, is_open_end_pole, is_sublime_pole,
    reached_sublimes_of, service_chain_of, sublimes_charged_from, story_now,
    voltage_toward_sublime,
};
use poles::{grounding_edges_from, grounding_edges_onto, is_designated_end_pole, is_now_pole};

// the contraction plugin seam (merged sitting 2026-07-03): consumer-owned contraction rules
// over the because-grammar. scher ships the trait, the collision-refusing registry, and the
// law-checker; the RULES stay consumer-side (Hallie's ruling) and never live here.
pub mod contraction;
/// The counted fold — ONE implementation, so the TS twin becomes a caller.
pub mod counted;

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
/// LEGACY SPELLING (renamed to `q-blocked-by`, Hallie, 2026-07-15: "depends-on is too
/// close to need to drift and we need the language to be the language"). Live canon
/// carries exactly 2 legacy q-depends-on rows — append-only ink, it stays; the
/// depends_on/dependents_of read family below honors BOTH spellings (both-spellings
/// window, mirroring scher/src/strain.ts). New writes: Q_BLOCKED_BY only.
pub const Q_DEPENDS_ON: &str = "q-depends-on";
/// The current spelling of the dependency edge (2026-07-15 rename — see Q_DEPENDS_ON).
pub const Q_BLOCKED_BY: &str = "q-blocked-by";
/// The `designate-trub` relate-door's quality (api/src/bujo_write.rs, "designate-trub" bucket,
/// Hallie 2026-07-10): a bare designation edge, stamped POSITIVELY — "the nag" should be a
/// pain, not an inferred absence, so trub never gets a checkmark, it keys on a quality. Named
/// here (not hardcoded string-literal at the call site) matching this file's pattern for every
/// other designation quality bujo_write.rs imports (Q_SUBLIME_POLE, Q_END_POLE, Q_COMMENT).
/// CORRECTION (2026-07-14): this const does NOT back `is_trub_explicit` below — that reads the
/// separate, already-shipped q-feel/😕 reaction door instead (see its doc comment). An earlier
/// pass on this file wrongly conflated the two; they are two live, distinct trub-marking paths
/// today, not one. Reconciling them (or retiring one) is a design call, not a drive-by fix.
pub const Q_TRUB: &str = "q-trub";
/// The trub marker (ruling-trub-pair-q-fixes, 2026-07-21): edge `{hook} ~fixes~ {log}`.
/// `Q_TRUB` / `is_trub_explicit` are a DIFFERENT, older channel — do not conflate.
/// See `q_resolves_stays_cut.rs` (tests/) for the enforced ban on a sibling quality.
pub const Q_FIXES: &str = "q-fixes";
/// The answer marker (Hallie's socratic-closure ruling, 2026-07-24): edge
/// `{answer} ~answers~ {socratic}`. An event that prehends a socratic with this
/// quality makes it read de-facto done — see `is_answered`.
pub const Q_ANSWERS: &str = "q-answers";
/// The structural End-pole designation the lazy three-pole unpack lays (2026-07-06).
/// q-lure is DEAD — killed with fire (Hallie, same ruling): it smuggled an agent and
/// could not state its own direction. `lay_p` REFUSES it (panic, fail-closed).
pub const Q_END_POLE: &str = "q-end-pole";
/// The structural sublime-pole designation (2026-07-06 sublimes-store design): a
/// never-closing pole that ORGANIZES pursuit without luring. Sublimes are inert — they
/// never close, never beckon, never actualize. `lay_p` REFUSES attempts to close them.
pub const Q_SUBLIME_POLE: &str = "q-sublime-pole";
/// The structural now-pole designation (story-designate-now-poles ruling, Hallie,
/// 2026-07-20 second sitting): Nows become designated poles like End-poles and
/// sublime-poles already are, mirroring the Q_END_POLE / Q_SUBLIME_POLE pattern exactly.
/// This designation is what disambiguates a closing (bare edge FROM a designated End
/// ONTO a designated now-pole) from a charge (bare edge FROM the same End onto anything
/// that is NOT a now-pole) now that both are bare edges outgoing from the End under the
/// end-prehends-the-capture ruling (2026-07-20, first sitting). Existing canon Nows get
/// this designation laid in a migration pass — not this file's job; these reads just
/// need to handle the designation once it lands.
pub const Q_NOW_POLE: &str = "q-now-pole";
/// MARK THE EXCEPTION, NOT THE RULE (Hallie's ruling, 2026-07-13, q-grounding-death design).
/// `Q_GROUNDING` ("q-grounding") is a dead, redundant relation-LABEL under the one-relation
/// ruling — but bare `"because"` vs a CLOSING is a live structural distinction the
/// sublime-never-closes guard depends on: bare "because" is a legal sublime-BEARING (may ring,
/// per the 2026-07-10 relaxation), while a CLOSING actualizes/lands its subject and must never
/// land on a sublime-pole (mirage). Naively refusing on `is_sublime_pole` alone, with no way to
/// name "this write means to close", would break the legal bearing ring. So: the CLOSING is the
/// exception and gets the honest mark; ordinary grounding is the unmarked default. `Q_SETTLES`
/// names that marked exception. NOT YET WIRED into the never-closes guard — the unwired state
/// is pinned by `q_settles_tripwire` (bottom of this file), which goes red the day the guard
/// starts testing `Q_SETTLES`; the test names the fence to clear first.
/// It IS read elsewhere: `unsettled_blocking_edges` counts unsettled reachings, and the
/// close door refuses on them — that read is lateral to this guard, not a crossing of it.
/// RULED KEPT and renamed (Hallie, 2026-07-24 12:02, the koan sitting): "q-closing is
/// good. or even — q-settles." The linguistic surplus earns the quality: topology says a
/// reaching exists; only the word says whether it SETTLES the telos or merely carries it.
/// Wiring into open_story's circuit edge stays fenced until done-reachability's quality
/// filter is traced — that edge feeds done_to_frame, and changing its color untested is
/// how doneness breaks board-wide. No canon row has ever carried q-closing, so the value
/// rename is free.
pub const Q_SETTLES: &str = "q-settles";
/// The structural comment designation (2026-07-14, comment-readability fix). `bujo_comment`
/// lays a comment INSIDE a parent's betweenness interval via ordinary q-grounding edges — that
/// gives it membership for free when the parent's interval is small, but for a parent already
/// entangled in a day's (or any large story's) shared bare `~holds~`/`~charge~` fabric,
/// `interval_of` walks the WHOLE connected component (verified live: a single fresh comment on
/// a day-captured beat surfaced 1000+ unrelated rows through `/bujo/interior`). `interval_of`'s
/// plain-edge filter is NOT safe to narrow further — a prior attempt to exclude by the edge's
/// own quality emptied production intervals (see the CORRECTION note on `interval_of`, 2026-07-06,
/// event-1350). So comments get their OWN structural marker, read by a NEW dedicated, narrow
/// query (`/bujo/comments`) instead of overloading full betweenness. Never read by slug-parsing
/// (opaque-slugs law) — mirrors the `Q_END_POLE` designation pattern exactly.
pub const Q_COMMENT: &str = "q-comment";

/// A beat. With subject+object it is a prehension (an edge). A quality beat (slug ending
/// `~q`, object a `q-*`) carries mode. Mirrors the `EventRow` interface in society.ts.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EventRow {
    pub slug: String,
    pub content: String,
    /// the NAME — what this beat IS (short human headline, distinct from content). Optional.
    pub name: Option<String>,
    pub subject: Option<String>,
    pub object: Option<String>,
    /// when the local society witnessed this beat (the client's own db_witnessed). Set by
    /// `lay` if absent — readers should treat `Some(_)` as authoritative.
    pub witnessed: Option<u64>,
    /// WHO laid this beat — the capturing/editing frame's subject (or a causing event's
    /// slug when machinery lays). CONSTITUTIVE, not relational (Hallie's ruling, 2026-07-07
    /// braid-of-societies: "no statement is not spoken from" — the author is part of the
    /// event's own character, never recovered by parsing a slug). Exactly parallel to
    /// `witnessed`: an inline property set at lay time, read without a graph walk. The
    /// authorship EVENT+edge (`gen4_policy::lay_ingression`) still rides alongside this as
    /// testimony/process history (ruling 13) — this field is the substance read.
    pub laid_by: Option<String>,
    /// VOLTAGE (event-2681/2692): optional feeling-indicator emoji or short text, set at
    /// capture time. PLAINTEXT metadata, available for board display. Null for events
    /// captured without a voltage indicator.
    pub voltage: Option<String>,
}

impl EventRow {
    /// A content beat (a node): subject and object null.
    pub fn node(slug: &str, content: &str) -> Self {
        EventRow {
            slug: slug.into(),
            content: content.into(),
            name: None,
            subject: None,
            object: None,
            witnessed: None,
            laid_by: None,
            voltage: None,
        }
    }

    /// A prehension (an edge) from `subject` to `object`.
    pub fn edge(slug: &str, content: &str, subject: &str, object: &str) -> Self {
        EventRow {
            slug: slug.into(),
            content: content.into(),
            name: None,
            subject: Some(subject.into()),
            object: Some(object.into()),
            witnessed: None,
            laid_by: None,
            voltage: None,
        }
    }

    /// `with_witnessed(t)` — set an explicit witnessing moment.
    pub fn with_witnessed(mut self, t: u64) -> Self {
        self.witnessed = Some(t);
        self
    }

    /// `with_laid_by(frame)` — set the authoring frame inline, at construction time.
    pub fn with_laid_by(mut self, frame: &str) -> Self {
        self.laid_by = Some(frame.into());
        self
    }

    /// `with_voltage(emoji)` — set the optional feeling-indicator inline, at construction time.
    pub fn with_voltage(mut self, emoji: &str) -> Self {
        self.voltage = Some(emoji.into());
        self
    }
}

/// Two typed quarantine failures (mirrors society.ts's `RowInFlightError` /
/// `AbortedTransactionRowError`, 2026-07-27 ruling — "don't let every violation shriek
/// at the same pitch"). Both name the row and the transaction; only the aborted case
/// carries the cause, and only the aborted case is PERMANENT.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum QuarantineError {
    /// The transaction that laid this row is still open. Ordinary — retry after it returns.
    RowInFlight { slug: String, txn_label: String },
    /// The transaction that laid this row returned `Err` before completing. Permanent:
    /// this row will never become readable (append-only cannot roll it back, so it is
    /// quarantined instead of masquerading as valid data).
    AbortedTransactionRow { slug: String, txn_label: String, cause: String },
}

impl std::fmt::Display for QuarantineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuarantineError::RowInFlight { slug, txn_label } => write!(
                f,
                "[IN-FLIGHT] '{slug}' is still being laid by transaction {txn_label} — not \
                 yet committed, not corrupted. Read it again after that lay_atomic call \
                 returns. (law: transactions-throw-not-hide)"
            ),
            QuarantineError::AbortedTransactionRow { slug, txn_label, cause } => write!(
                f,
                "[ABORTED TRANSACTION] '{slug}' was laid by transaction {txn_label}, which \
                 ABORTED before completing (cause: {cause}). This row is permanently \
                 quarantined — it will never become readable, by design: an aborted \
                 half-write must never masquerade as valid data. Re-lay the intended \
                 edge(s) as a fresh transaction under a new slug. (law: \
                 transactions-throw-not-hide)"
            ),
        }
    }
}

impl std::error::Error for QuarantineError {}

/// An append-only society of beats. The only write is `lay`. `rev` rises on every genuine
/// append. Beats are never overwritten — to undo, occlude with a new beat.
#[derive(Clone, Debug, Default)]
pub struct Society {
    rows: HashMap<String, EventRow>,
    rev: u64,
    clock: u64,
    // Adjacency indexes (load-time fix, 2026-07-13): edge slugs keyed by their subject /
    // object. Maintained in `insert` — safe because the society is append-only and a row's
    // subject/object are never mutated after insert (set_laid_by touches only laid_by).
    // These turn the per-call full-table scans in prehensions_onto/from, is_occluded and
    // reaches into O(degree) lookups; at ~14k rows the scans were O(n) per read and O(n·m)
    // in any caller that reads per-row, which made /bujo/today's cold path ~1.5s.
    by_subject: HashMap<String, Vec<String>>,
    by_object: HashMap<String, Vec<String>>,
    // TRANSACTION MARKS (2026-07-28, mirrors society.ts's #txnOf/#txnLabel/#abortedTxns/
    // #activeTxnStack, 2026-07-27 sitting): a row laid inside `lay_atomic` carries its
    // transaction id here until the transaction commits (cleared) or hands off to an
    // enclosing one (reassigned) — or, if the transaction's closure returns `Err`, is left
    // here forever, aborted. Additive-only: nothing existing reads through these; only
    // `lay_atomic`'s own gated reads (`get_checked`/`all_checked`) consult them.
    txn_of: HashMap<String, u64>,
    txn_labels: HashMap<u64, String>,
    /// txn id -> the Err message the closure returned. Permanent: an aborted txn's rows
    /// never become readable, by design (rows are never rolled back — append-only cannot).
    aborted_txns: HashMap<u64, String>,
    active_txn_stack: Vec<u64>,
    txn_seq: u64,
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
        if let Some(s) = &b.subject {
            self.by_subject.entry(s.clone()).or_default().push(b.slug.clone());
        }
        if let Some(o) = &b.object {
            self.by_object.entry(o.clone()).or_default().push(b.slug.clone());
        }
        let slug = b.slug.clone();
        self.rows.insert(slug.clone(), b);
        if let Some(&innermost) = self.active_txn_stack.last() {
            self.txn_of.insert(slug, innermost);
        }
        true
    }

    /// Edges whose SUBJECT is `s` (adjacency-indexed; same rows a full scan on
    /// `subject == s` yields, in insertion order).
    pub fn edges_from_subject<'a>(&'a self, s: &str) -> impl Iterator<Item = &'a EventRow> {
        self.by_subject.get(s).into_iter().flatten().filter_map(|slug| self.rows.get(slug))
    }

    /// Edges whose OBJECT is `o` (adjacency-indexed mirror of `edges_from_subject`).
    pub fn edges_onto_object<'a>(&'a self, o: &str) -> impl Iterator<Item = &'a EventRow> {
        self.by_object.get(o).into_iter().flatten().filter_map(|slug| self.rows.get(slug))
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
    /// Lay a prehension co-prehending a quality. EVERY guard here refuses with `Err` — a
    /// panic inside a write under the shared lock poisons it for every later caller, which
    /// has happened twice (2026-07-07, 2026-07-21). A scream with no ears is a seizure.
    /// Pinned by `no_guard_in_lay_p_ever_panics`.
    pub fn lay_p(
        &mut self,
        slug: &str,
        content: &str,
        subject: &str,
        object: &str,
        quality: &str,
    ) -> Result<bool, String> {
        // DEAD GRAMMAR (mirrors society.ts assertNoLure). Err, not assert!: `quality` is
        // caller-reachable through the relate door's bucket map, and a panic mid-write
        // poisons the shared lock. (law: three-poles, no-luring-verb)
        if quality == "q-lure" {
            return Err(format!(
                "[DEAD GRAMMAR] '{slug}' tries to lay q-lure — dead since 2026-07-06 (it \
                 smuggled an agent and could not state its own direction). Unpack the event \
                 into its three poles instead: lay Q_END_POLE ('{subject} ~end-pole~ end') and \
                 close with a bare edge onto the story's Now. (law: three-poles, no-luring-verb)"
            ));
        }
        // ADDRESS LAW: a labelled edge never lands on an open End — comments and references
        // prehend the STORY. Q_END_POLE is the designation that creates End-hood, so it is
        // exempt. The law's other half (exactly one closing LEAVES a pole) moved to
        // `lay_bare_p`, where closings now live. (law: naked-pole)
        if quality != Q_END_POLE && is_open_end_pole(self, object, None) {
            return Err(format!(
                "[ADDRESS LAW] '{slug}' lays a {quality} prehension ONTO the open \
                 End-pole '{object}'. Comments and references prehend the STORY, never its \
                 End. Fix: point this edge at the story. (law: naked-pole)"
            ));
        }
        // SUBLIME GUARD (blocking — mirrors society.ts assertSublimeNeverCloses,
        // 2026-07-06 sublimes-store design): a sublime-pole is NEVER ACTUAL. It is a
        // never-closing, receding horizon — a "star for navigation, not a destination to
        // land" (Hallie). Attempting to close it with q-grounding violates the anti-q-lure
        // guarantee. Q_SUBLIME_POLE designation itself is exempt (like Q_END_POLE).
        if quality != Q_SUBLIME_POLE
            && quality == Q_GROUNDING
            && is_sublime_pole(self, subject, None)
        {
            return Err(format!(
                "[ANTI-Q-LURE GUARANTEE] '{slug}' tries to close the sublime-pole '{subject}' \
                 with q-grounding. A sublime is NEVER ACTUAL — it is a receding horizon, not a \
                 destination. Sublimes orient pursuit; they do not actualize. (law: \
                 sublime-never-closes)"
            ));
        }
        // GRANDFATHER WARN-RATCHET (q-grounding-death, Hallie's ruling 2026-07-13, kernel-first-
        // commit scope): q-grounding is a dead, redundant relation-LABEL under the one-relation
        // ruling (the-because-grammar / 2026-07-13 general ruling) — every because-edge grounds
        // relative to its laying frame; naming it "the only relation" carries zero information.
        // Per the "staged, not ripped" grandfather ratchet (matches the no-hand-js pattern):
        // existing q-grounding writes are NOT refused — this is a SHRINKING ratchet, a signal,
        // never a gate. Deliberately non-blocking: `eprintln!`, not `Err`. A future commit may
        // tighten this once callers have migrated off the literal string.
        if quality == Q_GROUNDING {
            eprintln!(
                "[q-grounding-death ratchet] '{slug}' lays quality \"q-grounding\" — dead, \
                 redundant relation-label under the one-relation ruling (2026-07-13). Not \
                 refused (grandfathered); new call sites should stop minting this string. \
                 (law: one-relation, no-relation-predicate)"
            );
        }
        // GRANDFATHER WARN-RATCHET (q-depends-on-death, Hallie's ruling 2026-07-14): same
        // one-relation ruling claims depends-on too — "and depends on shouldnt exist" as a
        // category separate from because. Staged, not ripped: existing q-depends-on writes
        // are NOT refused, this is a signal, never a gate. New call sites (the drag-to-
        // associate REQUIRES zone) have already migrated to laying "because" with a reversed
        // subject/object instead; this ratchet catches anything that still mints the literal
        // depends-on string.
        if quality == Q_DEPENDS_ON {
            eprintln!(
                "[q-depends-on-death ratchet] '{slug}' lays quality \"q-depends-on\" — dead, \
                 redundant relation-label under the one-relation ruling (2026-07-14). Not \
                 refused (grandfathered); new call sites should lay \"because\" with the \
                 subject/object order reversed instead. (law: one-relation, \
                 no-relation-predicate)"
            );
        }
        // SUBLIME↔SUBLIME PREHENSION (Hallie, 2026-07-10): "The SUBLIME is the limit of all
        // future events taken to infinity, so we can start to do weird shit up there.
        // Sublimes should be able to ground in other sublimes, and sublimes can be mutually
        // prehensive. The sublime is where we let those things happen because it's a little
        // outside of time." And, the truest framing (2026-07-10): "Sublimes are mirages on
        // the surface of the sublime's event horizon." THE sublime is the event horizon — the
        // limit-of-representation where information gives out (V=0, the outer ground of the
        // representable; the sublime is what you gesture at by taking an infinite series to
        // where your information gives out). The individual sublime-POLES we designate are
        // MIRAGES on that surface, not destinations past it. This single image grounds BOTH
        // halves of the cut: mirages-on-a-horizon can reflect/hold each other (a ring, no
        // in-time causality among mirages), yet you can never LAND on a mirage (reaching for
        // one as an actual destination is the q-lure; the horizon recedes).
        //
        // The OLD sublime-dag-acyclic guard once refused a bare "because" bearing that would
        // close a cycle among sublime-poles (A serves B serves ... serves A), calling it
        // "q-lure wearing a halo." That was importing a rule ABOUT TIME into a place outside
        // it. Acyclicity is a *time* constraint: down in the actual world occasions are
        // discrete, perished, strictly time-ordered, so a causal chain that cycled would be a
        // paradox. But a sublime is the LIMIT POINT of the sequence of all futures; at that
        // limit time's grip relaxes. Two aims CAN mutually prehend; a RING of "because"
        // bearings is a constellation of stars holding each other's positions — not a causal
        // paradox. So the acyclic refusal is REMOVED for the sublime↔sublime case: a ring of
        // sublime-bearings is now allowed (mutual prehension).
        //
        // THE BOUNDARY THAT STAYS (the in-time-vs-timeless cut): aim→aim is a BEARING (the
        // bare "because" service-edge), NOT a q-grounding. A q-grounding ACTUALIZES/closes
        // its subject — that is itself a time operation (settling an occasion into the
        // perished past). So sublimes prehending each other never means q-grounding OUT of a
        // sublime; it stays a bare bearing. That is exactly why the sublime-never-closes
        // guard ABOVE is left untouched: an in-time occasion (or the sublime itself) trying
        // to CLOSE a sublime with q-grounding — trying to LAND on the mirage, actualizing the
        // limit point, dragging the ever-receding horizon down into time — is the real q-lure,
        // and stays REFUSED. We
        // relax the ring (timeless mutual bearing) without opening the close (actualizing the
        // limit). No new guard is needed here: the bare "because" ring is now simply legal.
        let a = self.lay(EventRow::edge(slug, content, subject, object));
        let q_slug = format!("{slug}~q");
        let q_content = format!("{content} [{quality}]");
        let q = self.lay(EventRow::edge(&q_slug, &q_content, slug, quality));
        Ok(a || q)
    }

    /// Lay a BARE prehension under the laws that bare edges can now break. `lay_p`'s sibling:
    /// same arity, same `Err`-not-panic contract, and like it a thin wrapper over `lay`.
    ///
    /// `lay` stays the dumb append primitive because canon replay goes through it
    /// (api/src/canon_store) — a kernel that refuses its own past cannot boot. So doors that
    /// take caller-supplied slugs come here instead.
    ///
    /// ONE-CLOSING LAW: a closing is a bare edge from a designated End onto a designated Now
    /// (one arm of `grounding_edges_from`). Re-laying the SAME closing is inert; a second,
    /// different one is refused. Read and guard share `is_designated_end_pole`/`is_now_pole`
    /// so they cannot drift. (law: one-closing)
    pub fn lay_bare_p(
        &mut self,
        slug: &str,
        content: &str,
        subject: &str,
        object: &str,
    ) -> Result<bool, String> {
        let would_close = is_designated_end_pole(self, subject, None) && is_now_pole(self, object, None);
        if would_close && self.get(slug).is_none() {
            if let Some(existing) = grounding_edges_from(self, subject, None).first() {
                return Err(format!(
                    "[ONE-CLOSING LAW] '{slug}' lays a SECOND closing out of the End-pole \
                     '{subject}', which '{}' already closed. Exactly one closing ever leaves \
                     a pole. Fix: occlude the standing closing before laying another, or \
                     point this edge at the story. (law: one-closing)",
                    existing.slug
                ));
            }
        }
        Ok(self.lay(EventRow::edge(slug, content, subject, object)))
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

    /// Set `laid_by` on an already-laid row, ONCE. The one narrow exception to the
    /// append-only law's "never overwrite" reading — justified the same way `insert`
    /// backfills `witnessed` on a beat that didn't carry one yet: this fills an *absent*
    /// constitutive property, it never changes an already-set one. Refuses (returns false,
    /// no-op) if the row doesn't exist or already carries a `laid_by` — authorship, once
    /// spoken, does not get respoken. Exists because callers lay the content event and
    /// record authorship as two separate calls (`lay` then `lay_ingression`); Whitehead's
    /// "no statement is not spoken from" wants the inline field to land on that SAME row,
    /// not a fresh one — and Society has no other route back to a laid row's fields.
    pub fn set_laid_by(&mut self, slug: &str, layer: &str) -> bool {
        match self.rows.get_mut(slug) {
            Some(row) if row.laid_by.is_none() => {
                row.laid_by = Some(layer.to_string());
                true
            }
            _ => false,
        }
    }

    /// All beats (a snapshot; iteration order is unspecified, like a Map's values()).
    /// Does NOT gate on transaction marks — callers wanting the atomic-read guarantee
    /// use `all_checked`. This one is unchanged so no existing caller's behavior shifts.
    pub fn all(&self) -> impl Iterator<Item = &EventRow> {
        self.rows.values()
    }

    /// Existence check only — never gated on transaction marks (mirrors society.ts's
    /// `has`, whose own doc says the same: "does NOT throw on a mid-transaction row —
    /// not a content read"). A row IS in the append-only log the instant it lands,
    /// whether or not its transaction has committed; `has` answers that question, not
    /// "is this readable."
    pub fn has(&self, slug: &str) -> bool {
        self.rows.contains_key(slug)
    }

    /// Is `slug` marked mid-transaction, and is the CURRENT call (per `active_txn_stack`)
    /// outside that transaction? Every gated read goes through this. Mirrors society.ts's
    /// `#assertReadable`.
    fn assert_readable(&self, slug: &str) -> Result<(), QuarantineError> {
        let Some(&txn) = self.txn_of.get(slug) else { return Ok(()) };
        if self.active_txn_stack.contains(&txn) {
            return Ok(()); // reading from inside its own transaction (or an outer one it nests within)
        }
        let txn_label = self.txn_labels.get(&txn).cloned().unwrap_or_else(|| "(unlabeled)".into());
        if let Some(cause) = self.aborted_txns.get(&txn) {
            return Err(QuarantineError::AbortedTransactionRow {
                slug: slug.to_string(),
                txn_label,
                cause: cause.clone(),
            });
        }
        Err(QuarantineError::RowInFlight { slug: slug.to_string(), txn_label })
    }

    /// `get`, but gated: refuses (returns `Err`) a row still marked mid- or
    /// permanently-aborted transaction, from OUTSIDE that transaction, instead of
    /// silently handing it back. Mirrors society.ts's `get`.
    pub fn get_checked(&self, slug: &str) -> Result<Option<&EventRow>, QuarantineError> {
        if self.rows.contains_key(slug) {
            self.assert_readable(slug)?;
        }
        Ok(self.rows.get(slug))
    }

    /// `all`, but gated: refuses (returns `Err`) if ANY row anywhere is mid- or
    /// permanently-aborted transaction, from outside it. Mirrors society.ts's `all`
    /// (which walks every transaction-marked slug before returning the snapshot).
    pub fn all_checked(&self) -> Result<Vec<&EventRow>, QuarantineError> {
        for slug in self.txn_of.keys() {
            self.assert_readable(slug)?;
        }
        Ok(self.rows.values().collect())
    }

    /// THE ATOMIC-LAY PRIMITIVE (2026-07-28, Hallie's ruling: "the laying and the event
    /// should be an atomic event"). Runs `steps` under one transaction mark. Every row
    /// `steps` lays is unreadable (via `get_checked`/`all_checked`) from OUTSIDE this call
    /// until `steps` returns `Ok` (committed — or handed to an enclosing `lay_atomic`, if
    /// nested) — or FOREVER, if `steps` returns `Err` (permanently quarantined; append-only
    /// means the rows already landed and cannot be rolled back, so they are made
    /// unreadable instead of pretending nothing happened).
    ///
    /// CLOSURE-SHAPED, NOT FIXED-ARITY (by design): `steps` takes `&mut Society` and
    /// returns whatever `T` the caller needs — a bare `lay_atomic(node, edge)` couldn't
    /// reach `lay_ingression`'s third act (the `set_laid_by` mutation); a closure can
    /// stand for however many acts one becoming requires.
    ///
    /// SCOPED, NOT THE NEW FRONT DOOR: this does not replace `lay`/`lay_p`/`lay_all`, and
    /// nothing in this commit wires an existing caller to it — see this file's own
    /// pushback (position paper, 2026-07-28) against quietly making "the event and its
    /// authorship are one act" into "every lay must go through lay_atomic."
    ///
    /// THE LANGUAGE BOUNDARY (say it plainly, don't chase it): TS quarantines on `throw`,
    /// which unwinds through any call depth and is always caught by the enclosing
    /// `layAtomic`'s `try`. Rust's analogue is `Err`, and this function tests exactly
    /// that path. But a Rust closure that **panics** instead of returning `Err` unwinds
    /// past this function's bookkeeping entirely — no `catch_unwind` wraps `steps` here,
    /// on purpose: catching unwinds is its own hazard (poisoned invariants, a lock left
    /// half-updated) and every OTHER guard in this crate that must not poison a shared
    /// write already converted from `panic!`/`assert!` to `Err` for exactly that reason
    /// (see `lay_p`'s ADDRESS LAW / SUBLIME GUARD comments). A `steps` closure that
    /// panics leaves this transaction's rows marked in-flight forever, with no aborted
    /// cause recorded — a real gap TypeScript's `try/catch` doesn't have, not drift to
    /// chase down, a language-boundary fact to know. Callers wiring existing panicking
    /// guards (the ADDRESS/SUBLIME/DEAD-GRAMMAR asserts in `lay_p`) into a `lay_atomic`
    /// closure must convert them to `Err` first, or this guarantee does not hold for them.
    pub fn lay_atomic<T>(
        &mut self,
        steps: impl FnOnce(&mut Society) -> Result<T, String>,
    ) -> Result<T, String> {
        self.txn_seq += 1;
        let txn = self.txn_seq;
        self.txn_labels.insert(txn, format!("txn-{txn}"));
        self.active_txn_stack.push(txn);
        let result = steps(self);
        self.active_txn_stack.pop();
        let outer = self.active_txn_stack.last().copied();
        match &result {
            Ok(_) => {
                let landed: Vec<String> =
                    self.txn_of.iter().filter(|(_, &t)| t == txn).map(|(s, _)| s.clone()).collect();
                for slug in landed {
                    match outer {
                        Some(o) => {
                            self.txn_of.insert(slug, o); // hand off to the enclosing transaction
                        }
                        None => {
                            self.txn_of.remove(&slug); // outermost: fully committed, ordinary row now
                        }
                    }
                }
                self.txn_labels.remove(&txn);
            }
            Err(cause) => {
                self.aborted_txns.insert(txn, cause.clone());
                // rows stay marked with `txn` forever — permanently quarantined, never
                // rolled back (this crate is append-only; the row already landed).
            }
        }
        result
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
    // Adjacency-indexed (was a full soc.all() scan per call — the load-time murder).
    soc.edges_onto_object(row)
        .filter(|b| {
            // TODO(socratic): why insist subject.is_some() — would a beat with no subject (a content beat) ever land here by accident, or is the check defensive against a grammar that forbids headless edges?
            // ANSWERED(walk 2026-07-02): definitional, not defensive — in the grammar an edge always carries both subject and object; a node is (None, None). The check selects edges. — see walk plan §A (grammar facts)
            b.subject.is_some()
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
    // Adjacency-indexed (mirror of prehensions_onto's fix).
    soc.edges_from_subject(row)
        .filter(|b| {
            // TODO(socratic): why require object.is_some() — could an edge have no object (a subject-only beat), or is the grammar such that edges always have both?
            // ANSWERED(walk 2026-07-02): the grammar is such that edges always have both — a node is (None, None); there is no subject-only shape. — see walk plan §A (grammar facts)
            b.object.is_some()
                && visible_at(b, as_of)
                && prehends_as(soc, &b.slug, quality, as_of)
        })
        .collect()
}

/// Is this occlusion-prehension itself occluded (its occluder occluded)? One level only —
/// un-occlusion is the absence of a LIVE occluder, read fresh; no deep recursion.
// TODO(socratic): "one level only" means an occluder whose own occluder is occluded still casts no shadow — is the depth-1 cutoff a claim of the metaphysics (un-occlusion is absence of a LIVE occluder, read fresh) or a convenience that silently diverges from "live" at chains of length three?
fn is_occluder(soc: &Society, occlude_edge: &str, as_of: Option<u64>) -> bool {
    soc.edges_onto_object(occlude_edge).any(|b| {
        b.subject.is_some()
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
    soc.edges_onto_object(target).any(|b| {
        b.subject.is_some()
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
///
/// Reads `grounding_edges_onto` — the object-indexed twin of the walk's
/// `grounding_edges_from` — so this one-step adjacency read and the walk share one statement
/// of what a grounding IS (`is_grounding_edge`'s three arms: legacy q-grounding, bare out of
/// a designated Now, bare End→Now closing). Scanning for the quality alone went blind to the
/// bare arms the moment the doors stopped writing q-grounding.
pub fn grounded_for_any_frame(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    !grounding_edges_onto(soc, row, as_of).is_empty()
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
///
/// The Q_GROUNDING walk is the exception: grounding is carried by BARE edges, so it defers
/// to `grounding_edges_from` (whose doc holds the arms, legacy q-grounding among them).
/// Every other quality walks its own edges, untouched.
pub fn reaches(soc: &Society, from: &str, to: &str, quality: &str, as_of: Option<u64>) -> bool {
    if from == to {
        return true;
    }
    let mut seen = std::collections::HashSet::new();
    seen.insert(from.to_string());
    let mut stack = vec![from.to_string()];
    while let Some(n) = stack.pop() {
        let edges = if quality == Q_GROUNDING {
            grounding_edges_from(soc, &n, as_of)
        } else {
            prehensions_from(soc, &n, quality, as_of)
        };
        for p in edges {
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

/// reaches_set: every node reachable from `from` along un-occluded prehensions co-prehending
/// `quality` (subject→object), as of a moment — `reaches` run to exhaustion instead of
/// early-exit. Includes `from` itself (mirroring `reaches`'s trivial from==to case). For a
/// caller asking `reaches(from, X)` for many X against one frontier, one set beats N walks.
/// Defers to `grounding_edges_from` on Q_GROUNDING exactly as `reaches` does — the two walks
/// must agree or a fan-out establishment read would diverge from the pairwise one.
pub fn reaches_set(soc: &Society, from: &str, quality: &str, as_of: Option<u64>) -> std::collections::HashSet<String> {
    let mut seen = std::collections::HashSet::new();
    seen.insert(from.to_string());
    let mut stack = vec![from.to_string()];
    while let Some(n) = stack.pop() {
        let edges = if quality == Q_GROUNDING {
            grounding_edges_from(soc, &n, as_of)
        } else {
            prehensions_from(soc, &n, quality, as_of)
        };
        for p in edges {
            if is_occluded(soc, &p.slug, as_of) {
                continue;
            }
            let Some(next) = p.object.as_deref() else { continue };
            if seen.insert(next.to_string()) {
                stack.push(next.to_string());
            }
        }
    }
    seen
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

// ── DEPENDENCY READS — one edge (q-blocked-by, RENAMED from q-depends-on, Hallie,
// 2026-07-15), read in several directions. "blocked" is never stored; it is a READING of
// blocked-by against establishment.
//
// BOTH-SPELLINGS WINDOW (dated 2026-07-15, ported from scher/src/strain.ts — the TS twin):
// live canon carries exactly 2 legacy q-depends-on rows. Append-only means that ink stays —
// so the reads below honor EITHER spelling (fresh q-blocked-by first, then legacy, same
// row order as the twin). New writes must use q-blocked-by only; drop the q-depends-on
// half once no legacy row remains (a greppable fact, the pathosOf exit shape). ──────────

/// dependsOn: the beats this one is waiting ON (its blockers) — non-occluded q-blocked-by
/// edges FROM this beat, plus legacy q-depends-on rows (both-spellings window, above).
/// Mirrors `dependsOn` in scher/src/strain.ts.
pub fn depends_on(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    let fresh = prehensions_from(soc, row, Q_BLOCKED_BY, as_of);
    let legacy = prehensions_from(soc, row, Q_DEPENDS_ON, as_of);
    fresh
        .iter()
        .chain(legacy.iter())
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        // TODO(socratic): filter_map(|p| p.object.clone()) assumes every dependency edge has an object set; is that guaranteed by the grammar, or should a None-object edge be an error?
        // ANSWERED(walk 2026-07-02): guaranteed by the grammar — edges always carry both subject and object; filter_map is just the type-level unwrap of that fact. — see walk plan §A (grammar facts)
        .filter_map(|p| p.object.clone())
        .collect()
}

/// dependentsOf: the beats waiting on THIS one — the backward read (this beat as object).
/// Reads both spellings (both-spellings window, above). Mirrors `dependentsOf` in strain.ts.
pub fn dependents_of(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    let fresh = prehensions_onto(soc, row, Q_BLOCKED_BY, as_of);
    let legacy = prehensions_onto(soc, row, Q_DEPENDS_ON, as_of);
    fresh
        .iter()
        .chain(legacy.iter())
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

/// unsettledBlockingEdges: the blocking EDGES nobody has laid a Q_SETTLES onto — the closing
/// read. The edge is the object because settling retires the dependency, not the blocker beat.
pub fn unsettled_blocking_edges(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    let fresh = prehensions_from(soc, row, Q_BLOCKED_BY, as_of);
    let legacy = prehensions_from(soc, row, Q_DEPENDS_ON, as_of);
    fresh
        .iter()
        .chain(legacy.iter())
        .map(|p| p.slug.clone())
        .filter(|edge| !is_occluded(soc, edge, as_of))
        .filter(|edge| !bears_quality(soc, edge, Q_SETTLES, as_of))
        .collect()
}

/// parallelizable: not blocked AND not yet established — work that could start right now.
pub fn parallelizable(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    !is_blocked(soc, row, as_of) && !is_established(soc, row, as_of)
}

/// The frowny reaction (Hallie's REACTION_PALETTE, cardview.ts) — the actual emoji ridden as
/// CONTENT on a q-feel charge edge (2026-07-06 emoji-charge-quality committee, Proposal A:
/// "emoji rides as content of a q-feel charge edge"). This is the SAME mechanism as any other
/// reaction (❤️/😀/😕) — trub rides the existing emoji-quality system rather than a bespoke
/// designation door. Corrected 2026-07-14: an earlier pass on this file wrongly proposed a
/// standalone Q_TRUB designation quality — Hallie's charter comment on REACTION_PALETTE
/// (cardview.ts:227-228) already says "hearts and smileys and frowny faces on events to
/// qualify my feelings about them... this becomes how we track trub" — q-feel is the door.
pub const FROWNY_REACTION: &str = "😕";

/// isTrubExplicit: someone (any frame — reactions are public, per REACTION_PALETTE's "allow
/// OTHERS to too") has laid a 😕 q-feel reaction onto this beat. Named "explicit" because a
/// DERIVED half (any open, past-due beat is trub too, per Hallie 2026-07-14: "Any event
/// that's not taken up is honestly trub in some form itself") is a separate, not-yet-built
/// predicate — it needs a real "moment has passed" primitive this codebase doesn't have yet
/// (no beat-to-wall-clock-day comparison exists anywhere; asOf/visibleAt compare witnessed-
/// clock reads, not a beat's own due-moment). Do not conflate the two: this function alone is
/// NOT "is trub" in the full sense Hallie asked for.
///
/// NOT YET WIRED (2026-07-14): zero callers today, in either lib.rs or society.ts. Landed as a
/// verified-correct read, not as a shipped feature — a card-facing "this is trub" affordance
/// still needs to call this (and eventually OR it with the derived half once that primitive
/// exists) before it does anything a user sees.
pub fn is_trub_explicit(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    prehensions_onto(soc, row, "q-feel", as_of)
        .iter()
        .any(|p| !is_occluded(soc, &p.slug, as_of) && p.content == FROWNY_REACTION)
}

/// The shared quality-read: does any un-occluded prehension onto `row` carry `quality`?
/// Factored out of `is_trub_log` (Hallie's socratic, 2026-07-24) so each new
/// designated quality is one call, not one more hand-rolled loop.
pub fn bears_quality(soc: &Society, row: &str, quality: &str, as_of: Option<u64>) -> bool {
    prehensions_onto(soc, row, quality, as_of)
        .iter()
        .any(|p| !is_occluded(soc, &p.slug, as_of))
}

/// The shared companion read: the subjects of every un-occluded `quality`
/// prehension onto `row` — "who reaches me this way".
pub fn quality_subjects_onto(soc: &Society, row: &str, quality: &str, as_of: Option<u64>) -> Vec<String> {
    prehensions_onto(soc, row, quality, as_of)
        .iter()
        .filter(|p| !is_occluded(soc, &p.slug, as_of))
        .filter_map(|p| p.subject.clone())
        .collect()
}

/// is_trub_log: true iff some un-occluded prehension onto `row` carries Q_FIXES.
/// Not the same channel as `is_trub_explicit` above — do not conflate.
pub fn is_trub_log(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    bears_quality(soc, row, Q_FIXES, as_of)
}

/// trub_hooks_of: the hooks (subjects) of every un-occluded Q_FIXES prehension onto `log`.
pub fn trub_hooks_of(soc: &Society, log: &str, as_of: Option<u64>) -> Vec<String> {
    quality_subjects_onto(soc, log, Q_FIXES, as_of)
}

/// is_answered: true iff some un-occluded prehension onto `row` carries Q_ANSWERS.
/// The socratic-closure read (ruling 2026-07-24): an answered socratic is
/// de-facto done. `answers_of` names the answering events.
pub fn is_answered(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    bears_quality(soc, row, Q_ANSWERS, as_of)
}

/// answer_closes: the done-composing form of `is_answered`, with the KOAN
/// EXCEPTION (Hallie, 2026-07-24): an answered SUBLIME stays open. A koan
/// receives its answer without closing — mu redirects, it does not resolve.
/// A sublime never closes; this read is where that law meets Q_ANSWERS.
///
/// Takes `as_of` and NOT `frame`, on purpose. Those are two different axes
/// (2026-07-24 sitting): `as_of` is the REVISION standpoint — which version of
/// the canon — and `frame` is the POSITION standpoint, whose Now cuts what.
/// Whether someone answered is a fact about the graph, true from anywhere.
/// Done-by-reachability is the frame-relative read, and it lives in done_at.
pub fn answer_closes(soc: &Society, row: &str, as_of: Option<u64>) -> bool {
    is_answered(soc, row, as_of) && !poles::is_sublime_pole(soc, row, as_of)
}

/// answers_of: the answering events (subjects) of every un-occluded Q_ANSWERS
/// prehension onto `row`.
pub fn answers_of(soc: &Society, row: &str, as_of: Option<u64>) -> Vec<String> {
    quality_subjects_onto(soc, row, Q_ANSWERS, as_of)
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
///
/// OCCLUSION (2026-07-16, TODO(socratic) answered): an occluded edge does not carry the walk
/// — same discipline prehensions_onto/is_occluded already hold. Filtered in the same prepass
/// that excludes quality machinery, so the fwd/bwd adjacency never reaches through a shadowed
/// membership edge. Mirrors society.ts's intervalContext fix; conformance twin:
/// interval-occlusion.json (replayed by both suites).
pub fn interval_of(soc: &Society, once: &str, end: &str) -> Vec<String> {
    interval_of_with(soc, &interval_context(soc, None), once, end)
}

// The hoist is a claim about HOW MANY TIMES the prepass runs, so a test must be able to
// count it. A timing test would flake; this cannot.
#[cfg(test)]
thread_local! {
    static INTERVAL_CONTEXT_BUILDS: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
}

#[cfg(test)]
pub fn interval_context_builds_reset() {
    INTERVAL_CONTEXT_BUILDS.with(|c| c.set(0));
}

#[cfg(test)]
pub fn interval_context_builds() -> usize {
    INTERVAL_CONTEXT_BUILDS.with(|c| c.get())
}

/// IntervalContext: interval_of's plain-edge prepasses, hoisted so a caller doing many
/// interval reads over ONE unchanged Society builds them once. The board's cold rebuild
/// read 81 intervals per paint and rebuilt this identically 81 times — 99.6% of the paint.
///
/// Owned `String`s, not borrows: the wasm crate cannot carry a lifetime, and `reach`
/// already allocates per node, so a borrow buys nothing.
///
/// Mirrors `IntervalContext` in society.ts, which hoisted the same prepasses first.
pub struct IntervalContext {
    /// The `rev` of the Society this was derived from. A context is valid ONLY for that
    /// exact state; `interval_of_with` checks this rather than trusting the caller. Private
    /// so no caller can forge one — the only way to get a context is `interval_context`.
    derived_from_rev: u64,
    as_of: Option<u64>,
    fwd_adj: std::collections::HashMap<String, Vec<String>>,
    bwd_adj: std::collections::HashMap<String, Vec<String>>,
}

/// Build the IntervalContext for `soc` — identical to what `interval_of` builds internally.
pub fn interval_context(soc: &Society, as_of: Option<u64>) -> IntervalContext {
    #[cfg(test)]
    INTERVAL_CONTEXT_BUILDS.with(|c| c.set(c.get() + 1));
    let quality_tokens: std::collections::HashSet<&str> = soc
        .all()
        .filter(|b| b.slug.ends_with("~q") && visible_at(b, as_of))
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
                && visible_at(b, as_of)
                && !is_occluded(soc, &b.slug, as_of)
        })
        .collect();

    // Adjacency maps over the filtered plain edges, built once (was: the reach walk re-scanned
    // the whole edge list per stack node — O(V·E), the distance_to_hea half of the load-time
    // murder). Same edges, same steps: fwd walks subject→object, bwd the reverse.
    // TODO(socratic): fwd=true walks forward (subject→object), fwd=false walks backward (object→subject) — but does "forward-reachable from once" mean subject→object or object→subject, and which direction is the story's "natural" flow?
    // ANSWERED(walk 2026-07-02): fwd steps subject→object, bwd the reverse; the interval is the fwd(once) ∩ bwd(end) intersection, so the read is order-free set reachability between the poles — the poles ARE the story, the interior is read, never stored. — see event-is-the-bounding-sphere.md (R3)
    //
    // END-SUBJECT MEMBERSHIP (2026-07-20): membership/charge edges run subject=End,
    // object=event — physically out of the End, but the event is still BETWEEN the poles,
    // so a backward walk from `end` must step through it. Mirroring into bwd_adj under the
    // End's OWN slug is what makes that step exist. Per-edge here, not precomputed:
    // edges_onto_object indexes this (see Society.by_object) — society.ts precomputes an
    // endPoles set because its isDesignatedEndPole is a full scan. Same result, different
    // cost model. Fixture: conformance/end-subject-membership.json.
    let mut fwd_adj: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    let mut bwd_adj: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    for e in &edges {
        let (s, o) = (e.subject.as_deref().unwrap(), e.object.as_deref().unwrap());
        fwd_adj.entry(s.to_string()).or_default().push(o.to_string());
        bwd_adj.entry(o.to_string()).or_default().push(s.to_string());
        if is_designated_end_pole(soc, s, as_of) {
            bwd_adj.entry(s.to_string()).or_default().push(o.to_string());
        }
    }
    IntervalContext { derived_from_rev: soc.rev(), as_of, fwd_adj, bwd_adj }
}

fn reach(adj: &std::collections::HashMap<String, Vec<String>>, from: &str) -> std::collections::HashSet<String> {
    let mut seen = std::collections::HashSet::new();
    seen.insert(from.to_string());
    let mut stack = vec![from.to_string()];
    while let Some(n) = stack.pop() {
        for next in adj.get(n.as_str()).into_iter().flatten() {
            // TODO(socratic): seen.insert() returns false if `next` was already in the set — so the stack skips revisiting; is the reachability graph acyclic, or does loop-avoidance silently hide cycles?
            if seen.insert(next.to_string()) {
                stack.push(next.to_string());
            }
        }
    }
    seen
}

/// Read one interval against a prebuilt context. A stale context is a caller bug, so it
/// fails loudly in debug — and is silently, safely corrected in release, because a wrong
/// interval is worse than a slow one. The rebuild terminates: the fresh context carries
/// `soc.rev()` by construction.
pub fn interval_of_with(soc: &Society, ctx: &IntervalContext, once: &str, end: &str) -> Vec<String> {
    debug_assert_eq!(
        ctx.derived_from_rev,
        soc.rev(),
        "IntervalContext built at rev {} used against rev {} — its adjacency and occlusion are \
         frozen at build time, so this would read a moment that no longer exists. \
         Fix: rebuild with interval_context(soc, as_of).",
        ctx.derived_from_rev,
        soc.rev()
    );
    if ctx.derived_from_rev != soc.rev() {
        return interval_of_with(soc, &interval_context(soc, ctx.as_of), once, end);
    }
    let fwd = reach(&ctx.fwd_adj, once);
    let bwd = reach(&ctx.bwd_adj, end);
    // TODO(socratic): intersection of forward-reachable and backward-reachable sets gives the interval — but is this symmetric, or could a beat be reachable fwd from `once` but not bwd from `end` (unreachable end), and should the interval include `once` and `end` themselves?
    // ANSWERED(walk 2026-07-02): a beat reachable from once but not reaching end lies outside the sphere — betweenness IS the intersection, by design. Both seed sets include their own start, so the poles appear here; readers that want only the interior (canon_of) filter them out — poles are boundary, interior is read. — see event-is-the-bounding-sphere.md (R3)
    fwd.into_iter().filter(|n| bwd.contains(n)).collect()
}

/// end_of: the story's End-pole — the object of its Q_END_POLE designation (laid by the
/// lazy three-pole unpack), structurally; no spelling is read (F-A ruling + pole law,
/// 2026-07-06; q-lure is dead — see the lay_p guard). Mirrors `endOf` in society.ts.
// TODO(socratic): find() returns the first match in an unordered map — what defines "first", and if two pole designations match (reopened differentials), should end_of pick one deterministically or error?
pub fn end_of(soc: &Society, story: &str) -> Option<String> {
    soc.edges_from_subject(story)
        .find(|b| prehends_as(soc, &b.slug, Q_END_POLE, None))
        .and_then(|b| b.object.clone())
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
        // the arms live in grounding_edges_from (its own doc)
        let closings: Vec<EventRow> = grounding_edges_from(soc, end, as_of)
            .into_iter()
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

#[cfg(test)]
mod q_settles_tripwire {
    use super::*;

    /// TRIPWIRE, not a blessing: pins that `lay_p`'s sublime-never-closes guard does not
    /// count Q_SETTLES as a closing. Q_SETTLES IS live elsewhere — `unsettled_blocking_edges`
    /// reads it and the close door refuses on it; this guard is the part still unwired.
    #[test]
    fn q_settles_is_not_a_closing_for_the_sublime_guard() {
        let mut soc = Society::new();
        soc.lay(EventRow::node("star", "a sublime"));
        soc.lay(EventRow::node("now", "a now"));
        soc.lay_p("star~pole~star", "designate", "star", "star", Q_SUBLIME_POLE)
            .unwrap();
        assert!(is_sublime_pole(&soc, "star", None));
        let landed = soc.lay_p("star~settles~now", "close?", "star", "now", Q_SETTLES);
        assert!(
            landed.is_ok(),
            "the guard now refuses Q_SETTLES — the fence is crossed; re-point this \
             tripwire at the refusal and verify done_to_frame first"
        );
    }
}

#[cfg(test)]
mod address_law {
    use super::*;

    /// Unpack a story the way `open_story` does, without depending on gen4-policy.
    fn story(soc: &mut Society, name: &str) -> (String, String) {
        let end = format!("hea-{name}");
        let now = poles::story_now(name);
        soc.lay(EventRow::node(name, name));
        soc.lay(EventRow::node(&end, "the End"));
        soc.lay(EventRow::node(&now, "the Now"));
        soc.lay_p(&format!("{name}~end-pole~{end}"), "designate", name, &end, Q_END_POLE).unwrap();
        soc.lay_p(&format!("{name}~now-pole~{now}"), "designate", name, &now, Q_NOW_POLE).unwrap();
        (end, now)
    }

    /// The stale prose said an open End "receives ONLY charge-prehensions (bare edges) ONTO
    /// it." Post-2026-07-20 charges LEAVE the End, so an edge onto one is simply inert —
    /// this is what made deleting that sentence safe.
    #[test]
    fn a_bare_edge_onto_an_end_is_inert() {
        let mut soc = Society::new();
        let (end, _) = story(&mut soc, "s");
        soc.lay(EventRow::node("c", "a comment"));

        assert!(soc.lay(EventRow::edge("c~bare~end", "onto", "c", &end)));
        assert!(!end_actual(&soc, &end, None), "an edge onto an End never closes it");
        assert!(charges_on(&soc, &end, None).is_empty(), "charges leave the End, never land on it");
    }

    /// THE LAW `lay_bare_p` EXISTS FOR. `lay` cannot hold it — canon replay goes through it.
    #[test]
    fn exactly_one_closing_leaves_a_pole() {
        let mut soc = Society::new();
        let (end, now) = story(&mut soc, "s");
        let (_, other_now) = story(&mut soc, "other");

        assert!(soc.lay_bare_p(&format!("{end}~because~{now}"), "closing", &end, &now).unwrap());
        assert!(end_actual(&soc, &end, None));

        let second = soc.lay_bare_p("second~closing", "closing", &end, &other_now);
        assert!(second.is_err(), "a second closing must be refused");
        assert!(second.unwrap_err().contains("one-closing"), "and must name the law");
    }

    /// Idempotence is the kernel's character — `lay` is inert on a known slug. The guard
    /// refuses a second DIFFERENT closing, never a re-lay of the standing one.
    #[test]
    fn re_laying_the_same_closing_stays_inert_not_refused() {
        let mut soc = Society::new();
        let (end, now) = story(&mut soc, "s");
        let slug = format!("{end}~because~{now}");

        assert!(soc.lay_bare_p(&slug, "closing", &end, &now).unwrap());
        assert_eq!(
            soc.lay_bare_p(&slug, "closing", &end, &now),
            Ok(false),
            "the same closing re-laid is inert, not a violation"
        );
    }

    /// A charge is the closing's shape minus now-pole-hood on the object. It must stay free.
    #[test]
    fn a_charge_out_of_a_closed_end_is_still_allowed() {
        let mut soc = Society::new();
        let (end, now) = story(&mut soc, "s");
        soc.lay(EventRow::node("captured", "a beat the End prehends"));
        soc.lay_bare_p(&format!("{end}~because~{now}"), "closing", &end, &now).unwrap();

        assert!(soc.lay_bare_p("chg", "charge", &end, "captured").unwrap());
        assert_eq!(charges_on(&soc, &end, None).len(), 1);
    }

    /// Every refusal is an `Err`. A panic under the shared write lock poisons it for every
    /// later caller — twice paid for (2026-07-07, 2026-07-21).
    #[test]
    fn no_guard_in_lay_p_ever_panics() {
        let mut soc = Society::new();
        let (end, _) = story(&mut soc, "s");
        soc.lay(EventRow::node("x", "x"));

        assert!(soc.lay_p("l", "lure", "x", "s", "q-lure").is_err(), "dead grammar refuses");
        assert!(soc.lay_p("a", "onto", "x", &end, Q_COMMENT).is_err(), "address law refuses");
    }
}

#[cfg(test)]
mod interval_hoist {
    use super::*;
    use std::collections::HashSet;

    /// Two stories sharing a canon, so the hoisted context serves several reads.
    fn canon() -> (Society, Vec<(String, String)>) {
        let mut soc = Society::new();
        for (story, end) in [("s1", "s1-end"), ("s2", "s2-end")] {
            soc.lay(EventRow::node(story, story));
            soc.lay(EventRow::node(end, end));
            let tag = format!("{story}-pole");
            soc.lay(EventRow::edge(&tag, "pole", story, end));
            soc.lay(EventRow::edge(&format!("{tag}~q"), "[q-end-pole]", &tag, Q_END_POLE));
        }
        for i in 0..12 {
            let ev = format!("ev{i}");
            soc.lay(EventRow::node(&ev, &ev));
            let story = if i % 2 == 0 { "s1" } else { "s2" };
            let m = format!("m{i}");
            soc.lay(EventRow::edge(&m, "membership", story, &ev));
            soc.lay(EventRow::edge(&format!("{m}~q"), "[q-grounding]", &m, Q_GROUNDING));
            // the End prehends the capture (2026-07-20) — subject=End, object=event.
            let end = if i % 2 == 0 { "s1-end" } else { "s2-end" };
            soc.lay(EventRow::edge(&format!("cap{i}"), "capture", end, &ev));
        }
        let pairs = vec![
            ("s1".to_string(), "s1-end".to_string()),
            ("s2".to_string(), "s2-end".to_string()),
        ];
        (soc, pairs)
    }

    /// The hoist must not change a single read. Compared as SETS, both sides: the interval
    /// is collected from a HashSet, so Vec order was never a promise and an assert_eq! on
    /// Vec would flake.
    #[test]
    fn hoisted_reads_match_the_unhoisted_ones_exactly() {
        let (soc, pairs) = canon();
        let ctx = interval_context(&soc, None);
        for (once, end) in &pairs {
            let plain: HashSet<String> = interval_of(&soc, once, end).into_iter().collect();
            let hoisted: HashSet<String> =
                interval_of_with(&soc, &ctx, once, end).into_iter().collect();
            assert_eq!(plain, hoisted, "hoisted read diverged for {once}..{end}");
            assert!(!plain.is_empty(), "fixture is inert — it would prove nothing");
        }
    }

    /// The point of the hoist, asserted structurally rather than by a stopwatch.
    #[test]
    fn many_reads_build_the_prepass_once() {
        let (soc, pairs) = canon();
        let ctx = interval_context(&soc, None);

        interval_context_builds_reset();
        for (once, end) in &pairs {
            interval_of_with(&soc, &ctx, once, end);
        }
        assert_eq!(interval_context_builds(), 0, "a hoisted read rebuilt the prepass");

        interval_context_builds_reset();
        for (once, end) in &pairs {
            interval_of(&soc, once, end);
        }
        assert_eq!(
            interval_context_builds(),
            pairs.len(),
            "the un-hoisted path should still build one prepass per read"
        );
    }

    /// The staleness fallback is a real correction, not just a debug_assert. In release the
    /// context silently rebuilds; this pins that the ANSWER is right either way.
    #[test]
    fn a_stale_context_still_reads_correctly() {
        let (mut soc, _) = canon();
        let stale = interval_context(&soc, None);
        soc.lay(EventRow::node("ev-late", "a beat laid after the context"));
        soc.lay(EventRow::edge("cap-late", "capture", "s1-end", "ev-late"));

        let fresh: HashSet<String> = interval_of(&soc, "s1", "s1-end").into_iter().collect();
        assert!(fresh.contains("ev-late"), "the fresh read should see the new beat");

        if cfg!(not(debug_assertions)) {
            let recovered: HashSet<String> =
                interval_of_with(&soc, &stale, "s1", "s1-end").into_iter().collect();
            assert_eq!(recovered, fresh, "the stale context did not safely rebuild");
        }
    }
}
