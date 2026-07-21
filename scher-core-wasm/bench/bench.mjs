// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  MUSLIN — a measuring stick, not a benchmark suite. Numbers over vibes.  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// bench.mjs — quantifies the wasm boundary cost both ways (the #1 thing the
// 2026-07-21 first slice exists to measure):
//   1. ONE COARSE CALL: bucketsOf(event) — whole structure per crossing —
//      wasm vs the TS twin (dist/society.js), same synthesized society.
//   2. A DELIBERATELY CHATTY LOOP: one boundary crossing per slug (the
//      cautionary probes), so the per-call tax is visible in the open.
//
// Run:  node scher-core-wasm/bench/bench.mjs        (from the scher root)
// Needs: scher-core-wasm/pkg built (wasm-pack build --target web --release)
//        and dist/ built (npm run build) for the TS twin.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// ── synthesize a realistic society: one day-story, N todos (half gathered by the
//    Now = past, a quarter prehending the Now = future, a quarter straddling), all
//    in the fixture's own row spelling — replayed identically into both kernels. ──
const N = 1000;
const rows = [];
let w = 0;
const lay = (slug, content, subject, object) =>
  rows.push({ slug, content, ...(subject ? { subject, object } : {}), witnessed: ++w });
const layP = (slug, content, subject, object, q) => {
  lay(slug, content, subject, object);
  rows.push({ slug: `${slug}~q`, content: `${content} [${q}]`, subject: slug, object: q, witnessed: w });
};

lay("the-day", "a synthesized day");
lay("the-day~hea", "its End-pole");
layP("the-day~end-pole~the-day~hea", "End-pole designation", "the-day", "the-day~hea", "q-end-pole");
lay("the-day~now", "its Now");
layP("the-day~now~because~the-day", "now is because events", "the-day~now", "the-day", "q-grounding");
for (let i = 0; i < N; i++) {
  const t = `todo-${i}`;
  lay(t, `todo #${i}`);
  layP(`${t}~because~the-day`, "grounds in", t, "the-day", "q-grounding");
  if (i % 2 === 0) {
    layP(`the-day~now~because~${t}`, "the Now gathers it", "the-day~now", t, "q-grounding");
  } else if (i % 4 === 1) {
    layP(`${t}~because~the-day~now`, "prehends the Now", t, "the-day~now", "q-grounding");
  } // else: straddler — in the interval, neither gathered nor prehending
}
console.log(`society: ${rows.length} rows (${N} todos)`);

// ── the two kernels ──────────────────────────────────────────────────────────────
const ts = await import(here("../../dist/society.js"));
const tsSoc = new ts.Society();
for (const r of rows) tsSoc.lay({ subject: null, object: null, ...r });

const wasm = await import(here("../pkg/scher_core_wasm.js"));
await wasm.default({ module_or_path: readFileSync(here("../pkg/scher_core_wasm_bg.wasm")) }); // the one-await init

const t0 = performance.now();
const wasmSoc = new wasm.WasmSociety(JSON.stringify(rows)); // ONE coarse construction call
console.log(`wasm construction (one batch call, ${rows.length} rows): ${(performance.now() - t0).toFixed(2)} ms`);

// sanity: the two kernels agree on this society before we time anything
const agree = (a, b, name) => {
  const sa = JSON.stringify([...a].sort()), sb = JSON.stringify([...b].sort());
  if (sa !== sb) throw new Error(`DIVERGENCE on ${name}:\n  ts:   ${sa}\n  wasm: ${sb}`);
};
const tsB = ts.bucketsOf(tsSoc, "the-day");
const wasmB = JSON.parse(wasmSoc.bucketsOf("the-day"));
agree(tsB.interior.past, wasmB.interior.past, "interior.past");
agree(tsB.interior.future, wasmB.interior.future, "interior.future");
agree(tsB.interior.present, wasmB.interior.present, "interior.present");
console.log(`kernels agree: past=${wasmB.interior.past.length} future=${wasmB.interior.future.length} present=${wasmB.interior.present.length}\n`);

const time = (label, iters, fn) => {
  fn(); // warm
  const samples = [];
  for (let i = 0; i < iters; i++) {
    const s = performance.now();
    fn();
    samples.push(performance.now() - s);
  }
  samples.sort((a, b) => a - b);
  const med = samples[Math.floor(samples.length / 2)];
  console.log(`${label}: median ${med.toFixed(3)} ms over ${iters} iters (min ${samples[0].toFixed(3)}, max ${samples[samples.length - 1].toFixed(3)})`);
  return med;
};

// ── 1. the coarse call ───────────────────────────────────────────────────────────
console.log("── coarse call: bucketsOf(the-day), whole structure per crossing ──");
const tsMed = time("  ts  bucketsOf", 20, () => ts.bucketsOf(tsSoc, "the-day"));
const wasmMed = time("  wasm bucketsOf (incl. JSON parse)", 20, () => JSON.parse(wasmSoc.bucketsOf("the-day")));
console.log(`  → wasm is ${(tsMed / wasmMed).toFixed(2)}× the TS twin's speed on the coarse read\n`);

// ── 2. the cautionary chatty loop ────────────────────────────────────────────────
console.log(`── chatty loop (CAUTIONARY): ${N} crossings, one has()+isOccluded() per todo ──`);
const slugs = Array.from({ length: N }, (_, i) => `todo-${i}`);
const chattyWasm = time("  wasm per-slug loop", 10, () => {
  for (const s of slugs) { wasmSoc.has(s); wasmSoc.isOccluded(s); }
});
const chattyTs = time("  ts   per-slug loop", 10, () => {
  for (const s of slugs) { tsSoc.has(s); ts.isOccluded(tsSoc, s); }
});
console.log(`  → per-crossing tax: ~${((chattyWasm / (N * 2)) * 1e6).toFixed(0)} ns/call wasm vs ~${((chattyTs / (N * 2)) * 1e6).toFixed(0)} ns/call ts (${(chattyWasm / chattyTs).toFixed(1)}× per crossing)`);
console.log(`  → moral: the tax is PER CROSSING — cheap probes stay cheap even chatty, but a read that`);
console.log(`    fans out (bucketsOf per member instead of per event) would pay it thousands of times.`);
