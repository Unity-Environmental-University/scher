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
import { cardStory, buttonStory, toggleButtonStory, modalStory, frameStory, reading } from "./stories.js";
import { fact } from "./fact.js";
import { project } from "./projection.js";

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
    [cardStory(soc, { slug: "b-tea", standpoint: "you" })],
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
  const teaCard2 = cardStory(soc, { slug: "b-tea", standpoint: "you" });
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
  const rainCard = cardStory(soc, { slug: "b-rain", standpoint: "you" });
  const starRain = buttonStory(soc, {
    label: "🌧️ react (lay pathos)",
    press: (s) => {
      // TODO(socratic): counting beats by slug prefix is exactly the string-matching on slugs that scher/CLAUDE.md forbids — shouldn't charge be read structurally (q-feel prehensions onto b-rain), and doesn't the doc string below teach every reader the smuggle?
      const n = s.all().filter((b) => b.slug.startsWith("feel-rain-")).length;
      s.layP(`feel-rain-${n}`, "🌧️", "actor-you", "b-rain", "q-feel");
    },
  });
  root.appendChild(entry(
    "Pathos (star) — charge accumulates",
    "Press repeatedly: each press lays a q-feel beat. Pathos is static charge — it accumulates on the beat. " +
    "Same primitive as check=ground, different quality (q-feel instead of q-grounding).",
    [rainCard, starRain],
    `// pathos is the same primitive — a different quality.
// each press lays a fresh q-feel beat → charge accrues.
const starRain = buttonStory(soc, {
  label: "🌧️ react (lay pathos)",
  press: (s) => {
    const n = s.all()
      .filter(b => b.slug.startsWith("feel-rain-")).length;
    s.layP(\`feel-rain-\${n}\`, "🌧️",
           "actor-you", "b-rain", "q-feel");
  },
});`,
  ));

  // TODO(socratic): every CODE string here is a hand-copied twin of the live demo above it — when the lib's API shifts, what keeps the executable half and the quoted half from quietly diverging, and is a glossary that lies about its own code worse than no glossary?
  // ── ENTRY 4: Toggle — built on the Fact PORCELAIN (the positivist wrapper) ──
  // This is the desync-proof version: a Fact gives a get/set(boolean) surface; the
  // toggle never touches a slug, so the one-loop bug is unwriteable.
  // TODO(socratic): I create this Fact and never read, press, or show it — the toggle below re-derives its own handle from raw slugs — so does 'doorGrounded' demonstrate the porcelain or quietly demonstrate that the demo didn't need it?
  const doorGrounded = fact(soc, "b-door", { by: "actor-you" });
  const doorCard = cardStory(soc, { slug: "b-door", standpoint: "you" });
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
      wrap.appendChild(cardStory(s, { slug: "b-tea", standpoint: "you (in modal)" }));
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
    return cardStory(s, { slug: "b-tea" });
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
    [frameStory(soc, { once: "morning-once", end: "morning-end", standpoint: "you" })],
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
}

// auto-mount when loaded as a module on the glossary page
const rootEl = typeof document !== "undefined" ? document.getElementById("glossary-root") : null;
if (rootEl) mountGlossary(rootEl as HTMLElement);
