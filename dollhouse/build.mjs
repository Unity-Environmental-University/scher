#!/usr/bin/env node
// Build the dollhouse browser: run the play-dolls, render each as a readable card. Plain — no
// framework, no deps beyond vitest (already here). The `it()` names ARE the stories; we just lay
// them out so you can SHOW someone the grammar playing on real history, fiction, and ideas.
//
//   node dollhouse/build.mjs   → writes dollhouse/index.html (open it in a browser)
//
// Reads vitest's JSON. Each *.play.test.ts is one DOLL; each `it` is one SCENE (pass = it holds).
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

// run only the play-dolls, capture JSON.
let json;
try {
  const out = execSync("npx vitest run --reporter=json " + "$(ls test/*.play.test.ts)", {
    cwd: root, shell: "/bin/bash", encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  });
  json = JSON.parse(out.slice(out.indexOf("{")));
} catch (e) {
  // vitest exits nonzero if any test fails — its JSON still printed to stdout.
  const out = e.stdout || "";
  json = JSON.parse(out.slice(out.indexOf("{")));
}

// group assertions by file (one doll per file), keep order.
const dolls = [];
for (const suite of json.testResults || []) {
  const file = (suite.name || "").split("/").pop().replace(".play.test.ts", "");
  const scenes = (suite.assertionResults || []).map((a) => ({
    title: a.title, ok: a.status === "passed",
  }));
  if (scenes.length) dolls.push({ file, scenes });
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const total = dolls.reduce((n, d) => n + d.scenes.length, 0);
const passed = dolls.reduce((n, d) => n + d.scenes.filter((s) => s.ok).length, 0);

const cards = dolls.map((d) => `
    <section class="doll">
      <h2>${esc(d.file)}</h2>
      <ul>${d.scenes.map((s) =>
        `<li class="${s.ok ? "ok" : "no"}"><span class="mark">${s.ok ? "✓" : "✗"}</span>${esc(s.title)}</li>`
      ).join("")}</ul>
    </section>`).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Dollhouse — the grammar, played</title>
<style>
  :root{ --paper:#faf7f1; --ink:#2a2622; --line:#e4ddd2; --note:#8a8170; --ok:#3f7d4a; --no:#b5603a; }
  body{ margin:0; background:var(--paper); color:var(--ink);
        font:16px/1.55 ui-serif,Georgia,"Times New Roman",serif; }
  .wrap{ max-width:760px; margin:0 auto; padding:2.5rem 1.4rem 4rem; }
  h1{ font-size:1.7rem; margin:0 0 .2rem; }
  .lede{ color:var(--note); margin:0 0 .3rem; }
  .count{ color:var(--note); font:13px ui-monospace,monospace; margin-bottom:2rem; }
  .doll{ border:1px solid var(--line); border-radius:12px; padding:1.1rem 1.3rem; margin-bottom:1.1rem;
         background:#fff; }
  .doll h2{ font-size:1.05rem; margin:0 0 .6rem; font-family:ui-monospace,monospace; color:var(--ink); }
  ul{ list-style:none; margin:0; padding:0; }
  li{ padding:.18rem 0 .18rem 1.6rem; text-indent:-1.6rem; }
  .mark{ display:inline-block; width:1.2rem; font-family:ui-monospace,monospace; }
  li.ok .mark{ color:var(--ok); } li.no .mark{ color:var(--no); }
  li.no{ color:var(--no); }
  footer{ color:var(--note); font-size:.85rem; margin-top:2rem; font-style:italic; }
</style></head>
<body><div class="wrap">
  <h1>The Dollhouse 🌊</h1>
  <p class="lede">The grammar, played on real history, fiction, and ideas. Each card is a doll
  (a property test); each line is a scene that holds. Load-bearing <em>and</em> fun.</p>
  <p class="count">${passed} / ${total} scenes hold · ${dolls.length} dolls</p>
  ${cards}
  <footer>Built from the play-tests in scher/test/*.play.test.ts. To add a doll, copy any one —
  the discipline is opaque slugs, real prehensions, no string-matching. The way is ahead.</footer>
</div></body></html>`;

mkdirSync(here, { recursive: true });
writeFileSync(here + "/index.html", html);
console.log(`dollhouse/index.html — ${passed}/${total} scenes across ${dolls.length} dolls. Open it in a browser.`);
