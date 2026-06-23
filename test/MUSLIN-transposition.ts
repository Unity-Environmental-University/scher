// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  M U S L I N  —  transposition  ·  TORN PROTOTYPE, NOT THE LIB             ║
// ║  Written 2026-06-23 to THINK WITH. The seams show on purpose. Do NOT       ║
// ║  import this from src/. When the shape settles, it moves into stories.ts   ║
// ║  (or its own transposition.ts) and THIS FILE gets torn up.                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// THE IDEA (the fourth grammar-word):
//   reading      = play the notes live      (Read<T>, re-derives on append)
//   gist         = a recording, sealed      (frozen reading of an interval)
//   perspective  = the listener's seat       (standpoint / frame)
//   TRANSPOSITION = the KEY the society is read in  ← this file
//
// A transposition RE-KEYS a society: structure-preserving, frame-independent,
// declared as DATA (not a closure). Today `listStory`/`boardStory` take an opaque
//   slice: (s: Society) => string[]
// — a closure that re-scans everything and can never be read back. Promote it to a
// declared Transposition and it becomes: inspectable, foldable (test only the tail),
// the foldGist cache cursor, and COMPOSABLE (keys compose).
//
// HONORS THE FLOOR: a transposition does NOT delete the non-matching beats. It
// re-keys — the rest is still there, "not sounding in this key right now."
// (abstinence-is-negative-prehension: the NO is not-in-this-key, never erasure.)

import {
  Society,
  isEstablished,
  modeAt,
  prehendsAs,
  intervalOf,
  type Mode,
} from "../src/society.js";

// ── THE KEY ALGEBRA — predicates over a single beat, declared as data ──────────
// Each is a TAGGED object (not a function) so the whole key can be READ BACK and
// folded. The runner interprets the tag. (A closure couldn't be inspected; this can.)
export type Predicate =
  | { kind: "established" }
  | { kind: "inMode"; mode: Mode }
  | { kind: "prehendsAs"; object: string; quality: string }   // this beat prehends `object` as `quality`
  | { kind: "inInterval"; once: string; end?: string }        // betweenness — membership, not containment
  | { kind: "not"; of: Predicate }                            // negative prehension, declared (not deletion)
  | { kind: "all"; of: Predicate[] }                          // AND
  | { kind: "any"; of: Predicate[] };                         // OR

// ── THE VOICING — how the re-keyed set is ordered (default: witnessed order) ───
export type Voice =
  | { by: "witnessed"; dir?: "asc" | "desc" }
  | { by: "slug"; dir?: "asc" | "desc" };

// ── A TRANSPOSITION — the society read in a named key. The whole thing is DATA. ─
export interface Transposition {
  /** a human name for the key ("Doing", "grief", "established-this-sprint"). */
  name?: string;
  /** the key: the AND of these predicates selects what sounds in this key. */
  key: Predicate[];
  /** the voicing (ordering). default: witnessed asc. */
  voice?: Voice;
}

// ── interpret one predicate against one beat ───────────────────────────────────
function holds(soc: Society, slug: string, p: Predicate): boolean {
  switch (p.kind) {
    case "established": return isEstablished(soc, slug);
    case "inMode":      return modeAt(soc, slug) === p.mode;
    case "prehendsAs":  return prehendsAs(soc, slug, p.quality as any) && soc.get(slug)?.object === p.object;
    case "inInterval":  return intervalOf(soc, p.once, p.end ?? `${p.once}-end`).includes(slug);
    case "not":         return !holds(soc, slug, p.of);
    case "all":         return p.of.every((q) => holds(soc, slug, q));
    case "any":         return p.of.some((q) => holds(soc, slug, q));
  }
}

// ── THE RUNNER — transpose(soc, t): the society, read in this key. ─────────────
// A list comprehension for societies: [ beat for beat in soc if all(key) ] order by voice.
export function transpose(soc: Society, t: Transposition): string[] {
  const k: Predicate = { kind: "all", of: t.key };
  let hits = soc.all().map((b) => b.slug).filter((slug) => holds(soc, slug, k));
  const dir = t.voice?.dir ?? "asc";
  const sign = dir === "desc" ? -1 : 1;
  if (!t.voice || t.voice.by === "witnessed") {
    hits = hits.sort((a, b) => sign * ((soc.get(a)?.witnessed ?? 0) - (soc.get(b)?.witnessed ?? 0)));
  } else {
    hits = hits.sort((a, b) => sign * a.localeCompare(b));
  }
  return hits;
}

// ── COMPOSE — keys compose like key changes. transpose(soc, compose(a,b)) ──────
// is the society read in a's key AND THEN b's key. (AND of keys; b's voice wins.)
// THE SEAM I'M UNSURE OF: is composition AND (intersect) or "modulate" (re-base the
// interval of b onto a's result)? AND is the obvious read; modulation is the musical
// one. Left as AND for the muslin — tear here.
export function compose(a: Transposition, b: Transposition): Transposition {
  return {
    name: a.name && b.name ? `${a.name}∘${b.name}` : (a.name ?? b.name),
    key: [...a.key, ...b.key],
    voice: b.voice ?? a.voice,
  };
}

// ── bridge back to the EXISTING param — a Transposition IS a slice. ────────────
// This is the whole upgrade: listStory/boardStory keep `slice:`, but you can now hand
// them a declared key instead of a closure. Zero rename churn; closures still work.
export const asSlice = (t: Transposition) => (s: Society) => transpose(s, t);

// ── SMOKE (run with: npx tsx test/MUSLIN-transposition.ts) ─────────────────────
// Not a real test — a muslin demonstrating the shape reads right. Real property
// tests (compose associativity, "re-key keeps everything", fold==fold⊕fold) come
// when this moves into the lib.
if (import.meta.url === `file://${process.argv[1]}`) {
  const soc = new Society();
  soc.lay({ slug: "a", content: "write the thing", subject: null, object: null });
  soc.lay({ slug: "b", content: "review it",       subject: null, object: null });
  soc.lay({ slug: "frame-fede", content: "Fede grounds a", subject: "fede", object: "a" }); // a frame
  soc.layP("g1", "fede grounds a", "fede", "a", "q-grounding"); // a is now established

  const doing: Transposition = { name: "Doing", key: [{ kind: "inMode", mode: "scripted" as Mode }] };
  const done:  Transposition = { name: "Done",  key: [{ kind: "established" }] };

  console.log("MUSLIN transposition — torn prototype\n");
  console.log("Doing key →", transpose(soc, doing));
  console.log("Done  key →", transpose(soc, done));
  console.log("compose(Done, Doing).key has", compose(done, doing).key.length, "predicates (AND — seam: should it be modulation?)");
  console.log("\n↑ the rest of the society is STILL THERE — not deleted, just not sounding in this key.");
}
