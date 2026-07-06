// ─────────────────────────────────────────────────────────────────────────────
// charge-triage-hybrid.play.test.ts — DOLL 3: the hybrid the first two dolls suggested.
// A four-person team (Ozzie the on-call fixer, Priya who triages, Vik and Tam returning
// from DOLL 2) plays a shape neither pure doll admitted: a charge that NAMES ITS FIX
// attaches DIRECTLY to its own fresh story (DOLL 1's move — cheap, honest, no accumulation
// needed because the goal is already clear); a charge with NO named fix goes to the
// capacitor (DOLL 2's move) UNTIL a distinct TRIAGE OCCASION — not sprint-end, sooner,
// whenever Priya has a look — decides it deserves its own story after all.
//
// This is not a new quality and not a new guard: it is a DECISION PROCEDURE for which of
// the two already-played topologies a charge's story-address should be, made at the
// moment of charging, plus a second small event (the triage occasion) that can PROMOTE a
// capacitor-routed need into its own story later — itself just another discharge-shaped
// event, smaller and more frequent than sprint-end.
//
// THE FUN THAT PULLED US HERE: DOLL 1 and DOLL 2 disagreed about only one thing — WHERE
// the charge presses — and that's a property of the CHARGE'S CONTENT (does it name a fix
// or not), which the charter itself flagged ("a bug report that names its fix"). Once
// that's the deciding fact, of COURSE there's a third shape: a triage occasion between
// the two extremes.
//
// UPDATED mid-sitting: the build body landed the ADDRESS LAW (charge is a bare edge onto
// the open End-pole — chargesOn(end) reads it, no q-charge quality exists anymore). This
// doll's findings are unchanged (topology-level, not API-level); only the read calls moved.
//
// Run: cd scher && npx vitest run charge-triage-hybrid.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, layCharge, voltageOf, isStory, endOf, endActual, unpackPoles, chargesOn,
  isOccluded,
} from "../src/society.js";

function node(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}

/**
 * The triage DECISION is a caller-side judgment (does the charge's content name a fix?)
 * — not a kernel read. We keep it explicit and playful rather than pretending the grammar
 * can read "clear goal" out of English content (that would be exactly the string-matching
 * discipline this repo refuses). A real team would have Priya, a human, make this call;
 * here we just narrate her call inline, honestly, as the doll's own stage direction.
 */
type Charge = { by: string; content: string; namesAFix: boolean };

describe("DOLL 3 — hybrid: clear-goal charges attach direct, goal-less charges go to the capacitor, a triage occasion can promote", () => {
  it("Ozzie's report NAMES ITS FIX — it attaches DIRECTLY to its own fresh story, DOLL 1's move", () => {
    const s = new Society();
    node(s, "ozzie");
    const report: Charge = {
      by: "ozzie",
      content: "the export button's onclick handler is missing a null check on Safari — add the guard",
      namesAFix: true, // clear goal named in the report itself
    };
    node(s, "bug-export-safari", "export button dead on Safari, fix named");
    layCharge(s, "bug-export-safari", report.by, report.content);

    // clear-goal path: own story, own voltage, exactly DOLL 1's shape — cheap because the
    // goal is already legible, no triage overhead needed.
    expect(isStory(s, "bug-export-safari")).toBe(true);
    expect(voltageOf(s, "bug-export-safari")).toBe(2);
  });

  it("Vik's report names NO fix — it goes to the team capacitor, DOLL 2's move, NOT its own story", () => {
    const s = new Society();
    node(s, "vik");
    node(s, "team-formed", "the sprint capacitor");
    unpackPoles(s, "team-formed", "team-formed~routing-end");

    const report: Charge = {
      by: "vik",
      content: "onboarding feels clunky, not sure what's wrong exactly",
      namesAFix: false, // no clear goal — the charter's default case ("usually it doesn't")
    };
    layCharge(s, "team-formed", report.by, report.content);

    // no fresh story was minted for this — it's ink on the STANDING capacitor, not a
    // freestanding story. We can show this negatively: no address called
    // "onboarding-clunky" or similar was ever created; the only new isStory=true fact is
    // the capacitor itself (already true before this charge).
    expect(voltageOf(s, "team-formed")).toBe(2); // 1 open + Vik's charge
    // and there is exactly one q-end-pole designation in the whole society — the
    // capacitor's own, not a second one minted for Vik's vague report:
    const allPoleDesignations = s.all().filter((b) => b.object === "q-end-pole");
    expect(allPoleDesignations.length).toBe(1);
  });

  it("TRIAGE OCCASION (Priya, mid-sprint, sooner than sprint-end): promotes ONE capacitor-routed need into its own story — a small discharge, not the big one", () => {
    const s = new Society();
    node(s, "vik"); node(s, "tam"); node(s, "priya");
    node(s, "now-priya-wednesday", "Wednesday, Priya's triage pass, mid-sprint");
    node(s, "team-formed", "the sprint capacitor");
    const cap = unpackPoles(s, "team-formed", "team-formed~routing-end");

    const c1 = layCharge(s, "team-formed", "vik", "onboarding feels clunky");
    const c2 = layCharge(s, "team-formed", "tam", "deploys feel slow, not sure why");
    expect(voltageOf(s, "team-formed")).toBe(3); // 1 + 2

    // Wednesday, Priya looks at the capacitor (she does NOT wait for sprint-end) and
    // decides Vik's onboarding complaint is worth its own story NOW — a triage occasion,
    // real event, grounded because HER Now, distinct in kind from Odalys's sprint-end
    // discharge (smaller scope: ONE need promoted, not the whole capacitor drained):
    node(s, "story-fix-onboarding", "promoted: fix onboarding flow");
    const promoted = layCharge(s, "story-fix-onboarding", "priya", "triaged out of the capacitor mid-sprint");
    s.layP(
      `${promoted}~because~now-priya-wednesday`,
      "Wednesday triage: promoted from the capacitor",
      promoted, "now-priya-wednesday", "q-grounding",
    );

    // the ORIGINAL charge (Vik's) is untouched — append-only, same discipline as DOLL 2's
    // sprint-end discharge, just smaller and earlier. Charges are bare edges onto the End
    // (address law) — chargesOn(end) reads them, no quality word to look up:
    expect(isOccluded(s, c1)).toBe(false);
    const capCharges = chargesOn(s, cap.end);
    expect(capCharges.map((c) => c.slug).sort()).toEqual([c1, c2].sort());

    // the capacitor itself is NOT discharged (its circuit stays open — Tam's deploy
    // complaint is still sitting there, only Vik's got promoted) — this is the key
    // difference from sprint-end: triage is SELECTIVE and doesn't close the big circuit.
    expect(endActual(s, cap.end)).toBe(false);
    expect(voltageOf(s, "team-formed")).toBe(3); // unchanged — the originals are still there

    // and the promoted story has its own fresh, small voltage:
    expect(voltageOf(s, "story-fix-onboarding")).toBe(2); // 1 open + priya's triage charge
  });

  it("the hybrid's own honesty check: triage is a JUDGMENT CALL, not a kernel read — 'namesAFix' cannot be derived from content without string-matching the grammar refuses", () => {
    // This is the doll pointing at its own seam. The `namesAFix` field above is decided
    // by US, narrating Priya/Ozzie, exactly the way a human triager would read English
    // and judge. If a future build wanted the KERNEL itself to branch on "does this
    // charge name a fix," it would need either (a) a human/UI decision laid as an
    // explicit edge at charge time (e.g. a q-charge variant, or a lateral quality
    // marking "goal-named"), or (b) content classification outside the graph (an LLM
    // call, policy-layer, never inside society.ts's pure reads). Option (a) is buildable
    // without minting new KERNEL-branching qualities — a lateral quality (the meta-law
    // exempts laterals from needing a law+guard) could carry it. This doll does not mint
    // that quality; it only shows where the seam is, honestly, per the charter's warning
    // against eager minting.
    const s = new Society();
    node(s, "ozzie");
    node(s, "bug-x", "some report");
    // if a team wanted to mark clarity WITHOUT inventing kernel-branching machinery, a
    // lateral quality is available today, unminted, just to show the shape is already
    // representable with existing grammar (no new quality needed for THIS much):
    const chargeSlug = layCharge(s, "bug-x", "ozzie", "clear fix named");
    s.layP(`${chargeSlug}~clarity`, "this charge names its fix", chargeSlug, "q-goal-named", "q-goal-named");
    // ^ a LATERAL quality (rides through prehendsAs with no kernel branch, per the
    // KernelQuality doc-comment at society.ts:30-42) — playable today, not proposed as
    // a new law. We do NOT assert this becomes canon; we only prove it typechecks and
    // lays without violating any guard (assertNoLure, assertNotMembershipContainment).
    expect(s.has(`${chargeSlug}~clarity`)).toBe(true);
    expect(s.has(`${chargeSlug}~clarity~q`)).toBe(true);
  });
});
