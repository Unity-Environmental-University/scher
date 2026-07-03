// ─────────────────────────────────────────────────────────────────────────────
// contraction — the plugin seam for CONSUMER-OWNED contraction rules over the
// because-grammar. (Merged business meeting 2026-07-03, lingit-verb-assembler-
// prototype/docs/committees/2026-07-03-contraction-rules-merged-business.md;
// Hallie's ruling: rules stay consumer-side, "get scher committee to add
// contraction plugin support" — this file is that support, and ONLY that.)
//
// The law (H1, standing): the canonical edge-word form is TRUTH. A contraction is a
// consumer-owned partial bijection on surface strings — `expand(contract(s)) == s` for
// every canonical string a rule claims — and surface parsing is `parse(expand(s))`.
// `EdgeWord::parse`/`render` never learn any contraction exists.
//
// scher ships the trait, the registry with COLLISION REFUSAL at registration, and the
// law-checker a consumer's own proptest can drive. NO contraction rules live here — the
// rules in #[cfg(test)] below are law-exercise fixtures (one lawful, one law-breaking,
// one colliding), proving the harness catches violations; they are not vocabulary.
// ─────────────────────────────────────────────────────────────────────────────

use crate::edge_word::EdgeWord;

/// A consumer-owned contraction rule: a partial bijection on canonical edge-word strings.
/// `contract` maps a canonical string to a surface form (None = this rule doesn't apply);
/// `expand` maps a surface form back (None = not this rule's surface). The registry holds
/// every rule to the inverse law against the consumer's own probe corpus.
pub trait Contraction {
    /// A stable, human-auditable name — the trace of WHICH rule fired.
    fn name(&self) -> &str;
    /// Contract a canonical edge-word string to a surface form. None = doesn't apply.
    fn contract(&self, canonical: &str) -> Option<String>;
    /// Expand a surface form back to the canonical string. None = not this rule's surface.
    fn expand(&self, surface: &str) -> Option<String>;
}

/// Why a rule was refused (registration) or a surface unreadable (plural claim). Every
/// variant names the rule(s) — refusal is loud and auditable, never silent.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContractionError {
    /// `expand(contract(s)) != s` for a probe — the inverse law broken.
    LawBroken {
        rule: String,
        canonical: String,
        surface: String,
        expanded: Option<String>,
    },
    /// The contracted surface itself parses as a canonical edge-word — it would shadow
    /// the canonical grammar (a surface must never be mistakable for truth).
    ShadowsCanonical { rule: String, surface: String },
    /// Two rules' outputs collide: an already-registered rule claims (expands) the new
    /// rule's surface, or produces the same surface from a different canonical.
    Collision {
        incoming: String,
        registered: String,
        surface: String,
    },
}

/// The registry: rules checked at the door, held to the law over the consumer's probe
/// corpus, refused loudly on any violation. Registration order is insertion order.
#[derive(Default)]
pub struct Contractions {
    rules: Vec<Box<dyn Contraction>>,
}

impl Contractions {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a rule, checked against `probes` — the CONSUMER's own corpus (their
    /// vocabulary, their shapes; scher never guesses what a consumer will mint). For every
    /// probe the rule claims: the inverse law must hold, the surface must not shadow the
    /// canonical grammar, and no already-registered rule may collide on it. Any violation
    /// refuses the rule with the violation named.
    pub fn register(
        &mut self,
        rule: Box<dyn Contraction>,
        probes: &[EdgeWord],
    ) -> Result<(), ContractionError> {
        for e in probes {
            let Some(canonical) = e.render() else { continue };
            let Some(surface) = rule.contract(&canonical) else { continue };
            // the inverse law: expand ∘ contract = id on everything the rule claims.
            // (This also catches a rule contracting two canonicals to one surface —
            // expand can only return one of them, so the other probe breaks here.)
            let expanded = rule.expand(&surface);
            if expanded.as_deref() != Some(canonical.as_str()) {
                return Err(ContractionError::LawBroken {
                    rule: rule.name().to_string(),
                    canonical,
                    surface,
                    expanded,
                });
            }
            // no shadowing: a surface that parses as a canonical edge-word would make
            // contracted text indistinguishable from truth.
            if EdgeWord::parse(&surface).is_some() {
                return Err(ContractionError::ShadowsCanonical {
                    rule: rule.name().to_string(),
                    surface,
                });
            }
            // collision refusal (the merged sitting's added boundary): an existing rule
            // that claims this surface, or that produces it from any probe canonical.
            for r in &self.rules {
                let claims = r.expand(&surface).is_some();
                let produces = probes.iter().any(|p2| {
                    p2.render()
                        .and_then(|c2| r.contract(&c2))
                        .as_deref()
                        == Some(surface.as_str())
                });
                if claims || produces {
                    return Err(ContractionError::Collision {
                        incoming: rule.name().to_string(),
                        registered: r.name().to_string(),
                        surface,
                    });
                }
            }
        }
        self.rules.push(rule);
        Ok(())
    }

    /// Expand a surface string to canonical form: the unique rule that claims it, or the
    /// string unchanged if none does. A plural claim is a collision registration should
    /// have refused — refuse loudly here too (None), never pick silently.
    pub fn expand_surface(&self, s: &str) -> Option<String> {
        let mut claims = self.rules.iter().filter_map(|r| r.expand(s));
        match (claims.next(), claims.next()) {
            (None, _) => Some(s.to_string()),
            (Some(c), None) => Some(c),
            (Some(_), Some(_)) => None, // plural claim — loud refusal, no silent pick
        }
    }

    /// Parse a surface string: expand (if a rule claims it), then the canonical parse.
    /// This IS `parse(expand(s))` — the whole seam in one read.
    pub fn parse_surface(&self, s: &str) -> Option<EdgeWord> {
        EdgeWord::parse(&self.expand_surface(s)?)
    }
}

/// The harness law, callable from a consumer's own proptest: for one rule and one
/// edge-word, either the rule doesn't claim it (fine) or the full law holds. Consumers
/// drive this with THEIR generators over THEIR vocabulary; scher only states the law.
pub fn law_holds(rule: &dyn Contraction, e: &EdgeWord) -> Result<(), ContractionError> {
    let Some(canonical) = e.render() else { return Ok(()) };
    let Some(surface) = rule.contract(&canonical) else { return Ok(()) };
    let expanded = rule.expand(&surface);
    if expanded.as_deref() != Some(canonical.as_str()) {
        return Err(ContractionError::LawBroken {
            rule: rule.name().to_string(),
            canonical,
            surface,
            expanded,
        });
    }
    if EdgeWord::parse(&surface).is_some() {
        return Err(ContractionError::ShadowsCanonical {
            rule: rule.name().to_string(),
            surface,
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    // ── law-exercise fixtures (NOT vocabulary — see the header) ──────────────────

    /// Lawful: rewrites the `be(needs)cause` infix to `~needs~` (delimiter-free of the
    /// canonical grammar's shapes, so it can never shadow a canonical string).
    struct NeedsTilde;
    impl Contraction for NeedsTilde {
        fn name(&self) -> &str {
            "fixture-needs-tilde"
        }
        fn contract(&self, canonical: &str) -> Option<String> {
            canonical
                .contains("be(needs)cause")
                .then(|| canonical.replace("be(needs)cause", "~needs~"))
        }
        fn expand(&self, surface: &str) -> Option<String> {
            surface
                .contains("~needs~")
                .then(|| surface.replace("~needs~", "be(needs)cause"))
        }
    }

    /// Law-breaking: contracts but expands to the wrong thing (drops the mode).
    struct Lossy;
    impl Contraction for Lossy {
        fn name(&self) -> &str {
            "fixture-lossy"
        }
        fn contract(&self, canonical: &str) -> Option<String> {
            canonical
                .contains("be(hides)cause")
                .then(|| canonical.replace("be(hides)cause", "~hides~"))
        }
        fn expand(&self, surface: &str) -> Option<String> {
            // WRONG on purpose: expands to the bare form, losing the mode.
            surface
                .contains("~hides~")
                .then(|| surface.replace("~hides~", " because "))
        }
    }

    /// Colliding: produces the same `~needs~` surface as NeedsTilde.
    struct NeedsTildeToo;
    impl Contraction for NeedsTildeToo {
        fn name(&self) -> &str {
            "fixture-needs-tilde-too"
        }
        fn contract(&self, canonical: &str) -> Option<String> {
            NeedsTilde.contract(canonical)
        }
        fn expand(&self, surface: &str) -> Option<String> {
            NeedsTilde.expand(surface)
        }
    }

    fn probes() -> Vec<EdgeWord> {
        vec![
            EdgeWord::with("the-card", &["needs"], "day-30"),
            EdgeWord::with("old-plan", &["hides"], "new-plan"),
            EdgeWord::bare("hea", "once"),
        ]
    }

    #[test]
    fn lawful_rule_registers_and_round_trips() {
        let mut c = Contractions::new();
        c.register(Box::new(NeedsTilde), &probes()).unwrap();
        let canonical = EdgeWord::with("the-card", &["needs"], "day-30").render().unwrap();
        let surface = NeedsTilde.contract(&canonical).unwrap();
        assert_eq!(surface, "the-card~needs~day-30");
        // the whole seam: surface → canonical → struct
        assert_eq!(
            c.parse_surface(&surface),
            Some(EdgeWord::with("the-card", &["needs"], "day-30"))
        );
        // an unclaimed string passes through to the canonical parse untouched
        assert_eq!(c.parse_surface("hea because once"), Some(EdgeWord::bare("hea", "once")));
    }

    #[test]
    fn law_breaking_rule_is_refused_by_name() {
        let mut c = Contractions::new();
        let err = c.register(Box::new(Lossy), &probes()).unwrap_err();
        assert!(matches!(err, ContractionError::LawBroken { ref rule, .. } if rule == "fixture-lossy"));
    }

    #[test]
    fn colliding_rule_is_refused_by_both_names() {
        let mut c = Contractions::new();
        c.register(Box::new(NeedsTilde), &probes()).unwrap();
        let err = c.register(Box::new(NeedsTildeToo), &probes()).unwrap_err();
        assert!(matches!(
            err,
            ContractionError::Collision { ref incoming, ref registered, .. }
                if incoming == "fixture-needs-tilde-too" && registered == "fixture-needs-tilde"
        ));
    }

    #[test]
    fn law_holds_is_the_callable_harness() {
        assert!(law_holds(&NeedsTilde, &EdgeWord::with("a", &["needs"], "b")).is_ok());
        assert!(law_holds(&Lossy, &EdgeWord::with("a", &["hides"], "b")).is_err());
        // a rule that doesn't claim the edge is fine by definition
        assert!(law_holds(&Lossy, &EdgeWord::bare("a", "b")).is_ok());
    }

    // the seam under proptest: for arbitrary kebab edge-words, the registered lawful rule
    // preserves parse-through-the-seam — parse_surface(contract-or-not) == the edge itself.
    fn name_strategy() -> impl Strategy<Value = String> {
        "[a-z][a-z0-9-]{0,12}".prop_filter("kebab", |s| !s.ends_with('-'))
    }

    proptest! {
        #[test]
        fn seam_preserves_the_edge(a in name_strategy(), b in name_strategy()) {
            let mut c = Contractions::new();
            c.register(Box::new(NeedsTilde), &probes()).unwrap();
            for e in [EdgeWord::with(&a, &["needs"], &b), EdgeWord::bare(&a, &b)] {
                let canonical = e.render().unwrap();
                let surface = NeedsTilde.contract(&canonical).unwrap_or(canonical);
                prop_assert_eq!(c.parse_surface(&surface), Some(e));
            }
        }
    }
}
