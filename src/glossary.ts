// ─────────────────────────────────────────────────────────────────────────────
// glossary.ts — the lib, demonstrating AND documenting itself. Each entry shows the
// live Story next to the CODE that builds it, so the glossary is the lib's reference:
// see the card, see exactly how you'd write it. Press the buttons → a beat is laid →
// the reading re-projects. No server. The deps-loop, broken; the docs, executable.
//
// TODO(socratic): I live in scher/src — do my build/serve directions (web/, /web/src/lib/glossary.html) describe a home I no longer have, and will the next builder follow them into a wall?
// Build:  cd web && npx tsc
// Serve:  python3 -m http.server 8020  (from repo root) → /web/src/lib/glossary.html
// ─────────────────────────────────────────────────────────────────────────────

import { el } from "./dom.js";
import { Society, modeAt } from "./society.js";
import { cardStory, buttonStory, toggleButtonStory, modalStory, frameStory, reading, readCardAnatomy, type ModeArm } from "./stories.js";
import { fact } from "./fact.js";
import { project } from "./projection.js";

// ── THE GLOSSARY'S TASTE — the mode-copy glosses, in ONE place, owned by the caller. ──
// stories.ts's cardStory reads mode as pure STRUCTURE (CardRead.mode: "established"|"scripted");
// the English/symbols are this glossary's own voice, not scher's. Any caller — this demo, a real
// Penelope view — supplies its own modeArm. This is the glossary's demonstration of its own taste.
const glossaryModeArm: ModeArm = (v) =>
  el("span", {}, v.mode === "established"
    ? `✓ established — an actual met this (conf ${v.conf.toFixed(2)})`
    : `○ scripted — a lure, ungrounded`);

export function mountGlossary(root: HTMLElement): void {
  // ── the society: a tiny canon of content beats, all ungrounded (scripted) ──
  const soc = new Society([
    { slug: "actor-you", content: "you — a standpoint that can ground", subject: null, object: null },
    { slug: "b-tea", content: "The tea is ready.", subject: null, object: null },
    { slug: "b-door", content: "Someone is at the door.", subject: null, object: null },
    { slug: "b-rain", content: "It is raining.", subject: null, object: null },
  ]);

  // a tiny Story-with-interior for the Frame demo: Once → [two interior beats, one of
  // which is ITSELF a story] → End. Demonstrates the one-level recursion cap.
  soc.layAll([
    { slug: "morning-once", content: "Once: a morning began.", subject: null, object: null },
    { slug: "m-coffee", content: "Coffee was made.", subject: null, object: null },
    { slug: "m-walk", content: "A walk was taken.", subject: null, object: null },     // this one is a sub-story
    { slug: "morning-end", content: "…and the morning was complete. The End.", subject: null, object: null },
    // the spine: once → coffee → walk → end (plain prehension edges = the interval)
    { slug: "me1", content: "once→coffee", subject: "morning-once", object: "m-coffee" },
    { slug: "me2", content: "coffee→walk", subject: "m-coffee", object: "m-walk" },
    { slug: "me3", content: "walk→end", subject: "m-walk", object: "morning-end" },
    // morning-end is designated morning-once's End-pole (so isStory(morning-once) = true)
  ]);
  soc.layP("ml-story", "the morning is a story", "morning-once", "morning-end", "q-end-pole");
  // m-walk is ITSELF a story (a sub-interval): walk-once → step → walk-end
  soc.layAll([
    { slug: "walk-step", content: "A single step.", subject: null, object: null },
    { slug: "walk-end", content: "…the walk ended.", subject: null, object: null },
    { slug: "we1", content: "walk→step", subject: "m-walk", object: "walk-step" },
    { slug: "we2", content: "step→walk-end", subject: "walk-step", object: "walk-end" },
  ]);
  soc.layP("wl-story", "the walk is a story", "m-walk", "walk-end", "q-end-pole");

  // a glossary entry: title · blurb · the live demo · the CODE that built it.
  const entry = (title: string, blurb: string, demo: Node[], code: string): Node => {
    const s = el("section", { class: "glo-entry" });
    s.appendChild(el("h2", {}, title));
    s.appendChild(el("p", { class: "blurb" }, blurb));
    const row = el("div", { class: "entry-row" });
    const demoBox = el("div", { class: "demo" });
    for (const n of demo) demoBox.appendChild(n);
    const codeBox = el("pre", { class: "code" });
    codeBox.appendChild(el("code", { text: code }));
    row.appendChild(demoBox);
    row.appendChild(codeBox);
    s.appendChild(row);
    return s;
  };

  // ── ENTRY 1: Card Story ──
  root.appendChild(entry(
    "Card Story",
    "A Story that reads ONE beat — its content and its determined mode (scripted vs established). " +
    "The card IS the reading of that beat; it holds no state and re-reads when the society appends.",
    [cardStory(soc, { slug: "b-tea", standpoint: "you", modeArm: glossaryModeArm })],
    `// a Card Story reads one beat → a card.
// 'soc' is the society (the append-only beat-store).
const teaCard = cardStory(soc, {
  slug: "b-tea",          // the beat this card reads
  standpoint: "you",      // whose reading (shown on hover)
});
root.appendChild(teaCard);
// the card's value (content, mode, pathos) is READ from
// the society — not stored. When the society appends,
// the card re-projects. No setState.`,
  ));

  // ── ENTRY 2: Button Story (press = lay a beat) ──
  const teaCard2 = cardStory(soc, { slug: "b-tea", standpoint: "you", modeArm: glossaryModeArm });
  const groundTea = buttonStory(soc, {
    label: (s) => (modeAt(s, "b-tea") === "established" ? "✓ grounded (press again = inert)" : "check = ground the tea"),
    enabled: (s) => modeAt(s, "b-tea") === "scripted",
    press: (s) => s.layP("g-you-tea", "you ground the tea", "actor-you", "b-tea", "q-grounding"),
  });
  root.appendChild(entry(
    "Button Story — press = lay a beat",
    "A Story whose label/enabled are read from the society, and whose PRESS lays a beat — the only write. " +
    "Press it: the card above re-reads and flips to established. No mutation — an append, and every reading re-projects.",
    [teaCard2, groundTea],
    `// a Button Story: label/enabled are READINGS;
// press LAYS a beat (the only write in the whole lib).
const groundTea = buttonStory(soc, {
  // label is a reading — it knows if it's grounded:
  label: (s) =>
    modeAt(s, "b-tea") === "established"
      ? "✓ grounded"
      : "check = ground the tea",
  enabled: (s) => modeAt(s, "b-tea") === "scripted",
  // the PRESS — lay a grounding prehension:
  press: (s) =>
    s.layP("g-you-tea", "you ground the tea",
           "actor-you", "b-tea", "q-grounding"),
});`,
  ));

  // ── ENTRY 3: Pathos ──
  const rainCard = cardStory(soc, { slug: "b-rain", standpoint: "you", modeArm: glossaryModeArm });
  const starRain = buttonStory(soc, {
    label: "🌧️ react (lay pathos)",
    press: (s) => {
      // TODO(socratic): counting beats by slug prefix is exactly the string-matching on slugs that scher/CLAUDE.md forbids — shouldn't charge be read structurally (q-feel prehensions from b-rain), and doesn't the doc string below teach every reader the smuggle?
      const n = s.all().filter((b) => b.slug.startsWith("feel-rain-")).length;
      // Q-FEEL DIRECTION FLIP (Hallie, 2026-07-20, "story-flip-q-feel-direction"): the
      // EVENT prehends the emoji — subject=b-rain, object=actor-you.
      s.layP(`feel-rain-${n}`, "🌧️", "b-rain", "actor-you", "q-feel");
    },
  });
  root.appendChild(entry(
    "Pathos (star) — charge accumulates",
    "Press repeatedly: each press lays a q-feel beat. Pathos is static charge — it accumulates on the beat. " +
    "Same primitive as check=ground, different quality (q-feel instead of q-grounding).",
    [rainCard, starRain],
    `// pathos is the same primitive — a different quality.
// each press lays a fresh q-feel beat → charge accrues.
// the EVENT prehends the emoji (subject=beat, object=reactor).
const starRain = buttonStory(soc, {
  label: "🌧️ react (lay pathos)",
  press: (s) => {
    const n = s.all()
      .filter(b => b.slug.startsWith("feel-rain-")).length;
    s.layP(\`feel-rain-\${n}\`, "🌧️",
           "b-rain", "actor-you", "q-feel");
  },
});`,
  ));

  // TODO(socratic): every CODE string here is a hand-copied twin of the live demo above it — when the lib's API shifts, what keeps the executable half and the quoted half from quietly diverging, and is a glossary that lies about its own code worse than no glossary?
  // ── ENTRY 4: Toggle — built on the Fact PORCELAIN (the positivist wrapper) ──
  // This is the desync-proof version: a Fact gives a get/set(boolean) surface; the
  // toggle never touches a slug, so the one-loop bug is unwriteable.
  // TODO(socratic): I create this Fact and never read, press, or show it — the toggle below re-derives its own handle from raw slugs — so does 'doorGrounded' demonstrate the porcelain or quietly demonstrate that the demo didn't need it?
  const doorGrounded = fact(soc, "b-door", { by: "actor-you" });
  const doorCard = cardStory(soc, { slug: "b-door", standpoint: "you", modeArm: glossaryModeArm });
  const doorToggle = toggleButtonStory(soc, {
    target: "b-door",
    by: "actor-you",
    // TODO(socratic): a fixed groundSlug on an append-only society — after untick then re-tick, does laying "g-you-door" again collide with the superseded beat of the same name, and is a fixed slug for a repeatable act the "track a slug" bug wearing a new coat?
    groundSlug: "g-you-door",
    labelChecked: "☑ grounded — untick (supersede, stays in ink)",
    labelUnchecked: "☐ check = ground the door",
  });
  root.appendChild(entry(
    "Toggle / Uncheckable Button (+ the Fact porcelain)",
    "Press to ground; press again to UNGROUND — but nothing is deleted. Uncheck lays a SUPERSEDE beat; the " +
    "grounding stays in ink, the read ignores it. Watch the society count: it only ever RISES, even on undo. " +
    "Built on a Fact — a positivist get/set(boolean) handle that hides the append-only plumbing, so the " +
    "'track a slug' desync bug is UNWRITEABLE. (Honest porcelain: fact.history() exposes the seam on demand.)",
    [doorCard, doorToggle],
    `// THE POSITIVIST WRAPPER. A Fact gives you the
// intuitive surface — a boolean you get/set — over the
// append-only/read-the-truth process core. Pass a Fact
// to a Story and the desync bug-class is gone.

const door = fact(soc, "b-door", { by: "actor-you" });

door.get();        // → reads the TRUTH (isEstablished) — never a stale slug
door.set(true);    // → lays a fresh grounding (append)
door.set(false);   // → SUPERSEDES live groundings (append, not delete)
door.set(false);   // → inert (intent-idempotent)
door.confidence(); // → 0..1 (groundings vs exclusions)
door.history();    // → every grounding/supersede ever laid (the seam)

// the bug we hit ("works one loop then stuck") came from
// tracking a fixed slug. With a Fact there is NO slug to
// track — get() always re-reads establishment. Unwriteable.`,
  ));

  // ── ENTRY 5: Modal Story ──
  const { openButton, overlay } = modalStory(soc, {
    id: "demo",
    title: "A modal is a Story",
    body: (s) => {
      const wrap = el("div", { class: "modal-body" });
      wrap.appendChild(el("p", {}, "This modal's open/closed state is a reading of the society (is there a live open-beat?), " +
        "not useState. Opening laid a beat; closing supersedes it. The modal's own existence is in the canon."));
      wrap.appendChild(cardStory(s, { slug: "b-tea", standpoint: "you (in modal)", modeArm: glossaryModeArm }));
      return wrap;
    },
  });
  root.appendChild(entry(
    "Modal Story — open-state is a reading",
    "A modal is a Story too. Its openness lives in the society, not in a JS variable — open = lay a beat, " +
    "close = supersede it. So the modal is observer-relative and rollback-able. Stories compose inside Stories.",
    [openButton, overlay],
    `// a modal IS a Story — its open-state is a READING.
const { openButton, overlay } = modalStory(soc, {
  id: "demo",
  title: "A modal is a Story",
  body: (s) => {
    // Stories compose: a Card Story inside the modal,
    // reading the SAME society.
    return cardStory(s, { slug: "b-tea", modeArm: glossaryModeArm });
  },
});
// open = lay a 'modal-open-demo' beat; close = supersede
// it. The modal's existence is in the canon — rollback-able.
root.append(openButton, overlay);`,
  ));

  // ── ENTRY 6: Frame Story (the frame-tale) — a Story contains its beats ──
  root.appendChild(entry(
    "Frame Story (the frame-tale) — a Story contains its beats",
    "The Once/End bracket made visible: a top lip (the Once), the interior beats (the causal interval = " +
    "the body), a bottom lip (the End), and a spine showing the interior is HELD by the bound. Reads " +
    "intervalOf(once, end). RECURSION CAP: one level — an interior beat that's itself a story nests ONE " +
    "sub-frame ('A walk was taken' below); deeper, stories become drill-in affordances. The retro, the rail, " +
    "a sprint are all Frames.",
    [frameStory(soc, { once: "morning-once", end: "morning-end", standpoint: "you", modeArm: glossaryModeArm })],
    `// the C-block: a Story bracketing its interior.
const morning = frameStory(soc, {
  once: "morning-once",   // top lip (the input)
  end:  "morning-end",    // bottom lip (the return)
  standpoint: "you",
});
// it reads intervalOf(once, end) for the body and
// projects each interior beat as a Card. An interior
// beat that is ITSELF a story (here: "A walk was taken")
// nests ONE sub-frame — then stops (depth cap = 1).
// deeper stories render as "↳ drill in" affordances.
root.appendChild(morning);`,
  ));

  // ── ENTRY 7: the society (append-only) ──
  const readout = project(
    reading(soc, (s) => s.size),
    (size) => el("div", { class: "readout" }, `society now holds ${size} beats (append-only — nothing is ever overwritten)`),
  ).node;
  root.appendChild(entry(
    "The Society (append-only)",
    "Every press above APPENDED to this society. The count only ever rises — versioning, rollback, and audit " +
    "are free, because they are what an append-only society IS. git, for meaning — at the UI layer.",
    [readout],
    `// the Society is the gen3 substance, client-side:
// an append-only log of beats. The ONLY write is lay().
const soc = new Society([ ...seed beats... ]);
soc.lay({ slug, content, subject, object });  // append
soc.layP(slug, content, subj, obj, "q-grounding"); // a prehension
// you NEVER overwrite. "undo" is a supersede (an append).
// a Cell over the society re-derives on every append —
// that's how the cards/buttons above stay live.`,
  ));

  // ── ENTRY 8: Card Anatomy — CONTAINS / FUTURE / PAST ──
  // A separate small society: a "bake bread" beat with an interior (CONTAINS), one
  // thing it makes necessary (FUTURE), and two things it needs first, one already
  // met and one still pending (PAST). This is the SAME three-compartment read the
  // real card opens into on the board — readCardAnatomy below is called live, on this
  // society, not mocked.
  const anatomySoc = new Society([
    { slug: "you", content: "you — a standpoint that can ground", subject: null, object: null },
    { slug: "bake-bread", content: "Bake bread", subject: null, object: null },
    { slug: "knead-dough", content: "Knead the dough", subject: null, object: null },
    { slug: "shape-loaf", content: "Shape the loaf", subject: null, object: null },
    { slug: "bake-end", content: "…and the bread was baked. The End.", subject: null, object: null },
    { slug: "eat-bread", content: "Eat the bread", subject: null, object: null },
    { slug: "buy-flour", content: "Buy flour", subject: null, object: null },
    { slug: "starter-ready", content: "Starter is ready", subject: null, object: null },
  ]);
  // CONTAINS: bake-bread is a story: once → knead → shape → end (the interior).
  anatomySoc.layAll([
    { slug: "bb1", content: "once→knead", subject: "bake-bread", object: "knead-dough" },
    { slug: "bb2", content: "knead→shape", subject: "knead-dough", object: "shape-loaf" },
    { slug: "bb3", content: "shape→end", subject: "shape-loaf", object: "bake-end" },
  ]);
  anatomySoc.layP("bb-story", "baking bread is a story", "bake-bread", "bake-end", "q-end-pole");
  // FUTURE (enablesOf = downstreamsOf): eating the bread grabs bake-bread — bake-bread
  // is upstream of eat-bread, so from bake-bread's own card this reads forward, as
  // "what this makes necessary."
  anatomySoc.layP("eat-grab", "eating the bread grabs the baked loaf", "eat-bread", "bake-bread", "q-grounding");
  // PAST (requiresOf = dependsOn, met/pending): buy-flour is already established
  // (met — struck); starter-ready is not (pending — weather, not error).
  // 2026-07-15: q-blocked-by, not q-depends-on — Hallie's ruling ("the language to be
  // the language," q-depends-on too close to a drift-prone English echo). Live canon
  // keeps 2 legacy q-depends-on rows as append-only ink; society.ts's requiresOf reads
  // both spellings. New writers here use q-blocked-by only.
  fact(anatomySoc, "buy-flour", { by: "you" }).set(true); // establish it — this PAST is met
  anatomySoc.layP("dep-flour", "bake-bread depends on buying flour", "bake-bread", "buy-flour", "q-blocked-by");
  anatomySoc.layP("dep-starter", "bake-bread depends on the starter being ready", "bake-bread", "starter-ready", "q-blocked-by");

  const anatomy = readCardAnatomy(anatomySoc, "bake-bread");
  const renderList = (label: string, rows: string[], metFor?: (slug: string) => boolean | undefined): Node => {
    const box = el("div", { class: "anatomy-list" });
    box.appendChild(el("h4", {}, label));
    if (rows.length === 0) {
      box.appendChild(el("p", { class: "empty" }, "(none)"));
    } else {
      const ul = el("ul", {});
      for (const slug of rows) {
        const met = metFor?.(slug);
        const li = el("li", {
          data: { met: met === undefined ? undefined : String(met) },
          class: [met === true ? "met" : met === false ? "pending" : undefined],
          text: met === true ? `✓ ${slug} — met` : met === false ? `○ ${slug} — pending` : slug,
        });
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
    return box;
  };
  const anatomyDemo = el("div", { class: "anatomy-card" });
  anatomyDemo.appendChild(el("h3", {}, `bake-bread (opened)`));
  anatomyDemo.appendChild(renderList("CONTAINS — interior members", anatomy.contains));
  anatomyDemo.appendChild(renderList("FUTURE — what this makes necessary", anatomy.enables));
  anatomyDemo.appendChild(renderList("PAST — what had to come first", anatomy.requires.map((r) => r.slug),
    (slug) => anatomy.requires.find((r) => r.slug === slug)?.met));

  root.appendChild(entry(
    "Card Anatomy — CONTAINS / FUTURE / PAST",
    "The card interior, opened: CONTAINS (this beat's own interior members — containsOf, a reuse of " +
    "intervalOf), FUTURE (what this beat makes necessary — enablesOf, a renamed alias of downstreamsOf), " +
    "and PAST (what has to come first — requiresOf, the q-blocked-by read, each row carrying its own " +
    "met/pending). met renders struck-through; pending renders as weather, never error-red — a thing on the PAST " +
    "you haven't received yet is not a failure, it's a thing still on its way. readCardAnatomy assembles " +
    "all three in one call. SEAM: the actual card's DOM contract (`.eventview-contains`, `data-met`, the " +
    "phantom stack, the toggle) is board.ts's/cblock-skins.css's to render — this entry calls the same " +
    "read live and renders it plainly, it does not reproduce the real card's markup or skin.",
    [anatomyDemo],
    `// the three-compartment read — ONE call:
const anatomy = readCardAnatomy(soc, "bake-bread");
// anatomy.contains: string[]        — CONTAINS (containsOf)
// anatomy.enables:  string[]        — FUTURE   (enablesOf)
// anatomy.requires: RequiresRow[]   — PAST     (requiresOf)
//   each row: { slug, met: boolean }
//   met=true  → render struck-through (received)
//   met=false → render pending/weather (not yet — not an error)
// board.ts's buildCardInterior takes this same read and lays
// it into the real DOM contract (.eventview-contains, data-met,
// data-section-hidden); this glossary entry renders it plainly
// to teach the READ, not to duplicate that markup.`,
  ));
}

// auto-mount when loaded as a module on the glossary page
const rootEl = typeof document !== "undefined" ? document.getElementById("glossary-root") : null;
if (rootEl) mountGlossary(rootEl as HTMLElement);
