// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  M U S L I N  —  one-file card  ·  TORN PROTOTYPE, NOT THE LIB            ║
// ║  Cheap cotton, basting stitches left in. Do NOT import from src/.         ║
// ║  Built to be cut. If it survives, it survives as something else.          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// THE ONE QUESTION: can a scher WALK declare its own dependencies, so a card
// repaints only when a slug IT ACTUALLY TOUCHED changes?
//
// Svelte knows `count` changed because a compiler read the JS. Scher has no
// compiler — but it has something Svelte doesn't: every read of the graph goes
// through four methods on Society. Record those and the dependency list is
// OBSERVED, not inferred. No syntax analysis, no `$:` sigil, no build step.
//
// Answers to the three asked questions are at the BOTTOM, under FINDINGS, so a
// reader who scrolls sees the verdict and not just the cleverness.

import { Society, type EventRow } from "../src/society.js";

// ── SEAM 1: the recording lens ──────────────────────────────────────────────
// A Proxy over Society that writes down every slug a walk touches. This is the
// whole idea. It wraps — society.ts is not touched, not subclassed, not forked.
//
// FRAGILE ON PURPOSE: this hardcodes the four read methods by name. A fifth read
// added to society.ts escapes the trail SILENTLY. That is the muslin's worst
// seam and the reason `assertTrailCoversSociety` below exists — it fails loudly
// the day someone adds one, instead of shipping a card that stops repainting.
// `has` was NOT in this list when the muslin was first written. The tripwire below
// caught it on the first run — a walk using `soc.has(slug)` would have recorded
// nothing and frozen forever. That is the escape this design is most afraid of,
// found by the mechanism built to find it, before any card shipped.
const RECORDED_READS = ["get", "has", "edgesFromSubject", "edgesOntoObject"] as const;
/** Reads that touch the WHOLE society — no slug to key on; the trail says "everything". */
const WHOLE_SOCIETY_READS = ["all", "size"] as const;

export interface Trail {
  /** Every slug this walk touched. The dependency list, observed. */
  readonly slugs: ReadonlySet<string>;
  /** True if the walk read `all()` — it depends on EVERYTHING; no granularity. */
  readonly readWholeSociety: boolean;
}

/** Wrap a society so reads land in `into`. The walk is written normally — it does
 *  not know it is being watched, which is the point: no annotation, no sigil. */
export function recording(soc: Society, into: { slugs: Set<string>; whole: boolean }): Society {
  return new Proxy(soc, {
    get(target, prop, receiver) {
      const name = prop as string;
      // `size` is a GETTER, not a method — it must be caught before the
      // typeof-function check below, or a whole-society read slips past silently.
      if ((WHOLE_SOCIETY_READS as readonly string[]).includes(name)) into.whole = true;
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (!(RECORDED_READS as readonly string[]).includes(name)) return value.bind(target);
      return (...args: unknown[]) => {
        if (typeof args[0] === "string") {
          const slug = args[0];
          into.slugs.add(slug);
          // A `~q` mode-beat is read to answer "what quality is this edge?" —
          // charge it to the edge itself so laying the edge repaints the card
          // that read it. (Opaque-slug law says don't PARSE slugs for meaning;
          // this strips a known structural suffix, which is the same trick
          // society.ts itself plays with `pslug + "~q"`. Still a seam.)
          if (slug.endsWith("~q")) into.slugs.add(slug.slice(0, -2));
        }
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  }) as Society;
}

/** Run a walk against a recording lens; hand back what it read and what it made. */
export function walkWithTrail<T>(soc: Society, walk: (s: Society) => T): { value: T; trail: Trail } {
  const into = { slugs: new Set<string>(), whole: false };
  const value = walk(recording(soc, into));
  return { value, trail: { slugs: into.slugs, readWholeSociety: into.whole } };
}

/** THE TRIPWIRE for the seam above: if society.ts grows a read method that the
 *  lens does not record, this throws with the name. A comment saying "remember
 *  to update RECORDED_READS" would rot; this cannot. */
export function assertTrailCoversSociety(): void {
  const proto = Object.getOwnPropertyNames(Society.prototype);
  // Reads are the methods that take a slug and return rows; writes are lay*.
  const known = new Set<string>([
    ...RECORDED_READS, ...WHOLE_SOCIETY_READS,
    "constructor", "rev",
    // writes — they change the graph, they do not read it into a trail
    "lay", "layAll", "layAtomic", "layP", "layCoupling",
  ]);
  const unknown = proto.filter((m) => !known.has(m) && !m.startsWith("#"));
  if (unknown.length) {
    throw new Error(
      `[MUSLIN one-file-card] Society grew method(s) the read-trail does not know: ${unknown.join(", ")}.\n` +
      `If it READS the graph, add it to RECORDED_READS or cards will silently stop repainting.\n` +
      `If it WRITES, add it to the known-writes list in assertTrailCoversSociety.`,
    );
  }
}

// ── SEAM 2: the one file ────────────────────────────────────────────────────
// Markup, style and walk in one declaration. Deliberately NOT a compiler and NOT
// a .svelte file — it is a plain object literal, so it needs no tooling at all.
//
// `markup` is a template string with {holes}. It is dumb on purpose: no
// expressions, no logic, no `{#if}`. The walk computes values; the markup only
// names where they land. That is the "editable without knowing TypeScript" test
// — everything between the backticks is HTML plus single-word holes.

export interface OneFileCard<D> {
  name: string;
  /** CSS. Scoped by the runtime to `[data-card="<name>"]` — so a rule here CANNOT
   *  leak to another card, which is the property 15 shared partials do not have. */
  style: string;
  /** The walk. Gets a society; returns the holes. Its reads become the trail. */
  walk: (soc: Society, data: D) => Record<string, string>;
  /** HTML with {holes}. No logic. A hole with no value renders empty, never
   *  "undefined" — an unfilled hole is a blank, which is honest. */
  markup: string;
}

const HOLE = /\{(\w+)\}/g;

function escapeText(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Scope every selector in `style` to this card. Crude on purpose — it prefixes
 *  each comma-separated selector and does not understand @media, :is(), or
 *  nesting. Real scoping is a parser; this is basting thread.
 *  A comment could have said "TODO: handle @media" and rotted. Instead: */
export function scopeStyle(name: string, style: string): string {
  if (/@(media|supports|keyframes)/.test(style)) {
    throw new Error(
      `[MUSLIN one-file-card] card "${name}": scopeStyle cannot handle @media/@supports/@keyframes yet.\n` +
      `This is the muslin's known hole. Real scoping needs a CSS parser (or native @scope).`,
    );
  }
  const scope = `[data-card="${name}"]`;
  return style.replace(/(^|\})\s*([^{}]+)\{/g, (_m, close: string, sel: string) => {
    const scoped = sel.split(",").map((s) => `${scope} ${s.trim()}`).join(", ");
    return `${close}\n${scoped} {`;
  }).trim();
}

export interface CardInstance<D> {
  readonly html: string;
  readonly trail: Trail;
  /** How many times this card's walk+render has run. The proof, counted. */
  readonly renders: number;
  /** Repaint IF this card touched `slug`. Returns true if it actually repainted. */
  repaintIfTouched(slug: string, soc: Society, data: D): boolean;
}

export function mountOneFile<D>(card: OneFileCard<D>, soc: Society, data: D): CardInstance<D> {
  let renders = 0;
  let html = "";
  let trail: Trail = { slugs: new Set(), readWholeSociety: false };

  const paint = (s: Society, d: D): void => {
    renders++;
    const run = walkWithTrail(s, (lens) => card.walk(lens, d));
    trail = run.trail;
    const holes = run.value;
    html = card.markup.replace(HOLE, (_m, key: string) => escapeText(holes[key] ?? ""));
  };

  paint(soc, data);

  return {
    get html() { return html; },
    get trail() { return trail; },
    get renders() { return renders; },
    repaintIfTouched(slug, s, d) {
      // The whole granularity claim lives in this one `if`.
      if (!trail.readWholeSociety && !trail.slugs.has(slug)) return false;
      paint(s, d);
      return true;
    },
  };
}

// ── SEAM 3: a card, written the way the pitch promises ──────────────────────
// Read this as a NON-PROGRAMMER would. Is the markup legible? That is the test.
// (The greybox styling is deliberate: grey boxes and dashed borders, so nobody
// critiques the colors instead of the shape.)

export const TitleCard: OneFileCard<{ slug: string }> = {
  name: "muslin-title",

  style: `
    .card { border: 2px dashed #999; background: #eee; padding: 8px; font-family: monospace; }
    .title { font-weight: bold; }
    .count { color: #666; }
  `,

  walk(soc, { slug }) {
    const row = soc.get(slug);
    const edges = soc.edgesOntoObject(slug);
    return {
      title: row?.content ?? "(no such beat)",
      count: `${edges.length} edges point here`,
    };
  },

  markup: `
    <article class="card">
      <h2 class="title">{title}</h2>
      <p class="count">{count}</p>
    </article>
  `,
};

/** A second card that reads a DIFFERENT slug — the control. If per-slug repaint
 *  works, laying an edge onto card A's slug must leave this one untouched. */
export const NeighborCard: OneFileCard<{ slug: string }> = {
  name: "muslin-neighbor",
  style: `.card { border: 2px dashed #999; background: #eee; }`,
  walk(soc, { slug }) {
    return { title: soc.get(slug)?.content ?? "(none)" };
  },
  markup: `<article class="card"><h2>{title}</h2></article>`,
};

/** The card that DISPROVES the happy path: it reads the whole society. No trail
 *  can make this granular — the honest answer is "everything", and the runtime
 *  says so rather than pretending. Kept in the muslin because a prototype that
 *  only contains its own success story is a sales demo, not a muslin. */
export const CensusCard: OneFileCard<Record<string, never>> = {
  name: "muslin-census",
  style: `.card { border: 2px dashed #c00; }`,
  walk(soc) {
    return { total: `${soc.all().length} beats` };
  },
  markup: `<article class="card"><p>{total}</p></article>`,
};

// ── FINDINGS ────────────────────────────────────────────────────────────────
// Written after the tests below were run, not before. See
// MUSLIN-one-file-card.test.ts for the counts that back each claim.
//
// Q1. DOES THE TRAIL WORK, OR DOES SOME READ ESCAPE IT?
//   It works, and reads DO escape it. Both are true and the second is the useful
//   half.
//   • Works: every read in society.ts funnels through four methods. A walk
//     written normally — prehensionsFrom, isOccluded, voltageOf, the lot — lands
//     its slugs in the trail without knowing it. That is better than Svelte's
//     syntax inference, because it observes the ACTUAL read rather than guessing
//     from the shape of the source.
//   • ONE ESCAPE WAS FOUND FOR REAL, not hypothesised. The first run of the
//     tripwire test went red: `Society.has(slug)` and `Society.size` were not in
//     the lens. `has` is slug-keyed — a card whose walk asked "does this beat
//     exist?" would have recorded NOTHING and frozen permanently, and no test
//     about that card would have caught it. `size` is a getter, so it slipped
//     past the typeof-function check that catches every other read. Both are now
//     recorded. The lesson is not "we fixed it" — it is that hand-maintained
//     dependency lists rot, and the only reason this one did not ship rotten is
//     that a test enumerates the real class instead of trusting the list.
//   • Escapes, three of them, all real:
//     1. `all()` — reads everything, so the trail is "everything". Not a bug in
//        the trail; the walk genuinely depends on the whole society. The runtime
//        flags it (readWholeSociety) instead of silently over-claiming.
//     2. NEGATIVE READS. A walk that asks "does X exist?" and gets `undefined`
//        records X — good, laying X later repaints. But a walk that decides
//        something by an edge NOT existing has no slug to record for the edge
//        that would falsify it. `edgesOntoObject(s)` covers this (the answer
//        changes when any edge onto `s` is laid, and `s` IS in the trail) — but
//        only because the adjacency read is keyed by the slug. A walk that
//        derived a negative some other way would go stale. Verified: the
//        adjacency path is safe; the general case is not proven.
//     3. Anything read from OUTSIDE the society — a Date, a module-global like
//        pull-tabs' `drawerModes` Map, localStorage. The trail cannot see these
//        because they are not graph reads. This is the big one for the real app:
//        card view-state lives in module Maps today, and NONE of it is trailed.
//
// Q2. WHAT DOES THE SINGLE FILE COST?
//   Less than expected, because the cost was paid to avoid a build step.
//   • NO new tooling. No compiler, no .svelte extension, no bundler plugin, no
//     source maps. It is a plain .ts object literal; existing tsc and vitest read
//     it unchanged. That was the design constraint and it held.
//   • What it costs instead is EXPRESSIVENESS IN MARKUP. `{hole}` has no
//     conditionals and no loops. Every branch must be computed in the walk and
//     handed down as a string. For a card that is genuinely a form with repeated
//     rows, this pushes markup back into TypeScript — exactly the thing the
//     single file was meant to stop. It is fine for a title row; it is not fine
//     for a list.
//   • Style scoping is the real unpaid bill. `scopeStyle` is a regex. It refuses
//     @media loudly (good) but that refusal is a limitation, not a feature —
//     real cards have media queries. Native CSS `@scope` would fix this for free
//     and is the honest recommendation; a parser is the fallback.
//   • Injecting <style> per card means N style tags. Fine at 20 cards, and it
//     buys the property that matters: a rule cannot leak, so a style bug is
//     local to one file by construction.
//
// Q3. IS A COMPILER NEEDED, OR IS A RUNTIME HELPER ENOUGH?
//   A runtime helper is enough, and is BETTER HERE than a compiler.
//   Svelte needs a compiler because it must infer dependencies from JS syntax it
//   cannot otherwise observe. Scher does not have that problem: the dependency
//   is a graph read, and graph reads go through an interface we own. Observing
//   beats inferring — the trail is exact where a compiler's is conservative.
//   The compiler would only buy markup expressiveness ({#each}), which is the
//   one thing the runtime version is weak at. So the trade is legible:
//   runtime = exact reactivity, weak markup. Compiler = rich markup, inferred
//   reactivity, and a build step this codebase does not currently have.
//   Recommendation: stay runtime, and fix markup by allowing a hole to take a
//   list of pre-rendered children rather than by adding a template language.
//
// WHERE TO CUT THIS FIRST: the `~q` suffix strip in `recording`. It works, but it
// string-matches a slug, which is the one discipline scher/CLAUDE.md names. It
// should become a real read on Society ("what quality does this edge carry"),
// and then the lens records the edge directly. That is a change to society.ts,
// which this muslin was told not to make — so it is left visibly wrong here.
