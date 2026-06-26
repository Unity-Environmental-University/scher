// ─────────────────────────────────────────────────────────────────────────────
// founding-line.play.test.ts — Dissent → America → the Constitution, played. 🪶⚖️
//
// A doll (2026-06-26, Hallie: "take the puritans out to america? with the quakers? to the
// writing of the constitution?"). The through-line of the whole grammar — and of Hallie's
// own work — is here: from a CROWN that banishes belief, to dissenters who FLEE the light
// cone, to dissenters who turn and BANISH the next dissenter (the Quaker footgun), to a
// document that REFUSES banishment IN WRITING and encodes its own succession (Article V).
//
// It is single-reference-frame-is-the-master-negative-prehension losing, slowly, over 150
// years, ending in a written refusal: "Congress shall make no law... " = thou shalt not
// occlude belief by force = plurality held in LAW.
//
// Run: cd scher && npx vitest run founding-line.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, isOccluded, prehensionsOnto, type Beat } from "../src/society.js";

function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }
function succeeds(s: Society, heir: string, parent: string) {
  lay(s, heir); lay(s, parent);
  s.layP(`${heir}--${parent}-succ`, `${heir} succeeds ${parent}`, heir, parent, "q-utterance");
}
/** banish/occlude a belief or claim BY FORCE (the gallows, the prison) — a named realm casts q-occludes. */
function banish(s: Society, target: string, by: string) {
  lay(s, by);
  s.layP(`occ-${target}-by-${by}`, `${by} occludes ${target}`, by, target, "q-occludes");
}
/** the live tips reachable from root (HEAD; >1 = plural). */
function heads(s: Society, root: string): string[] {
  const onChain = new Set<string>([root]); let grew = true;
  while (grew) { grew = false;
    for (const b of s.all())
      if (b.slug.endsWith("-succ") && b.object && onChain.has(b.object) && b.subject && !onChain.has(b.subject) && !isOccluded(s, b.slug))
        { onChain.add(b.subject); grew = true; }
  }
  return [...onChain].filter((m) => !s.all().some((b) => b.slug.endsWith("-succ") && b.object === m && !isOccluded(s, b.slug)));
}
/** is this belief live (un-occluded) FROM a given realm's reading? occlusion is frame-scoped. */
function liveFrom(s: Society, belief: string): boolean { return s.has(belief) && !isOccluded(s, belief); }

describe("Dissent → America → the Constitution 🪶⚖️", () => {
  it("THE CROWN BANISHES BELIEF — dissent occluded by force under the established church", () => {
    const s = new Society();
    lay(s, "english-church");
    succeeds(s, "puritan-dissent", "english-church");   // dissent succeeds (forks from) the church
    succeeds(s, "separatist-pilgrims", "puritan-dissent");
    banish(s, "separatist-pilgrims", "the-crown");       // persecuted — the claim occluded at home
    expect(liveFrom(s, "separatist-pilgrims")).toBe(false); // silenced under the crown's frame
  });

  it("EMIGRATION — they don't depose the crown, they LEAVE its light cone (occlusion as exit)", () => {
    const s = new Society();
    lay(s, "english-church");
    succeeds(s, "puritan-dissent", "english-church");
    banish(s, "puritan-dissent", "the-crown");           // occluded in England...
    // ...but a NEW frame (the colony) reads from its own standpoint — occlusion is society-scoped.
    succeeds(s, "massachusetts-bay", "puritan-dissent");  // the belief takes root in a new society
    // from the colony's frame, the dissent is the LIVE root — the crown's occlusion doesn't reach here.
    expect(heads(s, "massachusetts-bay").includes("massachusetts-bay")).toBe(true);
    // the belief lives in the new frame even as it was occluded in the old. Plural frames.
    expect(s.has("massachusetts-bay")).toBe(true);
  });

  it("THE QUAKER FOOTGUN — the banished become the banishers (Mary Dyer, Boston Common 1660)", () => {
    const s = new Society();
    lay(s, "puritan-dissent");
    succeeds(s, "massachusetts-bay", "puritan-dissent");  // the colony of the formerly-persecuted
    succeeds(s, "quaker-inner-light", "puritan-dissent"); // dissent-within-dissent, a sibling claim
    // the colony founded BY survivors of occlusion turns and occludes the next dissenter — by force.
    banish(s, "quaker-inner-light", "massachusetts-bay"); // the gallows. the recurring Quaker footgun.
    expect(liveFrom(s, "quaker-inner-light")).toBe(false); // silenced by the once-silenced. the tragedy.
  });

  it("PENN'S REPAIR — a society founded on NOT banishing (the Holy Experiment)", () => {
    const s = new Society();
    lay(s, "quaker-inner-light");
    succeeds(s, "massachusetts-bay", "quaker-inner-light");
    banish(s, "quaker-inner-light", "massachusetts-bay"); // occluded in the Bay...
    // Pennsylvania: founded so that NO belief is occluded by force — un-occlude, hold plurality.
    succeeds(s, "pennsylvania", "quaker-inner-light");
    banish(s, "occ-quaker-inner-light-by-massachusetts-bay", "pennsylvania"); // occlude the occlusion
    expect(liveFrom(s, "quaker-inner-light")).toBe(true); // the light re-lit: tolerance as founding law
  });

  it("THE CONSTITUTION — a society that writes its OWN succession rule (Article V, self-reference)", () => {
    const s = new Society();
    lay(s, "the-colonies");
    succeeds(s, "articles-of-confederation", "the-colonies");
    // the Constitution succeeds the Articles — but its defining act is encoding HOW it itself succeeds:
    succeeds(s, "the-constitution", "articles-of-confederation");
    // Article V: the amendment clause — a beat by which the Constitution specifies its own q-succeeds.
    // (An amendment succeeds the Constitution AND is authored BY the Constitution's own rule. Self-ref.)
    succeeds(s, "amendment-process", "the-constitution");
    expect(heads(s, "the-colonies")).toEqual(["amendment-process"]); // HEAD = the live, amendable tip
    // the Articles remain an honored ancestor — superseded in reading, never deleted.
    expect(s.has("articles-of-confederation")).toBe(true);
  });

  it("THE FIRST AMENDMENT — banishment-of-belief REFUSED in writing (the master-negative-prehension, beaten)", () => {
    const s = new Society();
    lay(s, "the-constitution");
    succeeds(s, "bill-of-rights", "the-constitution");
    // three beliefs, three frames — the thing the crown and the Bay both tried to collapse to one.
    for (const belief of ["quaker-inner-light", "puritan-dissent", "catholic-rome"]) {
      lay(s, belief);
      succeeds(s, belief + "-free", "bill-of-rights"); // each belief's free exercise succeeds from the Bill
    }
    // "Congress shall make no law..." — NO realm may occlude belief by force. We assert the refusal:
    // there is NO live force-occlusion onto any of the three beliefs. Plurality held in LAW.
    const anyForced = ["quaker-inner-light", "puritan-dissent", "catholic-rome"]
      .some((b) => isOccluded(s, b));
    expect(anyForced).toBe(false); // none occluded — the single-reference-frame, refused in writing
    // and all three free-exercise claims co-reign — a deliberately PLURAL head. No one true church.
    expect(heads(s, "bill-of-rights").sort())
      .toEqual(["catholic-rome-free", "puritan-dissent-free", "quaker-inner-light-free"]);
  });

  // ── THE BITE (Hallie: "gesture at the society of the Lenape without modelling them fully") ──
  // Every test above tells the founding's flattering self-portrait: dissenters flee a banishing
  // crown and write freedom. It is a lie BY OMISSION. "Pennsylvania" and "Massachusetts Bay" were
  // laid on land already inhabited — the Lenape, the Massachusett, and others were PRIOR societies,
  // present, with their own frames, their own routes. The same Constitution that refused to occlude
  // belief drew a "we the people" light cone that NEGATIVELY-PREHENDED the people already there:
  // not argued with, not merged with — read AROUND. (And worse than occlusion: dispossession and
  // genocide = banishment, the irreversible one.) The grammar's BITE is that it cannot tell the
  // flattering story without the absence showing.
  //
  // We do NOT model the Lenape fully — to capture a living society in OUR schema would itself be
  // the colonial move (the cadastre: single-reference-frame imposed). We mark only: they were
  // PRIOR, they were PRESENT, and the founding frame did not prehend them. The gap is the truth.
  it("THE GAP — the founding's light cone read AROUND the societies already here (negative prehension)", () => {
    const s = new Society();
    // the prior society: laid as a bare presence, NOT modelled, NOT succeeded-from, NOT captured.
    // It exists in the canon as a root with no inbound edges — present, prior, unprehended.
    lay(s, "the-lenape-society");        // present before "Pennsylvania" — a gesture, not a model.

    // the founding frame builds its whole chain WITHOUT a single prehension onto the prior society:
    lay(s, "the-constitution");
    succeeds(s, "we-the-people", "the-constitution");
    succeeds(s, "pennsylvania", "we-the-people");   // laid on Lenape land — but the chain never names it

    // THE BITE, asserted: the founding chain prehends the prior society ZERO times.
    // (no q-succeeds, no merge, no honest q-occludes-with-an-agent — it was read AROUND.)
    const prehensionsOntoLenape = s.all().filter((b) =>
      b.object === "the-lenape-society" && b.subject !== null);
    expect(prehensionsOntoLenape.length).toBe(0); // unprehended. the absence IS the dispossession.

    // and the prior society is not even OCCLUDED — occlusion at least NAMES an agent and a frame
    // (honest: "X occluded by E"). This is worse: a NEGATIVE prehension — read as if not there at all.
    expect(isOccluded(s, "the-lenape-society")).toBe(false);   // not occluded...
    expect(s.has("the-lenape-society")).toBe(true);            // ...but present in the canon, prior, real.
    // The grammar holds the gap open and legible: the founding HEAD never rests on this society,
    // yet the society is THERE. That un-prehended presence is the master-negative-prehension at its
    // most total — and the canon refuses to let the flattering chain hide it. (honest-hamartia: the
    // sin is declared, scoped, present — not scrubbed.)
  });
});
