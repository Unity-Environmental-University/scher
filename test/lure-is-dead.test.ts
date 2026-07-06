// ─────────────────────────────────────────────────────────────────────────────
// lure-is-dead.test.ts — "Q Lure is killed with fire thousands of times as it has been
// before and a test is written that says if there are any q-lures anywhere in the db it
// will not work and why and what to do to fix it." — Hallie, verbatim, 2026-07-06.
//
// This is that test. Unlike the containment guard (which hollers and continues), the
// lure guard REFUSES: layP throws on q-lure, and assertNoLureInSociety throws on a
// society carrying one however it got in. Both errors carry the WHY (q-lure smuggled an
// agent and could not state its own direction) and the FIX (unpack the event into its
// three poles; End-hood is the structural q-end-pole designation; close with
// `end ~because~ now`).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, assertNoLureInSociety } from "../src/society.js";

describe("q-lure is dead grammar — the guard BLOCKS", () => {
  it("layP refuses a q-lure outright, saying why and what to do", () => {
    const s = new Society();
    expect(() => s.layP("a~lures~b", "a lure", "a", "b", "q-lure")).toThrowError(
      /DEAD GRAMMAR.*q-lure is DEAD.*smuggled an agent.*unpackPoles/s,
    );
    expect(s.has("a~lures~b")).toBe(false); // fail-closed: nothing was laid
    expect(s.has("a~lures~b~q")).toBe(false);
  });

  it("a society smuggling a lure past layP (raw rows, seeds, fetched canons) will not work", () => {
    // raw lay() bypasses the write guard — a seeded/fetched canon could carry old lures.
    const s = new Society([
      { slug: "old-lure", content: "legacy", subject: "a", object: "b" },
      { slug: "old-lure~q", content: "[q-lure]", subject: "old-lure", object: "q-lure" },
    ]);
    expect(() => assertNoLureInSociety(s)).toThrowError(
      /DEAD GRAMMAR.*1 q-lure mode-beat.*old-lure~q.*unpack.*three poles/s,
    );
  });

  it("a clean society passes the db-wide guard silently", () => {
    const s = new Society();
    s.lay({ slug: "ev", content: "an event", subject: null, object: null });
    s.layP("ev~end-pole~ev~hea", "the living shape", "ev", "ev~hea", "q-end-pole");
    expect(() => assertNoLureInSociety(s)).not.toThrow();
  });
});
