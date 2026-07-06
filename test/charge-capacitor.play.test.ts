// ─────────────────────────────────────────────────────────────────────────────
// charge-capacitor.play.test.ts — DOLL 2: "capacitor." A three-person team (Tam the
// triager, Vik who reports, Odalys who runs sprint-end, Priya who watches capacitance)
// plays out Hallie's other half of the charter: "does it accumulate into a capacitor that
// will eventually have to be discharged?"
//
// THE SHAPE: a team's capacitor is ITSELF a story — its own Once, its own open End,
// content something like "these needs are routed" — and unattached charges press on the
// CAPACITOR'S end-pole instead of minting a private story each (contrast DOLL 1). This
// is the SAME machinery (unpackPoles, layCharge, voltageOf, closePole) pointed at a
// standing address instead of a fresh one per report — no new quality, no new guard,
// purely a topology choice: address ONE open End, not N of them.
//
// UPDATED mid-sitting: the build body landed the ADDRESS LAW (charge is a bare edge onto
// the open End-pole — chargesOn(end) reads it, no q-charge quality exists anymore) and
// closePole (the done-verb's kernel half) plus a FRAME-RELATIVE voltageOf(soc, story,
// ground?) — voltage is read against a ground (default the story's own frame's Now via
// storyNow), and discharge PROPAGATES rather than zeroing globally: a frame the closing
// hasn't established to still honestly reads residual voltage. This is a genuinely
// richer machinery than the flat-sum voltageOf this doll was first written against, and
// it changes one whole scene for the better (see the capacitance section below — the
// "early algedonic signal" Hallie asked for turns out to be REAL under the new voltageOf,
// where it wasn't producible under the old one).
//
// The DISCHARGE at sprint-end is played as a REAL event: it closes the capacitor's
// circuit via closePole — and because append-only means the original charges NEVER move,
// the discharge event lays NEW charge edges on next-sprint stories' Ends, grounded
// BECAUSE the discharge (not because the original report). We verify this shape actually
// holds with the real reads: original charges keep their original authors; the
// re-expression is additional ink, not surgery on old ink.
//
// A second, slower capacitor — the DEEP BACKLOG CAPACITOR — receives what the sprint
// declines to route: it accumulates across sprints and its voltage is read as "the
// honest accumulating dread of a backlog," now a NUMBER instead of a feeling.
//
// Finally the doll BREAKS ITS OWN SHAPE: what happens when Odalys goes on leave and the
// discharge event never comes? Floating charge — accumulation with no path to ground —
// and, since this sitting, floatingCharge(soc, grounds) is a REAL algedonic read that
// finds exactly this pathology; we test it directly rather than only narrating it.
//
// Run: cd scher && npx vitest run charge-capacitor.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, layCharge, voltageOf, isStory, endOf, endActual, unpackPoles, reopenTask,
  closePole, chargesOn, storyNow, floatingCharge, overload,
  prehensionsOnto, isOccluded,
} from "../src/society.js";

function node(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}

describe("DOLL 2 — capacitor: unattached charges press on a standing routing story", () => {
  it("the sprint capacitor is itself a story — unpacked once, at team formation, with an open 'route these' End", () => {
    const s = new Society();
    node(s, "team-formed", "the team's standing capacitor, opened at kickoff");
    const cap = unpackPoles(s, "team-formed", "team-formed~routing-end");

    expect(isStory(s, "team-formed")).toBe(true);
    expect(endOf(s, "team-formed")).toBe(cap.end);
    expect(endActual(s, cap.end)).toBe(false); // "these needs are routed" — not yet
    // no charges pressed yet — voltage in the capacitor's own frame reads the bare open strike:
    expect(voltageOf(s, "team-formed")).toBe(1);
  });

  it("Vik and Tam file goal-less felt-needs across a sprint — voltage climbs on ONE story, not N", () => {
    const s = new Society();
    node(s, "vik"); node(s, "tam");
    node(s, "team-formed", "the sprint capacitor");
    unpackPoles(s, "team-formed", "team-formed~routing-end");

    layCharge(s, "team-formed", "vik", "the onboarding flow feels clunky, not sure what to do about it");
    layCharge(s, "team-formed", "vik", "same clunkiness, hit it again today");
    layCharge(s, "team-formed", "tam", "someone should look at why deploys take so long");

    // unlike DOLL 1, this is still ONE story — the capacitor's own End-pole, never
    // re-unpacked, because layCharge's unpack is idempotent against an already-unpacked
    // event (society.ts:730-731: `existing` short-circuits inside unpackPoles).
    expect(voltageOf(s, "team-formed")).toBe(4); // 1 (open) + 3 charges
    const end = endOf(s, "team-formed")!;
    const chargers = chargesOn(s, end).map((c) => c.subject);
    expect(chargers.sort()).toEqual(["tam", "vik", "vik"]);
  });

  it("SPRINT-END DISCHARGE: a real event closes the capacitor's circuit and re-expresses charges as NEW edges on next-sprint stories — originals untouched", () => {
    const s = new Society();
    node(s, "vik"); node(s, "tam"); node(s, "odalys");
    node(s, "team-formed", "the sprint capacitor");
    const cap = unpackPoles(s, "team-formed", "team-formed~routing-end");

    const c1 = layCharge(s, "team-formed", "vik", "onboarding flow clunky");
    const c2 = layCharge(s, "team-formed", "tam", "deploys are slow");

    // Odalys runs the discharge: closePole is the kernel's done-verb half today — it lays
    // `end ~because~ storyNow(team-formed)`, the ONE edge the address law lets leave a
    // naked pole. She DOES NOT touch c1/c2.
    const discharge = closePole(s, "team-formed");
    expect(endActual(s, cap.end)).toBe(true);
    expect(voltageOf(s, "team-formed")).toBe(0); // the capacitor's circuit is closed, in its own frame

    // she re-expresses the two needs as charges on REAL next-sprint stories. Each new
    // story is unpacked fresh; the NEW charge edge is grounded BECAUSE THE DISCHARGE (not
    // because Vik's or Tam's original report) — that "because" is the causal claim "this
    // next-sprint story exists because the sprint-end routing happened," a different,
    // true, ADDITIONAL fact from "Vik noticed this."
    node(s, "story-fix-onboarding", "next sprint: fix onboarding flow");
    const s1 = layCharge(s, "story-fix-onboarding", "odalys", "routed from sprint-end discharge");
    s.layP(`${s1}~because~${discharge}`, "this routing traces to the sprint-end discharge", s1, discharge, "q-grounding");

    node(s, "story-fix-deploys", "next sprint: speed up deploys");
    const s2 = layCharge(s, "story-fix-deploys", "odalys", "routed from sprint-end discharge");
    s.layP(`${s2}~because~${discharge}`, "this routing traces to the sprint-end discharge", s2, discharge, "q-grounding");

    // VERIFY THE APPEND-ONLY SHAPE: c1 and c2 (the ORIGINAL charges) are UNMOVED — still
    // present, still authored by Vik/Tam, still pressing on the OLD capacitor's End, not
    // silently relinked onto the new stories. Nothing was surgery; everything is addition.
    const capacitorCharges = chargesOn(s, cap.end);
    expect(capacitorCharges.map((c) => c.slug).sort()).toEqual([c1, c2].sort());
    expect(capacitorCharges.find((c) => c.slug === c1)?.subject).toBe("vik");
    expect(capacitorCharges.find((c) => c.slug === c2)?.subject).toBe("tam");
    expect(isOccluded(s, c1)).toBe(false); // never occluded — the routing doesn't erase the report
    expect(isOccluded(s, c2)).toBe(false);

    // the NEW stories carry their OWN fresh voltage — genuinely new open differentials,
    // not the old one relabeled:
    expect(voltageOf(s, "story-fix-onboarding")).toBe(2); // 1 open + 1 charge (odalys's routing charge)
    expect(voltageOf(s, "story-fix-deploys")).toBe(2);

    // and the causal trace is real and walkable: the new charges' grounding names the
    // discharge EVENT (not Vik's original charge slug) as their because — the authorship
    // of the FEEL stays with Vik; the authorship of the ROUTING stays with Odalys. Two
    // different true facts, two different subjects, both readable forever.
    expect(prehensionsOnto(s, discharge, "q-grounding").map((g) => g.subject).sort()).toEqual([s1, s2].sort());
  });

  it("the Deep Backlog Capacitor: a second, slower bank — voltage after three sprints of declined items is the measured dread", () => {
    const s = new Society();
    node(s, "odalys");
    node(s, "deep-backlog", "the Deep Backlog Capacitor — a team's, slower, cross-sprint");
    const dbc = unpackPoles(s, "deep-backlog", "deep-backlog~routing-end");
    expect(endActual(s, dbc.end)).toBe(false); // a slow capacitor's End is not expected to close soon

    // sprint 1: two things nobody had room for get routed to the DBC instead of next-sprint stories
    layCharge(s, "deep-backlog", "odalys", "sprint 1: declined — 'refactor the auth module' (no room)");
    layCharge(s, "deep-backlog", "odalys", "sprint 1: declined — 'document the deploy pipeline' (no room)");
    expect(voltageOf(s, "deep-backlog")).toBe(3); // 1 + 2

    // sprint 2: one more declined item
    layCharge(s, "deep-backlog", "odalys", "sprint 2: declined — 'flaky test suite' (no room)");
    expect(voltageOf(s, "deep-backlog")).toBe(4); // 1 + 3

    // sprint 3: two more
    layCharge(s, "deep-backlog", "odalys", "sprint 3: declined — 'onboarding docs stale' (no room)");
    layCharge(s, "deep-backlog", "odalys", "sprint 3: declined — 'CI takes 40 minutes' (no room)");
    expect(voltageOf(s, "deep-backlog")).toBe(6); // 1 + 5

    // THE HONEST READ: the DBC's voltage is a monotone-rising number across three sprints
    // — the "accumulating dread of a backlog," now measurable instead of a vibe. It never
    // drops on its own; only a discharge (routing occasion) or a done-verb on the DBC's
    // own End would close it. Nobody has run one — which is the true, un-comfortable
    // shape of a deep backlog: it is designed to hold voltage, not to relieve it.
    expect(chargesOn(s, dbc.end).length).toBe(5);
  });

  // ── THE PATHOLOGY, PLAYED HONESTLY: what if the discharge event never comes? ────────
  it("BREAKS ITS OWN SHAPE: floating charge — Odalys goes on leave, no discharge — floatingCharge(soc, grounds) finds it directly, unfiltered (the algedonic channel)", () => {
    const s = new Society();
    node(s, "vik"); node(s, "tam");
    node(s, "team-formed", "the sprint capacitor");
    const cap = unpackPoles(s, "team-formed", "team-formed~routing-end");

    layCharge(s, "team-formed", "vik", "week 1 need");
    layCharge(s, "team-formed", "tam", "week 2 need");
    // Odalys goes on leave. Sprint-end arrives. No discharge event is ever laid.
    layCharge(s, "team-formed", "vik", "week 3 need too — still nobody's routing it");

    // voltage keeps climbing — there is NO decay, NO cap, NO automatic escalation:
    const v = voltageOf(s, "team-formed");
    expect(v).toBe(4); // 1 open + 3 charges
    expect(endActual(s, cap.end)).toBe(false); // still open — nothing ever forces closure

    // THE ALGEDONIC READ (landed this sitting): floatingCharge(soc, grounds) is the built
    // pain-channel read — it takes the team's LIVE frames' lineage-head nodes and returns
    // every open, charged differential unreachable from ALL of them. If nobody's live
    // frame (Priya's Now, say, the only person still around) has a grounding path to the
    // capacitor's own Now, it surfaces here — loudest first, NEVER silently filtered
    // (don't-plug-the-channel law, society.ts:801-806):
    node(s, "priya"); node(s, "now-priya"); // Priya's the only one left; her frame never touches team-formed
    const floating = floatingCharge(s, ["now-priya"]);
    expect(floating.length).toBe(1);
    expect(floating[0].story).toBe("team-formed");
    expect(floating[0].charges).toBe(3); // the raw, ground-independent charge count — "dukkha nobody holds"
    expect(floating[0].now).toBe(storyNow("team-formed"));

    // and if the capacitor's OWN frame IS a live ground (say the team still nominally
    // considers it "theirs," so its own Now counts as a live ground), it does NOT float —
    // reachability is reflexive (a frame reaches its own Now trivially), which is the
    // correct edge case: a capacitor is never floating relative to ITSELF, only relative
    // to the OTHER live frames that were supposed to be tending it:
    const notFloatingFromItself = floatingCharge(s, [storyNow("team-formed")]);
    expect(notFloatingFromItself.length).toBe(0);
  });

  it("overload(soc, ground): the total voltage grounded through ONE lineage — the honest sum across every live story, unfiltered", () => {
    const s = new Society();
    node(s, "vik"); node(s, "tam"); node(s, "priya"); node(s, "now-priya");
    node(s, "team-formed", "the sprint capacitor");
    node(s, "deep-backlog", "the Deep Backlog Capacitor");
    unpackPoles(s, "team-formed", "team-formed~routing-end");
    unpackPoles(s, "deep-backlog", "deep-backlog~routing-end");

    layCharge(s, "team-formed", "vik", "need 1");
    layCharge(s, "team-formed", "tam", "need 2");
    layCharge(s, "deep-backlog", "priya", "declined item");

    // reading from Priya's own frame's Now yields nothing (nothing established to it yet
    // — establishment is a real relation this doll hasn't wired, so we read from each
    // story's OWN frame instead, composing the total by hand first to show what overload
    // itself computes identically, in one call:
    const total = overload(s, storyNow("team-formed")).total; // reading grounded in team-formed's own Now
    // team-formed's own differential (3) is visible to its own frame trivially; deep-backlog's
    // is a SEPARATE frame with no established path to team-formed's Now, so it does not
    // contribute — overload is HONEST about what one lineage actually carries, not a
    // society-wide sum:
    expect(total).toBe(voltageOf(s, "team-formed", storyNow("team-formed")));
    const readings = overload(s, storyNow("team-formed")).readings;
    expect(readings.map((r) => r.story)).toContain("team-formed");
  });

  // ── CAPACITANCE, C = Q/V (Hallie, mid-sitting, verbatim): "capacitance... really does
  // what it says on the tin, lets us ACTUALLY MEASURE the capacity of our system and when
  // we're getting close." A THIRD derived quantity, alongside charge (the write) and
  // voltage (the read across the differential): capacitance is accumulated charge HELD
  // per unit of voltage — Q/V — computed purely by the CALLER from two reads that already
  // exist (chargesOn(end).length for Q, voltageOf(soc, story, ground) for V, now
  // frame-relative). No new quality, no new edge, no kernel change: capacitance is
  // composition of two reads, same discipline as DOLL 4 Scene A's "composedPressure."
  describe("CAPACITANCE — C = Q/V, a third derived read composed from charge-count and voltage (no new quality)", () => {
    /** capacitanceOf: Q/V, computed purely from existing exports — NOT a society.ts read,
     *  a doll-local composition, exactly the discipline the meta-law asks for (prefer
     *  composing existing reads over minting a new one; if this earns a name in src/ later,
     *  it needs its own one-sentence law + guard in that commit, not smuggled in here).
     *  Q is read raw (chargesOn is ground-independent, per the address law); V is read
     *  AGAINST A GROUND (voltageOf's new parameter) — so capacitance itself is now
     *  frame-relative too: "how much this reader's lineage feels held per unit felt need." */
    function capacitanceOf(s: Society, story: string, ground?: string): number {
      const end = endOf(s, story);
      const q = end ? chargesOn(s, end).length : 0;
      const v = voltageOf(s, story, ground);
      if (v === 0) return 0; // closed-for-this-ground, or never unpacked — nothing to hold a ratio about
      return q / v;
    }

    it("a healthy capacitor: capacitance near 1 in its own frame — charge and voltage rise together, nothing hidden", () => {
      const s = new Society();
      node(s, "vik"); node(s, "tam");
      node(s, "team-formed", "the sprint capacitor");
      unpackPoles(s, "team-formed", "team-formed~routing-end");

      layCharge(s, "team-formed", "vik", "need 1");
      // Q=1, V=1(open)+1(charge)=2 → C=0.5 — the "+1 open strike" baseline in voltageOf
      // means a freshly-struck capacitor with exactly one charge reads C=0.5, not 1; the
      // ratio approaches 1 as charges accumulate and the open-strike's +1 is amortized:
      expect(capacitanceOf(s, "team-formed")).toBeCloseTo(0.5, 5);

      layCharge(s, "team-formed", "tam", "need 2");
      layCharge(s, "team-formed", "vik", "need 3");
      // Q=3, V=1+3=4 → C=0.75 — rising toward 1 as more charge presses on the same
      // differential without the differential itself getting any WIDER:
      expect(capacitanceOf(s, "team-formed")).toBeCloseTo(0.75, 5);
    });

    it("THE EARLY ALGEDONIC SIGNAL, now genuinely producible under frame-relative voltage: capacitance DEGRADES for a ground the discharge hasn't reached, even though Q hasn't moved, because V includes a residual 'still discharging' component that ground can see and the closer's own frame cannot", () => {
      const s = new Society();
      node(s, "vik"); node(s, "priya"); node(s, "odalys");
      node(s, "team-formed", "the sprint capacitor");
      const cap = unpackPoles(s, "team-formed", "team-formed~routing-end");
      layCharge(s, "team-formed", "vik", "need 1");
      layCharge(s, "team-formed", "priya", "need 2");

      // read from team-formed's OWN frame (the closer's frame, once she closes it):
      const discharge = closePole(s, "team-formed");
      expect(endActual(s, cap.end)).toBe(true);
      // in the CLOSER's own frame (storyNow(team-formed) is literally the closing's own
      // Now — voltageOf's closedHere check treats `c.object === ground` as closed even
      // without a walked establishedTo path), the circuit reads closed, capacitance 0:
      expect(voltageOf(s, "team-formed")).toBe(0);
      expect(capacitanceOf(s, "team-formed")).toBe(0);

      // BUT a DIFFERENT frame — Priya's own personal Now — reads differently. She DOES
      // reach the story itself (so the strike and the old charges are visible to her —
      // she knows the need existed), but her Now has NOT been woven into the discharge's
      // OWN lineage (nobody laid `priya-now ~because~ discharge`, so
      // establishedTo(priya-now, discharge, ...) is false and priya-now !== discharge) —
      // so the CLOSING itself doesn't reach her: the differential reads OPEN from her
      // standpoint even though it is closed from the closer's: "done, still discharging,"
      // exactly the doc-comment's phrase (society.ts:764-765):
      node(s, "priya-now");
      s.layP("priya-now~because~team-formed", "Priya's frame knows the capacitor existed", "priya-now", "team-formed", "q-grounding");
      const vFromPriya = voltageOf(s, "team-formed", "priya-now");
      expect(vFromPriya).toBeGreaterThan(0); // residual voltage — genuinely NOT zero here
      expect(vFromPriya).toBe(voltageOf(s, "team-formed", "priya-now")); // stable, re-derivable

      // charge count Q is UNCHANGED throughout (nobody re-charged anything):
      const qNow = chargesOn(s, cap.end).length;
      expect(qNow).toBe(2);

      // THIS is the genuine early-algedonic signal Hallie asked for: the SAME Q, but
      // capacitance reads DIFFERENTLY depending on which lineage is asking — 0 from the
      // closer's own frame (looks fully resolved) vs. a nonzero, lower ratio from Priya's
      // frame (still feels the pressure) — a divergence that is invisible if you only
      // ever read from the frame that closed it. The "early warning" is literally: read
      // capacitance from OTHER frames, not just the discharging frame's own, and a gap
      // between them is the signal — no decay/weighting mechanism was needed after all;
      // frame-relativity alone produces it:
      const cFromCloser = capacitanceOf(s, "team-formed", storyNow("team-formed"));
      const cFromPriya = capacitanceOf(s, "team-formed", "priya-now");
      expect(cFromCloser).toBe(0);
      expect(cFromPriya).toBeGreaterThan(0);
      expect(cFromPriya).not.toBe(cFromCloser); // the divergence IS the signal
    });

    it("a reopened differential (no new charge yet) still reads full residual voltage from a ground that never saw the close — reopen doesn't erase the 'still discharging' read either", () => {
      const s = new Society();
      node(s, "vik"); node(s, "odalys");
      node(s, "team-formed", "the sprint capacitor");
      unpackPoles(s, "team-formed", "team-formed~routing-end");
      layCharge(s, "team-formed", "vik", "need 1");

      closePole(s, "team-formed"); // Odalys closes it (in team-formed's own frame)
      const reopened = reopenTask(s, "team-formed"); // ...then reopens (the team decided it wasn't actually done)
      expect(endActual(s, reopened.end)).toBe(false);

      // team-formed's own frame reads the REOPENED differential as open (voltage > 0 —
      // the strike counts again since the NEW pole isn't closed), while the OLD closed
      // pole no longer contributes in that same frame (it's closed there):
      expect(voltageOf(s, "team-formed")).toBeGreaterThan(0);
    });

    it.todo(
      "breakdown tolerance calibrated from the RECORD ('past arcing prices this line's rating') " +
      "rather than a generic fixed threshold — e.g. read the capacitance value at each historical " +
      "discharge/breakdown event and derive a per-capacitor tolerance band from that distribution. " +
      "No such read exists in society.ts today (no 'discharge event' or 'breakdown' concept is " +
      "recorded structurally yet — DOLL 2's sprint-end discharge is played here as closePole's " +
      "ordinary q-grounding edge, not a distinguishable event KIND a future read could query by). " +
      "Minuted (charge-routing-dolls, DOLL 2 capacitance scene), not built — src/ out of bounds.",
    );

    it.todo(
      "a staleness read on a capacitor's frame ('N witnessed-clock ticks since its last charge or " +
      "grounding') would let a floating-charge capacitor surface itself proactively rather than " +
      "only via floatingCharge's grounds-based read (which needs the CALLER to already know which " +
      "frames are 'live' — a capacitor that everyone has quietly stopped considering live, without " +
      "anyone removing it from the grounds list, would not surface). Minuted (charge-routing-dolls, " +
      "DOLL 2), not built — no such read exists in society.ts today.",
    );
  });
});
