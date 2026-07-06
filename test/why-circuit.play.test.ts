// ─────────────────────────────────────────────────────────────────────────────
// why-circuit.play.test.ts — wiring EVENTS to their WHYs, routed to V=0. 🎯🌊
//
// A doll (2026-06-26, Hallie: "lay in WHYs that are HEA-lures and try to get them with
// nuance to V=0 — to each event first, bundling events for efficiency, chunking events
// as is efficient, and routing the circuit realistically to HEA").
//
// THE CIRCUIT (the full prefigurement→grounding loop, not just succession):
//   · a WHY is End-pole-ward — a "so that the End can be" beat (q-end-pole, the structural
//     future-because; the luring verb is dead, killed with fire 2026-07-06 — the Hallie quote
//     above predates the kill and stays verbatim).
//   · an event attaches to its WHY: event --q-end-pole--> why  ("I happen so that this aim is").
//   · ROUTING is realistic: events do NOT each ground straight to V=0 (that was the leaf-to-
//     root sin). They route THROUGH altitudes: event → local why → bundled why → a chunk's
//     HEA → ... → the Mirage / V=0. Each hop is a q-end-pole; the chain IS the provenance of aim.
//
// THREE EFFICIENCIES, each its own test:
//   1. TO EACH EVENT  — every event gets its own immediate why (full resolution).
//   2. BUNDLING       — events sharing a why point at ONE why-beat (no redundant lure-edges).
//   3. CHUNKING       — a SEQUENCE of events that IS one larger event: the why attaches to the
//                       CHUNK (the story-that-contains-them), at the right altitude, once.
//   4. THE ROUTE      — the whole circuit reaches V=0 by hops, realistically, through HEAs.
//
// Run: cd scher && npx vitest run why-circuit.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, type EventRow } from "../src/society.js";

const V0 = "the-bodhisattva-vow-v0";        // the floor / the Mirage's limit-point
const MIRAGE = "the-mirage-of-objectivity"; // the horizon every why aims at

function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }
/** WHY: `from` happens SO THAT `aim` can be — the aim as End-pole (q-end-pole, structural). */
function why(s: Society, from: string, aim: string) {
  lay(s, from); lay(s, aim);
  s.layP(`${from}--why--${aim}`, `${from} so that ${aim}`, from, aim, "q-end-pole");
}
/** does a chain of q-end-pole hops reach `target` from `start`? (the route to V=0, walked.) */
function routesTo(s: Society, start: string, target: string, seen = new Set<string>()): boolean {
  if (start === target) return true;
  if (seen.has(start)) return false;
  seen.add(start);
  return prehensionsFrom(s, start, "q-end-pole").some((edge) => edge.object && routesTo(s, edge.object, target, seen));
}
/** the number of distinct why-edges in the society (efficiency: fewer = more bundled). */
function whyEdges(s: Society): number {
  return s.all().filter((b) => b.slug.includes("--why--")).length;
}

describe("the WHY circuit — events → whys → HEAs → V=0 🎯", () => {
  // shared backbone: the Mirage/V=0 and the REAL HEAs today's play served (Hallie named them):
  //   "we enjoy our work"  — Montessori-alignment: find the fun, the job's a game (→ V=0)
  //   "we test the mechanics on real history" — no-test-but-legitimate-practice: the dolls ARE
  //    the real use; testing the grammar against the Tudor/founding lines is dogfooding the ontology.
  function backbone(s: Society) {
    lay(s, V0); lay(s, MIRAGE);
    why(s, MIRAGE, V0);                                  // the horizon aims at the floor
    why(s, "hea-we-enjoy-our-work", MIRAGE);             // the real HEA #1 → the Mirage
    why(s, "hea-we-test-mechanics-on-real-history", MIRAGE); // the real HEA #2 → the Mirage
  }

  it("1. TO EACH EVENT — every event gets its own immediate why (full resolution)", () => {
    const s = new Society(); backbone(s);
    // three distinct events, three distinct local whys.
    why(s, "ev-ripped-supersession", "hea-we-test-mechanics-on-real-history");
    why(s, "ev-m0-seeded-occlusion",  "hea-we-enjoy-our-work");
    why(s, "ev-fixed-the-bullet-bug", "hea-we-enjoy-our-work");
    // each event, on its own, routes all the way to V=0 through its altitude.
    for (const ev of ["ev-ripped-supersession", "ev-m0-seeded-occlusion", "ev-fixed-the-bullet-bug"])
      expect(routesTo(s, ev, V0)).toBe(true);
  });

  it("2. BUNDLING — events that share a why point at ONE why-beat (no redundant edges)", () => {
    const s = new Society(); backbone(s);
    // three events ALL serve the same aim — bundle them onto one why, not three copies of it.
    const bundled = ["ev-m0-seed", "ev-ratchet-fix", "ev-runtime-seed"]; // all = "the BuJo persists"
    why(s, "why-the-bujo-persists", "hea-we-enjoy-our-work");          // ONE why-beat
    for (const ev of bundled) why(s, ev, "why-the-bujo-persists");        // events → the one why
    // efficiency: 3 events bundle through 1 shared why (5 backbone + 1 shared + 3 = 9 edges,
    // vs. a naive "each event straight to the HEA" which still works but loses the shared aim).
    for (const ev of bundled) expect(routesTo(s, ev, V0)).toBe(true);
    // and they genuinely SHARE: the one why-beat is the single point all three route through.
    expect(prehensionsFrom(s, "why-the-bujo-persists", "q-end-pole").length).toBe(1); // one onward hop, shared
    expect(bundled.every((ev) => routesTo(s, ev, "why-the-bujo-persists"))).toBe(true);
  });

  it("3. CHUNKING — a sequence that IS one event: the why attaches to the CHUNK, once", () => {
    const s = new Society(); backbone(s);
    // five small steps that together ARE one event ("the occlusion rip"). Rather than wire each
    // step's why separately, CHUNK them: the steps aim at their chunk, the chunk carries the why up.
    const steps = ["step-isOccluded", "step-q-occludes-quality", "step-foldGist-cursor",
                   "step-rewrite-tests", "step-drop-the-alias"];
    for (const st of steps) why(s, st, "chunk-the-occlusion-rip");   // steps → the chunk
    why(s, "chunk-the-occlusion-rip", "hea-we-test-mechanics-on-real-history"); // the chunk → its HEA, ONCE
    // every step reaches V=0 — but the WHY only had to be attached at the chunk's altitude.
    for (const st of steps) expect(routesTo(s, st, V0)).toBe(true);
    // the efficiency: the chunk has exactly ONE onward why (not five) — the altitude is right.
    expect(prehensionsFrom(s, "chunk-the-occlusion-rip", "q-end-pole").length).toBe(1);
  });

  it("4. THE ROUTE — realistic multi-hop: no event grounds STRAIGHT to V=0; all route THROUGH", () => {
    const s = new Society(); backbone(s);
    why(s, "ev-fixed-the-bullet-bug", "hea-we-enjoy-our-work");
    // it reaches V=0...
    expect(routesTo(s, "ev-fixed-the-bullet-bug", V0)).toBe(true);
    // ...but NOT by a direct edge — the leaf-to-root sin is absent. The event's only End-pole is its
    // local HEA; the route to V0 is ≥3 hops (event → HEA → Mirage → V0).
    const directToV0 = prehensionsFrom(s, "ev-fixed-the-bullet-bug", "q-end-pole").some((e) => e.object === V0);
    expect(directToV0).toBe(false);                 // realistic: aim routes through altitude, never leaps
    expect(routesTo(s, "ev-fixed-the-bullet-bug", MIRAGE)).toBe(true); // it does pass through the Mirage
  });

  it("THE WHOLE CIRCUIT — today's real events, wired, bundled, chunked, all reaching V=0", () => {
    const s = new Society(); backbone(s);
    // bundle: the three M0 sub-events share "the bujo persists"
    why(s, "why-bujo-persists", "hea-we-enjoy-our-work");
    for (const ev of ["ev-m0-seed", "ev-ratchet-fix", "ev-bullet-fix"]) why(s, ev, "why-bujo-persists");
    // chunk: the rip's steps share their chunk
    for (const st of ["step-isOccluded", "step-foldGist", "step-tests"]) why(s, st, "chunk-occlusion-rip");
    why(s, "chunk-occlusion-rip", "hea-we-test-mechanics-on-real-history");
    // chunk: today's DOLLS (tudor, founding, succession-war) ARE one event — "test on real history"
    for (const doll of ["doll-tudor-line", "doll-founding-line", "doll-succession-war"])
      why(s, doll, "chunk-the-dolls");
    why(s, "chunk-the-dolls", "hea-we-test-mechanics-on-real-history");
    // EVERY leaf reaches V=0 — the circuit is whole, by hops, realistically routed.
    const leaves = ["ev-m0-seed","ev-ratchet-fix","ev-bullet-fix","step-isOccluded","step-foldGist",
                    "step-tests","doll-tudor-line","doll-founding-line","doll-succession-war"];
    for (const leaf of leaves) expect(routesTo(s, leaf, V0)).toBe(true);
    // and it converges: everything funnels through the Mirage on its way to the floor.
    for (const leaf of leaves) expect(routesTo(s, leaf, MIRAGE)).toBe(true);
  });

  // ── PSEUDO-HEAs (Hallie: "there can be pseudo-HEAs projected on the objectivity of the sub-story")
  // A sub-story has its own LOCAL objectivity — within the Tudor doll, there's a fact of the matter
  // (Elizabeth reigned, the line ended). A PSEUDO-HEA is an End projected onto that LOCAL surface: a
  // real HEA *inside the sub-story's frame*, but NOT the real Mirage. It's a local mirage — a within-
  // the-doll horizon. "Secure the dynasty" is a pseudo-HEA: coherent inside the Tudor frame, organizing
  // its events — yet projected on the sub-story's objectivity, not on V=0. (The stability they aimed at
  // never existed — the line ended childless. Objectivity PROJECTED, a local horizon mistaken for floor.)
  //
  // The legitimate use: a pseudo-HEA is a real intermediate ALTITUDE — events route THROUGH it, and it
  // routes ONWARD to a real HEA → the Mirage. The ERROR (single-reference-frame, as a teleological sin):
  // mistaking your sub-story's local objective-surface FOR V=0 — terminating the route there. Then the
  // circuit lies: it looks grounded but never reaches the floor.
  it("PSEUDO-HEA done right — a sub-story End that routes ONWARD through a real HEA to V=0", () => {
    const s = new Society(); backbone(s);
    // inside the Tudor doll, events serve a LOCAL aim ("secure the dynasty") — a pseudo-HEA.
    why(s, "ev-henry-vii-merge", "pseudo-hea-secure-the-dynasty");
    why(s, "ev-elizabeth-reigns", "pseudo-hea-secure-the-dynasty");
    // the pseudo-HEA is NOT the floor — it routes ONWARD: it's an instance of testing-on-real-history.
    why(s, "pseudo-hea-secure-the-dynasty", "hea-we-test-mechanics-on-real-history");
    // done right, the route still reaches V=0 — THROUGH the pseudo-HEA, not terminating at it.
    expect(routesTo(s, "ev-henry-vii-merge", "pseudo-hea-secure-the-dynasty")).toBe(true); // through the local horizon
    expect(routesTo(s, "ev-henry-vii-merge", V0)).toBe(true);                               // and onward to the floor
    // the pseudo-HEA is itself a leaf-with-an-onward-why — it is NOT a terminus.
    expect(prehensionsFrom(s, "pseudo-hea-secure-the-dynasty", "q-end-pole").length).toBe(1);
  });

  it("PSEUDO-HEA mistaken for the floor — the teleological single-reference-frame sin (route LIES)", () => {
    const s = new Society(); backbone(s);
    // here the pseudo-HEA is treated AS the End — no onward why is laid. The Tudor frame mistakes
    // "secure the dynasty" for V=0 itself.
    why(s, "ev-henry-vii-merge", "pseudo-hea-secure-the-dynasty");
    // (NO why(pseudo-hea → a real HEA) — the route terminates at the local mirage.)
    // the event routes to the pseudo-HEA, and FEELS grounded...
    expect(routesTo(s, "ev-henry-vii-merge", "pseudo-hea-secure-the-dynasty")).toBe(true);
    // ...but does NOT reach V=0. The circuit LIES: a local horizon mistaken for the floor.
    expect(routesTo(s, "ev-henry-vii-merge", V0)).toBe(false);     // the tell: never reaches the floor
    expect(routesTo(s, "ev-henry-vii-merge", MIRAGE)).toBe(false); // nor the real Mirage
    // (and history is the proof: the dynasty was NOT secured — the line ended. The pseudo-HEA was a
    //  mirage on the sub-story's surface, never the Mirage of Objectivity. The grammar shows the gap.)
  });
});
