// ─────────────────────────────────────────────────────────────────────────────
// counted.ts — the general structure `stack-inventory` turned out to be an
// instance of.
//
// Hallie, 2026-07-30: "do we want a data structure that wraps an inventory and
// automatically attaches a scher-state variable to integer counts, has stack
// limits, maps to sections? … we might want genuinely scher-native data
// structures."
//
// A COUNTED is: keys whose values are FOLDED from delta-beats, optionally
// capped, optionally partitioned into sections. That is all. Its instances:
//
//   inventory      keys are items, sections are bags, cap is stack size
//   resume keys    keys are emoji, no cap, sections are resume lines
//   hp / currency  one key, a cap, no sections
//   a hand         keys are moves, cap is hand size, sections hand/deck/discard
//   appetition     keys are motivators, counted in a cone
//
// Five consumers, which is well past the two-consumer bar this package sets
// for itself.
//
// WHAT MAKES IT SCHER-NATIVE RATHER THAN A MAP WITH EXTRA STEPS
// -------------------------------------------------------------
//  1. THE VALUE IS NEVER STORED. `valueOf` folds delta-beats every read. There
//     is no field that can drift from its history, because there is no field.
//  2. MEMBERSHIP IS BETWEENNESS, NOT A FIELD. A section is a bounded interval;
//     which section a key sits in is READ by position, never written onto the
//     key. So moving between sections is an append, not a mutation — and the
//     move is in the history like everything else.
//  3. UNDO IS OCCLUSION. Occlude a delta-beat and the value re-folds. No undo
//     stack exists, because the log already is one.
//  4. AS-OF IS FREE. Every read takes a clock; the past is a read, not a
//     snapshot you kept.
//
// SEAM — the honest one: scher-state (Rust) already rasterizes typed key/value
// over a succession chain. This is the same operation in TypeScript, and the
// two could drift. The right long-term answer is probably one implementation
// compiled to WASM (scher-core-wasm exists), with this as the reference. Named
// now rather than discovered later.
// ─────────────────────────────────────────────────────────────────────────────

import { Society, isOccluded } from "scher/society";

/** A key in a Counted. Opaque — never parsed for meaning (no string-matching
 *  on slugs; that is the discipline scher's CLAUDE.md names explicitly). */
export type Key = string;

// Constants and slug schemes are GENERATED from the Rust kernel — the parts
// that drift silently (a renamed quality or a changed scheme does not throw,
// it just makes the fold read nothing, which looks like "you have zero").
// Regenerate: node scripts/generate-from-rust.mjs · CI check: --check
export { Q_COUNTS, Q_IN_SECTION } from "./counted.generated.js";
import { deltaPrefix, placePrefix, Q_COUNTS as Q_COUNTS_V,
         Q_IN_SECTION as Q_IN_SECTION_V } from "./counted.generated.js";

export interface CountedSpec {
  /** namespace: whose counted is this. Two holders never share by accident. */
  holder: string;
  /** per-key cap. A number applies to every key; a function lets one key differ.
   *  Over-cap writes are REFUSED, never silently clamped — a clamped write is a
   *  lie the history cannot show. */
  cap?: number | ((key: Key) => number | undefined);
  /** the named sections, in display order. Omit for an unsectioned counted. */
  sections?: string[];
  /** default section for a newly-counted key. */
  defaultSection?: string;
}

export interface CountedRead {
  /** read as of this clock; omit for now. */
  asOf?: number;
  /** keep keys that folded to zero (a WoW bag keeps the empty slot). */
  keepEmpty?: boolean;
}

/** One counted key, folded. */
export interface Counted {
  key: Key;
  label: string;
  value: number;
  /** which section it is in, READ by placement — never a stored field. */
  section: string | null;
  cap?: number;
  /** the deltas that produced the value, newest first. */
  from: Array<{ slug: string; delta: number; by: string | null; at: number }>;
}

const capFor = (spec: CountedSpec, key: Key): number | undefined =>
  typeof spec.cap === "function" ? spec.cap(key) : spec.cap;

// ── WRITES: every one of them is an append ──────────────────────────────────

/** Add `delta` to a key (negative to subtract).
 *  Returns the beat slug, or null if refused. */
export function count(soc: Society, spec: CountedSpec, key: Key,
                      delta: number, by?: string): string | null {
  if (!Number.isFinite(delta) || delta === 0) return null;

  const now = valueOf(soc, spec, key);
  if (now + delta < 0) return null;                       // never below zero
  const cap = capFor(spec, key);
  if (cap !== undefined && now + delta > cap) return null; // refuse, not clamp

  const n = deltaBeats(soc, spec.holder, key).length;
  const slug = `${deltaPrefix(spec.holder, key)}${n}`;
  soc.lay({
    // the delta is the beat's own content: self-describing, so the fold never
    // has to consult a second place.
    slug, content: String(delta), title: null,
    subject: null, object: null, laid_by: by ?? null,
  });
  soc.layP(`${slug}~c`, `${delta > 0 ? "+" : ""}${delta} ${key}`, slug, key, Q_COUNTS_V);

  // first sighting of a key lands it in the default section, as an append.
  if (spec.defaultSection && sectionOf(soc, spec, key) === null)
    place(soc, spec, key, spec.defaultSection, by);

  return slug;
}

/** Put a key in a section. An APPEND — the newest placement wins the read, and
 *  every previous placement stays visible in history. */
export function place(soc: Society, spec: CountedSpec, key: Key,
                      section: string, by?: string): string | null {
  if (spec.sections && !spec.sections.includes(section)) return null;
  const n = placementBeats(soc, spec.holder, key).length;
  const slug = `${placePrefix(spec.holder, key)}${n}`;
  soc.lay({ slug, content: section, title: null, subject: null, object: null, laid_by: by ?? null });
  soc.layP(`${slug}~p`, `${key} → ${section}`, slug, key, Q_IN_SECTION_V);
  return slug;
}

/** Move `n` of a key from one section to another. Split-friendly: moving part
 *  of a stack spends here and acquires there, so both halves keep provenance. */
export function moveBetween(soc: Society, spec: CountedSpec, key: Key,
                            to: string, by?: string): string | null {
  return place(soc, spec, key, to, by);
}

/** Undo any counted write: occlude it and the value re-folds. */
export function undo(soc: Society, slug: string, lesson: string, by?: string): string | null {
  if (!soc.get(slug) || !lesson.trim()) return null;
  const occ = `occ-${slug}`;
  if (soc.get(occ)) return null;               // already undone; inert
  soc.lay({ slug: occ, content: lesson, subject: null, object: null, laid_by: by ?? null });
  soc.layP(`${occ}~o`, lesson, occ, slug, "q-occludes");
  return occ;
}

// ── READS: nothing below is stored ──────────────────────────────────────────

function deltaBeats(soc: Society, holder: string, key: Key) {
  const p = deltaPrefix(holder, key);
  return soc.all()
    .filter((r) => r.subject !== null && r.object === key && (r.subject as string).startsWith(p))
    .sort((a, b) => (a.witnessed ?? 0) - (b.witnessed ?? 0));
}

function placementBeats(soc: Society, holder: string, key: Key) {
  const p = placePrefix(holder, key);
  return soc.all()
    .filter((r) => r.subject !== null && r.object === key && (r.subject as string).startsWith(p))
    .sort((a, b) => (a.witnessed ?? 0) - (b.witnessed ?? 0));
}

/** THE FOLD. A key's value, read — never stored. */
export function valueOf(soc: Society, spec: CountedSpec, key: Key, opts: CountedRead = {}): number {
  let v = 0;
  for (const e of deltaBeats(soc, spec.holder, key)) {
    const beat = soc.get(e.subject as string);
    if (!beat) continue;
    if (opts.asOf !== undefined && (beat.witnessed ?? 0) > opts.asOf) continue;
    // asOf MUST be passed: occlusion is standpoint-relative, and reading it
    // at "now" while reading deltas "as of then" makes the past change every
    // time the present does. (Caught by conformance/counted.json, not review.)
    if (isOccluded(soc, beat.slug, opts.asOf) || isOccluded(soc, e.slug, opts.asOf)) continue;
    v += Number(beat.content) || 0;
  }
  return v;
}

/** Which section a key sits in — READ from the newest live placement. */
export function sectionOf(soc: Society, spec: CountedSpec, key: Key,
                          opts: CountedRead = {}): string | null {
  const live = placementBeats(soc, spec.holder, key)
    .map((e) => soc.get(e.subject as string))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .filter((b) => opts.asOf === undefined || (b.witnessed ?? 0) <= opts.asOf)
    .filter((b) => !isOccluded(soc, b.slug, opts.asOf));
  return live.length ? live[live.length - 1].content : null;
}

/** One key, fully read. */
export function countedOf(soc: Society, spec: CountedSpec, key: Key,
                          opts: CountedRead = {}): Counted | null {
  const beats = deltaBeats(soc, spec.holder, key);
  if (!beats.length) return null;
  const from: Counted["from"] = [];
  for (const e of beats) {
    const b = soc.get(e.subject as string);
    if (!b) continue;
    const at = b.witnessed ?? 0;
    if (opts.asOf !== undefined && at > opts.asOf) continue;
    if (isOccluded(soc, b.slug, opts.asOf) || isOccluded(soc, e.slug, opts.asOf)) continue;
    from.push({ slug: b.slug, delta: Number(b.content) || 0, by: b.laid_by ?? null, at });
  }
  from.reverse();
  return {
    key,
    label: soc.get(key)?.title ?? soc.get(key)?.content ?? key,
    value: from.reduce((n, f) => n + f.delta, 0),
    section: sectionOf(soc, spec, key, opts),
    cap: capFor(spec, key),
    from,
  };
}

/** Every key this counted holds. */
export function keysOf(soc: Society, spec: CountedSpec): Key[] {
  const p = `count-${spec.holder}-`;
  const out = new Set<Key>();
  for (const r of soc.all())
    if (r.subject && r.object && (r.subject as string).startsWith(p)) out.add(r.object as string);
  return [...out];
}

/** THE READ: everything, optionally grouped by section. */
export function readCounted(soc: Society, spec: CountedSpec, opts: CountedRead = {}): Counted[] {
  return keysOf(soc, spec)
    .map((k) => countedOf(soc, spec, k, opts))
    .filter((c): c is Counted => !!c)
    .filter((c) => opts.keepEmpty || c.value > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Grouped by section, in the spec's declared section order. */
export function bySection(soc: Society, spec: CountedSpec,
                          opts: CountedRead = {}): Array<{ section: string; items: Counted[] }> {
  const all = readCounted(soc, spec, opts);
  const names = spec.sections ?? [...new Set(all.map((c) => c.section ?? ""))];
  return names.map((section) => ({
    section,
    items: all.filter((c) => (c.section ?? "") === section),
  }));
}

/** Sum of every value — encumbrance, total points, hand size. */
export function totalOf(soc: Society, spec: CountedSpec, opts: CountedRead = {}): number {
  return readCounted(soc, spec, opts).reduce((n, c) => n + c.value, 0);
}
