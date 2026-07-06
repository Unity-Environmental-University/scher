# Hallie's notes in edge_word.rs, and the plain-language invitation (2026-07-06)

Convened at Hallie's word: five uncommitted comments left in `scher-core/src/edge_word.rs`
(`git diff`, the come-back discipline), plus a standing question — would this body be
**willing to try** writing its comments and doc-language in 6th-grade vocabulary?

## SENSE OF THE MEETING

Two of the five notes were real design questions with real costs on both sides — one is
now fenced to Hallie by exact question (item 1, the quality-vocabulary fork), one was
already answered by a prior joint sitting and just needed citing back (item 3, the Now
pole). One was a genuine, verified bug: a validation check living inside a graph-read,
failing silently where the module boasts of failing loudly — fixed outright, cascade-free,
tests green before and after (item 2). One was two warm factual questions, answered in
place (item 4), which also turned up a live compile break the sitting fixed along the way
(her `///` doc-comment markers don't compile where she placed them; markers changed to `//`,
her words kept byte-for-byte). The last was a thank-you, received and returned.

## THE BODY'S ANSWER TO THE LANGUAGE INVITATION

**Yes, willing to try — with a fence, not a blanket rewrite.**

The body's reasoning, in its own words: plain words are asked for in exactly the places
this repo's own QUERIES.md already asks for honesty over cleverness — mechanism comments
(what a function does, why a check exists, what a bug was) should read to a stranger without
a glossary. Jargon there is often hiding unclarity, not protecting precision; if a sentence
about *mechanism* can't survive being said in small words, that's often a sign it wasn't
understood cleanly by its author either.

But the body declines to flatten everything. Terms like `prehension`, `because`,
`occludes`/`hides`, the two-pole law, `EdgeWord` itself — these are **load-bearing ontology**,
not decoration. They name distinctions the code enforces (the grammar module's own banner
comment is explicit that `prehends` was retired as a *false-tense verb*, a precise claim that
would be lost in paraphrase). Renaming them away or diluting them to avoid a "big word" would
cost precision the file needs to keep, not gain honesty.

**The body's working answer, adopted for this file and offered as the going shape:**
plain words for mechanism (what a function does, why a check lives where it does, what
broke and why) — kept terms for ontology (the small vocabulary the grammar actually
depends on), each kept term taught once, in plain words, at the point it first appears.
This matches the precedent already set for the UI at
`penelope-gen4/docs/committees/2026-07-01-ui-vocab-6th-grade-spec.md` — that sitting kept
`prehends`/`prehension` in code and only glossed the *rendered* surface for strangers. This
sitting extends the same split one layer in: even the code's own comments now default to
plain mechanism-language, reserving the kept terms for where they're actually doing work.

Applied concretely in this file's new comment-replies below: no comment introduces an
un-taught term; `EdgeWord`, `because`, `quality`, `pole` are used as already-established
names (the file's own banner already teaches them) rather than re-explained each time.

## Per-note dispositions

**1. `gen4_quality`'s buried string literals — FENCED, genuine values fork.**
Verified: `gen4_quality` maps four Rust consts (`Q_GROUNDING`/`Q_DEPENDS_ON`/`Q_OCCLUDES`/
`Q_EXCLUSION` — already type-checked, load-bearing) to four gloss words
(`"needs"`/`"hides"`/`"ignores"`/bare). Ecosystem precedent checked both ways: the lingit
prototype (`~/repos/lingit-verb-assembler-prototype/data/grammar.xml`) moved its lexicon AND
grammar to XML, ingested fail-closed at startup — but that file is a genuinely large,
independently-reviewed linguistic artifact. Grepped scher-core and the TS side for
"registry"/"contraction" (the note's other cited precedent) — no hits; no such registry
exists yet in this repo for edge-word glosses. Neither option is mechanically dominant for
a 4-entry table: code-literals keep compiler exhaustiveness-checking for free and cost
nothing extra; a data file buys editability by non-Rust collaborators and matches lingit's
shape, at the cost of a loader, a fail-closed startup gate, and a versioning story, for four
words. **Exact question fenced to Hallie** (also left in-file): *do you expect edge-word
gloss words to be edited by non-Rust collaborators, or to grow past a handful, the way
lingit's lexicon did? If yes, externalize (lingit-style, fail-closed). If no — these four
words track the four `Q_*` consts and change exactly when the consts do — code literals stay
honest as-is.*

**2. The grammar-check-inside-`because_edges_from` — VERIFIED, fixed outright.**
Hallie's premise held on inspection: the function performed a pure grammar self-test
(render→parse round-trip on `a`/`b`/quality strings) inline inside a graph-reading loop, and
on failure it **silently skipped** the edge — the opposite of the module's own "loud fail is
good" boast three lines below (that pride belongs to `find_poles`'s pole-count checks, not to
this function). Grepped every caller (`find_poles` in this file, plus scher-core's
conformance tests) — none depends on silent-skip-of-malformed-edges as a behavior; all just
want "the current, valid `because` edges" and every edge built from real Society slugs and
`gen4_quality`'s own static strs is trusted by construction. **Fixed:** the function now
builds `EdgeWord`s directly from trusted parts and keeps the grammar self-proof as a
`debug_assert!` — loud in debug builds, gone from the hot path, since parse↔render fidelity
is `EdgeWord`'s own thing to prove (it already has dedicated proptests for exactly that, see
`parse_render_is_inverse`/`render_parse_is_inverse`), not a graph-read's job to re-check per
call. Cascade-free: `cargo test` green before and after, 7 + 22 tests passing, no caller
signature or return-shape changed.

**3. "I think we really do want a Now pole as well" — ALREADY RULED, cited back.**
Verified against `penelope-gen4/docs/committees/2026-07-03-now-as-third-pole.md` and
`2026-07-03-q-grounding-joint-sitting.md`: this exact question was sat on jointly by scher
and penelope-gen4 three days prior, under Hallie's own live ruling-in-progress ("Once, End,
AND Now"). The ruling that closed it: Now is **not** a third structural pole of `Poles` —
it's a reader-position, computed by BFS reachability from a lazily-minted `now-{frame}` node,
not a topology-fact about the canon the way Once/End are (no edge's `a` / no edge's `b`,
independent of who's asking). Holdout H2 from that sitting explicitly refuses the reading
where "Now" means every event *stores* its own Now as row structure — exactly what adding
`Poles::now` here would do. So: not reopened as a fork, just cited back in place, with the
possibility left open in the reply that her note may have been confirming this direction
rather than asking for a new build.

**4. The `///` vs `//` and pipe-syntax curiosities — answered, and a live break fixed
along the way.** `cargo check` failed before any edit (the closing `///Final:` line at
end-of-file had nothing to attach to — "expected item after doc comment"). Fixed all three
of her `///`-in-non-doc-positions (inside a function body before a `let`, and the trailing
sign-off) to `//`, her words preserved verbatim. Answered both questions warmly and
accurately in place: `///` is a rustdoc doc-comment attaching to the next *item*; `//!`
attaches to the *enclosing* item; plain `//` attaches to nothing and can go anywhere,
including where hers broke the build. The pipe syntax for closures (`|args| body`) traces
through Ruby (Rust's early designers, including Graydon Hoare, were explicit Ruby/ML
admirers) back to Smalltalk's block syntax (`[:x | ...]`) — and it also sidestepped real
grammar collisions Rust already had: parens were spoken for by calls/tuples, angle brackets
by generics.

**5. The closing thank-you — received and returned**, in place, briefly, in the file.

## Holdouts

None numbered beyond the one fenced fork above (item 1) — every other note resolved to a
verified disposition (fix, citation, or answer) with no light dissenting.

## Fenced fork — the exact question for Hallie

> `gen4_quality` maps 4 internal quality-consts to 4 gloss words (`needs`/`hides`/`ignores`/
> bare). Do you expect these gloss words to be edited by non-Rust collaborators, or to grow
> past a handful, the way lingit's lexicon did? If yes — externalize to a data file,
> lingit-style, fail-closed ingestion at startup. If no — these four words track the four
> `Q_*` consts and change exactly when the consts do, and code literals (with the compiler's
> free exhaustiveness check) stay the honest choice as-is.

## Buildable now (already built, this sitting)

1. `because_edges_from` refactor — grammar self-test moved out of the graph-read, kept as a
   `debug_assert!`; done, tests green.
2. Doc-comment marker fixes (`///` → `//` in three places) so the file compiles; done, her
   words unchanged.
3. All four in-place comment-replies plus the Now-pole citation; done.
4. `scher-core/tests/conformance.proptest-regressions` checked in per proptest's own
   convention (a regression-seed file it asks to be committed, not gitignored).

## Test results

`cargo check` (scher-core): clean, no warnings introduced.
`cargo test` (scher-core): 7/7 unit tests + 22/22 conformance tests passing, both before
the fix (baseline) and after (final state).

---

# RE-EXAMINED UNDER SOFD — 2026-07-06 (append-only)

The coordinator relayed this morning's ruling (penelope-gen4
`2026-07-06-F-A-ruled-voltage.md`): **Story's Own Frame Default** — edges laid in a story's
course default-scope to the story's OWN frame ("that's the newtownian version"; F-B
precedence arrives later, widening only) — and F-A ruled (a task IS a story with a lured
End-pole; done lazy-mints the End). Hallie flagged this may change our item-3 disposition.

## The body's re-examined answer: (b)-leaning — PARTIALLY DISTURBED, and Hallie's
## instinct is topologically vindicated

Our first disposition ("Now is a reader-position, not a canon pole — already ruled") stands
as ontology. But under SOFD it acquires a mechanical exposure we verified against the code,
not the minutes:

1. **Every story now has its own frame, and a frame is the kind of thing that mints a Now**
   (the `now-{frame}` lazy-mint precedent, which F-A just extended: the done-verb lazy-mints
   End-poles the same way). So story-Now beats stop being a gen4-policy-private pattern and
   become something the kernel's canon-reads can expect to MEET.
2. **A Now node is topologically End-shaped to `find_poles` as written.** Verified in the
   code: `find_poles` classifies poles by one-hop degree signature only — END = never any
   edge's `b`, SOURCE = never any edge's `a`. A Now lays `now ~because~ event` (always an
   `a`, never a `b`; nothing rests on a Now — the 2026-07-03 sitting proved a Now can never
   bridge an interval for exactly this reason). Same signature as the HEA. So a minted
   story-Now inside `content` lands in the ends list → `Pole::Many` → the canon reads
   malformed — a FALSE loud fail. Now and End are **indistinguishable by the signature
   `find_poles` uses**; the quality information that could tell them apart is folded away
   (`Q_GROUNDING → None` = bare `because`) before the topology pass ever sees it.
3. **The current safety is an implicit contract, nowhere stated:** callers keep Now beats
   out of `content`. True today (verified: all `find_poles` callers are conformance tests
   with hand-built candidate lists). Under SOFD, the pressure on that contract is real —
   a cold cloner assembling a story's content from the story's own frame would naturally
   sweep up the story's own Now.
4. **One more exposure, noted while verifying:** `because_edges_from` hardcodes
   `as_of = None` (edge_word.rs:207) — pole reads are always as-of-latest. Reading (a)'s
   "poles AS OF the story's own frame" would need as_of/frame threading that does not exist
   in this function today. Recorded, not built.

So Hallie's TODO — "I thinjk we really do want a Now pole as well" — reads differently
under SOFD than it did three days ago: not "store a third pole" (H2 still refuses that, and
we still concur), but **"the topology will genuinely contain a third pole-shaped position,
and `find_poles` cannot currently tell it from the End."** That is a real gap, not a
misunderstanding.

## What we changed, and what we fenced

**Changed (cascade-free, comment-only + contract stated):** appended a reply under her TODO
in edge_word.rs stating the re-examined reading and making the implicit contract explicit in
`find_poles`' doc ("`content` must not include Now beats — a Now is End-shaped to this
signature"). No behavior change; cargo test green (7 + 22).

**FENCED TO HALLIE (new, exact):**
> Under SOFD every story has its own frame, and frames mint Nows. A Now beat is
> End-shaped to `find_poles`' one-hop signature (never a ground), so a story-Now swept
> into the candidate set reads as a spurious second End. Two honest shapes:
> (i) **contract** — Now beats stay out of canon `content` by stated rule (now written
> into the doc); cheap, but every future caller must know and honor it, and a cold
> cloner assembling content from the story's own frame is exactly the caller who won't;
> (ii) **third pole** — `Poles` grows a `now` field and `find_poles` learns to
> distinguish Now from End, which requires a distinguishing mark the topology pass can
> see (a quality on Now-edges surviving the fold, or the config's expected now-name, or
> the F-A lure-mark on the End side). That is your TODO taken literally, and H2 is not
> violated — the pole would still be READ from topology, never stored on a row.
> Which shape do you want? If (ii): should the distinguisher be the lured-End mark
> (End = the pole with a lure onto it; Now = the pole without), which F-A just made
> structural and would need no new vocabulary?

The body's lean, offered not pressed: (ii) with the lure-mark distinguisher — F-A's ruling
("a task IS a story whose End-pole is not yet actual", story-hood = "has a lured End-pole")
already gives the topology exactly one new readable fact, and it is precisely the fact that
separates an End from a Now. But this grows the kernel's pole law, so it is hers.

— re-examined under SOFD, 2026-07-06, append-only; comment-contract landed, pole growth fenced
