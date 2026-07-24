//! substance — relational reads, read as substance. The World collapsed to a Fool.
//!
//! Grounded in: the socratic/koan sitting (2026-07-24). Kind comes from what I
//! AM; settledness from what REACHES me; the two never conflate.
//! Fixes/Prevents: callers improvising substance-reads out of raw edges.
//!
//! The refusals this module makes are pinned in `tests` below, not asserted
//! here: no save(), no partial read, no cache, no frame-relative doneness.

use crate::{answers_of, bears_quality, end_of, is_occluded, is_trub_log, Society};
use crate::poles::is_sublime_pole;

/// The wonder self-badge the capture-kinds recipe lays (a~q-tag-wonder~a).
pub const Q_TAG_WONDER: &str = "q-tag-wonder";

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Kind {
    /// A designated sublime-pole. Never actual, never closes — a koan when it
    /// carries a question.
    Sublime,
    /// Self-badged q-tag-wonder. With a telos edge it is a socratic.
    Wonder,
    /// A POSITION, not a badge (Hallie's dissolution, 2026-07-24 12:13: "why
    /// do problems need to be a different thing?" → state derives from
    /// relation, both ways). To be a problem IS to be what fixes reach toward
    /// and work grounds in; the incoming q-fixes read was never a borrow to
    /// repair — it was the honest read. The mirrored pole to Sublime: the
    /// already-hurting FROM to its never-closing TOWARD (ontology lock).
    TrubLog,
    /// Has a designated End: an open arc.
    Story,
    /// A bare content beat.
    Note,
}

/// What one beat has become, at one standpoint. Read-only by construction.
#[derive(Clone, Debug)]
pub struct Substance {
    pub slug: String,
    pub kind: Kind,
    /// What reaches me with the settles quality (today Q_ANSWERS; the
    /// q-fixes fold is fenced with Hallie — one settles quality, target kind
    /// gives the English).
    pub answered_by: Vec<String>,
    /// Answered AND closable: the koan exception applied — an answered
    /// sublime is answered, and never settled.
    pub settled_by_answer: bool,
    pub occluded: bool,
}

/// The one door. No half-substances: every field is computed here, now.
pub fn substance_of(soc: &Society, slug: &str, as_of: Option<u64>) -> Substance {
    let kind = if is_sublime_pole(soc, slug, as_of) {
        Kind::Sublime
    } else if bears_quality(soc, slug, Q_TAG_WONDER, as_of) {
        Kind::Wonder
    } else if is_trub_log(soc, slug, as_of) {
        Kind::TrubLog
    } else if end_of(soc, slug).is_some() {
        Kind::Story
    } else {
        Kind::Note
    };
    let answered_by = answers_of(soc, slug, as_of);
    Substance {
        slug: slug.to_string(),
        settled_by_answer: !answered_by.is_empty() && kind != Kind::Sublime,
        answered_by,
        kind,
        occluded: is_occluded(soc, slug, as_of),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{EventRow, Q_ANSWERS, Q_SUBLIME_POLE};

    fn node(soc: &mut Society, slug: &str) {
        soc.lay(EventRow::node(slug, slug));
    }

    #[test]
    fn a_koan_is_answered_never_settled() {
        let mut soc = Society::default();
        node(&mut soc, "koan");
        node(&mut soc, "mu");
        node(&mut soc, "d");
        soc.lay_p("d~sublime-pole~koan", "designate", "d", "koan", Q_SUBLIME_POLE).unwrap();
        soc.lay_p("mu~answers~koan", "relate", "mu", "koan", Q_ANSWERS).unwrap();
        let s = substance_of(&soc, "koan", None);
        assert_eq!(s.kind, Kind::Sublime);
        assert_eq!(s.answered_by, vec!["mu"]);
        assert!(!s.settled_by_answer);
    }

    #[test]
    fn a_wonder_badge_beats_the_trub_borrow() {
        // A socratic that receives a q-fixes edge must stay a Wonder — the
        // self-badge outranks the incoming-edge borrow by arm order.
        let mut soc = Society::default();
        node(&mut soc, "socratic");
        node(&mut soc, "fixer");
        soc.lay_p("socratic~q-tag-wonder~socratic", "badge", "socratic", "socratic", Q_TAG_WONDER)
            .unwrap();
        soc.lay_p("fixer~fixes~socratic", "fix", "fixer", "socratic", crate::Q_FIXES).unwrap();
        let s = substance_of(&soc, "socratic", None);
        assert_eq!(s.kind, Kind::Wonder);
    }

    /// THE ORM REFUSALS, as tests instead of a header paragraph (2026-07-24).
    /// Penelope looks at ORMs and says "what if that was my whole deal" — the
    /// good half of that bargain only holds if the object never writes back.
    ///
    /// No ACTIVE RECORD: a Substance carries no door back to the Society. It is
    /// built from a &Society and holds none, so `s.save()` cannot be written —
    /// this test would stop compiling if a mutable handle were ever added.
    #[test]
    fn a_substance_cannot_write_back() {
        let mut soc = Society::default();
        node(&mut soc, "beat");
        let s = substance_of(&soc, "beat", None);
        // The proof is structural: `soc` is still exclusively borrowable after
        // the read, so the Substance kept no reference into it.
        node(&mut soc, "later-beat");
        assert_eq!(s.slug, "beat");
    }

    /// No LAZY LOADING: every field is computed in the one call. A Substance is
    /// never half-built, so a caller can never observe a partial one.
    #[test]
    fn a_substance_is_whole_or_not_at_all() {
        let mut soc = Society::default();
        node(&mut soc, "beat");
        node(&mut soc, "a");
        soc.lay_p("a~answers~beat", "relate", "a", "beat", Q_ANSWERS).unwrap();
        let s = substance_of(&soc, "beat", None);
        // Fields agree with each other at the same standpoint — the invariant a
        // lazily-loaded field set would break.
        assert_eq!(s.settled_by_answer, !s.answered_by.is_empty() && s.kind != Kind::Sublime);
    }

    /// No CACHE past the standpoint: the same slug read after a change reads
    /// differently. Stale substance is yesterday's slice in a suit.
    #[test]
    fn a_substance_is_honest_at_its_standpoint_only() {
        let mut soc = Society::default();
        node(&mut soc, "q");
        node(&mut soc, "a");
        assert!(!substance_of(&soc, "q", None).settled_by_answer);
        soc.lay_p("a~answers~q", "relate", "a", "q", Q_ANSWERS).unwrap();
        assert!(
            substance_of(&soc, "q", None).settled_by_answer,
            "a re-read after a write must see the write — no memo lives here"
        );
    }

    #[test]
    fn a_plain_answered_note_settles() {
        let mut soc = Society::default();
        node(&mut soc, "q");
        node(&mut soc, "a");
        soc.lay_p("a~answers~q", "relate", "a", "q", Q_ANSWERS).unwrap();
        assert!(substance_of(&soc, "q", None).settled_by_answer);
    }
}
