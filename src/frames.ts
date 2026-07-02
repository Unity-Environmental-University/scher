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
// FUTURE: the TC39 Temporal API is the natural substrate for time-as-frame
// (Temporal.PlainDate is exactly "a calendar date that cannot zone-shift";
// Temporal.ZonedDateTime is exactly "an instant read through a zone"). As of mid-2026
// Temporal ships in Chrome 144+ and is ES2026, but Safari/mobile still lack stable
// support, so using it would force a ~200KB polyfill and break scher's zero-dep promise.
// The time surface below (timeFrame / clockLabel) is kept deliberately small so it can
// be reimplemented over Temporal — with no caller-visible API change — once it's Baseline.
// ─────────────────────────────────────────────────────────────────────────────

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
 *  - a bare ISO date (YYYY-MM-DD) is a calendar date — parsed LOCAL, never zone-shifts
 *  - a full instant is read THROUGH the reader's frame (their zone, or the system's)
 */
// TODO(socratic): now that I take BOTH userZone and userLocale, they arrive as two loose optionals — should a reader's frame be one value (zone+locale together) rather than two parameters a caller can half-pass, recreating the half-frame this signature just repaired?
export function clockLabel(when: string, userZone?: string | null, userLocale?: string | null): string {
  // bare calendar date — the common case. Parse the parts as a LOCAL date: no day-shift.
  const isoDate = when.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    // TODO(socratic): new Date(year, month, day) in JS is always LOCAL — but does labelOf then read the same date in ANOTHER zone if the caller passed userZone?  (the calendar date was parsed local to the machine, but then labelOf ignores userZone entirely — is that the contract, or a bug)?
    return labelOf(new Date(Number(y), Number(m) - 1, Number(d)), userLocale);
  }
  // TODO(socratic): my "hand-written strings pass through" promise rests on Date.parse returning NaN — but Date.parse is famously lenient ("March 5", "2026/06/17" parse in many engines), so which hand-written labels get silently hijacked into the instant branch and re-worded in someone's zone?
  // a full instant (has time/offset) — read it in the reader's frame via Intl.
  const t = Date.parse(when);
  if (!Number.isNaN(t)) {
    const zone = timeFrame(userZone);
    const locale = localeFrame(userLocale);
    try {
      // TODO(socratic): Why call Intl twice (once for weekday, once for date) instead of a single format call with both options?
      const day = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: zone }).format(t);
      const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: zone }).format(t);
      return `${day} ${date}`;
    } catch {
      // TODO(socratic): If Intl formatting fails, we fall back to labelOf — which doesn't know the userZone; is this the contract, or should the fallback honor the frame somehow?
      return labelOf(new Date(t), userLocale);
    }
  }
  // already-plain hand-written string ("Weds AM") passes through.
  return when;
}

function labelOf(d: Date, userLocale?: string | null): string {
  // plain register: short weekday + month + day. The READER'S locale words, frame-correct date.
  const locale = localeFrame(userLocale);
  const day = d.toLocaleDateString(locale, { weekday: "short" });
  const date = d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return `${day} ${date}`;
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
