// ─────────────────────────────────────────────────────────────────────────────
// ingress.ts — the boundary where outside data BECOMES a society, and where a
// society becomes outside data again.
//
// Hallie, 2026-07-30: "in general having an ingressWrapper that can create a
// scher state that goes to and from some serializable JSON-schema-style type
// to a scher gist for serialization."
//
// The word is already scher's. ARCHITECTURE.md, on the auth seam: "deriveFrame
// at the app's edge is exactly the INGRESSION: the outside becomes an occasion,
// and that occasion is the frame." Same move, generalized: a JSON blob is not
// a society, and it does not become one by being parsed. It becomes one by
// INGRESSING — by being laid, as beats, BY someone, AT a moment.
//
// WHY THIS IS NOT JUST (de)serialize
// ----------------------------------
// The tempting version is `JSON.parse` → walk → `soc.lay`. It works and it
// throws away the two things that make the society worth having:
//
//   * WHO. Imported beats need a laid_by, and the honest answer is not the
//     original author — it is "ingressed from <source> by <frame>". Claiming
//     the original author would forge provenance the import cannot vouch for.
//   * WHEN. An import is one moment, not a replay of the original moments.
//     Faking the original clocks would make as-of reads lie about a past this
//     society never witnessed.
//
// So `ingress` records the import AS AN EVENT, and every imported beat points
// at it. You can always ask "where did this come from" and get an answer that
// is true.
//
// ROUND-TRIP IS NOT SYMMETRIC, AND THAT IS CORRECT
// ------------------------------------------------
// egress(ingress(json)) === json  — yes, for the declared fields.
// ingress(egress(soc)) === soc    — NO, and it must not be. The second society
// knows it was imported; the first did not. That extra beat is not noise, it
// is the truth. A round-trip that erased it would be lying to look tidy.
// ─────────────────────────────────────────────────────────────────────────────

import { Society, type EventRow } from "scher/society";
import { gistOf } from "scher/stories";

/** A field in a shape. Deliberately tiny — this is a mapping, not a validator;
 *  bring zod/ajv if you want real schema enforcement at the edge. */
export interface Field {
  /** where the value lives in the JSON object. */
  from: string;
  /** what it becomes on the beat. */
  to: "slug" | "title" | "content" | "data";
}

/** How one kind of JSON object becomes beats. */
export interface Shape<T = any> {
  /** the kind's name — becomes part of the slug namespace. */
  kind: string;
  /** stable identity within the kind. Deriving slugs from it (rather than
   *  generating) makes a re-import INERT rather than duplicating, because
   *  laying an existing slug is a no-op under the append-only law. */
  id: (o: T) => string;
  title?: (o: T) => string | null;
  content: (o: T) => string;
  /** edges out of this object: (quality, target-slug) pairs. */
  edges?: (o: T) => Array<{ quality: string; to: string; content?: string }>;
  /** children to ingress recursively, with their own shape. */
  children?: (o: T) => Array<{ shape: Shape<any>; items: any[] }>;
}

export interface IngressParams {
  /** WHO is importing. Required — an anonymous import is a provenance hole. */
  by: string;
  /** WHERE it came from: a filename, a URL, "editor export", a paste. */
  source: string;
  /** optional: the ingression beat's own slug, if you want it stable. */
  slug?: string;
}

export interface Ingression {
  /** the beat that records the import itself. Everything imported points here. */
  slug: string;
  /** slugs laid by this ingression (not counting ones that were already there). */
  laid: string[];
  /** slugs that were already present — a re-import is inert, and says so. */
  inert: string[];
}

/** The quality marking "this beat came in via that ingression." */
export const Q_INGRESSED = "q-ingressed-from";

// ── IN ──────────────────────────────────────────────────────────────────────

/**
 * Bring JSON into a society. Records the import as an event; every imported
 * beat prehends it, so provenance is answerable rather than assumed.
 */
export function ingress<T>(soc: Society, shape: Shape<T>, items: T[],
                           params: IngressParams): Ingression {
  const n = soc.all().filter((r) => r.slug.startsWith("ingress-")).length;
  const ingressSlug = params.slug ?? `ingress-${shape.kind}-${n}`;

  soc.lay({
    slug: ingressSlug,
    content: `ingressed ${items.length} ${shape.kind} from ${params.source}`,
    title: `import: ${params.source}`,
    subject: null, object: null,
    laid_by: params.by,
  });

  const out: Ingression = { slug: ingressSlug, laid: [], inert: [] };
  for (const item of items) ingressOne(soc, shape, item, params, ingressSlug, out);
  return out;
}

function ingressOne<T>(soc: Society, shape: Shape<T>, item: T,
                       params: IngressParams, ingressSlug: string, out: Ingression): string {
  const slug = `${shape.kind}-${shape.id(item)}`;
  const already = !!soc.get(slug);

  soc.lay({
    slug,
    content: shape.content(item),
    title: shape.title?.(item) ?? null,
    subject: null, object: null,
    // NOT the original author: the honest claim is who ingressed it.
    laid_by: params.by,
  });
  (already ? out.inert : out.laid).push(slug);

  // point at the import, so "where did this come from" always has an answer.
  if (!already)
    soc.layP(`${slug}~ing`, `from ${params.source}`, slug, ingressSlug, Q_INGRESSED);

  for (const e of shape.edges?.(item) ?? [])
    soc.layP(`${slug}~${e.quality}~${e.to}`, e.content ?? e.quality, slug, e.to, e.quality);

  for (const group of shape.children?.(item) ?? [])
    for (const child of group.items)
      ingressOne(soc, group.shape, child, params, ingressSlug, out);

  return slug;
}

// ── OUT ─────────────────────────────────────────────────────────────────────

/** A serialized society: beats plus what produced them. */
export interface Egress {
  /** the schema-ish descriptor, so a reader knows what they have. */
  kind: string;
  version: 1;
  /** when this egress was taken, in the SOCIETY's clock — not wall time, which
   *  the society does not have and should not invent. */
  atWitnessed: number;
  beats: EventRow[];
  /** a gist per exported story, if bounds were given: the surface, told short. */
  gists?: Array<{ once: string; end: string; interior: string[]; at: number; stale: boolean }>;
}

/**
 * Take the whole society out as JSON. Optionally include gists for named
 * story bounds — the packed surface beside the full interior, so a consumer
 * that only wants the summary does not have to re-fold everything.
 */
export function egress(soc: Society, kind: string,
                       stories?: Array<{ once: string; end?: string }>): Egress {
  const beats = soc.all();
  const atWitnessed = beats.reduce((m, b) => Math.max(m, b.witnessed ?? 0), 0);

  const gists = stories?.map(({ once, end }) => {
    const g = gistOf(soc, once, end);
    return { once: g.once, end: g.end, interior: g.interior, at: g.at, stale: g.stale };
  });

  return { kind, version: 1, atWitnessed, beats, gists };
}

/**
 * Rehydrate an egress. NOTE the asymmetry, and that it is deliberate: this
 * lays an ingression beat, so the rehydrated society KNOWS it was imported.
 * `ingress(egress(soc))` is not `soc`, and a round-trip that erased the
 * difference would be lying to look tidy.
 */
export function rehydrate(soc: Society, dump: Egress, params: IngressParams): Ingression {
  const shape: Shape<EventRow> = {
    kind: dump.kind,
    id: (b) => b.slug,
    title: (b) => b.title ?? null,
    content: (b) => b.content,
  };
  // lay plain beats first so edges have something to point at.
  const plain = dump.beats.filter((b) => b.subject === null && b.object === null);
  const edges = dump.beats.filter((b) => b.subject !== null && b.object !== null);

  const out = ingress(soc, { ...shape, id: (b) => b.slug.replace(`${dump.kind}-`, "") },
                      plain, params);
  for (const e of edges) {
    soc.lay({ ...e, laid_by: params.by });
    out.laid.push(e.slug);
  }
  return out;
}

// ── the wrapper ─────────────────────────────────────────────────────────────

/**
 * `ingressWrapper` — bind a shape once, get a typed door in and out.
 *
 *   const doorway = ingressWrapper(soc, CHARACTER_SHAPE);
 *   doorway.in(json.chars, { by: "frame-me", source: "editor export" });
 *   const dump = doorway.out();
 */
export function ingressWrapper<T>(soc: Society, shape: Shape<T>) {
  return {
    soc,
    shape,
    in: (items: T[], params: IngressParams) => ingress(soc, shape, items, params),
    out: (stories?: Array<{ once: string; end?: string }>) => egress(soc, shape.kind, stories),
    /** did this beat come from an import, and which one? */
    provenanceOf: (slug: string): string | null => {
      const e = soc.all().find((r) => r.subject === slug && r.object?.startsWith("ingress-"));
      return e?.object ?? null;
    },
  };
}
