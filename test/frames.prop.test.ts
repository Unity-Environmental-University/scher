// ─────────────────────────────────────────────────────────────────────────────
// frames.prop.test.ts — property tests for reference frames (time + locale).
//
// The frame law: a reader with no established frame reads EXACTLY as the system frame
// (inheritance); an established, non-blank frame overrides. Plus clockLabel's purity:
// a bare ISO date is a calendar date that never zone-shifts, and a hand-written string
// passes through untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  SYSTEM_ZONE,
  timeFrame,
  clockLabel,
  SYSTEM_LOCALE,
  localeFrame,
  makeCanon,
} from "../src/frames.js";

describe("frames — inheritance law", () => {
  it("an absent/blank frame inherits the system frame; a real frame overrides", () => {
    const blank = fc.constantFrom(undefined, null, "", "   ", "\t");
    fc.assert(
      fc.property(blank, (b) => {
        expect(timeFrame(b)).toBe(SYSTEM_ZONE);
        expect(localeFrame(b)).toBe(SYSTEM_LOCALE);
      }),
    );
    fc.assert(
      fc.property(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), (z) => {
        expect(timeFrame(z)).toBe(z.trim());
        expect(localeFrame(z)).toBe(z.trim());
      }),
    );
  });
});

describe("clockLabel — purity", () => {
  it("a bare ISO date is frame-independent (a calendar date never zone-shifts)", () => {
    const isoDate = fc
      .date({ min: new Date(Date.UTC(1970, 0, 1)), max: new Date(Date.UTC(2100, 0, 1)), noInvalidDate: true })
      .map((d) => d.toISOString().slice(0, 10)); // YYYY-MM-DD
    fc.assert(
      fc.property(isoDate, fc.option(fc.constantFrom("America/New_York", "Asia/Tokyo", "UTC")), (when, zone) => {
        // the same calendar date reads identically regardless of the reader's zone
        expect(clockLabel(when, zone)).toBe(clockLabel(when, "Pacific/Kiritimati"));
      }),
    );
  });

  it("omitting the locale reads exactly as a blank locale frame (back-compat: inheritance)", () => {
    const blankLocale = fc.constantFrom(undefined, null, "", "   ");
    const anyWhen = fc.oneof(
      fc.constant("2026-07-02"), // bare calendar date
      fc.constant("2026-07-02T15:30:00Z"), // full instant
      fc.constant("Weds AM"), // hand-written
    );
    fc.assert(
      fc.property(anyWhen, blankLocale, (when, loc) => {
        // the two-arg call (the pre-locale signature) and a blank locale frame are the SAME read
        expect(clockLabel(when, "UTC", loc)).toBe(clockLabel(when, "UTC"));
      }),
    );
  });

  it("an established locale frame changes the weekday/month WORDS (the other half of the frame)", () => {
    // 2026-07-02 is a Thursday; check both branches (calendar date + instant).
    fc.assert(
      fc.property(fc.constantFrom("2026-07-02", "2026-07-02T12:00:00Z"), (when) => {
        const en = clockLabel(when, "UTC", "en-US");
        const fr = clockLabel(when, "UTC", "fr-FR");
        const de = clockLabel(when, "UTC", "de-DE");
        expect(en).toMatch(/Thu/); // Thursday, July — English words
        expect(fr).toMatch(/jeu/i); // jeudi, juillet — French words
        expect(de).toMatch(/Do/); // Donnerstag, Juli — German words
        expect(fr).not.toBe(en);
      }),
    );
  });

  it("locale changes the words, never the calendar date (a date still never zone-shifts)", () => {
    const isoDate = fc
      .date({ min: new Date(Date.UTC(1970, 0, 1)), max: new Date(Date.UTC(2100, 0, 1)), noInvalidDate: true })
      .map((d) => d.toISOString().slice(0, 10));
    fc.assert(
      fc.property(isoDate, fc.constantFrom("en-US", "fr-FR", "ja-JP"), (when, loc) => {
        const day = Number(when.slice(8, 10));
        // the day-of-month survives every locale's wording
        expect(clockLabel(when, null, loc)).toContain(String(day));
      }),
    );
  });

  it("a non-date hand-written string passes through untouched", () => {
    const handwritten = fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}/.test(s) && Number.isNaN(Date.parse(s)));
    fc.assert(
      fc.property(handwritten, (s) => {
        expect(clockLabel(s)).toBe(s);
      }),
    );
  });
});

describe("makeCanon — frame-relative message read", () => {
  const canon = makeCanon({
    base: { hi: "hello", bye: "goodbye" } as const,
    deltas: { es: { hi: "hola" }, fr: { hi: "salut", bye: "au revoir" } },
  });

  it("reads a delta when present, else inherits the base", () => {
    fc.assert(
      fc.property(fc.constantFrom("es", "es-MX", "es-AR"), (loc) => {
        expect(canon("hi", loc)).toBe("hola"); // delta present
        expect(canon("bye", loc)).toBe("goodbye"); // delta absent → base
      }),
    );
  });

  it("an unknown language falls back entirely to the base canon", () => {
    fc.assert(
      fc.property(fc.constantFrom("de", "ja", "zz-XX"), (loc) => {
        expect(canon("hi", loc)).toBe("hello");
        expect(canon("bye", loc)).toBe("goodbye");
      }),
    );
  });
});
