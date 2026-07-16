// ─────────────────────────────────────────────────────────────────────────────
// card-reads.ts — the CARD-INTERIOR and CARD-ANATOMY reads: pure (Society, slug) ->
// structural shape, no DOM, no English. Split out of stories.ts (2026-07-15,
// separation-of-concerns pass) — this is the "read family" seam: readCard, the
// provenance anatomy (upstreamsOf/downstreamsOf/tagsOf/readCardInterior), and
// Hallie's three-compartment card anatomy (requiresOf/containsOf/enablesOf/
// readCardAnatomy). Behavior is byte-identical to the code this was cut from;
// only the file boundary moved. stories.ts re-exports everything here at the
// same names, so no importer (barrel, frontend dist path, or test) changes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Society,
  modeAt,
  confidence,
  isOccluded,
  isEstablished,
  prehensionsFrom,
  prehensionsOnto,
  intervalOf,
  endOf,
  isStory,
  type IntervalContext,
  type Mode,
  type Quality,
} from "./society.js";
// reactionsOn/dependsOn: cut from society.ts into pathos.ts/strain.ts (2026-07-15,
// separation-of-concerns pass, society.ts's own advocate) — same names, new source
// files. Following that split here, not re-importing from society.js.
import { reactionsOn } from "./pathos.js";
import { dependsOn } from "./strain.js";

// ── CARD STORY — the READ half ──────────────────────────────────────────────
// Reads ONE beat (its content + its determined mode + its pathos). This is the
// half of cardStory that belongs to scher (a scher-read per the reads/spreads
// boundary, CLEARNESS-reads-spreads.md 2026-07-10: mode-DETECTION is a scher-read
// that "survives clean"; mode-COPY/VISUAL is Penelope taste). cardStory itself
// (the DOM projection) stays in stories.ts.

/** the READ: pure (Society, slug) → structural shape. No English, no symbols — just what's
 *  true of the beat. This is the half of cardStory that belongs to scher (a scher-read per
 *  the reads/spreads boundary, CLEARNESS-reads-spreads.md 2026-07-10: mode-DETECTION is a
 *  scher-read that "survives clean"; mode-COPY/VISUAL is Penelope taste). */
export interface CardRead {
  slug: string;
  content: string;
  mode: Mode;
  conf: number;
  pathos: { key: string; count: number }[];
}

export function readCard(soc: Society, slug: string): CardRead {
  const beat = soc.get(slug);
  // TODO(socratic): why does modeAt return something that needs `as Mode` cast — is the query's return type too wide, or is modeAt sometimes returning a non-Mode value that should be caught?
  return {
    slug,
    content: beat?.content ?? `(no beat: ${slug})`,
    mode: modeAt(soc, slug) as Mode,
    conf: confidence(soc, slug),
    pathos: reactionsOn(soc, slug),
  };
}

// ── CARD-INTERIOR READS — upstreams / downstreams / tags ────────────────────────
// Hallie's card anatomy (fleet-card-anatomy sketch, 2026-07-10): ↑UPSTREAMS (the
// ~because~-in bearings), the name+description+TAGS edge-strip, ↓DOWNSTREAMS (this
// event's own light-cone out). All three are pure (Society, slug) -> shape reads —
// no DOM, no English, same discipline as readCard/readEventView. Board.ts's
// computeUpstreamDownstream (event-3037, the Faraday-cage rule) did this ad hoc,
// app-side, duplicating a read that belongs here — upstreamsOf/downstreamsOf are
// that read PROMOTED to scher so board.ts (and any future caller: a minimap, a
// triage card) gets it for free instead of re-deriving the because-edge walk.
//
// FARADAY-CAGE RULE preserved exactly: only a beat's OWN direct because-edges show
// — closing-edges (the End-pole machinery) are structural plumbing, not a real
// relationship, and are filtered here at the read, not left to every caller to
// remember to filter.
// UPSTREAM = everything that leads to a beat, by CAUSE or by ORIENTATION.
// Two qualities carry that: q-grounding (a note grounds in its cause) and the bare
// "because" bearing (a note/aim ORIENTS toward a user-story or higher aim — the
// bear-toward door, api/src/bujo_write.rs, 2026-07-10). Hallie's ruling (2026-07-10):
// "inside a story ≠ orienting toward a user-story" — that distinction lives at the
// STORY-MEMBERSHIP layer (loose vs inside), NOT here. On the CARD, both a cause and a
// bearing are simply "directly upstream," so the card's up/down read walks BOTH. (The
// card should show a todo's user-story and, on the user-story, what's directly upstream.)
const UPSTREAM_QUALITIES: Quality[] = ["q-grounding", "because"];

// FIX (2026-07-15, whole-codebase review sitting, tension hea-filter-mismatch): this
// used to filter by slug prefix (`!o.startsWith("hea-")`), on the assumption that
// every End-pole's slug looks like `hea-*`. It doesn't — the sitting's clerk confirmed
// TWO coexisting End-pole naming conventions live in the same canon: unpackPoles's own
// default mints `${event}~hea` (a SUFFIX), while the API layer's callers mint `hea-*`
// (a PREFIX, see day-as-story.test.ts's captureIntoDay). The prefix filter caught one
// convention and silently let the other leak into upstreams/downstreams. Per QUERIES.md
// (opaque slugs, no string-matching) and tagsOf's own exemplar just below: read the
// STRUCTURE instead of a name. A node is an End-pole iff it is the OBJECT of a live
// (un-occluded) q-end-pole designation — exactly what society.ts's (unexported)
// isOpenEndPole checks, minus the endActual exclusion (a CLOSED End-pole is still
// closing-machinery, not a real relationship, so it stays filtered here too).
function isEndPole(soc: Society, node: string, asOf?: number): boolean {
  return prehensionsOnto(soc, node, "q-end-pole", asOf).length > 0;
}

/** upstreamsOf: events THIS beat leads FROM — by cause (q-grounding) OR by orientation
 *  ("because" bearing toward an aim/user-story). The ~because~-in bearings a reader
 *  climbs to see why / what this serves. Closing-edges (End-poles, any naming
 *  convention) excluded structurally — see isEndPole above. Deduped. */
export function upstreamsOf(soc: Society, slug: string, asOf?: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of UPSTREAM_QUALITIES) {
    for (const p of prehensionsFrom(soc, slug, q, asOf)) {
      const o = p.object;
      if (o && !isEndPole(soc, o, asOf) && !seen.has(o)) { seen.add(o); out.push(o); }
    }
  }
  return out;
}

/** downstreamsOf: events that lead TO this beat — by cause (q-grounding) OR by
 *  orientation ("because" bearing). This event's own light-cone out / what orients
 *  toward it (on a user-story: its direct upstream bearers). Closing-edges excluded
 *  structurally — see isEndPole above. Each entry is a candidate DOWNSTREAM ROW per
 *  the card anatomy: a superject-face reading of that event, rendered as a bordered
 *  sub-card by the caller's taste arm. */
export function downstreamsOf(soc: Society, slug: string, asOf?: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of UPSTREAM_QUALITIES) {
    for (const p of prehensionsOnto(soc, slug, q, asOf)) {
      const s = p.subject;
      if (s && !isEndPole(soc, s, asOf) && !seen.has(s)) { seen.add(s); out.push(s); }
    }
  }
  return out;
}

/** tagsOf: this beat's ad-hoc qualities, laid through the q-tag- / q-collection-
 *  reserved-prefix door (cf47da6, api/src/bujo_write.rs) — a bujo SECTION is a
 *  story-plus-a-quality (q-collection-shopping), and a bare tag is q-tag-<name>.
 *  Reads the quality VALUE off each prehension touching this beat (either side —
 *  a tag can be laid subject=beat or object=beat, same as any lateral edge) and
 *  keeps only the ones matching the reserved prefixes. This is reading structured
 *  data (the quality field, via prehendsAs's own `~q` convention), never parsing a
 *  slug — the QUERIES.md discipline this file already holds throughout. Returns
 *  the bare tag name (the quality string with its reserved prefix stripped) once
 *  per distinct tag, occluded prehensions excluded. */
export interface TagRead {
  /** the bare tag name, prefix stripped (e.g. "shopping" from "q-collection-shopping"). */
  name: string;
  /** which reserved door this tag came through. */
  kind: "tag" | "collection";
  /** the full quality string, for a caller that wants to re-query or re-lay it. */
  quality: string;
}

const TAG_PREFIX = "q-tag-";
const COLLECTION_PREFIX = "q-collection-";

export function tagsOf(soc: Society, slug: string, asOf?: number): TagRead[] {
  const seen = new Set<string>();
  const out: TagRead[] = [];
  const touching = soc.all().filter(
    (b) => (b.subject === slug || b.object === slug) && b.subject !== null && b.object !== null,
  );
  for (const p of touching) {
    if (isOccluded(soc, p.slug, asOf)) continue;
    const q = soc.get(`${p.slug}~q`);
    if (!q) continue;
    const quality = q.object;
    if (!quality) continue;
    let kind: TagRead["kind"] | null = null;
    let name = "";
    if (quality.startsWith(TAG_PREFIX)) { kind = "tag"; name = quality.slice(TAG_PREFIX.length); }
    else if (quality.startsWith(COLLECTION_PREFIX)) { kind = "collection"; name = quality.slice(COLLECTION_PREFIX.length); }
    if (!kind || seen.has(quality)) continue;
    seen.add(quality);
    out.push({ name, kind, quality });
  }
  return out;
}

/** readCardInterior: the READ the card's interior mode needs, assembled — the
 *  same beat-level facts readCard already reads (content/mode/pathos) PLUS the
 *  three anatomy reads above. One call for eventview.ts's interior arm to build
 *  the whole card from, instead of four separate reads each re-deriving. */
export interface CardInteriorRead extends CardRead {
  upstreams: string[];
  downstreams: string[];
  tags: TagRead[];
}

export function readCardInterior(soc: Society, slug: string, asOf?: number): CardInteriorRead {
  return {
    ...readCard(soc, slug),
    upstreams: upstreamsOf(soc, slug, asOf),
    downstreams: downstreamsOf(soc, slug, asOf),
    tags: tagsOf(soc, slug, asOf),
  };
}

// ── REQUIRES / CONTAINS / ENABLES — Hallie's card anatomy (fleet-card-anatomy
// sketch, HALLIE-SKETCH-requires-contains-enables.png; verified muslin at
// from-ithaca-muslins/recess-cards/card-v1.html). Three reads, ONE new, two reused
// — see the doc on each for why. This is the read CONTRACT board.ts/cblock-skins.css
// compose against; the shapes below are final unless a real render need reshapes them.
//
// THE SEAM (surfaced, not guessed past): does REQUIRES = upstreamsOf? NO — and this
// is the one genuinely new read here. upstreamsOf/downstreamsOf walk q-grounding +
// "because": a CALM, ALREADY-RESOLVED provenance read ("what this beat already
// grabbed / climbed from," "why this exists"). Hallie's REQUIRES is a different verb
// entirely: "the events this beat must RECEIVE to be true" — the REDUCTION. A story
// IS the events it must receive; REQUIRES asks which of those it has NOT yet received.
// That is an OWED / met-vs-pending question, structurally distinct from "already
// happened, upstream of me" — upstreamsOf cannot answer it (a beat's upstreams are, by
// construction, already-landed prehensions; there is no "pending upstream"). The
// q-blocked-by family (dependsOn/blockedOnNow, society.ts ~570; RENAMED from q-depends-on,
// Hallie 2026-07-15 — both spellings still honored on read) is the correct
// substrate: it is EXACTLY "beats this one is waiting to receive," with isEstablished
// as the met/pending discriminant already built in. requiresOf below is that read,
// promoted to the card-anatomy shape (met flag inline, so a caller doesn't need two
// calls to render "struck-through=met, highlighted=pending" — the v1 muslin's own
// finding, corroborated independently by the v1 builder).

/** one REQUIRES row: a required event + whether it has been received (met) yet. */
export interface RequiresRow {
  slug: string;
  /** has this required event been established (received)? true = met (render
   *  struck-through per the muslin); false = still owed (render highlighted/pending). */
  met: boolean;
}

/** requiresOf: the events this beat must RECEIVE to be true — its q-blocked-by
 *  edges (dependsOn; both-spellings, legacy q-depends-on honored too — society.ts's
 *  rename doc), each carrying its own met/pending state (isEstablished).
 *  NEW READ (not a reuse of upstreamsOf — see the seam note above). Ordering:
 *  dependsOn's own edge order (no stored index — topological/insertion, not a rank). */
export function requiresOf(soc: Society, slug: string, asOf?: number): RequiresRow[] {
  return dependsOn(soc, slug, asOf).map((r) => ({ slug: r, met: isEstablished(soc, r, asOf) }));
}

/** containsOf: this beat's interior members — a REUSE, not a new read. CONTAINS is
 *  exactly what frameStory/readCardInterior already call "the interval minus its own
 *  lips": intervalOf(once, end) filtered to interior, which is membership read as
 *  BETWEENNESS (not ~holds~ string-match — ~holds~ is deprecated per the settled
 *  ontology, and this read never touches it). A leaf beat (isStory=false) has no
 *  interior at all — CONTAINS is empty, not an error; the card still opens, just with
 *  an empty middle compartment (mirrors the muslin's task-kind example: "no interior
 *  members — a task can be a leaf"). Depth is the caller's concern (eventview.ts's
 *  existing INLINE_OPEN_DEPTH_CAP / frameStory's depth<1 cap) — this read returns ONE
 *  level flat, same discipline as upstreamsOf/downstreamsOf returning flat slug lists. */
export function containsOf(soc: Society, slug: string, asOf?: number, ctx?: IntervalContext): string[] {
  // Optional ctx = intervalContext(soc), valid only for this exact soc — a per-paint
  // derivation the caller passes explicitly; absent, intervalOf builds it internally.
  if (!isStory(soc, slug)) return [];
  const end = endOf(soc, slug);
  if (!end) return [];
  return intervalOf(soc, slug, end, ctx).filter((b) => b !== slug && b !== end);
}

/** enablesOf: what this beat makes possible / grounds forward, toward V=0 (the sea).
 *  A REUSE, not a new read: this is downstreamsOf, renamed at the call site to match
 *  Hallie's anatomy vocabulary. downstreamsOf ALREADY reads "events that lead TO this
 *  beat" via the same q-grounding+because walk, forward-facing exactly as ENABLES
 *  wants — the muslin's own REAL-INTEGRATION MAP calls this "the closest 1:1 match of
 *  any compartment to existing code," and reading the ontology confirms it: no new
 *  substrate needed. Kept as a thin alias (not a re-export of the bare name) so a
 *  caller composing the three-compartment contract can import requiresOf/containsOf/
 *  enablesOf as one matched family, without upstreamsOf/downstreamsOf's older
 *  provenance-flavored names leaking into card-anatomy call sites. */
export function enablesOf(soc: Society, slug: string, asOf?: number): string[] {
  return downstreamsOf(soc, slug, asOf);
}

/** readCardAnatomy: the READ contract for Hallie's three-compartment card — one call
 *  assembling requiresOf/containsOf/enablesOf (+ the base beat facts) for board.ts's
 *  buildCardInterior and cblock-skins.css's compartment layout to compose against.
 *  Mirrors readCardInterior's shape/spirit (upstreams/downstreams/tags) but is NOT a
 *  replacement for it — readCardInterior's provenance anatomy (↑upstreams / ↓downstreams
 *  / tags) is a different, still-live reading (eventview.ts's interior mode uses it
 *  today); this is the NEW three-compartment reading Hallie's sketch asks for. Both may
 *  coexist on a card until/unless Penelope's render decides to retire one — that
 *  retirement is a Penelope-taste/board.ts call, not scher's to make here. */
export interface CardAnatomyRead extends CardRead {
  requires: RequiresRow[];
  contains: string[];
  enables: string[];
}

export function readCardAnatomy(soc: Society, slug: string, asOf?: number, ctx?: IntervalContext): CardAnatomyRead {
  // Optional ctx = intervalContext(soc), valid only for this exact soc (per-paint derivation).
  return {
    ...readCard(soc, slug),
    requires: requiresOf(soc, slug, asOf),
    contains: containsOf(soc, slug, asOf, ctx),
    enables: enablesOf(soc, slug, asOf),
  };
}
