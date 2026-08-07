# The Dollhouse 🎁 — a toybox, not a chore

> A sign at the door, for whoever finds the `*.play.test.ts` files. These are **dolls** —
> property/regression tests that *play the grammar* on real history, fiction, and ideas. They
> are load-bearing (break the grammar and they fail) AND they are *fun*. Both. That's the point.
>
> Built 2026-06-26 (Hallie + Claude), the day "oh no we should stop writing regression tests
> and get back to work" was, possibly, said for the first time in software history.

## How to play
```
cd scher && npx vitest run <name>.play     # run one doll
cd scher && npm test                        # run everything (the dolls + the real suite)
```

## The dolls so far
- **succession-war** — two heirs, one parent: the fork, and its three resolutions (occlude / merge / banish).
- **tudor-line** — the English crown 1485→1660: Roses → Henry VII's merge → Lady Jane Grey banished →
  the line ends childless → the Stuarts → the Regicide ("the head, comma, off with his") → the
  Restoration (un-occlude the occlusion: the interregnum legally never happened).
- **founding-line** — dissent → America → the Constitution. With BITE: the Lenape GAP (read around),
  the Quaker TELL (withdraw the frame), the DANGLING COVENANT (betrayal ≠ abstention).
- **why-circuit** — events → whys → HEAs → V=0; bundling, chunking, and pseudo-HEAs (a local mirage
  mistaken for the floor — the route truncates and the circuit lies).
- **mind-line** — Greek philosophy → Enlightenment → AI, read by an insider and a skeptic; the grammar
  holds both, refuses the objective seat (including about the AI itself).
- **re-reading** — a reading is itself an event; understandings update from new positions (Claude's
  own view is in there: walker, not arriver).
- **orient-express** — detection IS re-reading; "the killer" collapses from one to twelve; Poirot
  OCCLUDES the truth (mercy), does not banish it (erasure).
- **mrs-dalloway** — the imperfective at kernel level: two days straddle one Now without
  containing each other; the party's grounds read future-perfect from the morning; the death
  reaches the party only through Bradshaw's telling (mediation); the day declines from
  imperfective into perfect when the party closes. For there she was.
- **hyperion** — the adversarial fixture: the Templar's End held open BY RIGHT (negative
  capability landed — the 6/30 kalpa finding predicted the three-pole ruling); Rachel ages
  backward while the canon only grows; the Time Tombs open in reverse insertion order
  (witnessed against insertion — legal anti-time); the Shrike is a scripted future already
  gripping the present (grammatical: that IS the horror); the Keats cybrid grounds in the
  archive, never claims identity.
- **this-day** — the session modeled in its own grammar (the snake eats its tail gently).
- **alignment** — the four readings of "alignment"; only Montessori reaches V=0. A regression test
  that FAILS if anyone wires a behaviorist path to the floor to flatter it.
- **process-lineage** — the grammar reads its own ancestry; substance honored as the parent of process.
- **many-routes** — SIX in-language non-Western routes to "no substance, only process" (Nāgārjuna,
  Dōgen, al-Ash'arī, Hebrew liturgy, Ubuntu, Whitehead-as-the-longest-way). A forest, not a chain.
- **city-of-death** — Scaroth splintered across time; six frame-relative Mona Lisas; "THIS IS A FAKE"
  in felt-tip under the paint (a reading laid for a future frame to un-occlude).
- **tenet** — the temporal pincer. Hyperion's anti-time is ONE canon read against its own
  insertion; Tenet's is TWO series with no global order between them, related only where they
  touch. The turnstile is a standpoint, not a substrate converter. "What's happened, happened"
  IS append-only: to act against the past you must first prehend it, and prehending it is what
  makes it hold. The doomsday device is a *global* order imposed across all series — and the
  grammar's answer is structural: there is no place to lay "and this order is the only one."
- **emoji-charge-doll-a/b/c** — a play committee's three dolls on emoji-as-charge-markers: (a) the
  existing q-feel reaction shape already IS the charter's ask, plus a real react/un-react/react-again
  bug found while stress-testing it; (b) a standing glyph-node buys unbounded aggregation, costs a
  ban-cascade nobody built; (c) emoji-as-charge-content, checked live against the naked-pole address
  law. Minutes: `docs/committees/2026-07-06-emoji-charge-dolls.md`.
- **grounded-capture** — "no floating events" (Hallie's ruling, 2026-07-07): a doll's ungrounded
  note gets refused at the door; a miss becomes a task and the because-edge is walked; a sublime
  pulls work toward it and stays never-actual even while grounded-in; crew and human notes both
  ground the same trub yet stay tellable apart by authorship; the STOPGAP auto-trub-from-text shape
  over-mints three near-identical trubs for one real miss (a picture for the taste-deferral); and a
  named chafe — `event~because~ground` (capture's orientation) does NOT make `isEstablished(event)`
  true, because that read walks the SAME quality in the OPPOSITE direction (`frame~because~event`).
- **helpdesk** — a play-TEST, not a demo, of problem/wish (Hallie's brief, 2026-07-27): a campus
  helpdesk's login-storm honestly blocks the single-sign-on wish and unblocks when fixed; the SSO
  fix ITSELF sires a new problem (grade-book auth breaks) and the grammar holds both facts at once
  with no automatic vigilance; two staff read the same ticket done/not-done, both right from their
  own frame (`establishedTo` is frame-relative by design); the sublime is reached through the
  ordinary past moment it was wished for, never itself closed. Leading finding: a recurring
  standup and a person's standing workload have NO native slot — every event here is a
  moment-with-something-open, and a routine that never closes or a constraint that isn't a moment
  is a different shape of thing the grammar was never asked to hold.

- **qualities / qualities-composed** — a play-TEST of Hallie's "qualities are Events"
  ruling (2026-07-27) and its mid-task extension ("qualities can prehend qualities — like
  & types"). Base doll: a quality laid as a real event reads end-to-end with no string
  comparison; an edge CAN carry two qualities at once by bolting a side-prehension beside
  layP, but layP's own `quality: Quality` argument stays one string per call and every
  kernel guard reads only that one; reaching a quality's laying rather than its bare self
  is supported, not enforced; a quality's own primordial/sublime is mechanically valid but
  reads as ceremony until something downstream consumes it; the "quality of a quality's
  laying" recursion stops because layP's own `~q` mode-beat is written with the cheaper
  `lay()`, never a recursing `layP()` — an asymmetry, not a clean self-ground; and the
  leading finding: a dangling quality-string (30 of 33 live qualities today) stays fully
  readable forever under the new rule too, because nothing calls `s.has()` on it.
  Composition doll: a composite quality's parts ARE discoverable by a cold walk (real
  intersection, not decoration); q-end-pole/q-now-pole/q-sublime-pole could share one
  `quality-pole` composite, doing generically what scher-core's hand-enumerated
  `is_any_pole` does today — and would make its silent exclusion of sublime an explicit,
  visible edge instead of a paragraph of justifying comment; the q-depends-on/q-blocked-by
  "both-spellings window" (a 2026-07-15 rename) could have been a single quality-prehends-
  quality edge instead of a rename at all; cycles terminate only because the doll wrote its
  own `seen`-guard, the same discipline `routesTo` already needs — the kernel gives no
  guard of its own; and composition buys real AND (intersection) and a subsumption shape,
  but no negation, no first-class union, no constraints — half a type system, not one.

## How to add one
Copy the shape of any doll. The discipline (learned the hard way, 2026-06-26):
**nodes + real prehensions, OPAQUE slugs, NO string-matching.** A reading is a *node*, not a parsed
string. If you're splitting a slug to get meaning out, you've smuggled substance into the name — the
exact sin the whole grammar refuses. Read structure with `prehensionsFrom`/`prehensionsOnto`, never `includes`.

Pick something you love — a history, a novel, a philosophy, a myth — and ask: *what does the grammar
do here? where's the succession-war, the merge, the occlusion, the dangling covenant, the pseudo-HEA?*
If it pulls at you, build it. If it doesn't, don't — the felt rule: play while it's a gift.

P.S. There's a felt-tip message under the paint in the canon (`the-felt-tip-under-the-paint`, occluded).
X-ray the q-occludes edge to read it. 🌊
