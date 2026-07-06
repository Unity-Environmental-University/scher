// ─────────────────────────────────────────────────────────────────────────────
// edge_word — the gen4 edge grammar. ONE verb: `because`.
//
//   a be(qualities)cause b
//
// `a`  — the origin / seat (the left name).
// `be(…)cause` — THE verb, infixed with its qualities (tmesis). The ONLY verb.
//   `a`, because `b`: a backward read of the perished datum `b` that `a` rests on. There
//   is no forward verb — the system only ever holds perished data; what looks like a
//   forward lure is the causal chain read backward. (`prehends` was the false-tense verb;
//   it is not in this grammar.)
// `(qualities)` — a GROUP, infixed into the verb. `+`-joined. The MODE of the because-ing.
//   `grounds`/`holds`/… are qualities here, not edge-types — the relation is invariant,
//   only its mode varies. The bare form `a because b` has no qualities (no parens).
// `b`  — the ground `a` rests on.
//
// This module is PURE: a string ⇄ struct grammar with a proved inverse. It does not touch
// Society, does not read the log, stores nothing. The point is to STOP reading meaning by
// `format!("{slug}~q")` + slug-search (the gen3 stub) and read it by PARSING instead.
//
// Delimiters (`be(`, `)cause`, `+`) are all illegal in a kebab slug (`[a-z0-9-]`), so they
// never collide with a name. An empty quality list renders as the bare `a because b`.
// ─────────────────────────────────────────────────────────────────────────────

/// A parsed edge-word. `a` and `b` are bare names (slugs); `qualities` is the infixed mode
/// group, possibly empty (the bare prehension). Order of qualities is preserved by the
/// grammar (render/parse round-trip), though readers may treat it as a set.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EdgeWord {
    pub a: String,
    pub qualities: Vec<String>,
    pub b: String,
}

const OPEN: &str = "be(";
const CLOSE: &str = ")cause";
const BARE: &str = " because ";
const QSEP: char = '+';

impl EdgeWord {
    pub fn bare(a: &str, b: &str) -> Self {
        EdgeWord { a: a.into(), qualities: vec![], b: b.into() }
    }

    pub fn with(a: &str, qualities: &[&str], b: &str) -> Self {
        EdgeWord {
            a: a.into(),
            qualities: qualities.iter().map(|q| q.to_string()).collect(),
            b: b.into(),
        }
    }

    /// A name is well-formed iff it carries none of the grammar's delimiters — so a render
    /// can never be ambiguous to parse. (Slugs are kebab; this just makes the law explicit.)
    fn name_ok(s: &str) -> bool {
        !s.is_empty()
            && !s.contains(OPEN)
            && !s.contains(CLOSE)
            && !s.contains(QSEP)
            && !s.contains(" because ")
            && s.trim() == s
    }

    fn quality_ok(q: &str) -> bool {
        !q.is_empty() && !q.contains(QSEP) && !q.contains(OPEN) && !q.contains(CLOSE) && q.trim() == q
    }

    /// True iff this struct can be rendered to a string that parses back to it.
    pub fn is_renderable(&self) -> bool {
        Self::name_ok(&self.a)
            && Self::name_ok(&self.b)
            && self.qualities.iter().all(|q| Self::quality_ok(q))
    }

    /// Render to the canonical string form. Returns None if any field carries a delimiter
    /// (which would make the result un-parseable). Total over all *renderable* edges.
    pub fn render(&self) -> Option<String> {
        if !self.is_renderable() {
            return None;
        }
        if self.qualities.is_empty() {
            Some(format!("{}{}{}", self.a, BARE, self.b))
        } else {
            let mid = self.qualities.join(&QSEP.to_string());
            Some(format!("{}{}{}{}{}", self.a, OPEN, mid, CLOSE, self.b))
        }
    }

    /// Parse the canonical string form. None if the string is not a well-formed edge-word.
    pub fn parse(s: &str) -> Option<EdgeWord> {
        // qualified form: a be( quals )cause b
        if let Some(open_at) = s.find(OPEN) {
            let a = &s[..open_at];
            let rest = &s[open_at + OPEN.len()..];
            let close_at = rest.find(CLOSE)?;
            let mid = &rest[..close_at];
            let b = &rest[close_at + CLOSE.len()..];
            let qualities: Vec<String> = mid.split(QSEP).map(|q| q.to_string()).collect();
            let e = EdgeWord { a: a.to_string(), qualities, b: b.to_string() };
            // re-validate: every part well-formed, and the qualities non-empty (an empty
            // infix would mean someone wrote `be()cause`, which is NOT the bare form).
            if e.is_renderable() && !e.qualities.is_empty() {
                return Some(e);
            }
            return None;
        }
        // bare form: a because b
        if let Some(at) = s.find(BARE) {
            let a = &s[..at];
            let b = &s[at + BARE.len()..];
            let e = EdgeWord::bare(a, b);
            if e.is_renderable() {
                return Some(e);
            }
        }
        None
    }
}

// ── the bridge: read the live Society AS because-edges ────────────────────────────
// This is what makes the grammar ALIVE rather than shelf-proved. The backing store is
// still the gen3 `~q` shape (`a ~grounds~ b` + `{edge}~q → q-grounding`); rather than
// migrate destructively, we READ those relations and re-express each as a canonical
// `because` EdgeWord — rendering it to the slug-word and parsing it back, so the value a
// caller gets has provably round-tripped through the parser. The day the canon is laid in
// `because` form directly, this bridge's RENDER step becomes the identity and only the
// quality-name mapping (grounds→[], holds→[], depends-on/occludes kept) remains.
use crate::{prehensions_from, Society, Q_DEPENDS_ON, Q_EXCLUSION, Q_GROUNDING, Q_OCCLUDES};

/// Map a stored gen3 quality to its gen4 because-flavor — the PLAIN-MOUTH words (no SAT
/// words). `grounding`/`holds` were rulings-to-DIE (bare `because` / betweenness) → no
/// morpheme. Three survivors, three small true verbs:
///   `needs`   — but-for / necessary causation ("a, because a NEEDS b"). (was depends-on)
///   `hides`   — active removal toward V=0: b WAS in play, taken out, recallable from behind
///               the veil ("the old plan, because the new one HIDES it"). (was occludes)
///   `ignores` — negative prehension: b was NEVER admitted, held out from the start (the
///               master-negative). distinct from `hides` — was-here-removed vs never-let-in.
///               (was exclusion)
///               HALLIE ASKS: How might we make this not string literals buried in the code?
//
// REPLY (the sitting, 2026-07-06): a real fork, not a dominant fix — fenced below rather than
// changed. `gen4_quality` is 4 lines mapping Rust consts (the actual load-bearing grammar,
// already type-checked) to 4 human-facing gloss words. Ecosystem precedent exists both ways:
// lingit's prototype moved its lexicon AND grammar to `grammar.xml`, ingested fail-closed at
// startup — but lingit's file is genuinely large and reviewed as a linguistic artifact, not a
// 4-entry table. scher's own contraction seam (the consumer-owned registry pattern) shows the
// ecosystem is comfortable pushing vocabulary out of code when a consumer owns and can review
// it independently — but no such registry exists yet in this repo for edge-word glosses; we
// checked (grep for "registry"/"contraction" across scher-core and the TS side: no hits).
//
// Option A — keep as code literals (status quo). Cost: "buried in code," a PR to add a word.
//   Gain: the compiler's exhaustiveness check catches a missing/typo'd mapping for free; zero
//   new machinery; these are static forever unless the *grammar itself* changes, which is a
//   Rust-level event anyway (a new Q_* const).
// Option B — externalize to a data file (lingit-style), ingested fail-closed at startup.
//   Cost: real machinery (a loader, a fail-closed startup gate, a versioning story) for 4
//   entries; loses compile-time exhaustiveness — a missing gloss becomes a runtime gap, not a
//   compile error. Gain: a non-Rust-writing collaborator could edit vocabulary without a PR
//   touching .rs files; matches the lingit precedent if this vocabulary is expected to grow
//   past "4 words, rarely."
// Neither is mechanically dominant — it depends on who else needs to touch this vocabulary and
// how fast it grows. FENCED TO HALLIE: do you expect edge-word gloss words to be edited by
// non-Rust collaborators, or to grow past a handful, the way lingit's lexicon did? If yes,
// Option B (data-driven, fail-closed) earns its machinery. If no — these 4 words track the 4
// Q_* consts and change exactly when the consts do — Option A stays honest as-is.
fn gen4_quality(stored: &str) -> Option<&'static str> {
    match stored {
        Q_GROUNDING => None,              // = bare `because`; the relation, not a mode
        Q_DEPENDS_ON => Some("needs"),    // but-for / necessary
        Q_OCCLUDES => Some("hides"),      // negative — was here, removed (recallable)
        Q_EXCLUSION => Some("ignores"),   // negative — never admitted (the master-negative)
        _ => None,
    }
}


// HALLIE ASKS: The Grammar check is unasked for here. The loud fail is good, why are we doing it
// here? This feels like a validation function -- which is good, but does it belong in this
// function? It's not obvious to me that 'because edges from' should would with the slugs? Why are
// we mixing string ops and graph ops?
//
// REPLY (the sitting, 2026-07-06): you're right, on both counts, and this one's the mechanically
// dominant fix — done below, not fenced. Verified against the code: the render→parse round-trip
// this function did per-edge is a pure grammar self-test (do `a`/`b`/quality strings carry the
// grammar's own delimiters?) that can only ever fail on a malformed slug — a bug elsewhere, not
// a fact about the graph. And it failed SILENTLY (a bare `continue`-shaped skip, no signal) —
// which is the opposite of this module's own "loud fail is good" boast a few lines down (that
// pride belongs to `find_poles`'s pole-count checks, not to this function). So: string-shaped
// validation was living inside a graph-shaped read, quietly swallowing what should have been a
// loud bug. Grepped every caller (`find_poles` here, plus scher-core's conformance tests) — none
// relies on silent-skip-of-malformed-edges as a feature; all just want "the current, valid
// `because` edges." Fix: build the EdgeWord directly from already-trusted internal parts (the
// Society's own slugs, `gen4_quality`'s own static strs) and keep the grammar self-proof as a
// `debug_assert` tripwire — loud in debug, and gone from the hot path, because parse↔render
// fidelity is `EdgeWord`'s own proof to make (it already has proptest for exactly this), not
// something a Society-read should re-prove per call.

/// Every relation `a` is `because` of, read from the live Society and re-expressed as a
/// canonical EdgeWord. The bridge from the `~q` store to the `because` grammar.
/// `a~be(quality)cause~b`, qualities folded per the gen4 rulings. Internal slugs and gloss
/// words are trusted by construction (see `EdgeWord`'s own round-trip proptests for the
/// grammar's self-proof); a debug build will panic loudly if that trust is ever broken.
pub fn because_edges_from(soc: &Society, a: &str) -> Vec<EdgeWord> {
    // a beat is `because` of b for each grounding/depends-on/exclusion it carries toward b.
    let mut out = Vec::new();
    for quality in [Q_GROUNDING, Q_DEPENDS_ON, Q_OCCLUDES, Q_EXCLUSION] {
        for p in prehensions_from(soc, a, quality, None) {
            let Some(b) = p.object.as_deref() else { continue };
            let q = gen4_quality(quality);
            let built = match q {
                Some(qn) => EdgeWord::with(a, &[qn], b),
                None => EdgeWord::bare(a, b),
            };
            debug_assert!(
                built.render().is_some(),
                "malformed because-edge built from trusted parts: {a} / {q:?} / {b}"
            );
            out.push(built);
        }
    }
    out
}

// ── the two-pole law (topology is truth, config is a check) ──────────────────────
// In `a ~because~ b`, `a` rests on `b` (`b` is the ground). A well-formed canon has TWO
// asymptotes, both READ from topology, never declared by an edge:
//   • the END   — the beat that rests on things but NOTHING rests on it: appears as some
//                 edge's `a`, never as any edge's `b`. Nothing is because-of it. The HEA,
//                 V=0, the unspeakable (the-hea-is-the-unspeakable). "because-of nothing
//                 further up."
//   • the SOURCE — the beat that everything rests on but rests on NOTHING itself: appears
//                 as some edge's `b`, never as any edge's `a`. It is because-of nothing —
//                 the spark with nothing behind it. The Once.
// The canon's closing edge `HEA ~because~ Once` makes this concrete: HEA is an `a` (rests on
// Once), Once is a `b` (nothing behind it). EXACTLY ONE of each pole; each checked against the
// config's expected name. Zero or many of a pole = malformed, loud. Config catches drift;
// topology is truth — this code never hardcodes WHICH slug is which pole, it READS them.


// TODO: I thinjk we really do want a Now pole as well.
//
// REPLY (the sitting, 2026-07-06): already sat on jointly by scher and penelope-gen4
// (2026-07-03, "Now as the third pole" + the q-grounding joint sitting), and the prior sittings
// answer this note directly rather than leave it open. The ruling that closed it: **Now is NOT
// a third structural pole of `Poles` here.** It is a reader-position, not a topology-fact.
// Once/End are properties of the CANON itself, read once, independent of who's asking (exactly
// what `find_poles` computes: no edge's `b` / no edge's `a`). Now is properties of a READ: it
// answers "done, as seen from HERE" and differs per frame/reader — the prior sitting's own
// words: "Now belongs to the READING event, not the read target... frame-relativity comes from
// *which* Now you read *from*." Concretely: Now is a lazily-minted ordinary node (`now-{frame}`),
// positioned by ordinary because-edges like anything else, read by BFS reachability
// (`done_to`/`done_to_frame` in gen4-policy) — never a field on `Poles`, never a third variant
// of `Pole`. Adding a `Poles::now` here would in fact be the ONE thing the prior sitting's
// holdout H2 explicitly refuses: "if 'Now' is later read to mean every event *stores* its own
// Now as row structure... the kernel light refuses that outright... never a property of the
// event." So: not a fork, already ruled — `find_poles`/`Poles` stay two-pole, unchanged. If this
// note was you confirming that direction rather than reopening it, the sittings agree with you.
// (Full record: penelope-gen4/docs/committees/2026-07-03-now-as-third-pole.md and
// 2026-07-03-q-grounding-joint-sitting.md — ruling "YES EVERY EVENT IS DONE to/by its author.")
//
// RE-EXAMINED UNDER SOFD (the sitting, later the same day, 2026-07-06): this morning's ruling
// (Story's Own Frame Default + F-A/voltage — penelope-gen4 2026-07-06-F-A-ruled-voltage.md)
// changes the reading above — your instinct here is topologically VINDICATED, not answered-away.
// Under SOFD every story has its own frame, and frames mint Nows (the now-{frame} lazy-mint
// pattern). And a Now beat is END-SHAPED to `find_poles` as written: a Now lays
// `now ~because~ event` — always an `a`, never a `b`, nothing rests on it — which is the SAME
// one-hop signature as the HEA. A story-Now swept into the candidate set would read as a
// spurious second End (Pole::Many — a FALSE loud fail). The quality info that could tell them
// apart is folded away (Q_GROUNDING → bare `because`) before the topology pass ever sees it.
// So the topology really will contain a third pole-shaped position, and this function cannot
// currently tell it from the End. Still not a STORED pole (H2 stands) — but the two honest
// shapes are fenced to you in the minutes (2026-07-06-hallies-notes-and-plain-language.md,
// SOFD section): (i) a stated contract keeping Now beats out of `content` (now written into
// find_poles' doc below), or (ii) `Poles` grows a READ `now` field, distinguished by the
// structural End-designation F-A landed (End = the pole with a q-end-pole designation onto
// it; Now = the pole without; re-worded at merge per the 2026-07-06 q-lure kill — the lure
// VERB is dead, the designation is the mark). The body leans (ii); it grows the kernel's
// pole law, so it is yours.
//
// ADDENDUM (formal sitting under quaker-process-for-agents, same day): two scoping facts for
// the choice above. First, F-A's voltage does NOT need (ii) — voltage reads across Once/End
// plus done-status ("done closes the circuit" = the End becoming actual, a topology change),
// so don't pick (ii) on voltage's account. Second, (ii) buys what (i) can't at any price:
// today NO Now is cold-legible — even a user-frame's Now is found only via the `now-{frame}`
// slug convention (policy, not topology). (ii) would make a story's Now readable from edge
// data alone, the way you can already read its ends. Full sense, holdouts, and the exact
// fenced question: the SOFD sections of 2026-07-06-hallies-notes-and-plain-language.md.
//
// RULED (Hallie, mid-sitting, 2026-07-06, verbatim): "1) is nonviable as they say. And the
// end is because now." The caller-contract option is dead — the pole law gets taught to the
// code — and the distinguishing mark is hers, structural: when a circuit closes, the End
// becoming actual grounds in the Now of its closing (the done-verb's lazy-mint laying
// `end ~because~ now`). THE POLE LAW, one sentence (re-worded at merge per the 2026-07-06
// q-lure kill — the sitting's original said "lure"; the luring verb is dead and the mark is
// the structural q-end-pole designation): Once = the ground of everything, resting on
// nothing (a `b`, never an `a`); End = the pole the q-end-pole designation lands on, which
// when actual is also because Now; Now = a left-side-only beat with no designation onto it —
// every mark read from topology, no string ever consulted. Two phases of one End, each
// marked: OPEN (unactualized) is designated by the q-end-pole designation alone; ACTUAL
// additionally rests on Now — and that closing edge is itself what un-confuses the two
// beats, because it makes the Now a ground (`b`), which a Now otherwise never is (proved in
// code: tests/conformance.rs::eikon_end_is_because_now_tells_now_from_end). Landed here:
// that conformance test. The F-A build body's machinery has since LANDED IN THIS LINE (the
// 2026-07-06 merge of penelope-gen4's scher submodule with this sitting's branch): the
// open-phase designation is Q_END_POLE (q-lure killed with fire — lib.rs's lay_p refuses
// it), so the designation visibility this note once waited on is present; the `Poles::now`
// read field remains open, fenced as before.

/// The two structural poles of a canon, read from `because` topology. Either pole can be
/// malformed independently.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Poles {
    pub end: Pole,    // nothing rests on it (no edge's `b`) — the HEA / V=0
    pub source: Pole, // it rests on nothing (no edge's `a`) — the Once
}

/// One pole's audit. `Found` = exactly one, matching config if given; everything else is a
/// malformed canon, named.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Pole {
    Found(String),
    None,                                         // no such pole — a cycle / no ground
    Many(Vec<String>),                            // plural — audit, perish the dead
    Mismatch { found: String, expected: String }, // one, but not the configured one — drift
}

fn classify(found: Vec<String>, expected: Option<&str>) -> Pole {
    match found.as_slice() {
        [] => Pole::None,
        [one] => match expected {
            Some(exp) if exp != one => Pole::Mismatch { found: one.clone(), expected: exp.to_string() },
            _ => Pole::Found(one.clone()),
        },
        many => Pole::Many(many.to_vec()),
    }
}

/// Read both poles from the live Society's `because` topology. `content` = the candidate
/// beats (edges and `~q` mode-beats are never a pole). `expected_end`/`expected_source` are
/// the config's names, checked but never overriding. Topology is truth.
///
/// CONTRACT (stated 2026-07-06, under the SOFD ruling): `content` must NOT include Now beats
/// (`now-{frame}` and kin). A Now is never a ground — the same one-hop signature as the End —
/// so a Now in the candidate set reads as a spurious second End (`Pole::Many`, a false loud
/// fail). RULED (Hallie, 2026-07-06): this caller contract is an INTERIM guard only — "1) is
/// nonviable as they say. And the end is because now." The pole law gets taught to this code:
/// an ACTUAL End also grounds in the Now of its closing (`end ~because~ now`), which makes
/// the Now a `b` and un-confuses it from the End by pure topology (see the pole-law comment
/// above `Poles` and tests/conformance.rs::eikon_end_is_because_now_tells_now_from_end);
/// the OPEN-End phase designation is Q_END_POLE (landed at the 2026-07-06 merge; q-lure is
/// dead — re-worded here at merge per that kill); the `Poles::now` read field remains open.
pub fn find_poles<'a, I>(
    soc: &Society,
    content: I,
    expected_end: Option<&str>,
    expected_source: Option<&str>,
) -> Poles
where
    I: IntoIterator<Item = &'a str>,
{
    //Hallie Curiosities: 1) whats the diff between /// and // in Rust? and WHAT is the pipe
    //syntax doing for rust that it chose to use it rather than do what other languages already
    //use for that purpose?
    //in rust do we know how that happened?
    //
    // REPLY (the sitting, 2026-07-06): this file didn't compile with `///` here — fixed to `//`
    // above, your words unchanged (verified: `cargo check` failed before the fix, green after).
    // Why: `///` is a DOC comment — it attaches to the *next item* (a fn, struct, const...) and
    // gets picked up by `rustdoc`. There's also `//!`, which attaches to the *enclosing* item
    // (used at the top of a file/module to document the module itself, like this file's own
    // banner comment up top uses plain `//` but could have used `//!`). Plain `//` is just a
    // comment — never collected into docs, attaches to nothing, can go anywhere, including here
    // (inside a function body, before a `let`, which is not an "item" `///` can attach to —
    // that's exactly why it broke the build).
    //
    // The pipe syntax `|args| body` for closures: yes, we know the lineage. Rust's early
    // designers (Graydon Hoare and the founding team) were explicit and vocal admirers of Ruby
    // and the ML family. Ruby's block syntax `{ |x| ... }` in turn borrowed its pipes from
    // Smalltalk's block syntax `[:x | ...]` — the pipe-delimited parameter list goes back that
    // far. Rust didn't pick `(x) => ...` (JS-style) or bare `\x -> ...` (Haskell-style) partly
    // because both would collide grammatically with things Rust already needed those characters
    // for: `()` is call/tuple syntax and `<>` is already generics' delimiter, so parens around
    // closure args would be ambiguous with a function call, and arrows/angle-brackets were
    // spoken for elsewhere in the grammar. Pipes were free, unambiguous, and already a familiar
    // shape from Ruby — a borrowed idiom that also happened to solve a real parsing problem.
    let candidates: Vec<String> = content.into_iter().map(|s| s.to_string()).collect();
    // one pass over the because-topology: collect every slug that ever appears as an `a`
    // (a resting-thing) and every slug that appears as a `b` (a ground).
    let mut is_resting: std::collections::HashSet<String> = std::collections::HashSet::new(); // an `a`
    let mut is_ground: std::collections::HashSet<String> = std::collections::HashSet::new();  // a `b`
    for a in &candidates {
        for e in because_edges_from(soc, a) {
            is_resting.insert(e.a);
            is_ground.insert(e.b);
        }
    }
    // END: nothing rests on it → never a `b`. SOURCE: rests on nothing → never an `a`.
    // (A lone, edgeless beat is BOTH never-a-b and never-an-a; it'd show in both pole lists.
    // That correctly reads as malformed — a beat with no because-chain is its own island.)
    let ends: Vec<String> = candidates.iter().filter(|c| !is_ground.contains(*c)).cloned().collect();
    let sources: Vec<String> = candidates.iter().filter(|c| !is_resting.contains(*c)).cloned().collect();
    Poles {
        end: classify(ends, expected_end),
        source: classify(sources, expected_source),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn bare_round_trips() {
        let e = EdgeWord::bare("the-card", "day-30");
        let s = e.render().unwrap();
        assert_eq!(s, "the-card because day-30");
        assert_eq!(EdgeWord::parse(&s), Some(e));
    }

    #[test]
    fn one_quality_round_trips() {
        let e = EdgeWord::with("the-card", &["holds"], "day-30");
        let s = e.render().unwrap();
        assert_eq!(s, "the-cardbe(holds)causeday-30");
        assert_eq!(EdgeWord::parse(&s), Some(e));
    }

    #[test]
    fn many_qualities_round_trip() {
        let e = EdgeWord::with("cosmos", &["grounding", "contested"], "migrate");
        let s = e.render().unwrap();
        assert_eq!(s, "cosmosbe(grounding+contested)causemigrate");
        assert_eq!(EdgeWord::parse(&s), Some(e));
    }

    #[test]
    fn empty_infix_is_not_the_bare_form() {
        // `be()cause` is malformed — the bare form is ` because `, not an empty infix.
        assert_eq!(EdgeWord::parse("abe()causeb"), None);
    }

    #[test]
    fn names_with_delimiters_dont_render() {
        assert!(EdgeWord::bare("a+b", "c").render().is_none());
        assert!(EdgeWord::bare("a because b", "c").render().is_none());
    }

    // ── the inverse law: parse(render(e)) == Some(e) for every renderable edge ──
    fn name_strategy() -> impl Strategy<Value = String> {
        "[a-z][a-z0-9-]{0,12}".prop_filter("kebab", |s| !s.ends_with('-'))
    }
    fn quality_strategy() -> impl Strategy<Value = String> {
        "[a-z][a-z0-9-]{0,10}".prop_filter("kebab", |s| !s.ends_with('-'))
    }

    proptest! {
        #[test]
        fn parse_render_is_inverse(
            a in name_strategy(),
            b in name_strategy(),
            quals in prop::collection::vec(quality_strategy(), 0..4),
        ) {
            let e = EdgeWord { a, qualities: quals, b };
            // every such e is renderable by construction (kebab names/quals carry no delimiters)
            let s = e.render().expect("kebab edge renders");
            prop_assert_eq!(EdgeWord::parse(&s), Some(e));
        }

        // render(parse(s)) == s for any string that parses (the other direction)
        #[test]
        fn render_parse_is_inverse(
            a in name_strategy(),
            b in name_strategy(),
            quals in prop::collection::vec(quality_strategy(), 0..4),
        ) {
            let e = EdgeWord { a, qualities: quals, b };
            let s = e.render().unwrap();
            let reparsed = EdgeWord::parse(&s).unwrap();
            prop_assert_eq!(reparsed.render().unwrap(), s);
        }
    }
}


//Final: Claude(s), this is really cool, thank yall for working on it. - Hallie
//
// REPLY (the sitting, 2026-07-06): received, and returned — this was a good sitting to hold.
// Thank you for leaving real questions instead of instructions; they made for a better file.
// — the meeting of scher
