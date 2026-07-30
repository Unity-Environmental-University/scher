# Importing scher

Three ways in, none of which require a bundler or writing `dist/foo.js` paths by
hand. Added 2026-07-30 (Hallie: "feel free to edit scher to give it better module
referencing so we don't have to ref js directly").

**What did NOT change:** the `.js`-pointing-at-`.ts` convention *inside* `src/`.
That is deliberate and load-bearing — see `ARCHITECTURE.md`, "Why imports say
`.js`, not `.ts`". Consumers were always insulated from it by `package.json`'s
`exports`; what was missing was subpath access and a browser story.

---

## 1. Node / anything with a resolver

```js
import { Society, gistOf } from "scher";           // the barrel
import { intervalOf } from "scher/society";        // subpath, no dist/ path
import { foldGist, TALLY } from "scher/stories";
```

Subpaths now exported: `scher/society`, `scher/stories`, `scher/cell`,
`scher/dom`, `scher/frames`.

## 2. Browser, no build step — an import map

scher ships as raw ES modules, so the browser can load it directly. One
`<script type="importmap">` before your module makes the bare specifier resolve:

```html
<script type="importmap">
{
  "imports": {
    "scher": "/path/to/scher/dist/index.js",
    "scher/": "/path/to/scher/dist/"
  }
}
</script>
<script type="module">
  import { Society } from "scher";
  import { intervalOf } from "scher/society.js";
</script>
```

Note the trailing-slash mapping needs the `.js` on the tail (`scher/society.js`)
— that is the import-map spec, not scher. If you want the extensionless form in
a browser, use form 3.

A copy-pasteable map for a sibling checkout is in `importmap.json`.

## 3. Vendored, zero config

`dist/` is committed and self-contained (no runtime deps, by design). Copy it
next to your app and import relatively:

```js
import { Society } from "./vendor/scher/index.js";
```

Ugly, works everywhere, no tooling. Fine for a muslin.

---

## Should YOUR app use a bundler? Probably yes.

`ARCHITECTURE.md` argues scher itself stays `tsc`-only, and that still holds for
what scher *publishes*: a library shipping raw ES modules is a real gift to
consumers, who can vendor it, read it, and skip tooling entirely.

That is an argument about scher's dist. **It is not an argument about how your
app consumes scher.** Those got conflated, and the conflation cost this repo
some ergonomics it did not need to pay for.

If you are building an actual front end — a game, a real UI, anything with a
dev loop you will iterate in — use Vite (or whatever) and import `"scher"`
normally. You get HMR, one request instead of ~25 module fetches, tree-shaking,
and no import-map to maintain. For a UI you are iterating on constantly, HMR
alone likely outweighs both arguments in `ARCHITECTURE.md`.

The two arguments there, evaluated honestly rather than repeated:

- *"Honesty about what runs — the source IS the artifact."* **Sourcemaps already
  buy this.** A bundle that ships sourcemaps is readable: open devtools and you
  are looking at the original TypeScript, breakpoints land on real lines, stack
  traces name real files. So "legibility" is not a reason to avoid bundling —
  it is a reason to `build.sourcemap: true`.

  What survives is narrower and still real: raw ES modules are readable *with no
  build having happened at all*. `curl` one file and read it; vendor the folder
  and run it. That is a genuine property for a library people may want to adopt
  without tooling — and it is a much smaller claim than "the source is the
  artifact."

- *"AST/crawler friendliness — no resolver to reimplement."* Has teeth **if**
  something actually crawls the import graph. If nothing does, it is a cost paid
  against a hypothetical.

So: bundle the app, leave the library bare. Both can be true at once, and the
import map above stays the right answer for muslins and one-file experiments
where a build step is the heavier cost.
