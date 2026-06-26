#!/usr/bin/env node
// bounds-check — Monday's lamp. 🔦 The hyperbolic view lit up a mess at the bounds of the route
// (2026-06-26); this lists it plainly so you can dig out. It does NOT fix anything — the fix is
// discernment (which lures are real, which are scaffolding), and that's yours. This just shows the map.
//
//   node dollhouse/bounds-check.mjs            # against the live canon (engine on :8012)
//   PENELOPE=http://host node bounds-check.mjs # elsewhere
//
// The two cardinal sins (see test/bounds.guard.test.ts):
//   1. event-0 PREHENDS something      — invalid: the Once has no past to take up.
//   2. the final HEA IS PREHENDED      — invalid: the End is the aim, never prior data behind a later one.
// Plus the softer mess: lures laid AT the End (x --q-lure--> final-event) that likely want to be the
// End luring OUT, or to be q-succeeds/membership, not lures at all. (q-lure is NOT a prehension.)

const BASE = process.env.PENELOPE || "http://localhost:8012";
const PREHENSIONS = new Set(["q-grounding","q-feel","q-receives","q-occludes","q-resolves"]);
const ONCE = "event-0";
const END  = new Set(["final-event"]);                 // the End / final HEA (extend if you have more)

const res = await fetch(BASE + "/gen3/canon").catch(() => null);
if (!res || !res.ok) { console.error("could not reach the canon at " + BASE + "/gen3/canon"); process.exit(2); }
const data = await res.json();
const beats = data.beats || data.nodes || data;
const qof = {};                                         // edge-slug -> quality
for (const b of beats) if (b.slug?.endsWith("~q") && b.object) qof[b.slug.slice(0,-2)] = b.object;
const q = (slug) => qof[slug];

const sin1 = [], sin2 = [], luresAtEnd = [];
for (const b of beats) {
  if (!b.subject || !b.object || b.slug?.endsWith("~q")) continue;
  const ql = q(b.slug);
  if (b.subject === ONCE && PREHENSIONS.has(ql)) sin1.push(`${b.subject} --${ql}--> ${b.object}`);
  if (END.has(b.object) && PREHENSIONS.has(ql))  sin2.push(`${b.subject} --${ql}--> ${b.object}`);
  if (END.has(b.object) && ql === "q-lure")      luresAtEnd.push(`${b.subject} --q-lure--> ${b.object}`);
}

const show = (title, list, note) => {
  console.log(`\n${title}  (${list.length})`);
  if (note) console.log("  " + note);
  for (const e of list.slice(0, 20)) console.log("    " + e);
  if (list.length > 20) console.log(`    … and ${list.length - 20} more`);
};

console.log("🔦 BOUNDS CHECK — the mess at the Once and the End (a map, not a fix)");
show("SIN 1 — event-0 PREHENDS (the Once has no past; these must go)", sin1,
     "delete these: the first occasion takes up nothing.");
show("SIN 2 — the final HEA IS PREHENDED (the End is the aim, never prior data)", sin2,
     "delete these: nothing prehends the End.");
show("MESS — lures laid AT the End (x --q-lure--> End)", luresAtEnd,
     "these likely want to be: the End luring OUT (flip), OR q-succeeds/membership (re-type), OR removed.\n  q-lure is NOT a prehension — it's the eternal object's act, via ingression. (held: lure-is-ingression-plus-prehension.)");

const clean = !sin1.length && !sin2.length;
console.log(`\n${clean ? "🌊 the bounds are clean." : "🚧 " + (sin1.length+sin2.length) + " hard violations + " + luresAtEnd.length + " soft. dig out, gently — discernment, not a script."}`);
