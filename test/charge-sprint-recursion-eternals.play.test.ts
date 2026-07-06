// ─────────────────────────────────────────────────────────────────────────────
// charge-sprint-recursion-eternals.play.test.ts — DOLL 4 (chartered by Hallie mid-sitting,
// verbatim): "Proposal Sprint Canon I think would treat sprints as a recursion of stories
// within story, and have 'eternals' that could be 'ingressed' in a prototype patterny way."
//
// Two scenes, played with the same three-person team as the earlier dolls (Odalys who
// runs sprint-end, Vik and Tam who work inside it), using ONLY existing machinery —
// unpackPoles, isStory, intervalOf, voltageOf, endActual, prehensionsFrom/Onto,
// isOccluded. No new kernel quality is minted; where a new RELATION is needed (the
// eternal's ingression reference), it rides as a lateral quality per the meta-law
// (one-sentence law given inline, no kernel branch, same discipline as DOLL 3's
// q-goal-named aside).
//
// SCENE A — SPRINT AS RECURSION: a sprint is itself a story (Once = sprint-open, End =
// sprint-close); its interior beats (via intervalOf, the SAME betweenness read every
// story already uses for membership) are themselves full stories — the sprint's tasks.
// We play out whether the sprint's own voltage is the SUM of its children's, or a
// DISTINCT pressure ("close the sprint itself") — and find, honestly, that today's
// voltageOf reads PER-STORY, not aggregated: the sprint-story's own voltage counts only
// charges laid directly against ITS OWN End-pole, and says nothing about its children's
// open circuits unless a caller walks intervalOf and asks each child separately. That is
// a FINDING, not a bug: composition is a read a caller could build (sum voltageOf across
// intervalOf's members), but it does not exist today, and building it is out of bounds
// here (src/ untouched).
//
// We also test Hallie's specific hunch: is the sprint-end DISCHARGE from DOLL 2 actually
// THE SPRINT-STORY'S OWN CLOSING (End because Now), with routing as a consequence — "one
// event, two faces"? Played out below: YES, this holds with zero new machinery — the
// exact same `end ~because~ now` edge that closes ANY story's circuit closes the sprint's,
// and the routing charges are ADDITIONAL ink laid in the same breath, not a separate
// mechanism. The doll shows the two faces as literally the same q-grounding edge read
// two ways: "the sprint is done" (endActual) and "the routing occasion happened"
// (the new charges' `because` pointing at that same End).
//
// SCENE B — ETERNALS AND INGRESSION: a recurring shape (a weekly-review checklist,
// Whiteheadian-eternal-object-flavored, KNOWN BORROWING, KNOWN BOUNDARY — ours have
// provenance and occludability, Whitehead's forms don't) never itself becomes an
// occasion. Instead, each week, a FRESH occasion is minted and carries a reference edge
// back to the eternal it ingressed — an on-behalf-of/derived-from shape, always an edge,
// never ambient (never read off a shared slug-spelling). We play three successive
// sprints' weekly-reviews ingressing the SAME eternal, show charge presses on the
// OCCASIONS (never the eternal itself — the eternal never accumulates), and probe
// Hallie's named tension: does a chronically re-ingressed eternal deserve a read of its
// own (e.g. "how many times has this shape been used")? We show that read IS derivable
// today (count the ingression edges pointing at the eternal) without minting anything —
// a FINDING that answers her tension without a new quality. Finally: occluding the
// eternal stops FUTURE ingressions from finding it live, while every PAST occasion
// (already minted, already charged) is completely untouched — append-only holds.
//
// UPDATED mid-sitting: the build body landed the ADDRESS LAW (charge is a bare edge onto
// the open End-pole) and closePole (the done-verb's kernel half, replacing hand-laid
// `end ~because~ now` edges) while this doll was being written; Scene A's closing test
// was rewritten to use closePole so the sprint's own frame closes correctly (voltageOf is
// now frame-relative, defaulting to storyNow(story) — a hand-laid closing to an arbitrary
// Now node no longer reads as "closed" against that default ground). The finding itself
// (composition is not automatic; one event, two faces) is unaffected.
//
// Run: cd scher && npx vitest run charge-sprint-recursion-eternals.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, layCharge, voltageOf, isStory, endOf, endActual, unpackPoles, closePole,
  intervalOf, prehensionsFrom, prehensionsOnto, isOccluded,
} from "../src/society.js";

function node(s: Society, slug: string, content = slug) {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
}
/** a plain (non-quality) edge — the intervalOf-walkable shape, e.g. sprint-open → task-x. */
function plainEdge(s: Society, slug: string, from: string, to: string, content = slug) {
  s.lay({ slug, content, subject: from, object: to });
}

describe("DOLL 4 SCENE A — sprint as recursion of stories within story", () => {
  it("a sprint IS a story: unpacked with its own Once/End, exactly like any task", () => {
    const s = new Society();
    node(s, "sprint-7-open", "sprint 7 opens");
    const sprint = unpackPoles(s, "sprint-7-open", "sprint-7~close");

    expect(isStory(s, "sprint-7-open")).toBe(true);
    expect(endOf(s, "sprint-7-open")).toBe(sprint.end);
    expect(endActual(s, sprint.end)).toBe(false); // the sprint hasn't closed
  });

  it("the sprint's INTERIOR beats are themselves full stories — recursion, via the SAME betweenness read (intervalOf) every story already uses for membership", () => {
    const s = new Society();
    node(s, "sprint-7-open", "sprint 7 opens");
    const sprint = unpackPoles(s, "sprint-7-open", "sprint-7~close");

    // two tasks, laid as plain (non-quality) edges INSIDE the sprint's causal diamond —
    // exactly the shape intervalOf already walks (society.ts:536-562), no new mechanism:
    node(s, "task-fix-onboarding", "fix onboarding");
    node(s, "task-speed-deploys", "speed up deploys");
    plainEdge(s, "sprint-e1", "sprint-7-open", "task-fix-onboarding");
    plainEdge(s, "sprint-e2", "task-fix-onboarding", "task-speed-deploys");
    plainEdge(s, "sprint-e3", "task-speed-deploys", sprint.end);

    const interior = intervalOf(s, "sprint-7-open", sprint.end);
    expect(interior).toEqual(expect.arrayContaining(["task-fix-onboarding", "task-speed-deploys"]));

    // each interior task is unpacked into its OWN three poles — a story nested inside a
    // story, the SAME shape recursing, no special "sub-story" concept invented:
    const t1 = unpackPoles(s, "task-fix-onboarding", "task-fix-onboarding~hea");
    const t2 = unpackPoles(s, "task-speed-deploys", "task-speed-deploys~hea");
    expect(isStory(s, "task-fix-onboarding")).toBe(true);
    expect(isStory(s, "task-speed-deploys")).toBe(true);

    // FINDING: the sprint-story's OWN voltage (read on sprint-7-open) does NOT see its
    // children's open circuits — it is 1 (bare open strike), same as if it had zero
    // interior tasks, because voltageOf only counts charges laid directly against the
    // SPRINT's own End-pole (sprint.end), never a walk of intervalOf's members:
    expect(voltageOf(s, "sprint-7-open")).toBe(1);
    // ...even though BOTH children are wide open (unactualized):
    expect(endActual(s, t1.end)).toBe(false);
    expect(endActual(s, t2.end)).toBe(false);

    // COMPOSITION IS NOT AUTOMATIC — a caller who wants "sprint pressure = sum of its
    // children's open voltage" has to build that read themselves (sum voltageOf across
    // intervalOf's members). We show it is COMPUTABLE from existing exports, without any
    // src/ change, to prove the gap is a missing CONVENIENCE, not a missing CAPABILITY.
    // (intervalOf's own fwd/bwd reach includes its two ENDPOINTS — sprint-7-open and
    // sprint.end are both in `interior` per society.ts:558-561's `seen` seeding — so we
    // exclude the sprint's own Once/End here to isolate strictly the CHILDREN's pressure,
    // the composition Hallie's question is actually asking about:)
    const composedPressure = interior
      .filter((b) => b !== "sprint-7-open" && b !== sprint.end && isStory(s, b))
      .reduce((sum, b) => sum + voltageOf(s, b), 0);
    expect(composedPressure).toBe(2); // t1 (voltage 1) + t2 (voltage 1), summed by the CALLER
    // the sprint's own bare voltage (1) is a DISTINCT number from this composed pressure
    // (2) — Hallie's question ("sum, or a distinct thing?") reads, honestly, as: TODAY,
    // distinct by default, sum-able on demand. Neither is wrong; nothing forces one.
  });

  it("the sprint-end DISCHARGE (DOLL 2) IS the sprint-story's own closing — one event, two faces, zero new machinery", () => {
    const s = new Society();
    node(s, "odalys"); node(s, "vik");
    node(s, "sprint-7-open", "sprint 7 opens");
    const sprint = unpackPoles(s, "sprint-7-open", "sprint-7~close");

    // a charge accumulated on the sprint itself (Hallie's own "these needs are routed"
    // capacitor role can literally BE the sprint-story — nothing here required a SEPARATE
    // capacitor node from the sprint node; DOLL 2 built a standing capacitor as a
    // simplification, but the sprint-as-story already has everything a capacitor needs):
    layCharge(s, "sprint-7-open", "vik", "onboarding still feels clunky, unresolved this sprint");
    expect(voltageOf(s, "sprint-7-open")).toBe(2); // 1 open + 1 charge

    // FACE ONE: Odalys closes the sprint — closePole is the done-verb's kernel half
    // (lands `end ~because~ storyNow(sprint-7-open)`, the ONE edge the address law lets
    // leave a naked pole), no sprint-specific verb invented:
    const discharge = closePole(s, "sprint-7-open");
    expect(endActual(s, sprint.end)).toBe(true);
    expect(voltageOf(s, "sprint-7-open")).toBe(0); // the sprint's OWN circuit is closed, in its own frame — FACE ONE

    // FACE TWO, same breath: the unresolved charge gets routed to a next-sprint story,
    // grounded BECAUSE THE SAME discharge edge — the routing consequence of the identical
    // closing event, not a second mechanism:
    node(s, "sprint-8-task-onboarding", "sprint 8: finish onboarding fix");
    const routed = layCharge(s, "sprint-8-task-onboarding", "odalys", "routed from sprint 7's close");
    s.layP(`${routed}~because~${discharge}`, "this task exists because sprint 7 closed", routed, discharge, "q-grounding");

    // both faces trace to the SAME grounding fact — the discharge edge is now the
    // "because" of TWO downstream things (the sprint's own actuality read via endActual,
    // AND the routed charge's grounding) — literally one event read two ways, no
    // duplication. `discharge`'s subject IS sprint.end (closePole lays it there), so
    // reading outgoing-from-end still finds this SAME edge:
    const outgoingFromEnd = prehensionsFrom(s, sprint.end, "q-grounding");
    expect(outgoingFromEnd.map((e) => e.slug)).toEqual([discharge]); // the sprint's OWN closing edge (subject=end)
    const groundedBecauseDischarge = prehensionsOnto(s, discharge, "q-grounding");
    expect(groundedBecauseDischarge.map((g) => g.subject)).toEqual([routed]); // the routing's grounding (object=discharge)
    // FACE ONE reads outgoing-from-end (is the sprint done); FACE TWO reads onto-discharge
    // (what happened because the sprint closed) — same node, two directions, two faces.
  });
});

describe("DOLL 4 SCENE B — eternals ingressed into occasions (Whiteheadian-flavored, known borrowing)", () => {
  it("an eternal never becomes an occasion — it stays a plain content beat, never unpacked, never charged", () => {
    const s = new Society();
    node(s, "eternal-weekly-review", "the weekly-review shape: check blockers, check morale, check backlog size");

    // the eternal is NOT a story: nobody ever calls unpackPoles on it. It has no End-pole,
    // no voltage, because it is not an occasion — it is the FORM occasions ingress from.
    expect(isStory(s, "eternal-weekly-review")).toBe(false);
    expect(voltageOf(s, "eternal-weekly-review")).toBe(0); // never unpacked ⇒ zero, per society.ts:652's own comment
  });

  it("three successive sprints each mint a FRESH occasion carrying an ingression edge back to the SAME eternal — the reference is always an edge, never ambient", () => {
    const s = new Society();
    node(s, "eternal-weekly-review", "the weekly-review shape");

    const weeks = ["review-sprint-6", "review-sprint-7", "review-sprint-8"];
    for (const w of weeks) {
      node(s, w, `this week's instance of the review`);
      // the ingression: a lateral quality edge, NOT a kernel-branching one — same
      // discipline as DOLL 3's q-goal-named aside (one-sentence law inline, no kernel
      // branch, meta-law-compliant because it never causes society.ts to behave
      // differently — it is purely a readable relation a caller can walk):
      // LAW: "q-ingresses-from" names that an occasion was minted FROM an eternal form;
      // no kernel read branches on it (lateral, per the KernelQuality doc-comment,
      // society.ts:30-42) — it is Whitehead's "ingression" made into a plain edge.
      s.layP(`${w}~ingress`, `${w} ingresses the weekly-review eternal`, w, "eternal-weekly-review", "q-ingresses-from");
    }

    // each week is its own occasion (unpacked separately if it needs a differential —
    // here we just show they're distinct nodes with distinct ingression edges; whether a
    // given week's occasion becomes a full story is orthogonal to ingression itself):
    for (const w of weeks) {
      const ingressEdges = prehensionsFrom(s, w, "q-ingresses-from");
      expect(ingressEdges.length).toBe(1);
      expect(ingressEdges[0].object).toBe("eternal-weekly-review");
    }
    // the reference is ALWAYS AN EDGE — never read by comparing slug spellings (no
    // "review-sprint-N".startsWith("review-") sniffing anywhere in this doll; every
    // assertion above walks prehensionsFrom, honoring the opaque-slugs discipline).
  });

  it("charge presses on the OCCASIONS, never the eternal itself — the eternal never accumulates", () => {
    const s = new Society();
    node(s, "vik"); node(s, "tam");
    node(s, "eternal-weekly-review", "the weekly-review shape");
    node(s, "review-sprint-7", "this week's review instance");
    s.layP("review-sprint-7~ingress", "ingresses the eternal", "review-sprint-7", "eternal-weekly-review", "q-ingresses-from");

    // Vik and Tam charge the OCCASION (this week's actual review meeting had a felt
    // need come out of it), never the eternal form itself:
    layCharge(s, "review-sprint-7", "vik", "review surfaced: deploys are too slow");
    layCharge(s, "review-sprint-7", "tam", "review surfaced: docs are stale");

    expect(voltageOf(s, "review-sprint-7")).toBe(3); // 1 open + 2 charges — the OCCASION's voltage
    expect(voltageOf(s, "eternal-weekly-review")).toBe(0); // the ETERNAL stays at zero — never unpacked, never charged
    expect(isStory(s, "eternal-weekly-review")).toBe(false); // still not an occasion, even after 2 charges elsewhere
  });

  it("HALLIE'S NAMED TENSION, answered without minting anything new: 'does a chronically re-ingressed eternal deserve a read of its own?' — YES, and it's already computable: count the live ingression edges pointing AT it", () => {
    const s = new Society();
    node(s, "eternal-weekly-review", "the weekly-review shape");
    const weeks = ["review-sprint-6", "review-sprint-7", "review-sprint-8", "review-sprint-9", "review-sprint-10"];
    for (const w of weeks) {
      node(s, w);
      s.layP(`${w}~ingress`, `${w} ingresses`, w, "eternal-weekly-review", "q-ingresses-from");
    }

    // "how many times has this shape been used" = prehensionsOnto(eternal, quality).length
    // — the SAME read shape confidence()/dependentsOf() already use elsewhere in
    // society.ts, applied here to a NEW lateral quality. No new kernel mechanism: the
    // read composes from prehensionsOnto, which already exists (society.ts:277-281).
    const usageCount = prehensionsOnto(s, "eternal-weekly-review", "q-ingresses-from").length;
    expect(usageCount).toBe(5);

    // this IS "a read of its own" in every sense that matters (derivable, greppable,
    // stable) WITHOUT the eternal ever becoming a story, ever being unpacked, or ever
    // accumulating charge. Hallie's tension resolves: the eternal doesn't need its own
    // voltage/charge apparatus to be counted — usage-count is a cheaper, truer read than
    // voltage would be (voltage measures OPEN NEED; an eternal has none — it is a form,
    // not a felt need. Counting its ingressions measures POPULARITY/RELIANCE, a
    // genuinely different thing, and conflating the two would have been the eager-
    // minting mistake DOLL 1 already taught us to watch for).
  });

  it("occluding the eternal stops FUTURE ingressions from finding it live — but every PAST occasion (already minted, already charged) is completely untouched — append-only holds", () => {
    const s = new Society();
    node(s, "odalys"); node(s, "vik");
    node(s, "eternal-weekly-review", "the weekly-review shape");
    node(s, "review-sprint-7", "week 7's review");
    s.layP("review-sprint-7~ingress", "ingresses", "review-sprint-7", "eternal-weekly-review", "q-ingresses-from");
    layCharge(s, "review-sprint-7", "vik", "week 7's surfaced need");

    // the team retires the weekly-review format — Odalys occludes the eternal itself:
    s.layP("odalys-retires-review-format", "retiring the weekly-review eternal", "odalys", "eternal-weekly-review", "q-occludes");
    expect(isOccluded(s, "eternal-weekly-review")).toBe(true);

    // week 7's PAST occasion is COMPLETELY UNTOUCHED — still a real node, its ingression
    // edge still readable (occluding the FORM does not retroactively occlude edges that
    // point AT it — that would require a separate, deliberate occlusion of each
    // ingression edge, which nobody did here):
    expect(s.has("review-sprint-7")).toBe(true);
    expect(isOccluded(s, "review-sprint-7~ingress")).toBe(false);
    expect(voltageOf(s, "review-sprint-7")).toBe(2); // 1 open + vik's charge — unchanged, append-only
    const stillFindablePastIngression = prehensionsFrom(s, "review-sprint-7", "q-ingresses-from");
    expect(stillFindablePastIngression.length).toBe(1); // the past reference survives the eternal's occlusion

    // a NEW week trying to ingress the retired eternal would still MECHANICALLY succeed
    // (layP doesn't consult isOccluded — nothing in the kernel currently REFUSES ingression
    // from an occluded eternal; a caller-side policy would have to check isOccluded(eternal)
    // before minting a new ingression edge). This is a FINDING, not a guard: unlike q-lure
    // (which layP itself refuses, assertNoLure), there is no assertNoIngressFromOccludedEternal
    // — and per the HARD BOUNDARY (no src/ edits), this doll does not propose adding one, only
    // names that "stops future ingressions" is a POLICY discipline callers must uphold today,
    // not a kernel-enforced guarantee:
    node(s, "review-sprint-11", "a new week, after retirement");
    expect(() => s.layP("review-sprint-11~ingress", "ingresses anyway", "review-sprint-11", "eternal-weekly-review", "q-ingresses-from"))
      .not.toThrow(); // mechanically permitted — the refusal would have to be a CALLER'S check, not a kernel guard
  });
});
