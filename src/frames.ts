// ─────────────────────────────────────────────────────────────────────────────
// frames.ts — REFERENCE FRAMES: a reading is relative to a standpoint.
//
// scher's thesis is "a view is a reading of state." A reference frame is the same
// move, pushed down to the substrate every reading already happens against:
//
//   • TIME — "now is relative." A timezone IS a frame. There is an objective frame
//     (the system's zone) and every reader is a DELTA from it: they read in their own
//     zone if they've established one, else they inherit the system frame.
//   • LOCALE — the same shape for language. A locale is a frame a reader inherits from
//     the system default unless they establish their own.
//
// Both are "a value is read, not stored": a date's label and a message's wording are
// not held — they are READ THROUGH the reader's frame at the moment of projection.
//
// Zero runtime deps (scher's promise): native `Intl` only. A bare ISO date is parsed as
// a LOCAL calendar date (split the parts) so it never zone-shifts the way
// `new Date("2026-06-17")` (UTC-midnight) would.
//
// TIME IS TEMPORAL (2026-08-07, Hallie's call). Temporal.PlainDate is exactly "a
// calendar date that cannot zone-shift" and Temporal.ZonedDateTime is exactly "an
// instant read through a zone" — the frame model's two cases, as types rather than as
// branches of a string parse.
//
// This costs the zero-dependency promise: `temporal-polyfill` is a real runtime
// dependency, taken deliberately, because Temporal is not in node yet (undefined in
// v25.6.1; V8 knows --harmony-temporal but the build does not ship it). When node ships
// it, drop the import and nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

import { Temporal } from "temporal-polyfill";

// ── TIME AS A FRAME ────────────────────────────────────────────────────────────

// TODO(socratic): I call this "the objective frame," but it is captured once at module load — if the process migrates zones (or a test stubs Intl after import), is a frozen snapshot still objective, or is it just the frame of whoever imported me first?
/** The objective frame: the system's machine timezone. Every reader deltas from it. */
// TODO(socratic): Is "UTC" the right fallback if we can't read the zone — or is picking any zone when we're blind a violation of the frame's principle (a frame IS the reader's standpoint, and we have none)?
export const SYSTEM_ZONE: string = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC"; // honest fallback if the environment hides its zone
  }
})();

/** A reader's frame for time: their zone if established, else the system's (inherited). */
// TODO(socratic): Why pass userZone through trim() — are leading/trailing spaces meaningful input (should we reject them), or accidental noise (should trim happen at the boundary where userZone enters)?
export function timeFrame(userZone?: string | null): string {
  return userZone && userZone.trim() ? userZone.trim() : SYSTEM_ZONE;
}

/** Render a date into a plain, frame-correct label.
 *  - a hand-written string ("Weds AM") passes through untouched
 *  - a bare ISO date (YYYY-MM-DD) is a calendar date — it has no instant to shift
 *  - a full instant is read THROUGH the reader's frame (their zone, or the system's)
 *
 *  Over Temporal since 2026-08-07. The two kinds are now different TYPES rather than
 *  two branches of one string parse, which is what the frame model was claiming all
 *  along: `PlainDate` is a calendar date that cannot zone-shift, `Instant` is a moment
 *  read through a zone. Three things the old `Date` version got wrong fall out:
 *   - a bare ISO date used to be parsed local and then formatted ignoring `userZone`;
 *     a PlainDate has no zone to ignore, so the label is the date the author wrote.
 *   - `Date.parse` is lenient enough to swallow "March 5" and re-word it in someone
 *     else's zone; `Instant.from` is strict, so hand-written strings stay hand-written.
 *   - the two-Intl-calls-per-label thing is one call now.
 */
// TODO(socratic): now that I take BOTH userZone and userLocale, they arrive as two loose optionals — should a reader's frame be one value (zone+locale together) rather than two parameters a caller can half-pass, recreating the half-frame this signature just repaired?
export function clockLabel(when: string, userZone?: string | null, userLocale?: string | null): string {
  const locale = localeFrame(userLocale);
  const opts = { weekday: "short", month: "short", day: "numeric" } as const;

  // A bare calendar date. No instant, therefore nothing a zone could shift.
  if (/^\d{4}-\d{2}-\d{2}$/.test(when)) {
    try {
      return Temporal.PlainDate.from(when).toLocaleString(locale, opts);
    } catch {
      return when; // not a real date (2026-13-45) — the author's string stands
    }
  }

  // A full instant — read at the reader's standpoint.
  try {
    return Temporal.Instant.from(when)
      .toZonedDateTimeISO(timeFrame(userZone))
      .toLocaleString(locale, opts);
  } catch {
    // TODO(socratic): a zoned-but-not-instant string ("2026-06-17T12:00") has no offset — should it read as a PlainDateTime in the reader's zone rather than falling through to pass-through?
    return when; // hand-written ("Weds AM") — passes through untouched
  }
}

// ── LOCALE AS A FRAME ────────────────────────────────────────────────────────────

/** The objective frame: the system's locale. Every reader deltas from it. */
// TODO(socratic): Is "en" the right fallback if we can't read the locale — or is it assuming English-language readers when we're blind, the same tension as SYSTEM_ZONE defaulting to UTC?
export const SYSTEM_LOCALE: string = (() => {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "en"; // honest fallback
  }
})();

/** A reader's locale frame: theirs if established, else the system's (inherited). */
// TODO(socratic): Same as timeFrame — should trim() happen here, or at the boundary where userLocale is created?
export function localeFrame(userLocale?: string | null): string {
  return userLocale && userLocale.trim() ? userLocale.trim() : SYSTEM_LOCALE;
}

/** A message canon: a flat record of message-id → wording, for one base language. */
export type Canon<Id extends string> = Readonly<Record<Id, string>>;

/** A set of canons keyed by base language ("en", "es", …). `base` is the fallback;
 *  others are deltas — a delta need only carry the ids it overrides. */
export interface Canons<Id extends string> {
  /** the base canon every other inherits from (must be total over Id). */
  base: Canon<Id>;
  /** per-language deltas, keyed by base language code. Partial. */
  deltas?: Readonly<Record<string, Partial<Canon<Id>>>>;
}

/** Read a message in the reader's locale frame: their canon if it has the key, else
 *  inherit the base canon. The frame-relative read, one string at a time. Caller
 *  supplies the canon — scher commits to the FRAME shape, not to any vocabulary.
 *
 *    const msgs = makeCanon({ base: { hi: "hello" }, deltas: { es: { hi: "hola" } } });
 *    msgs("hi", "es-MX")  // "hola"   (es-MX → es)
 *    msgs("hi")           // "hello"  (system locale, or base fallback)
 */
export function makeCanon<Id extends string>(canons: Canons<Id>): (id: Id, userLocale?: string | null) => string {
  const { base, deltas } = canons;
  // TODO(socratic): Why does makeCanon take the whole Canons structure and return a closure, rather than being a pure function that takes (canons, id, userLocale)?  The closure bakes in the canons — is that a performance win (closure over data), a design win (each canon is its own reader-function), or just shape-matching the caller's site?
  return (id: Id, userLocale?: string | null): string => {
    const loc = localeFrame(userLocale);
    // TODO(socratic): I collapse the whole BCP-47 tag to its first subtag — "zh-Hant" and "zh-Hans" both become "zh", and "es-MX" can never carry its own delta even if a caller supplies one; is a one-hop delta-from-base a frame, or did I quietly decide locales have no depth?
    const lang = loc.split("-")[0] ?? loc; // "es-MX" -> "es"
    // TODO(socratic): The fallback chain is deltas?.[lang]?.[id] ?? base[id] — what if id is missing from base?  (The type signature says base is "must be total over Id," but we don't validate that at runtime — what does a missing key in the base canon mean)?
    return deltas?.[lang]?.[id] ?? base[id];
  };
}
