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
import { Society, isSublimePole, bearingsOf, voltageTowardSublime } from "../src/society.js";

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

  describe("bearingsOf: because-edges TO sublime-poles", () => {
    it("returns all because-edges FROM an event TO any sublime-pole", () => {
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

      // Create bearings (because-edges from event to sublimes)
      s.layP("gathering~bear~joy", "oriented toward joy", event, sublime1, "because");
      s.layP("gathering~bear~peace", "oriented toward peace", event, sublime2, "because");

      const bearings = bearingsOf(s, event);
      expect(bearings).toHaveLength(2);
      expect(bearings.map((b) => b.object)).toContain(sublime1);
      expect(bearings.map((b) => b.object)).toContain(sublime2);
    });

    it("returns empty if an event has no bearings", () => {
      const s = new Society();
      s.lay({ slug: "orphan", content: "unoriented", subject: null, object: null });
      expect(bearingsOf(s, "orphan")).toHaveLength(0);
    });

    it("ignores because-edges TO non-sublime nodes", () => {
      const s = new Society();
      const event = "task";
      const plainBeat = "another-task";
      const sublime = "growth";

      s.lay({ slug: event, content: "a task", subject: null, object: null });
      s.lay({ slug: plainBeat, content: "another", subject: null, object: null });
      s.lay({ slug: sublime, content: "growth", subject: null, object: null });

      s.layP("growth~pole", "growth as sublime", "growth", sublime, "q-sublime-pole");

      // Lay a because-edge to a plain beat (not a sublime)
      s.layP("task~to~other", "relates to another", event, plainBeat, "because");
      // Lay a bearing to the sublime
      s.layP("task~to~growth", "oriented to growth", event, sublime, "because");

      const bearings = bearingsOf(s, event);
      expect(bearings).toHaveLength(1);
      expect(bearings[0].object).toBe(sublime);
    });

    it("filters out occluded bearings", () => {
      const s = new Society();
      const event = "work";
      const sublime = "purpose";

      s.lay({ slug: event, content: "work", subject: null, object: null });
      s.lay({ slug: sublime, content: "purpose", subject: null, object: null });

      s.layP("purpose~pole", "purpose", "purpose", sublime, "q-sublime-pole");
      s.layP("work~bear", "bearing to purpose", event, sublime, "because");

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
    it("counts non-occluded because-edges ONTO a sublime", () => {
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

      // Lay three bearings TO the sublime (charge)
      s.layP("work1~bear", "bearing", work1, sublime, "because");
      s.layP("work2~bear", "bearing", work2, sublime, "because");
      s.layP("work3~bear", "bearing", work3, sublime, "because");

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

      s.layP("effort~bear", "bearing", work, sublime, "because");
      s.layP("effort~bear~2", "bearing 2", work, sublime, "because");

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
      s.layP("journey~bear", "bearing", work, sublime, "because");

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

      s.layP("bear~joy", "joy bearing", event, joy, "because");
      s.layP("bear~peace", "peace bearing", event, peace, "because");
      s.layP("bear~growth", "growth bearing", event, growth, "because");

      const bearings = bearingsOf(s, event);
      expect(bearings).toHaveLength(3);
      expect(new Set(bearings.map((b) => b.object))).toEqual(new Set([joy, peace, growth]));
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

      // Lay multiple bearings from the sprint
      s.layP("sprint~bear~exc", "sprint aims at excellence", sprint, excellence, "because");
      s.layP("sprint~bear~learn", "sprint aims at learning", sprint, learning, "because");
      s.layP("sprint~bear~perse", "sprint aims at perseverance", sprint, perseverance, "because");

      // Verify the sprint sails under all three sublimes
      const bearings = bearingsOf(s, sprint);
      expect(bearings).toHaveLength(3);
      const objects = new Set(bearings.map((b) => b.object));
      expect(objects).toEqual(new Set([excellence, learning, perseverance]));

      // Each sublime has voltage from the sprint
      expect(voltageTowardSublime(s, excellence)).toBe(1);
      expect(voltageTowardSublime(s, learning)).toBe(1);
      expect(voltageTowardSublime(s, perseverance)).toBe(1);
    });
  });
});
