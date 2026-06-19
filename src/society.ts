// ─────────────────────────────────────────────────────────────────────────────
// society.ts — the SOCIETY. "A Stor(e|y) is a society with determined values read
// from observation."
//
// This is the gen3 substance, client-side: an append-only log of beats. It is NOT
// a key/value store. You never overwrite. The ONLY write is lay(). A "value" is not
// held here — it is READ from here (see reads below: mode_at, confidence, …). State
// "changes" only by appending; every reader re-derives. Versioning/rollback/audit
// are free because they are what an append-only society IS (git, for meaning).
//
// The client society is a local CONE of the real gen3 canon. It mirrors what we've
// fetched + what we've optimistically laid; sync.ts reconciles it with the server.
// ─────────────────────────────────────────────────────────────────────────────

import { Cell, type Read } from "./cell.js";

/** A beat: the one shape. With subject+object it IS a prehension (an edge). A quality
 *  beat (slug ending '~q', object a q-*) carries mode. Mirrors gen3.beat exactly. */
export interface Beat {
  slug: string;
  content: string;
  subject: string | null;
  object: string | null;
  /** when the local society witnessed this beat (the client's own db_witnessed). */
  witnessed?: number;
}

/** The qualities a prehension can co-prehend (the mode it carries). Mirrors gen3. */
export type Quality =
  | "q-grounding"
  | "q-lure"
  | "q-exclusion"
  | "q-utterance"
  | "q-feel"
  | "q-containment"
  | "q-shared";

/** A beat reads as one of these modes, from a standpoint. Not stored — derived. */
export type Mode = "established" | "scripted";

// ── the society itself ───────────────────────────────────────────────────────

/** An append-only society of beats. The only write is lay(). Readers observe `rev`
 *  (a monotonically-rising revision) and re-derive when it changes — so a Cell over
 *  the society re-projects on any append, exactly like gen3's status-read-not-stored. */
export class Society {
  readonly #beats = new Map<string, Beat>();
  /** rev bumps on every genuine append; Cells subscribe to it to know to re-read. */
  readonly rev: Cell<number>;
  #clock = 0;

  constructor(seed: ReadonlyArray<Beat> = []) {
    this.rev = new Cell(0);
    for (const b of seed) this.#insert(b);
  }

  // the one write. append-only: lay() of an existing slug is INERT (ON CONFLICT DO
  // NOTHING — mirrors gen3.lay). You never overwrite; you supersede with a NEW beat.
  #insert(b: Beat): boolean {
    if (this.#beats.has(b.slug)) return false;
    this.#beats.set(b.slug, { ...b, witnessed: b.witnessed ?? ++this.#clock });
    return true;
  }

  /** LAY a beat into the society (the only write — append-only). Returns true if it
   *  was a genuine append (new slug), false if inert (slug already present). */
  lay(b: Beat): boolean {
    const appended = this.#insert(b);
    if (appended) this.rev.set(this.rev.get() + 1);
    return appended;
  }

  /** LAY a prehension (a beat that is an edge) co-prehending a quality. This is the
   *  lay_p of the client: it lays the prehension AND its '~q' mode-beat, exactly like
   *  gen3.lay_p, so the reads below see the mode. */
  layP(slug: string, content: string, subject: string, object: string, quality: Quality): boolean {
    const a = this.lay({ slug, content, subject, object });
    const q = this.lay({ slug: slug + "~q", content: `${content} [${quality}]`, subject: slug, object: quality });
    return a || q;
  }

  /** Bulk-lay (e.g. a fetched canon, or a seed package). One rev bump for the batch. */
  layAll(beats: ReadonlyArray<Beat>): void {
    let any = false;
    for (const b of beats) any = this.#insert(b) || any;
    if (any) this.rev.set(this.rev.get() + 1);
  }

  get(slug: string): Beat | undefined {
    return this.#beats.get(slug);
  }

  /** All beats (a snapshot; do not mutate). */
  all(): Beat[] {
    return [...this.#beats.values()];
  }

  has(slug: string): boolean {
    return this.#beats.has(slug);
  }

  get size(): number {
    return this.#beats.size;
  }
}

// ── THE READS (gen3's reads, ported to TS over the local society) ──────────────
// These are the determined-value functions a Cell reads. They are pure over the
// society's current beats. A content beat is a beat with subject===null and slug not
// ending '~q'. A prehension P co-prehends quality Q iff there's a beat `${P.slug}~q`
// whose object is Q.

/** Does prehension P (a beat slug) co-prehend the given quality? */
export function prehendsAs(soc: Society, pslug: string, quality: Quality): boolean {
  const q = soc.get(pslug + "~q");
  return !!q && q.object === quality;
}

/** Every prehension reaching `beat` as object, co-prehending `quality`. Returns the
 *  prehension beats (whose `subject` is the frame/standpoint that laid it). */
export function prehensionsOnto(soc: Society, beat: string, quality: Quality): Beat[] {
  return soc.all().filter(
    (b) => b.object === beat && b.subject !== null && prehendsAs(soc, b.slug, quality),
  );
}

/** is a beat SUPERSEDED? — append-only undo. A supersede is a beat whose subject AND
 *  object are the SAME target (a self-pointing beat onto the thing it cancels). The
 *  superseded beat STAYS IN INK; this read just ignores it. (Mirrors the retro runner's
 *  supersede pattern: lay(sup, …, target, target).) */
export function isSuperseded(soc: Society, target: string): boolean {
  return soc.all().some((b) => b.subject === target && b.object === target && b.slug !== target);
}

/** is_established: a beat is established iff some NON-superseded grounding-prehension
 *  reaches it. Uncheck = supersede the grounding → this re-reads as scripted, but the
 *  grounding (and its supersede) both remain in the society. Append-only undo. */
export function isEstablished(soc: Society, beat: string): boolean {
  return prehensionsOnto(soc, beat, "q-grounding").some((p) => !isSuperseded(soc, p.slug));
}

/** mode_at: the establishment-mode read of a beat, now, from this society. */
export function modeAt(soc: Society, beat: string): Mode {
  return isEstablished(soc, beat) ? "established" : "scripted";
}

/** confidence: weighted polarity-aware read in [0,1] — groundings vs exclusions.
 *  (Unweighted client version: every prehension weight 1. The phase/frame weighting
 *  lives server-side; this is the local approximation the UI reads optimistically.) */
export function confidence(soc: Society, beat: string): number {
  const g = prehensionsOnto(soc, beat, "q-grounding").length;
  const e = prehensionsOnto(soc, beat, "q-exclusion").length;
  if (g + e === 0) return 0;
  return g / (g + e);
}

/** grounded_by / excluded_by: WHO grounded/excluded — the subject (frame) of each
 *  grounding/exclusion prehension. Frame-on-grounding, read client-side. */
export function groundedBy(soc: Society, beat: string): string[] {
  return prehensionsOnto(soc, beat, "q-grounding").map((p) => p.subject!).filter(Boolean);
}
export function excludedBy(soc: Society, beat: string): string[] {
  return prehensionsOnto(soc, beat, "q-exclusion").map((p) => p.subject!).filter(Boolean);
}

/** pathos: the q-feel reactions on a beat — emoji + count + who. The star/charge read. */
export interface Pathos {
  emoji: string;
  count: number;
  by: string[];
}
export function pathosOf(soc: Society, beat: string): Pathos[] {
  const feels = prehensionsOnto(soc, beat, "q-feel");
  const byEmoji = new Map<string, Pathos>();
  for (const p of feels) {
    const emoji = p.content.trim();
    if (!emoji) continue;
    const cur = byEmoji.get(emoji) ?? { emoji, count: 0, by: [] };
    cur.count++;
    if (p.subject) cur.by.push(p.subject);
    byEmoji.set(emoji, cur);
  }
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}

/** is_story: does `beat` lure to a beat whose slug contains 'end'? (gen3's read.) */
export function isStory(soc: Society, beat: string): boolean {
  return soc.all().some(
    (b) => b.subject === beat && (b.object?.includes("end") ?? false) && prehendsAs(soc, b.slug, "q-lure"),
  );
}

/** content beats: subject===null and not a '~q' mode-beat. The "things", not the edges. */
export function contentBeats(soc: Society): Beat[] {
  return soc.all().filter((b) => b.subject === null && !b.slug.endsWith("~q"));
}

/** interval_of: the causal diamond between a Once and an End — the forward-cone of
 *  `once` ∩ the backward-cone of `end`, following plain (non-quality) prehension edges.
 *  This is the BODY of a Story (what a Clamp brackets). Ported from gen3.interval_of. */
export function intervalOf(soc: Society, once: string, end: string): string[] {
  // plain edges: a prehension whose object isn't a q-* and which isn't a ~q mode-beat.
  const edges = soc.all().filter(
    (b) => b.subject !== null && b.object !== null && !b.object.startsWith("q-") && !b.slug.endsWith("~q"),
  );
  const reach = (from: string, dir: "fwd" | "bwd"): Set<string> => {
    const seen = new Set<string>([from]);
    const stack = [from];
    while (stack.length) {
      const n = stack.pop()!;
      for (const e of edges) {
        const next = dir === "fwd" ? (e.subject === n ? e.object : null)
                                   : (e.object === n ? e.subject : null);
        if (next && !seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    return seen;
  };
  const fwd = reach(once, "fwd");
  const bwd = reach(end, "bwd");
  return [...fwd].filter((n) => bwd.has(n));
}

/** the End-beat a story lures toward (the slug containing 'end' it q-lures to), if any. */
export function endOf(soc: Society, story: string): string | null {
  const lure = soc.all().find(
    (b) => b.subject === story && (b.object?.includes("end") ?? false) && prehendsAs(soc, b.slug, "q-lure"),
  );
  return lure?.object ?? null;
}

/** author_of: the subject of a q-utterance prehension onto `beat` (who said it). */
export function authorOf(soc: Society, beat: string): string | null {
  const utt = prehensionsOnto(soc, beat, "q-utterance")[0];
  return utt?.subject ?? null;
}
