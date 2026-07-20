// ─────────────────────────────────────────────────────────────────────────────
// sublimes-store.test.ts — sublimes as never-closing poles (2026-07-06).
//
// A sublime is a pole designated structurally (like q-end-pole) that NEVER CLOSES.
// Its openness is eternal — a "star for navigation, not a destination to land."
// Unlike an End-pole (which closes when `end ~because~ now`), a sublime remains
// forever open. This ensures the anti-q-lure guarantee: a sublime is INERT, never
// beckons, never actualizes.
//
// Tests verify:
// 1. isSublimePole: identification of sublime-pole nodes
// 2. bearingsOf: because-edges FROM an event TO sublime-poles
// 3. The guard: BLOCKS attempts to close a sublime
// 4. voltageTowardSublime: counts non-occluded charge on a sublime
// 5. Inheritance and betweenness (placeholder for next pass)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, isSublimePole, unpackPoles } from "../src/society.js";
import { bearingsOf, voltageTowardSublime, serviceChainOf, reachedSublimesOf, storyBearingsOf, pathToSublime } from "../src/sublimes.js";

describe("sublimes-store: never-closing poles for navigation", () => {
  describe("isSublimePole: identification of sublime-poles", () => {
    it("designates a node as a sublime-pole via q-sublime-pole edge", () => {
      const s = new Society();
      const sublime = "star-of-hope";

      s.lay({ slug: "event", content: "an event", subject: null, object: null });
      s.layP("event~sublime~star", "oriented to a star", "event", sublime, "q-sublime-pole");

      expect(isSublimePole(s, sublime)).toBe(true);
    });

    it("returns false for a node with no q-sublime-pole designation", () => {
      const s = new Society();
      s.lay({ slug: "plain-beat", content: "just a beat", subject: null, object: null });
      expect(isSublimePole(s, "plain-beat")).toBe(false);
    });

    it("returns false for occluded sublime-poles", () => {
      const s = new Society();
      const sublime = "star-of-hope";

      s.lay({ slug: "event", content: "an event", subject: null, object: null });
      s.layP("event~sublime~star", "oriented to a star", "event", sublime, "q-sublime-pole");

      // Occlude the designation edge
      s.layP("hide~occludes~event~sublime~star", "hide the star", "hide", "event~sublime~star", "q-occludes");

      expect(isSublimePole(s, sublime)).toBe(false);
    });

    it("returns false for null nodes", () => {
      const s = new Society();
      expect(isSublimePole(s, null)).toBe(false);
    });
  });

  describe("bearingsOf: because-edges FROM sublime-poles", () => {
    it("returns all because-edges FROM any sublime-pole TO an event — DIRECTION FLIPPED (Hallie, 2026-07-20, ruling correction): sublimes prehend the user stories charged toward them, subject=sublime, object=story/event", () => {
      const s = new Society();
      const sublime1 = "joy";
      const sublime2 = "peace";
      const event = "gathering";

      s.lay({ slug: event, content: "a gathering", subject: null, object: null });
      s.lay({ slug: sublime1, content: "joy", subject: null, object: null });
      s.lay({ slug: sublime2, content: "peace", subject: null, object: null });

      // Create the sublime-pole designations
      s.layP("joy~pole", "joy as pole", "joy", sublime1, "q-sublime-pole");
      s.layP("peace~pole", "peace as pole", "peace", sublime2, "q-sublime-pole");

      // Create bearings (because-edges FROM sublimes TO the event — the sublime prehends
      // the capture)
      s.layP("gathering~bear~joy", "oriented toward joy", sublime1, event, "because");
      s.layP("gathering~bear~peace", "oriented toward peace", sublime2, event, "because");

      const bearings = bearingsOf(s, event);
      expect(bearings).toHaveLength(2);
      expect(bearings.map((b) => b.subject)).toContain(sublime1);
      expect(bearings.map((b) => b.subject)).toContain(sublime2);
    });

    it("returns empty if an event has no bearings", () => {
      const s = new Society();
      s.lay({ slug: "orphan", content: "unoriented", subject: null, object: null });
      expect(bearingsOf(s, "orphan")).toHaveLength(0);
    });

    it("ignores because-edges FROM non-sublime nodes", () => {
      const s = new Society();
      const event = "task";
      const plainBeat = "another-task";
      const sublime = "growth";

      s.lay({ slug: event, content: "a task", subject: null, object: null });
      s.lay({ slug: plainBeat, content: "another", subject: null, object: null });
      s.lay({ slug: sublime, content: "growth", subject: null, object: null });

      s.layP("growth~pole", "growth as sublime", "growth", sublime, "q-sublime-pole");

      // Lay a because-edge from a plain beat (not a sublime)
      s.layP("task~to~other", "relates to another", plainBeat, event, "because");
      // Lay a bearing from the sublime
      s.layP("task~to~growth", "oriented to growth", sublime, event, "because");

      const bearings = bearingsOf(s, event);
      expect(bearings).toHaveLength(1);
      expect(bearings[0].subject).toBe(sublime);
    });

    it("filters out occluded bearings", () => {
      const s = new Society();
      const event = "work";
      const sublime = "purpose";

      s.lay({ slug: event, content: "work", subject: null, object: null });
      s.lay({ slug: sublime, content: "purpose", subject: null, object: null });

      s.layP("purpose~pole", "purpose", "purpose", sublime, "q-sublime-pole");
      s.layP("work~bear", "bearing to purpose", sublime, event, "because");

      // Occlude the bearing
      s.layP("hide~bearing", "hide the bearing", "hide", "work~bear", "q-occludes");

      const bearings = bearingsOf(s, event);
      expect(bearings).toHaveLength(0);
    });
  });

  describe("the anti-q-lure guarantee: sublimes never close", () => {
    it("BLOCKS attempts to close a sublime-pole with q-grounding", () => {
      const s = new Society();
      const sublime = "horizon";

      s.lay({ slug: "event", content: "event", subject: null, object: null });
      s.lay({ slug: "now", content: "now", subject: null, object: null });
      s.layP("designate", "designate", "event", sublime, "q-sublime-pole");

      // Try to close the sublime — should throw
      expect(() => s.layP("close-attempt", "try to close", sublime, "now", "q-grounding")).toThrowError(
        /ANTI-Q-LURE GUARANTEE.*close the sublime-pole.*NEVER ACTUAL/,
      );

      // Nothing was laid
      expect(s.has("close-attempt")).toBe(false);
      expect(s.has("close-attempt~q")).toBe(false);
    });

    it("allows q-sublime-pole edges themselves (structural machinery)", () => {
      const s = new Society();
      const sublime = "north-star";

      s.lay({ slug: "event", content: "event", subject: null, object: null });

      expect(() => s.layP("designate", "designate", "event", sublime, "q-sublime-pole")).not.toThrow();
      expect(isSublimePole(s, sublime)).toBe(true);
    });

    it("allows q-grounding on end-poles (not sublimes)", () => {
      const s = new Society();
      const endNode = "task-end";
      const nowNode = "now";

      s.lay({ slug: "task", content: "task", subject: null, object: null });
      s.lay({ slug: nowNode, content: "now", subject: null, object: null });

      // Designate as an END-pole, not sublime
      s.layP("task~end-pole", "task end", "task", endNode, "q-end-pole");

      // Closing an end-pole should work
      expect(() => s.layP("task~grounding", "close task", endNode, nowNode, "q-grounding")).not.toThrow();
    });
  });

  describe("voltageTowardSublime: charge on sublimes", () => {
    it("counts non-occluded because-edges FROM a sublime — DIRECTION FLIPPED (Hallie, 2026-07-20, ruling correction): sublimes prehend the user stories charged toward them", () => {
      const s = new Society();
      const sublime = "justice";

      s.lay({ slug: sublime, content: "justice", subject: null, object: null });
      s.layP("designate", "designate", "justice", sublime, "q-sublime-pole");

      const work1 = "action-1";
      const work2 = "action-2";
      const work3 = "action-3";

      s.lay({ slug: work1, content: "work 1", subject: null, object: null });
      s.lay({ slug: work2, content: "work 2", subject: null, object: null });
      s.lay({ slug: work3, content: "work 3", subject: null, object: null });

      // Lay three bearings FROM the sublime (charge) TO each work
      s.layP("work1~bear", "bearing", sublime, work1, "because");
      s.layP("work2~bear", "bearing", sublime, work2, "because");
      s.layP("work3~bear", "bearing", sublime, work3, "because");

      expect(voltageTowardSublime(s, sublime)).toBe(3);
    });

    it("returns 0 for a sublime with no charge", () => {
      const s = new Society();
      const sublime = "unused-star";

      s.lay({ slug: sublime, content: "unused", subject: null, object: null });
      s.layP("designate", "designate", "unused", sublime, "q-sublime-pole");

      expect(voltageTowardSublime(s, sublime)).toBe(0);
    });

    it("filters out occluded charges", () => {
      const s = new Society();
      const sublime = "goal";

      s.lay({ slug: sublime, content: "goal", subject: null, object: null });
      s.layP("designate", "designate", "goal", sublime, "q-sublime-pole");

      const work = "effort";
      s.lay({ slug: work, content: "effort", subject: null, object: null });

      s.layP("effort~bear", "bearing", sublime, work, "because");
      s.layP("effort~bear~2", "bearing 2", sublime, work, "because");

      expect(voltageTowardSublime(s, sublime)).toBe(2);

      // Occlude one bearing
      s.layP("hide-one", "hide one", "hide", "effort~bear", "q-occludes");

      expect(voltageTowardSublime(s, sublime)).toBe(1);
    });

    it("never discharges: voltage persists on an open sublime", () => {
      // Unlike an End-pole's charge (which discharges when closed),
      // a sublime's voltage never diminishes — sublimes are never closed.
      const s = new Society();
      const sublime = "north";
      const now = "now";

      s.lay({ slug: sublime, content: "north", subject: null, object: null });
      s.lay({ slug: now, content: "now", subject: null, object: null });
      s.layP("designate", "designate", "north", sublime, "q-sublime-pole");

      const work = "journey";
      s.lay({ slug: work, content: "journey", subject: null, object: null });
      s.layP("journey~bear", "bearing", sublime, work, "because");

      const voltage1 = voltageTowardSublime(s, sublime);
      expect(voltage1).toBe(1);

      // Try to close the sublime (will fail due to guard)
      expect(() => s.layP("try-close", "x", sublime, now, "q-grounding")).toThrow();

      // Voltage is unchanged because closure was blocked
      const voltage2 = voltageTowardSublime(s, sublime);
      expect(voltage2).toBe(1);
    });
  });

  describe("multiple bearings and inheritance (shape proven)", () => {
    it("an event can sail under multiple sublimes", () => {
      const s = new Society();
      const event = "gathering";
      const joy = "joy";
      const peace = "peace";
      const growth = "growth";

      s.lay({ slug: event, content: "gathering", subject: null, object: null });
      s.lay({ slug: joy, content: "j", subject: null, object: null });
      s.lay({ slug: peace, content: "p", subject: null, object: null });
      s.lay({ slug: growth, content: "g", subject: null, object: null });

      s.layP("joy~pole", "joy", "joy", joy, "q-sublime-pole");
      s.layP("peace~pole", "peace", "peace", peace, "q-sublime-pole");
      s.layP("growth~pole", "growth", "growth", growth, "q-sublime-pole");

      // DIRECTION FLIPPED (2026-07-20): subject=sublime, object=event.
      s.layP("bear~joy", "joy bearing", joy, event, "because");
      s.layP("bear~peace", "peace bearing", peace, event, "because");
      s.layP("bear~growth", "growth bearing", growth, event, "because");

      const bearings = bearingsOf(s, event);
      expect(bearings).toHaveLength(3);
      expect(new Set(bearings.map((b) => b.subject))).toEqual(new Set([joy, peace, growth]));
    });

    it("a doll: event bearing multiple sublimes, inheritance through story betweenness (placeholder)", () => {
      // This doll demonstrates the shape. Full storyBearingsOf implementation is chartered for next pass.
      // For now, we just verify that multiple sublimes can be designated and bearings laid.
      const s = new Society();

      const sprint = "sprint";
      const excellence = "excellence";
      const learning = "learning";
      const perseverance = "perseverance";

      // Content beats
      s.lay({ slug: sprint, content: "a sprint", subject: null, object: null });
      s.lay({ slug: excellence, content: "excellence", subject: null, object: null });
      s.lay({ slug: learning, content: "learning", subject: null, object: null });
      s.lay({ slug: perseverance, content: "perseverance", subject: null, object: null });

      // Designate multiple sublime-poles
      s.layP("exc~pole", "excellence", "excellence", excellence, "q-sublime-pole");
      s.layP("learn~pole", "learning", "learning", learning, "q-sublime-pole");
      s.layP("perse~pole", "perseverance", "perseverance", perseverance, "q-sublime-pole");

      // Lay multiple bearings toward the sprint, one per sublime. DIRECTION FLIPPED
      // (2026-07-20): subject=sublime, object=sprint.
      s.layP("sprint~bear~exc", "sprint aims at excellence", excellence, sprint, "because");
      s.layP("sprint~bear~learn", "sprint aims at learning", learning, sprint, "because");
      s.layP("sprint~bear~perse", "sprint aims at perseverance", perseverance, sprint, "because");

      // Verify the sprint sails under all three sublimes
      const bearings = bearingsOf(s, sprint);
      expect(bearings).toHaveLength(3);
      const subjects = new Set(bearings.map((b) => b.subject));
      expect(subjects).toEqual(new Set([excellence, learning, perseverance]));

      // Each sublime has voltage from the sprint
      expect(voltageTowardSublime(s, excellence)).toBe(1);
      expect(voltageTowardSublime(s, learning)).toBe(1);
      expect(voltageTowardSublime(s, perseverance)).toBe(1);
    });
  });

  // ── storyBearingsOf: bearings inherited via story membership (2026-07-10 build) ──
  describe("storyBearingsOf: bearings a beat inherits via its containing story", () => {
    it("a beat inside a story's interval inherits the story's own bearing to a sublime", () => {
      const s = new Society();
      const sprint = "sprint";
      const excellence = "excellence";

      s.lay({ slug: sprint, content: "a sprint", subject: null, object: null });
      s.lay({ slug: excellence, content: "excellence", subject: null, object: null });
      s.layP("exc~pole", "excellence", "excellence", excellence, "q-sublime-pole");

      // The sprint (as its own Once) bears toward excellence. DIRECTION FLIPPED
      // (2026-07-20): subject=sublime (excellence), object=sprint.
      s.layP("sprint~bear~exc", "sprint aims at excellence", excellence, sprint, "because");

      // Place a beat in the sprint's interval: a plain edge from the sprint (Once) to
      // the beat puts it in the forward-cone, and a plain edge from the beat onto the
      // (lazily-unpacked) open End puts it in the backward-cone too — together,
      // intervalOf's betweenness reads the beat as a member.
      // UPDATED 2026-07-20 (charge-direction ruling, "the End prehends the capture"):
      // layCharge's bare charge is now subject=End, object=charged-event — the OPPOSITE
      // direction from what this test used to rely on (beat -> end put beat in the
      // backward cone; end -> beat does not). Placing membership now uses a plain edge
      // straight to the End instead of layCharge, since layCharge no longer produces a
      // beat-reaches-end shape.
      const beat = "write-the-doc";
      s.lay({ slug: beat, content: "write the doc", subject: null, object: null });
      s.layP("sprint~to~beat", "sprint contains beat", sprint, beat, "q-grounding");
      const sprintPoles = unpackPoles(s, sprint);
      s.lay({ slug: "beat~to~end", content: "beat reaches the End", subject: beat, object: sprintPoles.end });

      const inherited = storyBearingsOf(s, beat);
      expect(inherited).toHaveLength(1);
      expect(inherited[0].subject).toBe(excellence);
    });

    it("a beat in no story's interval returns empty", () => {
      const s = new Society();
      s.lay({ slug: "orphan-beat", content: "unaffiliated", subject: null, object: null });
      expect(storyBearingsOf(s, "orphan-beat")).toHaveLength(0);
    });

    it("a beat in multiple stories' intervals unions the inherited bearings, deduplicated", () => {
      const s = new Society();
      const storyA = "story-a";
      const storyB = "story-b";
      const excellence = "excellence";
      const learning = "learning";

      s.lay({ slug: storyA, content: "story a", subject: null, object: null });
      s.lay({ slug: storyB, content: "story b", subject: null, object: null });
      s.lay({ slug: excellence, content: "excellence", subject: null, object: null });
      s.lay({ slug: learning, content: "learning", subject: null, object: null });
      s.layP("exc~pole", "excellence", "excellence", excellence, "q-sublime-pole");
      s.layP("learn~pole", "learning", "learning", learning, "q-sublime-pole");

      // DIRECTION FLIPPED (2026-07-20): subject=sublime, object=story.
      s.layP("a~bear~exc", "a aims at excellence", excellence, storyA, "because");
      s.layP("b~bear~learn", "b aims at learning", learning, storyB, "because");
      // Also give story B the SAME bearing as story A, to prove dedup by sublime-pole.
      s.layP("b~bear~exc", "b aims at excellence too", excellence, storyB, "because");

      // UPDATED 2026-07-20 (charge-direction ruling): see the sibling test above — a
      // plain edge beat->end replaces layCharge for placing membership, since layCharge's
      // bare charge is now subject=End, object=charged-event (the opposite direction).
      const beat = "shared-beat";
      s.lay({ slug: beat, content: "shared beat", subject: null, object: null });
      s.layP("a~to~beat", "a contains beat", storyA, beat, "q-grounding");
      const aPoles = unpackPoles(s, storyA);
      s.lay({ slug: "beat~to~a-end", content: "beat reaches A's End", subject: beat, object: aPoles.end });
      s.layP("b~to~beat", "b contains beat", storyB, beat, "q-grounding");
      const bPoles = unpackPoles(s, storyB);
      s.lay({ slug: "beat~to~b-end", content: "beat reaches B's End", subject: beat, object: bPoles.end });

      const inherited = storyBearingsOf(s, beat);
      const subjects = inherited.map((b) => b.subject);
      // Excellence appears once (deduped across story A and story B), learning once.
      expect(new Set(subjects)).toEqual(new Set([excellence, learning]));
      expect(subjects).toHaveLength(2);
    });
  });

  // ── SUBLIME CHAINING (Hallie's extension, 2026-07-06): sublimes serve sublimes ──
  describe("sublimes chain to sublimes: a DAG of stars", () => {
    // Helper: designate a node as a sublime-pole (self-designation for chaining tests).
    function makeSublime(s: Society, name: string): void {
      s.lay({ slug: name, content: name, subject: null, object: null });
      s.layP(`${name}~pole`, name, name, name, "q-sublime-pole");
    }

    it("a sublime can be the OBJECT of a bearing (bearingsOf works on a sublime — free) — DIRECTION FLIPPED (Hallie, 2026-07-20): 'A serves B' is laid as B prehending A (subject=B, object=A), mirroring 'sublime prehends the charged thing' applied sublime-to-sublime", () => {
      const s = new Society();
      makeSublime(s, "the-plan-reads-itself");
      makeSublime(s, "nothing-unheard");

      // the-plan-reads-itself serves nothing-unheard: nothing-unheard (the served-toward
      // sublime) prehends the-plan-reads-itself (the server).
      s.layP("plan~serves~nothing", "in service of", "nothing-unheard", "the-plan-reads-itself", "because");

      const served = bearingsOf(s, "the-plan-reads-itself");
      expect(served).toHaveLength(1);
      expect(served[0].subject).toBe("nothing-unheard");
    });

    it("serviceChainOf walks UP the graph transitively (the why-behind-the-why)", () => {
      const s = new Society();
      makeSublime(s, "the-plan-reads-itself");
      makeSublime(s, "nothing-unheard");
      makeSublime(s, "people-are-not-grey-goo");

      // Chain: the-plan-reads-itself → nothing-unheard → people-are-not-grey-goo.
      // DIRECTION FLIPPED (2026-07-20): "a serves b" laid as b prehending a.
      s.layP("a~serves~b", "serves", "nothing-unheard", "the-plan-reads-itself", "because");
      s.layP("b~serves~c", "serves", "people-are-not-grey-goo", "nothing-unheard", "because");

      const chain = serviceChainOf(s, "the-plan-reads-itself");
      expect(new Set(chain)).toEqual(new Set(["nothing-unheard", "people-are-not-grey-goo"]));

      // From the middle, only the top remains
      expect(serviceChainOf(s, "nothing-unheard")).toEqual(["people-are-not-grey-goo"]);
      // The top serves nothing further
      expect(serviceChainOf(s, "people-are-not-grey-goo")).toHaveLength(0);
    });

    it("reachedSublimesOf: an event bearing A inherits bearing toward everything A serves", () => {
      const s = new Society();
      makeSublime(s, "sublime-a");
      makeSublime(s, "sublime-b");
      makeSublime(s, "sublime-c");

      // DAG: a → b → c. DIRECTION FLIPPED (2026-07-20): "a serves b" laid as b prehending a.
      s.layP("a~serves~b", "serves", "sublime-b", "sublime-a", "because");
      s.layP("b~serves~c", "serves", "sublime-c", "sublime-b", "because");

      // An event bears only A directly — A (the sublime) prehends the event.
      s.lay({ slug: "event", content: "work", subject: null, object: null });
      s.layP("event~bear~a", "bearing", "sublime-a", "event", "because");

      // Direct bearing: just A
      expect(bearingsOf(s, "event").map((b) => b.subject)).toEqual(["sublime-a"]);

      // Transitive: A, B, and C (inherited the whole chain)
      expect(new Set(reachedSublimesOf(s, "event"))).toEqual(
        new Set(["sublime-a", "sublime-b", "sublime-c"]),
      );
    });

    it("FLIPPED: a bearing that closes a ring among sublimes is now ACCEPTED (mutual prehension)", () => {
      // ONTOLOGY CHANGE (Hallie, 2026-07-10): this used to FAIL LOUD under sublime-dag-acyclic.
      // That guard imported an IN-TIME rule (no causal cycles among discrete, perished,
      // time-ordered occasions) into a place OUTSIDE time. A sublime is the limit of all future
      // events taken to infinity — "mirages on the surface of the sublime's event horizon."
      // Reflections on a horizon can hold each other's positions with no in-time causality, so a
      // RING of bearings is a constellation, not a paradox. sublime↔sublime cycles are now legal
      // — CONFIRMED, not merely theoretical, by the 2026-07-20 ruling correction's companion
      // ruling 2 ("cycles are LAWFUL within the sublime layer — that's the whole law").
      // (Deliberate flip, not a deleted test: the read-side cycle-safety is proven in
      // path-to-sublime.test.ts, and never-closes — you can't LAND on a mirage — still holds.)
      // Edge direction here is the guard's own subject/object shape (unaffected by the
      // 2026-07-20 charge-direction correction — this test exercises the WRITE guard, not
      // bearingsOf's read), so the raw a/b/c chain is left in its established shape.
      const s = new Society();
      makeSublime(s, "sublime-a");
      makeSublime(s, "sublime-b");
      makeSublime(s, "sublime-c");

      // Build a chain a → b → c
      s.layP("a~serves~b", "serves", "sublime-a", "sublime-b", "because");
      s.layP("b~serves~c", "serves", "sublime-b", "sublime-c", "because");

      // c → a closes the ring a → b → c → a. Now ACCEPTED — no throw.
      expect(() =>
        s.layP("c~serves~a", "serves", "sublime-c", "sublime-a", "because"),
      ).not.toThrow();

      // The ring-closing bearing was actually laid, and the graph stays usable.
      expect(s.has("c~serves~a")).toBe(true);
      s.lay({ slug: "after-ring", content: "ordinary", subject: null, object: null });
      expect(s.has("after-ring")).toBe(true);
    });

    it("FLIPPED: a direct self-serving loop (A serves A) is now ACCEPTED (self-prehension)", () => {
      // Same limit-of-futures frame: the smallest ring — a sublime bearing itself — is a mirage
      // reflecting itself on the horizon. Outside time this is self-prehension, not a paradox.
      const s = new Society();
      makeSublime(s, "solo");

      // solo → solo is the smallest ring: now accepted, not refused.
      expect(() =>
        s.layP("solo~serves~solo", "serves", "solo", "solo", "because"),
      ).not.toThrow();
      expect(s.has("solo~serves~solo")).toBe(true);
    });

    it("the guard permits chaining that stays acyclic (points UP)", () => {
      const s = new Society();
      makeSublime(s, "sublime-a");
      makeSublime(s, "sublime-b");
      makeSublime(s, "sublime-c");

      // A diamond: a → b, a → c, b → c — all point up, no cycle. DIRECTION FLIPPED
      // (2026-07-20): "a serves b" laid as b prehending a (subject=b, object=a), so this
      // walk (which reachedSublimesOf below actually traverses) reads correctly.
      expect(() => {
        s.layP("a~serves~b", "serves", "sublime-b", "sublime-a", "because");
        s.layP("a~serves~c", "serves", "sublime-c", "sublime-a", "because");
        s.layP("b~serves~c", "serves", "sublime-c", "sublime-b", "because");
      }).not.toThrow();

      // reachedSublimesOf from an event bearing A finds all three. DIRECTION FLIPPED
      // (2026-07-20): the sublime prehends the event.
      s.lay({ slug: "event", content: "w", subject: null, object: null });
      s.layP("event~bear~a", "bearing", "sublime-a", "event", "because");
      expect(new Set(reachedSublimesOf(s, "event"))).toEqual(
        new Set(["sublime-a", "sublime-b", "sublime-c"]),
      );
    });

    it("a bearing from an EVENT (non-sublime) to a sublime is never mistaken for a cycle", () => {
      const s = new Society();
      makeSublime(s, "star");

      // An ordinary event bearing a star — subject is not a sublime, so the guard is inert.
      s.lay({ slug: "task", content: "task", subject: null, object: null });
      expect(() => s.layP("task~bear~star", "bearing", "task", "star", "because")).not.toThrow();
    });

    // ── CYCLE SAFETY (Hallie, 2026-07-20, ruling correction — job item 3): "sublime→sublime
    // edges may now form cycles. Every walk that traverses sublime charges (bearings, lure
    // climbing, bucketsOf) needs a visited set or equivalent termination." This test is that
    // pin: two sublimes mutually charging each other (a genuine cycle, not a diamond) PLUS a
    // story charged toward one of them — every read that walks the sublime graph must
    // terminate and answer correctly, not loop forever or stack-overflow.
    it("two sublimes charging each other + a story charged toward one — walks terminate and read correctly", () => {
      const s = new Society();
      makeSublime(s, "sublime-x");
      makeSublime(s, "sublime-y");

      // x and y mutually prehend — a genuine 2-cycle: x~because~y AND y~because~x.
      // (subject=sublime, object=the-thing-it-prehends, per the direction ruling; here
      // each prehends the OTHER sublime, "sublime prehends other sublimes" per companion
      // ruling 1.)
      s.layP("x~bears~y", "x serves/prehends y", "sublime-x", "sublime-y", "because");
      s.layP("y~bears~x", "y serves/prehends x", "sublime-y", "sublime-x", "because");

      // A story is charged toward sublime-x (the ordinary event-to-sublime shape).
      s.lay({ slug: "story", content: "a user story", subject: null, object: null });
      s.layP("story~bear~x", "story charged toward x", "sublime-x", "story", "because");

      // bearingsOf(story) terminates and finds x (the only sublime prehending story directly).
      const storyBearings = bearingsOf(s, "story");
      expect(storyBearings).toHaveLength(1);
      expect(storyBearings[0]!.subject).toBe("sublime-x");

      // bearingsOf on the sublimes themselves, walking the cycle edge, terminates too —
      // x is prehended (bear-toward) by y, and vice versa: each is the OBJECT of the
      // other's bearing, so bearingsOf(x) (which reads edges ONTO x from a sublime
      // subject) finds y, and bearingsOf(y) finds x.
      expect(bearingsOf(s, "sublime-x").map((b) => b.subject)).toEqual(["sublime-y"]);
      expect(bearingsOf(s, "sublime-y").map((b) => b.subject)).toEqual(["sublime-x"]);

      // serviceChainOf MUST terminate on a true cycle (not loop forever) — from x, walking
      // "what x serves" climbs to y, then from y back to x, but the seen-set stops re-visiting x:
      const chainFromX = serviceChainOf(s, "sublime-x");
      expect(chainFromX).toEqual(["sublime-y"]);
      const chainFromY = serviceChainOf(s, "sublime-y");
      expect(chainFromY).toEqual(["sublime-x"]);

      // reachedSublimesOf(story) must also terminate: story bears x directly, x's service
      // chain (walking the cycle) adds y, and nothing loops forever or double-counts.
      const reached = reachedSublimesOf(s, "story");
      expect(new Set(reached)).toEqual(new Set(["sublime-x", "sublime-y"]));
      expect(reached).toHaveLength(2); // deduplicated despite the cycle

      // pathToSublime from the story toward y must terminate through the cycle and report
      // a finite, reachable spine (story -> x -> y).
      const path = pathToSublime(s, "story", "sublime-y");
      expect(path.reachable).toBe(true);
      expect(path.segments.length).toBeGreaterThan(0);
      expect(path.segments.length).toBeLessThanOrEqual(2); // finite — no runaway cycle walk

      // and the society stays usable after all these cyclic walks — no seizure, no hang:
      s.lay({ slug: "still-usable", content: "proof of life", subject: null, object: null });
      expect(s.has("still-usable")).toBe(true);
    });
  });
});
