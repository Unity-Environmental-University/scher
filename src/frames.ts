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

/** The objective frame: the system's machine timezone. Every reader deltas from it. */
export const SYSTEM_ZONE: string = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC"; // honest fallback if the environment hides its zone
  }
})();

/** A reader's frame for time: their zone if established, else the system's (inherited). */
export function timeFrame(userZone?: string | null): string {
  return userZone && userZone.trim() ? userZone.trim() : SYSTEM_ZONE;
}

/** Render a date into a plain, frame-correct label.
 *  - a hand-written string ("Weds AM") passes through untouched
 *  - a bare ISO date (YYYY-MM-DD) is a calendar date — parsed LOCAL, never zone-shifts
 *  - a full instant is read THROUGH the reader's frame (their zone, or the system's)
 */
export function clockLabel(when: string, userZone?: string | null): string {
  // bare calendar date — the common case. Parse the parts as a LOCAL date: no day-shift.
  const isoDate = when.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return labelOf(new Date(Number(y), Number(m) - 1, Number(d)));
  }
  // a full instant (has time/offset) — read it in the reader's frame via Intl.
  const t = Date.parse(when);
  if (!Number.isNaN(t)) {
    const zone = timeFrame(userZone);
    try {
      const day = new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: zone }).format(t);
      const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: zone }).format(t);
      return `${day} ${date}`;
    } catch {
      return labelOf(new Date(t));
    }
  }
  // already-plain hand-written string ("Weds AM") passes through.
  return when;
}

function labelOf(d: Date): string {
  // plain register: short weekday + month + day. Locale words, frame-correct date.
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} ${date}`;
}

// ── LOCALE AS A FRAME ────────────────────────────────────────────────────────────

/** The objective frame: the system's locale. Every reader deltas from it. */
export const SYSTEM_LOCALE: string = (() => {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "en"; // honest fallback
  }
})();

/** A reader's locale frame: theirs if established, else the system's (inherited). */
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
  return (id: Id, userLocale?: string | null): string => {
    const loc = localeFrame(userLocale);
    const lang = loc.split("-")[0] ?? loc; // "es-MX" -> "es"
    return deltas?.[lang]?.[id] ?? base[id];
  };
}
