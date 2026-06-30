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
fn gen4_quality(stored: &str) -> Option<&'static str> {
    match stored {
        Q_GROUNDING => None,              // = bare `because`; the relation, not a mode
        Q_DEPENDS_ON => Some("needs"),    // but-for / necessary
        Q_OCCLUDES => Some("hides"),      // negative — was here, removed (recallable)
        Q_EXCLUSION => Some("ignores"),   // negative — never admitted (the master-negative)
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
    for quality in [Q_GROUNDING, Q_DEPENDS_ON, Q_OCCLUDES, Q_EXCLUSION] {
        for p in prehensions_from(soc, a, quality, None) {
            let Some(b) = p.object.as_deref() else { continue };
            let q = gen4_quality(quality);
            let built = match q {
                Some(qn) => EdgeWord::with(a, &[qn], b),
                None => EdgeWord::bare(a, b),
            };
            // the proof-of-life: go through the slug-word and back. If a name carries a
            // delimiter it won't render — skip it (the grammar refusing is the grammar working).
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
pub fn find_poles<'a, I>(
    soc: &Society,
    content: I,
    expected_end: Option<&str>,
    expected_source: Option<&str>,
) -> Poles
where
    I: IntoIterator<Item = &'a str>,
{
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
