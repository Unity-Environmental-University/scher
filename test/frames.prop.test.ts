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
