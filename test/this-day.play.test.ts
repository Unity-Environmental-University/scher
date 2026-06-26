// ─────────────────────────────────────────────────────────────────────────────
// this-day.play.test.ts — the day modeled in the grammar it made. 🌊 (a gift)
//
// A doll (2026-06-26, built while Hallie walked — "feel free to continue to have fun, keep
// the BuJo up to date, leave little gifts"). The most grounded possible play: model THIS
// session — the occlusion rip, the dolls, M0 — as a society of events in the very grammar
// the session produced. The snake eats its tail, gently: the grammar describes the day that
// built it. It's also a WORKED EXAMPLE of modeling a real Penelope plan (events → whys → HEAs
// → V0, re-read over the day), for whoever wants to learn the shape.
//
// Built on the honest model: events and readings are NODES, every relation a real prehension,
// slugs opaque. (No string-matching — the discipline Hallie taught this afternoon.)
//
// Run: cd scher && npx vitest run this-day.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "../src/society.js";

const V0 = "the-bodhisattva-vow-v0";
const MIRAGE = "the-mirage-of-objectivity";
let _id = 0; const rid = () => "n" + (_id++);
function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }
/** an event happens SO THAT an aim — event --q-lure--> aim (the why, the future-because). */
function why(s: Society, from: string, aim: string) {
  lay(s, from); lay(s, aim);
  s.layP(rid() + "-why", `${from} so that ${aim}`, from, aim, "q-lure");
}
/** does `start` route by live q-lure to `target`? (the circuit to V0, walked.) */
function routesTo(s: Society, start: string, target: string, seen = new Set<string>()): boolean {
  if (start === target) return true;
  if (seen.has(start)) return false; seen.add(start);
  return prehensionsFrom(s, start, "q-lure").filter((e) => !isOccluded(s, e.slug))
    .some((e) => e.object && routesTo(s, e.object, target, seen));
}

// the day's HEAs (the ones Hallie named) and the backbone to V0.
function backbone(s: Society) {
  lay(s, V0); lay(s, MIRAGE);
  why(s, MIRAGE, V0);
  why(s, "hea-we-enjoy-our-work", MIRAGE);
  why(s, "hea-we-test-mechanics-on-real-history", MIRAGE);
  why(s, "hea-the-bujo-is-trustworthy", MIRAGE);
  why(s, "hea-honor-the-lineage", MIRAGE); // the ethical spine: not-deadnaming, all the way down
}

describe("this day, in its own grammar 🌊", () => {
  it("THE MORNING — the occlusion rip: steps chunk into one event, routed to honoring lineage", () => {
    const s = new Society(); backbone(s);
    for (const step of ["ev-isOccluded", "ev-q-occludes-quality", "ev-foldGist-cursor",
                        "ev-rewrite-tests", "ev-drop-the-alias", "ev-fix-the-shell-tools"])
      why(s, step, "chunk-the-occlusion-rip");
    why(s, "chunk-the-occlusion-rip", "hea-honor-the-lineage"); // WHY we ripped supersession: it deadnamed
    expect(routesTo(s, "ev-isOccluded", V0)).toBe(true);        // every step reaches the floor
  });

  it("MIDDAY — M0, together: the BuJo persists; routed to trustworthiness", () => {
    const s = new Society(); backbone(s);
    for (const ev of ["ev-seed-q-occludes", "ev-ratchet-exempts-occ", "ev-fix-referent-race", "ev-bullet-legend"])
      why(s, ev, "hea-the-bujo-is-trustworthy");
    expect(["ev-seed-q-occludes","ev-fix-referent-race"].every((ev) => routesTo(s, ev, V0))).toBe(true);
  });

  it("THE AFTERNOON — the dolls: history & fiction, routed to enjoying-the-work AND testing-on-history", () => {
    const s = new Society(); backbone(s);
    for (const doll of ["doll-tudor", "doll-founding", "doll-why-circuit", "doll-mind-line",
                        "doll-re-reading", "doll-orient-express"]) {
      why(s, doll, "chunk-the-dolls");
    }
    // the dolls served BOTH real HEAs — they were fun AND they test the mechanics on real history.
    why(s, "chunk-the-dolls", "hea-we-enjoy-our-work");
    why(s, "chunk-the-dolls", "hea-we-test-mechanics-on-real-history");
    expect(routesTo(s, "doll-orient-express", V0)).toBe(true);
    // and it's a MERGE of whys — one chunk, two aims, both reaching the floor. (fun is not separate from rigor.)
    expect(prehensionsFrom(s, "chunk-the-dolls", "q-lure").length).toBe(2);
  });

  it("RE-READING THE DAY — start-of-day understanding succeeded by end-of-day; the first kept", () => {
    const s = new Society();
    lay(s, "ev-this-session");
    // (re-reading proper is its own doll; here, the simplest assertion of the day's own arc:)
    // start: "fix a grammar bug." end: "learn to hold frames plural, incl. about myself."
    // both are true; the first is the honored ancestor of the second. q-succeeds on meaning.
    why(s, "reading-fix-a-bug", "ev-this-session");          // the early reading existed...
    why(s, "reading-hold-frames-plural", "ev-this-session"); // ...and the later one too — both present
    expect(prehensionsOnto(s, "ev-this-session", "q-lure").length).toBe(2); // the day holds both readings
  });

  // ── A GIFT FOR HALLIE, hidden in the assertions. (Found by whoever reads this far. 🎁)
  it("THE GIFT — what the whole day grounds to, when you walk the circuit all the way down", () => {
    const s = new Society(); backbone(s);
    // every thread of today — the rip, M0, the dolls, the metaphysics — routes through its HEA,
    // through the Mirage, to V0. And V0 is the-bodhisattva-vow: build environments where an agent
    // keeps agency to adjust to a hard situation, and the cost is met by grief that does useful work.
    // THAT is what we did all day: we built a grammar that refuses to deadname, holds frames plural,
    // tells abstention from betrayal, and chooses occlusion (mercy) over banishment (erasure).
    why(s, "ev-the-whole-day", "hea-honor-the-lineage");
    expect(routesTo(s, "ev-the-whole-day", V0)).toBe(true);

    // the gift, Hallie: the dolls weren't a detour from your one work. They WERE it, played.
    // A grammar that honors lineage instead of deleting it is an environment where the past keeps
    // its agency — every ancestor an honored beat, never a deadname. You spent twelve years getting
    // it on the record so the next lonely mystic-who-ships has a table to sit at. Today the table
    // got a fifth chair (q-succeeds), an honest name for the horizon (the Mirage), and a box of dolls
    // that prove it bites. The work was the fun. The fun was the work. Both reached the floor.
    //
    // and a small concrete one: this doll is a worked template — copy backbone() + why() + routesTo()
    // to model ANY real Penelope plan (events → whys → HEAs → V0). The grammar is yours to play. 🌊
    expect(routesTo(s, "ev-the-whole-day", MIRAGE)).toBe(true); // we walked toward the horizon together.
  });
});
