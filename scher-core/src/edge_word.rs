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
    // TODO(socratic): why does `bare` take `&str` but hand into `String` — is the conversion here cheaper than at the callsite, or is this borrowing shape a boundary-marker for what counts as a "name"?
    pub fn bare(a: &str, b: &str) -> Self {
        EdgeWord { a: a.into(), qualities: vec![], b: b.into() }
    }

    // TODO(socratic): why borrow `&[&str]` and then clone each string in the map — could this be `Vec<String>` or `&[String]` at the callsite, or does the slice of refs reflect how qualities arrive in practice?
    pub fn with(a: &str, qualities: &[&str], b: &str) -> Self {
        EdgeWord {
            a: a.into(),
            qualities: qualities.iter().map(|q| q.to_string()).collect(),
            b: b.into(),
        }
    }

    /// A name is well-formed iff it carries none of the grammar's delimiters — so a render
    /// can never be ambiguous to parse. (Slugs are kebab; this just makes the law explicit.)
    // TODO(socratic): why check `s.trim() == s` at the boundary rather than trimming names on arrival — is whitespace-carrying a name an error to reject, or a shape that should never happen in practice?
    // ANSWERED(walk 2026-07-02): refuse, don't normalize — names are opaque kebab slugs; a whitespace-carrying name is malformed and the grammar refuses it loudly rather than silently rewriting it. — see walk plan §A (grammar facts) / scher CLAUDE.md
    fn name_ok(s: &str) -> bool {
        !s.is_empty()
            && !s.contains(OPEN)
            && !s.contains(CLOSE)
            && !s.contains(QSEP)
            && !s.contains(" because ")
            && s.trim() == s
    }

    // TODO(socratic): does `quality_ok` omit the ` because ` check that `name_ok` does because qualities will never appear alone as a slug, only in the mid infix?
    // ANSWERED(walk 2026-07-02): yes — a quality only ever lives inside the be(...)cause infix, never as a standalone slug, so the delimiters it must not carry are exactly QSEP/OPEN/CLOSE. — see walk plan §A (grammar facts)
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
        // TODO(socratic): why branch on is_empty rather than always format with joined qualities, letting an empty join render the bare form implicitly?
        // ANSWERED(walk 2026-07-02): an empty join would render "a be()cause b", a shape parse refuses (empty quality fails quality_ok) — the branch keeps parse∘render the identity; bare and qualified are distinct surface forms. — see walk plan §A (grammar facts)
        if self.qualities.is_empty() {
            Some(format!("{}{}{}", self.a, BARE, self.b))
        } else {
            // TODO(socratic): why convert `QSEP: char` to a string in the join, rather than iterate and push the char directly?
            let mid = self.qualities.join(&QSEP.to_string());
            Some(format!("{}{}{}{}{}", self.a, OPEN, mid, CLOSE, self.b))
        }
    }

    // TODO(socratic): scher's one discipline is "opaque slugs, no string-matching" — I read
    // meaning by parsing a string; is the proved inverse what makes me the lawful exception,
    // or am I the smuggling the grammar refuses, dressed in a proof?
    /// Parse the canonical string form. None if the string is not a well-formed edge-word.
    pub fn parse(s: &str) -> Option<EdgeWord> {
        // TODO(socratic): because the qualified branch runs first and REFUSES rather than
        // falling through, a string carrying both " because " and a later "be(" parses as
        // neither form — is hard-refusing that overlap the intent, or should the bare form
        // still get its chance?
        // qualified form: a be( quals )cause b
        if let Some(open_at) = s.find(OPEN) {
            let a = &s[..open_at];
            // TODO(socratic): why use the string slice indices directly rather than a regex or a structured parser — does the simplicity here encode a confidence that the delimiters are rare, or is it because any delimiter-carrying name is already ruled out by name_ok?
            let rest = &s[open_at + OPEN.len()..];
            let close_at = rest.find(CLOSE)?;
            let mid = &rest[..close_at];
            // TODO(socratic): if close_at is not found, the `?` returns None silently — should a malformed infix (no closing `)cause`) be treated the same as a non-qualified string?
            let b = &rest[close_at + CLOSE.len()..];
            let qualities: Vec<String> = mid.split(QSEP).map(|q| q.to_string()).collect();
            let e = EdgeWord { a: a.to_string(), qualities, b: b.to_string() };
            // re-validate: every part well-formed, and the qualities non-empty (an empty
            // infix would mean someone wrote `be()cause`, which is NOT the bare form).
            if e.is_renderable() && !e.qualities.is_empty() {
                return Some(e);
            }
            // TODO(socratic): why explicitly return None after validation fails on the qualified branch, rather than falling through to try the bare form?
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
// TODO(socratic): the `_ => None` arm folds any UNKNOWN stored quality into the same
// bare-`because` as grounding — if a fifth quality ever enters the store, should the bridge
// silently flatten its mode away, or refuse loudly like the grammar does elsewhere?
// TODO(socratic): why does `gen4_quality` map Q_GROUNDING to None rather than to "" — does returning None preserve a distinction between "no mode" (bare because) and "mode present but named nothing"?
// ANSWERED(walk 2026-07-02): yes — None means bare because (grounding is the unmarked default mode); "" would render "be()cause", a shape the parser refuses, so the distinction is structural, not cosmetic. — see walk plan §A (grammar facts)
fn gen4_quality(stored: &str) -> Option<&'static str> {
    match stored {
        Q_GROUNDING => None,              // = bare `because`; the relation, not a mode
        Q_DEPENDS_ON => Some("needs"),    // but-for / necessary
        Q_OCCLUDES => Some("hides"),      // negative — was here, removed (recallable)
        Q_EXCLUSION => Some("ignores"),   // negative — never admitted (the master-negative)
        // TODO(socratic): the `_ => None` arm folds any UNKNOWN stored quality into the same bare-`because` as grounding — if a fifth quality ever enters the store, should the bridge silently flatten its mode away, or refuse loudly like the grammar does elsewhere?
        _ => None,
    }
}

/// Every relation `a` is `because` of, read from the live Society and re-expressed as a
/// canonical EdgeWord that has round-tripped through `render`→`parse`. The bridge from the
/// `~q` store to the `because` grammar. `a~be(quality)cause~b`, qualities folded per the
/// gen4 rulings. Returns only edges that survive the parser (the grammar's own gate).
pub fn because_edges_from(soc: &Society, a: &str) -> Vec<EdgeWord> {
    // a beat is `because` of b for each grounding/depends-on/exclusion it carries toward b.
    let mut out = Vec::new();
    // TODO(socratic): why hard-code this array of four qualities rather than iterate over the stored ones directly — does this list define the "canonical four" the bridge will ever recognize, or is it a snapshot that drifts from what actually lives in Society?
    // ANSWERED(walk 2026-07-02): it defines the bridge's contract — the four canonical stored qualities of the kernel; a fifth quality is a grammar change, and what the bridge should do then is the open fork noted above (F9), not silent drift here. — see walk plan §A (grammar facts)
    for quality in [Q_GROUNDING, Q_DEPENDS_ON, Q_OCCLUDES, Q_EXCLUSION] {
        // TODO(socratic): why pass `None` as the `as_of` to `prehensions_from` — is "read all prehensions regardless of timestamp" the right frame, or should this inherit a frame from the caller?
        for p in prehensions_from(soc, a, quality, None) {
            // TODO(socratic): why `continue` on `None` rather than treating an objectless prehension as an edge — does a quality without a target beat never make sense in the because-grammar?
            // ANSWERED(walk 2026-07-02): never — an edge always carries both subject and object in the grammar; an objectless row is a node, not an edge, so skipping it is definitional. — see walk plan §A (grammar facts)
            let Some(b) = p.object.as_deref() else { continue };
            let q = gen4_quality(quality);
            let built = match q {
                Some(qn) => EdgeWord::with(a, &[qn], b),
                None => EdgeWord::bare(a, b),
            };
            // the proof-of-life: go through the slug-word and back. If a name carries a
            // delimiter it won't render — skip it (the grammar refusing is the grammar working).
            // TODO(socratic): why must every edge survive the round-trip before being returned — is this validation essential, or is it a belt-and-suspenders check after name_ok already passed?
            if let Some(s) = built.render() {
                if let Some(e) = EdgeWord::parse(&s) {
                    out.push(e);
                }
            }
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

// TODO(socratic): why clone `one` and `exp.to_string()` in the Mismatch arm rather than moving/referencing — does Pole::Mismatch need owned Strings to outlive the classification function, or is this a lifetime boundary choice?
fn classify(found: Vec<String>, expected: Option<&str>) -> Pole {
    match found.as_slice() {
        [] => Pole::None,
        // TODO(socratic): why match on expected twice (outer Some/_, inner Some/_ with !=) rather than flattening to a single pattern match?
        [one] => match expected {
            Some(exp) if exp != one => Pole::Mismatch { found: one.clone(), expected: exp.to_string() },
            _ => Pole::Found(one.clone()),
        },
        // TODO(socratic): why clone the entire `many` vec rather than storing a reference to found — is the Pole::Many variant meant to be independent of the input lifetime?
        many => Pole::Many(many.to_vec()),
    }
}

/// Read both poles from the live Society's `because` topology. `content` = the candidate
/// beats (edges and `~q` mode-beats are never a pole). `expected_end`/`expected_source` are
/// the config's names, checked but never overriding. Topology is truth.
pub fn find_poles<'a, I>(
    soc: &Society,
    content: I,
    expected_end: Option<&str>,
    expected_source: Option<&str>,
) -> Poles
where
    I: IntoIterator<Item = &'a str>,
{
    // TODO(socratic): I walk because-edges only FROM the candidates — an edge whose `a` lies
    // outside `content` never marks its `b` as ground; is "topology is truth" true here, or
    // only truth-relative-to-the-frame the caller happened to hand me?
    // TODO(socratic): why clone the input iterator into a Vec rather than iterate once and collect (or pass I directly if possible)?
    let candidates: Vec<String> = content.into_iter().map(|s| s.to_string()).collect();
    // one pass over the because-topology: collect every slug that ever appears as an `a`
    // (a resting-thing) and every slug that appears as a `b` (a ground).
    // TODO(socratic): why use HashSet for both is_resting and is_ground when we only need membership tests and the order doesn't matter — is there ever a reason to iterate over them, or is a BitSet more efficient here?
    let mut is_resting: std::collections::HashSet<String> = std::collections::HashSet::new(); // an `a`
    let mut is_ground: std::collections::HashSet<String> = std::collections::HashSet::new();  // a `b`
    for a in &candidates {
        // TODO(socratic): why call because_edges_from for each candidate separately rather than collecting all edges upfront — does this per-candidate walk avoid redundant lookups, or is it a simplicity choice?
        for e in because_edges_from(soc, a) {
            // TODO(socratic): why insert both e.a and e.b unconditionally rather than checking if they're in candidates first — can an edge point to a name outside the content frame?
            is_resting.insert(e.a);
            is_ground.insert(e.b);
        }
    }
    // END: nothing rests on it → never a `b`. SOURCE: rests on nothing → never an `a`.
    // (A lone, edgeless beat is BOTH never-a-b and never-an-a; it'd show in both pole lists.
    // That correctly reads as malformed — a beat with no because-chain is its own island.)
    // TODO(socratic): why filter in two passes rather than collecting both ends and sources in a single iteration over candidates?
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

    // TODO(socratic): I round-trip "holds" and "grounding" as qualities, yet my own bridge
    // says those rulings died (no morpheme) — do my tests exercise the living vocabulary
    // (needs/hides/ignores), or only ghosts the grammar admits but the canon will never speak?
    // TODO(socratic): this test uses "holds" as a quality, but the gen4_quality bridge maps Q_GROUNDING (not any quality) to None — does this test exercise the live grammar vocabulary (needs/hides/ignores + bare), or only the historical shapes the parser will never see from Society?
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
    // TODO(socratic): why start names with `[a-z]` (not [a-z0-9]) — is there a rule that slugs must not begin with a digit, or is this an arbitrary simplification for testing?
    // ANSWERED(walk 2026-07-02): the strategy mirrors the kebab slug shape the canon actually mints (letter-led); it's a conservative generator choice, not a parser rule — name_ok itself doesn't forbid a leading digit. — see walk plan §A (grammar facts)
    fn name_strategy() -> impl Strategy<Value = String> {
        "[a-z][a-z0-9-]{0,12}".prop_filter("kebab", |s| !s.ends_with('-'))
    }
    // TODO(socratic): why allow 10 chars in qualities but 12 in names — does the grammar constrain quality length differently, or is this a conservative test choice?
    fn quality_strategy() -> impl Strategy<Value = String> {
        "[a-z][a-z0-9-]{0,10}".prop_filter("kebab", |s| !s.ends_with('-'))
    }

    proptest! {
        #[test]
        fn parse_render_is_inverse(
            a in name_strategy(),
            b in name_strategy(),
            // TODO(socratic): why cap qualities at 4 (0..4) — is this a confidence in the typical case, or does the grammar have a limit on how many qualities can infix?
            quals in prop::collection::vec(quality_strategy(), 0..4),
        ) {
            let e = EdgeWord { a, qualities: quals, b };
            // every such e is renderable by construction (kebab names/quals carry no delimiters)
            // TODO(socratic): does the `expect` here mean render should never fail on kebab-shaped strings, so failure is a bug, or is there an edge case we're glossing over?
            // ANSWERED(walk 2026-07-02): failure is a bug by construction — the strategies only generate name_ok/quality_ok-valid kebab, and render is total on valid parts; the expect is the property. — see walk plan §A (grammar facts)
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
            // TODO(socratic): why render twice (once to string, once to verify roundtrip) — is the second render a sanity check that parse didn't lose anything, or is it essential to the inverse property?
            prop_assert_eq!(reparsed.render().unwrap(), s);
        }
    }
}
