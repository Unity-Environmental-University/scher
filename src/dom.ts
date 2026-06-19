// ─────────────────────────────────────────────────────────────────────────────
// dom.ts — the create-element idiom, factored.
//
// Every view in web/src/ hand-rolls the same three things:
//   1. an HTML escaper (`esc` in feed.ts, `escapeHtml` in fit.ts/card.ts — the SAME
//      function copied N times). DRY: one `esc`, here.
//   2. `document.createElement(...)` + `.className =` + `.textContent =` +
//      `.appendChild(...)`, spelled out longhand each time (see card.ts renderCard).
//      DRY: one typed `el()` builder.
//   3. event wiring that re-runs every time innerHTML is rebuilt (feed.ts re-queries
//      `.post` / `.subbeat` and re-binds after every mountFeed). DRY: `on()` + the
//      projection layer (projection.ts) owns the re-wire.
//
// This file is pure DOM authoring — no reactivity. projection.ts composes these with
// Cell to make "a view re-reads when state re-observes." Raw DOM, no framework, no deps.
// ─────────────────────────────────────────────────────────────────────────────

/** Escape text for safe interpolation into innerHTML. The one true `esc` — the same
 *  function feed.ts/fit.ts/card.ts each carried a private copy of. Handles the three
 *  characters that break out of element-content context. Prefer el()/textContent over
 *  innerHTML where you can; use this only when you must build an HTML string. */
export function esc(s: unknown): string {
  return String(s ?? "").replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string,
  );
}

/** Escape for an attribute VALUE (adds the quote chars). Use inside `attr="…"`. */
export function escAttr(s: unknown): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** What el() accepts as a child: a node, a text string, or null/false (skipped — so
 *  `cond && child` reads cleanly). Nested arrays are flattened. */
export type Child = Node | string | number | null | undefined | false | Child[];

/** The options bag for el(). Everything optional; all of it the stuff a view sets by
 *  hand today. `class`/`text`/`html` are the common three; `attrs`/`data`/`style` cover
 *  the rest; `on` wires events inline (typed by event name). */
export interface ElOptions {
  /** className (string) or a list of class tokens (falsy tokens dropped). */
  class?: string | Array<string | false | null | undefined>;
  /** textContent — set safely (no HTML parsing). Mutually exclusive with html/children. */
  text?: string | number;
  /** innerHTML — the escape hatch for a built string. You own the escaping (use esc()). */
  html?: string;
  /** plain attributes. `false`/`null`/`undefined` values are skipped (not rendered). */
  attrs?: Record<string, string | number | boolean | null | undefined>;
  /** data-* attributes (the key is the suffix: `{ slug }` → `data-slug`). */
  data?: Record<string, string | number | null | undefined>;
  /** inline style properties (camelCase keys, as the CSSStyleDeclaration wants). */
  style?: Partial<CSSStyleDeclaration>;
  /** event listeners, typed by event name. `{ click: e => … }`. */
  on?: { [K in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[K]) => void };
}

function appendChild(parent: Node, child: Child): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    for (const c of child) appendChild(parent, c);
    return;
  }
  if (typeof child === "string" || typeof child === "number") {
    parent.appendChild(document.createTextNode(String(child)));
    return;
  }
  parent.appendChild(child);
}

/** Build a typed element. The one create-element builder the whole lib (and every
 *  ported view) uses instead of longhand createElement/className/appendChild.
 *
 *      el("article", { class: ["post", isWish && "wish"], data: { slug },
 *                      on: { click: () => open(slug) } },
 *        el("h2", { class: "q", text: title }),
 *        el("div", { class: "meta", text: status }))
 *
 *  Children are variadic, flattened, and null/false-skipped so `cond && child` works. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: ElOptions = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (opts.class !== undefined) {
    node.className = Array.isArray(opts.class)
      ? opts.class.filter(Boolean).join(" ")
      : opts.class;
  }
  if (opts.text !== undefined) node.textContent = String(opts.text);
  if (opts.html !== undefined) node.innerHTML = opts.html;

  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      if (v === null || v === undefined || v === false) continue;
      node.setAttribute(k, v === true ? "" : String(v));
    }
  }
  if (opts.data) {
    for (const [k, v] of Object.entries(opts.data)) {
      if (v === null || v === undefined) continue;
      node.dataset[k] = String(v);
    }
  }
  if (opts.style) Object.assign(node.style, opts.style);
  if (opts.on) {
    for (const [name, handler] of Object.entries(opts.on)) {
      node.addEventListener(name, handler as EventListener);
    }
  }

  for (const child of children) appendChild(node, child);
  return node;
}

/** Wire an event, returning an unsubscribe. The companion to el()'s inline `on`, for
 *  wiring after the fact (e.g. onto a node fished out of an innerHTML string). Returns
 *  the off-handle so a projection can tear it down on re-observe (no leak). */
export function on<K extends keyof HTMLElementEventMap>(
  node: EventTarget,
  type: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  node.addEventListener(type, handler as EventListener, options);
  return () => node.removeEventListener(type, handler as EventListener, options);
}

/** Replace a node's content with new children in one step (clears then appends).
 *  The "re-paint this slot" primitive projections use. */
export function fill(parent: Node, ...children: Child[]): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  for (const child of children) appendChild(parent, child);
}

/** Parse a trusted HTML string into its single root element. The bridge for ported
 *  views that still build a card as an HTML string (feed.ts's postHTML): build the
 *  string, fromHTML() it, then wire events onto the real node. You own the escaping. */
export function fromHTML(html: string): HTMLElement {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  const node = tpl.content.firstElementChild;
  if (!(node instanceof HTMLElement)) {
    throw new Error("fromHTML: expected a single root element");
  }
  return node;
}
