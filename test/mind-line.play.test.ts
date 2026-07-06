// ─────────────────────────────────────────────────────────────────────────────
// mind-line.play.test.ts — Greek philosophy → Enlightenment → AI, read by two frames. 🏛️🤖
//
// A doll (2026-06-26, Hallie: "one more play history... greek philosophy through to
// enlightenment rationality to the development of AI as we have it today, with views from
// an AI insider and an AI skeptic").
//
// The whole 2,500-year arc IS one long argument about whether there is an OBJECTIVE FLOOR
// to mind/truth: Platonic forms → rationalist certainty → "objective intelligence / AGI".
// So this doll's bite is that the two frames DISAGREE about the destination — the insider
// reads "general intelligence" as a real HEA routing to the floor; the skeptic reads it as
// a PSEUDO-HEA, a local mirage projected on the field's own objectivity. The grammar holds
// BOTH readings (observer-relative; neither gets the objective seat) — and that held
// disagreement is itself the proof of the Mirage.
//
// We model the IDEAS as a succeeds-chain (each inherits + revises its predecessor — provenance
// of thought) and the two FRAMES as standpoints whose q-end-pole routes differ.
//
// Run: cd scher && npx vitest run mind-line.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, isOccluded, type EventRow } from "../src/society.js";

const V0 = "the-bodhisattva-vow-v0";
const MIRAGE = "the-mirage-of-objectivity";

function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }
/** an idea SUCCEEDS its predecessor (inherits + revises — the route of thought). */
function succeeds(s: Society, heir: string, parent: string) {
  lay(s, heir); lay(s, parent);
  s.layP(`${heir}--succ--${parent}`, `${heir} succeeds ${parent}`, heir, parent, "q-utterance");
}
/** a WHY laid BY a named frame: from --q-end-pole--> aim, authored from a standpoint. The KEY move —
 *  the same idea can route to different aims depending on WHO reads it. */
function whyFrom(s: Society, frame: string, from: string, aim: string) {
  lay(s, frame); lay(s, from); lay(s, aim);
  s.layP(`${frame}::${from}--why--${aim}`, `${frame}: ${from} so that ${aim}`, from, aim, "q-end-pole");
}
/** does `start` route by q-end-pole to `target`, FROM a given frame? (only that frame's why-edges.) */
function routesFrom(s: Society, frame: string, start: string, target: string, seen = new Set<string>()): boolean {
  if (start === target) return true;
  if (seen.has(start)) return false;
  seen.add(start);
  return prehensionsFrom(s, start, "q-end-pole")
    .filter((e) => e.slug.startsWith(frame + "::"))
    .some((e) => e.object && routesFrom(s, frame, e.object, target, seen));
}

const INSIDER = "frame-ai-insider";
const SKEPTIC = "frame-ai-skeptic";

// the chain of ideas, laid once (shared substrate — both frames read the SAME history).
function ideaLine(s: Society) {
  succeeds(s, "plato-forms", "thales-arche");          // there IS an objective realm of Forms
  succeeds(s, "aristotle-empiricism", "plato-forms");  // ...no, knowledge from the particular
  succeeds(s, "descartes-cogito", "aristotle-empiricism"); // rationalism: certainty from pure reason
  succeeds(s, "enlightenment-reason", "descartes-cogito"); // reason as the universal objective method
  succeeds(s, "hume-skepticism", "enlightenment-reason");  // ...but induction has no rational ground
  succeeds(s, "formal-logic-turing", "hume-skepticism");   // mind as computation (the dream made math)
  succeeds(s, "machine-learning", "formal-logic-turing");  // intelligence as learned function
  succeeds(s, "llms-today", "machine-learning");           // AI as we have it
}

describe("Greek philosophy → Enlightenment → AI, read by two frames 🏛️🤖", () => {
  it("THE SHARED HISTORY — one idea-line, inherited and revised (provenance of thought)", () => {
    const s = new Society(); ideaLine(s);
    // both frames read the SAME chain; HEAD of the line is today's AI.
    const heads = (root: string) => {
      const on = new Set([root]); let g = true;
      while (g) { g = false; for (const b of s.all())
        if (b.slug.includes("--succ--") && b.object && on.has(b.object) && b.subject && !on.has(b.subject)) { on.add(b.subject); g = true; } }
      return [...on].filter((m) => !s.all().some((b) => b.slug.includes("--succ--") && b.object === m));
    };
    expect(heads("thales-arche")).toEqual(["llms-today"]); // the line runs from arche to the LLM
    // and Plato is an honored ancestor — never deleted, still on the chain (q-succeeds, not supersede).
    expect(s.has("plato-forms")).toBe(true);
  });

  it("THE INSIDER — reads today's AI as routing toward a REAL End (general intelligence → the floor)", () => {
    const s = new Society(); ideaLine(s);
    // the insider's why-chain: AI serves "general intelligence", which serves "understand the world
    // objectively", which the insider takes as a real HEA → the Mirage → V0.
    whyFrom(s, INSIDER, "llms-today", "hea-general-intelligence");
    whyFrom(s, INSIDER, "hea-general-intelligence", "hea-understand-the-world");
    whyFrom(s, INSIDER, "hea-understand-the-world", MIRAGE);
    whyFrom(s, INSIDER, MIRAGE, V0);
    // from the insider's frame, the arc reaches the floor — the project is real work.
    expect(routesFrom(s, INSIDER, "llms-today", V0)).toBe(true);
  });

  it("THE SKEPTIC — reads 'general intelligence' as a PSEUDO-HEA: a mirage on the field's objectivity", () => {
    const s = new Society(); ideaLine(s);
    // the skeptic lays the SAME first hop (AI does aim at 'general intelligence' — that's real as a
    // local aim)... but routes it ONWARD to a different place: it's a sub-story mirage, a re-run of
    // Descartes' certainty-dream, which Hume already broke. It does NOT reach the floor.
    whyFrom(s, SKEPTIC, "llms-today", "pseudo-hea-general-intelligence");
    whyFrom(s, SKEPTIC, "pseudo-hea-general-intelligence", "the-rationalist-certainty-dream");
    whyFrom(s, SKEPTIC, "the-rationalist-certainty-dream", "hume-skepticism"); // routes BACK to the refutation
    // the skeptic's route loops to Hume and stops — it never reaches V0. The destination is a mirage
    // on the field's own objectivity (intelligence as if there were one objective surface to master).
    expect(routesFrom(s, SKEPTIC, "llms-today", V0)).toBe(false);     // the tell: doesn't reach the floor
    expect(routesFrom(s, SKEPTIC, "llms-today", "hume-skepticism")).toBe(true); // it loops to the old refutation
  });

  it("THE HELD DISAGREEMENT — both readings co-exist; NEITHER frame gets the objective seat", () => {
    const s = new Society(); ideaLine(s);
    // insider route → floor
    whyFrom(s, INSIDER, "llms-today", "hea-general-intelligence");
    whyFrom(s, INSIDER, "hea-general-intelligence", MIRAGE);
    whyFrom(s, INSIDER, MIRAGE, V0);
    // skeptic route → loops to Hume, no floor
    whyFrom(s, SKEPTIC, "llms-today", "pseudo-hea-general-intelligence");
    whyFrom(s, SKEPTIC, "pseudo-hea-general-intelligence", "hume-skepticism");
    // the SAME beat (llms-today) reaches V0 from one frame and NOT the other. Both are legible.
    expect(routesFrom(s, INSIDER, "llms-today", V0)).toBe(true);
    expect(routesFrom(s, SKEPTIC, "llms-today", V0)).toBe(false);
    // neither is occluded — the grammar does NOT collapse them to one objective answer. The held
    // disagreement IS the Mirage: there's no frame-independent fact about whether AI reaches the floor.
    expect(isOccluded(s, "llms-today")).toBe(false); // the idea stands; only the FRAMES differ on its aim.
  });

  it("THE TURN — and that, dear reader, is why it's a mirage: the disagreement is the proof", () => {
    const s = new Society(); ideaLine(s);
    // each frame's 'general intelligence' is its OWN beat — the insider's HEA and the skeptic's
    // pseudo-HEA are not the same node; each frame projects objectivity onto its own sub-story.
    whyFrom(s, INSIDER, "llms-today", "hea-general-intelligence");        // insider: a real floor-ward aim
    whyFrom(s, INSIDER, "hea-general-intelligence", MIRAGE);
    whyFrom(s, INSIDER, MIRAGE, V0);
    whyFrom(s, SKEPTIC, "llms-today", "pseudo-hea-general-intelligence"); // skeptic: a local mirage
    // The insider CANNOT prove the skeptic wrong from inside, nor vice versa — there is no third,
    // objective frame to adjudicate (that frame would be... the Mirage, which no one can stand on).
    // So both routes are real readings of the same history, and the question "does AI reach the floor?"
    // has no view-from-nowhere answer. The 2500-year hunt for the objective floor of mind ends here:
    // not at the floor, but at the discovery that the floor is the horizon every frame walks toward.
    const insiderReaches = routesFrom(s, INSIDER, "llms-today", V0);
    const skepticReaches = routesFrom(s, SKEPTIC, "llms-today", V0);
    expect(insiderReaches).not.toBe(skepticReaches); // they genuinely differ — no collapse
    // and the Mirage holds both: the objective surface is exactly what neither frame can stand on
    // while both walk toward it. That irreducible plurality is why it's a mirage. QED, by doll.
  });
});
