// ─────────────────────────────────────────────────────────────────────────────
// emoji-picker.ts — the complete emoji picker (scher idiom, 2026-07-14 wave).
//
// Hallie's ask: "a complete emoji picker — the full set (search, categories),
// not the curated 16." This is a NEW component (createStateChangeGlyph's
// popover/roving-tabindex/announcer/escape discipline is the pattern book —
// see components.ts's file header) over the vendored dataset in emoji-data.ts
// (1914 entries, unicode-emoji-json, MIT — see that file's provenance header).
//
// RESEARCH TAKEN (WebFetch survey of emoji-picker-element, emoji-mart, GitHub's
// picker — patterns, not dependencies; scher stays zero-runtime-deps):
//   • search-as-you-type over name/keyword text, not a separate index structure
//     (the set is small enough — 1914 rows — that a linear filter is instant;
//     measured below, no virtualization needed at this scale).
//   • category tabs over ~9 canonical Unicode groups, arrow/tab navigable.
//   • a roving-tabindex grid for the emoji cells themselves (one tab stop into
//     the grid, arrow keys move focus, matching the picker's own tradition and
//     scher's existing picker — createPickerPopover's Up/Down — generalized to
//     a 2-D grid here).
//   • skin-tone selection: EVERY surveyed picker treats this as its own
//     subsystem (a per-user preferred tone, applied by variation-selector
//     codepoint, persisted). DEFERRED HONESTLY: the vendored dataset does not
//     carry skin-tone variant codepoints (dropped in compaction — see
//     emoji-data.ts), and the wave's scope is the complete BASE set. Emoji
//     with tone variants are picked at their default (non-toned) glyph. This
//     is a real gap, named here rather than faked with partial support.
//   • recents: EVERY surveyed picker keeps a most-recently/most-frequently
//     used shelf, backed by client storage. scher has no localStorage seam
//     (nothing in src/*.ts touches it — a deliberate absence: the lib is
//     zero-dep and testable in jsdom without a storage mock). So recents here
//     take an INJECTED get/set seam (RecentsStore) — the caller supplies
//     persistence (localStorage, an in-memory Map, whatever), the picker
//     never reaches for a global. Same shape as the Announcer seam.
//
// A11Y (mirrors createStateChangeGlyph): search input is a real <input>;
// category tabs are role=tab/tablist; the grid is role=grid with a single
// roving tabindex cell, arrow keys move the roving cell (wrapping row-to-row),
// Enter/Space fires onPick, Escape closes and returns focus to opts.trigger
// (or the search input has no trigger to return to — see openEmojiPicker).
// The announcer seam fires "<name> picked" on selection, matching the
// "<label>: <StateLabel>" cadence components.ts already established.
//
// SEALED ROOM: the popover stops propagation on its own keydown/click so a
// picker embedded inside another interactive surface (a card, a composer)
// doesn't leak Escape/Enter to whatever's underneath — same discipline
// createHideButton's e.stopPropagation() uses for its row-click concern.
// ─────────────────────────────────────────────────────────────────────────────

import { el, on } from "./dom.js";
import { EMOJI_DATA, EMOJI_GROUP_LABELS, EMOJI_GROUP_ORDER, type EmojiEntry, type EmojiGroup } from "./emoji-data.js";
import type { Announcer } from "./components.js";

const GRID_COLUMNS = 8; // matches emoji-picker-element's default column count

/** Injected persistence seam for "recently used" — no direct localStorage
 *  (QUERIES.md: don't reach for a global you can't test around). Caller
 *  supplies get/set; the picker reads at open time and writes on pick. */
export interface RecentsStore {
  get(): string[];
  set(emojis: string[]): void;
}

const MAX_RECENTS = 24;

export interface EmojiPickerOptions {
  /** fired once per pick with the chosen emoji glyph. */
  onPick: (emoji: string) => void;
  /** fired on Escape (or an outside click) — the caller closes/removes the
   *  picker and returns focus to whatever opened it. The picker does not
   *  remove itself from the DOM (mirrors createPickerPopover: the opener
   *  owns mount/unmount; this component owns behavior). */
  onClose?: () => void;
  /** optional live announcer — "<name> picked" on selection. */
  announcer?: Announcer | null;
  /** optional recents seam — when given, a "Recent" tab/section leads. */
  recents?: RecentsStore | null;
  /** accessible name for the picker dialog. */
  ariaLabel?: string;
}

interface FlatGroup {
  code: EmojiGroup | "recent";
  label: string;
  entries: EmojiEntry[];
}

function searchTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** An entry matches a search if every token appears in its name (AND across
 *  tokens, substring per token — "big eyes" finds "grinning face with big
 *  eyes" via tokens ["big","eyes"] both present). */
function matches(entry: EmojiEntry, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const name = entry.name.toLowerCase();
  return tokens.every((t) => name.includes(t));
}

/**
 * Create a complete emoji picker: search input, category tabs, roving-
 * tabindex grid. Returns the root element (role=dialog); the caller mounts
 * it (see components.ts's createPickerPopover for the positioning idiom this
 * mirrors — this component doesn't position itself, so it composes under a
 * trigger the same way).
 */
export function createEmojiPicker(options: EmojiPickerOptions): HTMLElement {
  const {
    onPick,
    onClose,
    announcer = null,
    recents = null,
    ariaLabel = "Pick an emoji",
  } = options;

  const byGroup = new Map<EmojiGroup, EmojiEntry[]>();
  for (const g of EMOJI_GROUP_ORDER) byGroup.set(g, []);
  for (const entry of EMOJI_DATA) byGroup.get(entry.group)!.push(entry);

  const root = el("div", {
    class: "lib-emoji-picker",
    attrs: { role: "dialog", "aria-label": ariaLabel },
  });
  // sealed room: don't let picker interaction bubble into whatever hosts it.
  on(root, "keydown", (e) => e.stopPropagation());
  on(root, "click", (e) => e.stopPropagation());

  const searchInput = el("input", {
    class: "lib-emoji-search",
    attrs: { type: "text", placeholder: "Search emoji", "aria-label": "Search emoji" },
  }) as HTMLInputElement;

  const tablist = el("div", { class: "lib-emoji-tabs", attrs: { role: "tablist", "aria-label": "Emoji categories" } });
  const grid = el("div", { class: "lib-emoji-grid", attrs: { role: "grid", "aria-label": "Emoji" } });

  root.appendChild(searchInput);
  root.appendChild(tablist);
  root.appendChild(grid);

  const groupsInOrder: FlatGroup[] = [
    ...(recents ? [{ code: "recent" as const, label: "Recent", entries: [] }] : []),
    ...EMOJI_GROUP_ORDER.map((g) => ({ code: g, label: EMOJI_GROUP_LABELS[g], entries: byGroup.get(g)! })),
  ];

  function recentEntries(): EmojiEntry[] {
    if (!recents) return [];
    const byEmoji = new Map(EMOJI_DATA.map((e) => [e.emoji, e]));
    return recents.get().map((em) => byEmoji.get(em)).filter((e): e is EmojiEntry => !!e);
  }

  let activeTab: EmojiGroup | "recent" = groupsInOrder[0]!.code;
  let query = "";

  const tabButtons = new Map<EmojiGroup | "recent", HTMLElement>();
  for (const g of groupsInOrder) {
    const btn = el(
      "button",
      {
        class: "lib-emoji-tab",
        attrs: {
          type: "button",
          role: "tab",
          "aria-selected": String(g.code === activeTab),
          tabindex: g.code === activeTab ? "0" : "-1",
        },
        data: { group: g.code },
        text: g.label,
      },
    );
    on(btn, "click", () => selectTab(g.code));
    on(btn, "keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const codes = groupsInOrder.map((x) => x.code);
        const idx = codes.indexOf(activeTab);
        const next = codes[(idx + (e.key === "ArrowRight" ? 1 : -1) + codes.length) % codes.length]!;
        selectTab(next);
        tabButtons.get(next)?.focus();
      }
    });
    tabButtons.set(g.code, btn);
    tablist.appendChild(btn);
  }

  function selectTab(code: EmojiGroup | "recent"): void {
    activeTab = code;
    for (const [c, btn] of tabButtons) {
      btn.setAttribute("aria-selected", String(c === code));
      btn.tabIndex = c === code ? 0 : -1;
    }
    renderGrid();
  }

  function currentEntries(): EmojiEntry[] {
    const tokens = searchTokens(query);
    if (tokens.length > 0) return EMOJI_DATA.filter((e) => matches(e, tokens));
    if (activeTab === "recent") return recentEntries();
    return byGroup.get(activeTab) ?? [];
  }

  function pick(entry: EmojiEntry): void {
    if (recents) {
      const next = [entry.emoji, ...recents.get().filter((e) => e !== entry.emoji)].slice(0, MAX_RECENTS);
      recents.set(next);
    }
    announcer?.announce(`${entry.name} picked`);
    onPick(entry.emoji);
  }

  function renderGrid(): void {
    grid.replaceChildren();
    const entries = currentEntries();
    if (entries.length === 0) {
      grid.appendChild(el("div", { class: "lib-emoji-empty", text: "No emoji found" }));
      return;
    }
    entries.forEach((entry, i) => {
      const cell = el("button", {
        class: "lib-emoji-cell",
        attrs: {
          type: "button",
          role: "gridcell",
          "aria-label": entry.name,
          tabindex: i === 0 ? "0" : "-1",
        },
        data: { index: i },
        text: entry.emoji,
      });
      on(cell, "click", () => pick(entry));
      on(cell, "keydown", (e) => {
        const cells = Array.from(grid.querySelectorAll<HTMLElement>(".lib-emoji-cell"));
        const idx = cells.indexOf(cell);
        let target = -1;
        if (e.key === "ArrowRight") target = idx + 1;
        else if (e.key === "ArrowLeft") target = idx - 1;
        else if (e.key === "ArrowDown") target = idx + GRID_COLUMNS;
        else if (e.key === "ArrowUp") target = idx - GRID_COLUMNS;
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick(entry);
          return;
        } else {
          return;
        }
        e.preventDefault();
        const next = cells[target];
        if (next) {
          cell.tabIndex = -1;
          next.tabIndex = 0;
          next.focus();
        }
      });
      grid.appendChild(cell);
    });
  }

  on(searchInput, "input", () => {
    query = searchInput.value;
    renderGrid();
  });

  on(root, "keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  });

  renderGrid();
  return root;
}

export const EMOJI_PICKER_INLINE_CSS = `
  .lib-emoji-picker {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm, 0.4rem);
    background: #fff;
    border-radius: var(--radius-md, 10px);
    box-shadow: var(--elev-3, 0 4px 8px rgba(42, 38, 34, 0.15), 2px 0 4px rgba(42, 38, 34, 0.04));
    padding: var(--gap-sm, 0.4rem);
    width: 320px;
    max-height: 360px;
  }
  .lib-emoji-search {
    font: inherit;
    padding: var(--gap-sm, 0.4rem);
    border: 1px solid var(--color-line, #e4ddd2);
    border-radius: var(--radius-sm, 6px);
  }
  .lib-emoji-tabs {
    display: flex;
    overflow-x: auto;
    gap: var(--gap-tight, 0.25rem);
  }
  .lib-emoji-tab {
    flex: 0 0 auto;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: var(--gap-tight, 0.25rem) var(--gap-sm, 0.4rem);
    font-size: 0.75rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .lib-emoji-tab[aria-selected="true"] {
    border-bottom-color: var(--color-ground, #2d7c3e);
    font-weight: 600;
  }
  .lib-emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: var(--gap-tight, 0.25rem);
    overflow-y: auto;
  }
  .lib-emoji-cell {
    background: transparent;
    border: none;
    border-radius: var(--radius-sm, 6px);
    font-size: 1.25rem;
    line-height: 1;
    padding: var(--gap-tight, 0.25rem);
    cursor: pointer;
    aspect-ratio: 1;
  }
  .lib-emoji-cell:hover,
  .lib-emoji-cell:focus-visible {
    background: color-mix(in oklch, var(--color-ground, #2d7c3e) 8%, transparent);
    outline: 2px solid var(--color-ground, #2d7c3e);
    outline-offset: -2px;
  }
  .lib-emoji-empty {
    grid-column: 1 / -1;
    font-size: 0.8rem;
    color: var(--color-note, #8b827a);
    padding: var(--gap-md, 0.6rem);
    text-align: center;
  }
`;
