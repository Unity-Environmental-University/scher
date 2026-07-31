// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  GENERATED — DO NOT EDIT. Your changes will be overwritten.              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Source of truth: scher-core/src/counted.rs
// Regenerate:      node scripts/generate-from-rust.mjs
// Verify in CI:    node scripts/generate-from-rust.mjs --check
//
// The Rust kernel is the DEFINITION. These constants and slug schemes are
// lifted from it so the two implementations cannot drift on the parts that
// break silently — a renamed quality or a changed slug scheme does not throw,
// it just makes a fold read nothing, which looks exactly like "you have zero
// of those."
//
// The fold LOGIC is not generated (that would be a transpiler). It is a
// hand-written port checked against conformance/counted.json every test run.

/** The quality marking a delta beat. */
export const Q_COUNTS = "q-counts";

/** The quality marking a section placement. */
export const Q_IN_SECTION = "q-in-section";

/** Slug scheme, lifted from Rust `delta_prefix`. */
export const deltaPrefix = (holder: string, key: string): string =>
  `count-${holder}-${key}-`;

/** Slug scheme, lifted from Rust `place_prefix`. */
export const placePrefix = (holder: string, key: string): string =>
  `place-${holder}-${key}-`;

