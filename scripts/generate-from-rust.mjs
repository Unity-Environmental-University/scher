#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// generate-from-rust.mjs — the Rust kernel is the DEFINITION; this generates
// the TS constants that must never disagree with it.
//
// Hallie, 2026-07-30: "can our PR just redirect everything to the wasm so we
// don't have to double maintain? … Or lacking that generates the TS based on
// the rust?"
//
// WHY NOT JUST REDIRECT TO WASM (the first option, and it was the right ask)
// -------------------------------------------------------------------------
// `scher-core-wasm/pkg/` is a GITIGNORED BUILD ARTIFACT: producing it needs
// rustup + the wasm32 target + wasm-pack. Making scher-pages call it would
// mean a fresh checkout cannot render a list without installing Rust, and it
// would break the vendor-it-and-go property scher deliberately keeps
// (ARCHITECTURE.md). So wasm is the FAST PATH when built, not the only path.
//
// WHY NOT GENERATE THE WHOLE FOLD (the second option, honestly assessed)
// ---------------------------------------------------------------------
// Generating fold LOGIC from Rust source is a transpiler. That is a real
// project, and a bad hand-rolled one would be worse than a checked port —
// it would drift AND be unreadable. Not attempted.
//
// WHAT IS ACTUALLY GENERATED, AND WHY IT IS THE PART THAT MATTERS
// --------------------------------------------------------------
// Drift does not usually arrive as "the algorithm diverged." It arrives as a
// renamed constant, a changed slug scheme, a quality string that gained a
// hyphen. Those are pure data, they are what silently breaks a corpus replay,
// and they are exactly what a 100-line script can keep honest.
//
// So: constants and slug schemes are GENERATED (never hand-edited), and the
// fold itself stays a hand-written port CHECKED against
// `conformance/counted.json` on every test run. That corpus already earns its
// keep — it caught an asOf bug in the TS fold within a minute of existing,
// one that the hand-written TS tests had passed clean.
//
// Run: node scripts/generate-from-rust.mjs   (or `npm run gen`)
// CI:  node scripts/generate-from-rust.mjs --check   (fails if stale)
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const CHECK = process.argv.includes("--check");

/** Sources of truth, in Rust. Each entry says what to lift and where it lands. */
const SOURCES = [
  {
    rust: "../scher-core/src/counted.rs",
    out: "../scher-pages/src/counted.generated.ts",
    module: "counted",
  },
];

/** `pub const NAME: &str = "value";` → { NAME: "value" } */
function constsOf(src) {
  const out = [];
  const re = /\/\/\/([^\n]*)\n\s*pub const (\w+): &str = "([^"]+)";/g;
  let m;
  while ((m = re.exec(src))) out.push({ doc: m[1].trim(), name: m[2], value: m[3] });
  return out;
}

/** `fn x_prefix(holder,key) { format!("count-{holder}-{key}-") }` → a template.
 *  The slug scheme is the single most drift-prone thing across twins: change it
 *  in one language and the other silently reads nothing (not an error — an
 *  empty fold, which looks like "you have zero of those"). */
function schemesOf(src) {
  const out = [];
  const re = /fn (\w+_prefix)\([^)]*\)\s*->\s*String\s*\{\s*format!\("([^"]+)"\)/g;
  let m;
  while ((m = re.exec(src))) out.push({ name: m[1], template: m[2] });
  return out;
}

const banner = (module, rustPath) => `// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  GENERATED — DO NOT EDIT. Your changes will be overwritten.              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Source of truth: ${rustPath}
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
`;

let stale = [];

for (const s of SOURCES) {
  const rustPath = s.rust.replace("../", "");
  const src = readFileSync(here(s.rust), "utf8");
  const consts = constsOf(src);
  const schemes = schemesOf(src);

  let body = banner(s.module, rustPath) + "\n";

  for (const c of consts) {
    if (c.doc) body += `/** ${c.doc} */\n`;
    body += `export const ${c.name} = ${JSON.stringify(c.value)};\n\n`;
  }

  for (const sc of schemes) {
    // count-{holder}-{key}- → (holder, key) => `count-${holder}-${key}-`
    const params = [...sc.template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const uniq = [...new Set(params)];
    const tmpl = sc.template.replace(/\{(\w+)\}/g, (_, n) => "${" + n + "}");
    const camel = sc.name.replace(/_(\w)/g, (_, c) => c.toUpperCase());
    body += `/** Slug scheme, lifted from Rust \`${sc.name}\`. */\n`;
    body += `export const ${camel} = (${uniq.map((p) => `${p}: string`).join(", ")}): string =>\n`;
    body += `  \`${tmpl}\`;\n\n`;
  }

  const outPath = here(s.out);
  let existing = "";
  try { existing = readFileSync(outPath, "utf8"); } catch {}

  if (existing !== body) {
    if (CHECK) { stale.push(s.out); }
    else { writeFileSync(outPath, body); console.log(`generated ${s.out.replace("../", "")}`); }
  } else if (!CHECK) {
    console.log(`up to date  ${s.out.replace("../", "")}`);
  }

  if (!CHECK) console.log(`  ${consts.length} constant(s), ${schemes.length} slug scheme(s)`);
}

if (CHECK && stale.length) {
  console.error("STALE — regenerate with `node scripts/generate-from-rust.mjs`:");
  for (const f of stale) console.error(`  ${f.replace("../", "")}`);
  process.exit(1);
}
if (CHECK) console.log("generated files are up to date with the Rust kernel");
