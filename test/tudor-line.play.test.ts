// ─────────────────────────────────────────────────────────────────────────────
// tudor-line.play.test.ts — THE TUDOR LINE, played as a society. 🌹👑
//
// A bigger doll (2026-06-26, Hallie: "wanna do a quick test of the entire tudor line?").
// The Tudors exercise EVERY word of the grammar — they're the canonical succession drama:
//   · q-succeeds  — the crown passes (commit on the branch; HEAD = the reigning monarch)
//   · the WAR     — two claimants succeed one root (the branch forks)
//   · MERGE       — Henry VII + Elizabeth of York: two claims (Lancaster/York) → one heir
//   · BANISH      — Lady Jane Grey, the 9-day pretender, expunged (occlude the claim)
//   · the END     — Elizabeth I dies childless: the branch CANNOT succeed itself → the Tudor
//                   society perishes, succeeded by a DIFFERENT society (the Stuarts).
//
// History, compressed (and simplified — it's a doll, not a thesis):
//   Edward III ──(Wars of the Roses: two cadet claims)── Lancaster ⚔ York
//        │ MERGE
//   Henry VII (m. Elizabeth of York) → Henry VIII → { Edward VI, Mary I, Elizabeth I }
//        (Lady Jane Grey: a pretender between Edward VI and Mary I — banished)
//   Elizabeth I → ∅ (no heir) ⇒ Tudor branch ends ⇒ James VI of Scotland (Stuart) succeeds
//
// Run: cd scher && npx vitest run tudor-line.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, isOccluded, type EventRow } from "../src/society.js";

function lay(s: Society, slug: string) { s.lay({ slug, content: slug, subject: null, object: null }); }
/** a monarch SUCCEEDS their predecessor (commit on the crown-branch). */
function succeeds(s: Society, monarch: string, predecessor: string) {
  if (!s.has(monarch)) lay(s, monarch);
  if (!s.has(predecessor)) lay(s, predecessor);
  s.layP(`${monarch}--${predecessor}-succ`, `${monarch} succeeds ${predecessor}`, monarch, predecessor, "q-utterance");
}
/** banish/occlude a claim (the crown's true banishment was the axe; we occlude the claim-edge). */
function banish(s: Society, claimEdge: string, by = "the-realm") {
  if (!s.has(by)) lay(s, by);
  s.layP(`occ-${claimEdge}`, `expunge ${claimEdge}`, by, claimEdge, "q-occludes");
}
/** the reigning HEAD(s): on the chain from `root`, succeeded by no LIVE claim. >1 = a war. */
function reigning(s: Society, root: string): string[] {
  const onChain = new Set<string>([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const b of s.all()) {
      if (b.slug.endsWith("-succ") && b.object && onChain.has(b.object) && b.subject && !onChain.has(b.subject)
          && !isOccluded(s, b.slug)) { onChain.add(b.subject); grew = true; }
    }
  }
  return [...onChain].filter((m) =>
    !s.all().some((b) => b.slug.endsWith("-succ") && b.object === m && !isOccluded(s, b.slug)));
}

describe("The Tudor line, played 🌹👑", () => {
  it("THE WARS OF THE ROSES — two cadet claims on Edward III → a forked crown (war)", () => {
    const s = new Society();
    lay(s, "edward-iii");
    succeeds(s, "house-lancaster", "edward-iii");   // claim 1
    succeeds(s, "house-york", "edward-iii");         // claim 2 — the fork
    expect(reigning(s, "edward-iii").sort()).toEqual(["house-lancaster", "house-york"]); // a war: two heads
  });

  it("HENRY VII — the MERGE that ends the war: a single heir succeeds BOTH houses", () => {
    const s = new Society();
    lay(s, "edward-iii");
    succeeds(s, "house-lancaster", "edward-iii");
    succeeds(s, "house-york", "edward-iii");
    // Henry Tudor (Lancaster) marries Elizabeth of York → Henry VII succeeds BOTH claims.
    succeeds(s, "henry-vii", "house-lancaster");
    succeeds(s, "henry-vii", "house-york");
    expect(reigning(s, "edward-iii")).toEqual(["henry-vii"]); // one crown, descended from both roses
  });

  it("THE TUDOR REIGN — succeeds down to a 3-way war among Henry VIII's children", () => {
    const s = new Society();
    lay(s, "henry-vii");
    succeeds(s, "henry-viii", "henry-vii");
    // three children, each a claim on Henry VIII — a 3-way succession crisis
    succeeds(s, "edward-vi", "henry-viii");
    succeeds(s, "mary-i", "henry-viii");
    succeeds(s, "elizabeth-i", "henry-viii");
    expect(reigning(s, "henry-vii").sort()).toEqual(["edward-vi", "elizabeth-i", "mary-i"]); // 3 pretenders
  });

  it("LADY JANE GREY — the 9-day pretender, BANISHED (occlude the claim)", () => {
    const s = new Society();
    lay(s, "henry-viii");
    succeeds(s, "edward-vi", "henry-viii");
    // Edward VI names Jane his heir; she "reigns" 9 days, then the realm expunges the claim.
    succeeds(s, "lady-jane-grey", "edward-vi");
    succeeds(s, "mary-i", "edward-vi");           // Mary's rival claim
    banish(s, "lady-jane-grey--edward-vi-succ");  // the axe: her claim occluded
    expect(reigning(s, "henry-viii")).toEqual(["mary-i"]); // Jane gone from the read; Mary reigns
  });

  it("THE END OF THE LINE — Elizabeth I leaves no heir: the Tudor branch cannot succeed itself", () => {
    const s = new Society();
    lay(s, "henry-viii");
    succeeds(s, "elizabeth-i", "henry-viii");
    // Elizabeth dies childless: NOTHING succeeds her. She is the tip — and the last Tudor.
    const tudorHead = reigning(s, "henry-viii");
    expect(tudorHead).toEqual(["elizabeth-i"]);
    const elizabethSucceeded = s.all().some((b) => b.slug.endsWith("-succ") && b.object === "elizabeth-i" && !isOccluded(s, b.slug));
    expect(elizabethSucceeded).toBe(false); // the branch terminates — no q-succeeds onward
  });

  it("THE STUART SUCCESSION — a DIFFERENT society takes up the crown across the gap", () => {
    const s = new Society();
    lay(s, "henry-viii");
    succeeds(s, "elizabeth-i", "henry-viii");
    // James VI of Scotland (House Stuart — a different society) succeeds Elizabeth: the crown
    // continues even though the TUDOR route ended. The branch perished; the throne did not.
    succeeds(s, "james-i-stuart", "elizabeth-i");
    expect(reigning(s, "henry-viii")).toEqual(["james-i-stuart"]); // the crown passes societies
    // and Elizabeth remains an honored ancestor — immutable, still on the chain, just not HEAD.
    expect(s.has("elizabeth-i")).toBe(true);
  });

  // ── up through the Civil War and Restoration (Hallie: "take it up through the civil war and
  //    recoronation") — where the grammar does its most violent move: banish the CROWN ITSELF,
  //    run headless (the Commonwealth = a society that occluded the whole crown-branch), then
  //    UN-OCCLUDE it (the Restoration back-dated Charles II's reign to 1649 — pretending the
  //    interregnum never happened = occluding the occlusion = scher's emergent un-occlusion). ──

  it("THE REGICIDE — the realm banishes the CROWN itself; the Commonwealth runs headless", () => {
    const s = new Society();
    lay(s, "james-i-stuart");
    succeeds(s, "charles-i", "james-i-stuart");
    // 1649: not a claimant banished — the MONARCHY banished. Charles I's reign-claim is occluded.
    banish(s, "charles-i--james-i-stuart-succ", "the-commonwealth");
    // the crown-branch from James has no live HEAD — the society runs without a monarch.
    expect(reigning(s, "james-i-stuart")).toEqual(["james-i-stuart"]); // folds back to the last un-occluded tip
    const charlesReigns = s.all().some((b) => b.slug === "charles-i--james-i-stuart-succ" && !isOccluded(s, b.slug));
    expect(charlesReigns).toBe(false); // the crown is struck — a headless republic
  });

  it("THE PROTECTORATE — a rival society's claim, fragile, fails to hold the branch", () => {
    const s = new Society();
    lay(s, "the-commonwealth");
    succeeds(s, "oliver-cromwell", "the-commonwealth");      // Lord Protector
    succeeds(s, "richard-cromwell", "oliver-cromwell");      // the hereditary attempt ("Tumbledown Dick")
    // Richard's protectorate collapses — the realm occludes the whole Cromwell line.
    banish(s, "richard-cromwell--oliver-cromwell-succ", "the-restored-realm");
    banish(s, "oliver-cromwell--the-commonwealth-succ", "the-restored-realm");
    // nothing of the protectorate survives the read — the rival society perished.
    expect(reigning(s, "the-commonwealth")).toEqual(["the-commonwealth"]);
  });

  it("THE RESTORATION — un-occlude the occlusion: the crown reads live again, as if continuous", () => {
    const s = new Society();
    lay(s, "james-i-stuart");
    succeeds(s, "charles-i", "james-i-stuart");
    // the Commonwealth occluded the crown (the regicide)...
    banish(s, "charles-i--james-i-stuart-succ", "the-commonwealth");
    expect(reigning(s, "james-i-stuart")).toEqual(["james-i-stuart"]); // headless, mid-interregnum
    // ...the RESTORATION occludes THAT occlusion (the regicide-edge is itself occluded). 1660:
    // Charles II's reign back-dated to 1649 — the interregnum legally never happened. Emergent
    // un-occlusion: the crown-line's shadow lifts, Charles I reads live again as an ancestor.
    banish(s, "occ-charles-i--james-i-stuart-succ", "the-restored-realm"); // occlude the occlusion
    // now Charles II succeeds Charles I, and the line reads continuous from James through to him.
    succeeds(s, "charles-ii", "charles-i");
    expect(reigning(s, "james-i-stuart")).toEqual(["charles-ii"]); // the crown restored, line intact
    // the regicide is now an occluded occlusion — present in history, but not in the live read.
    expect(isOccluded(s, "charles-i--james-i-stuart-succ")).toBe(false); // its shadow lifted
  });
});
