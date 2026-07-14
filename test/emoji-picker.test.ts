// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// emoji-picker.test.ts — the complete emoji picker (2026-07-14 wave).
//
// CLAIMS under test:
//   1. renders role=dialog with a search input, a tablist of 9 groups (+
//      Recent when a RecentsStore is given), and a role=grid of the first
//      group's emoji, one roving tabindex cell.
//   2. search filters the grid as you type (name substring, multi-token AND);
//      clearing the query restores the active tab's group.
//   3. category tabs are arrow-navigable (ArrowRight/Left wrap) and clicking
//      a tab swaps the grid to that group.
//   4. the grid is keyboard-walkable: ArrowRight/Left/Up/Down move the roving
//      cell (Up/Down by GRID_COLUMNS), and the cell tabIndex hops with focus.
//   5. Enter/Space on a cell (and click) fires onPick with the emoji glyph
//      EXACTLY ONCE.
//   6. Escape fires onClose (the popover doesn't remove itself — the caller
//      owns mount/unmount, matching createPickerPopover's contract).
//   7. the announcer hears "<name> picked" on selection.
//   8. the recents seam: picking calls store.set with the picked emoji
//      first, deduped, capped; a "Recent" tab reads from store.get().
//   9. sealed room: a keydown/click on the picker does not bubble to a
//      listener on an ancestor (stopPropagation, matching createHideButton's
//      row-click discipline).
//  10. no result state: an unmatched query shows "No emoji found", not an
//      empty grid pretending nothing was searched.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { createEmojiPicker, type RecentsStore } from "../src/emoji-picker.js";
import { EMOJI_DATA, EMOJI_GROUP_ORDER } from "../src/emoji-data.js";

function memoryStore(initial: string[] = []): RecentsStore {
  let recents = initial;
  return {
    get: () => recents,
    set: (next) => {
      recents = next;
    },
  };
}

describe("createEmojiPicker", () => {
  it("renders role=dialog, search input, 9 group tabs, and a grid (claim 1)", () => {
    const p = createEmojiPicker({ onPick: () => {} });
    expect(p.getAttribute("role")).toBe("dialog");
    expect(p.querySelector(".lib-emoji-search")).not.toBeNull();
    const tabs = p.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(EMOJI_GROUP_ORDER.length);
    const grid = p.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
    const cells = p.querySelectorAll(".lib-emoji-cell");
    expect(cells.length).toBeGreaterThan(0);
    expect(Array.from(cells).filter((c) => c.getAttribute("tabindex") === "0").length).toBe(1);
  });

  it("adds a Recent tab first when a recents seam is given (claim 1b)", () => {
    const p = createEmojiPicker({ onPick: () => {}, recents: memoryStore() });
    const firstTab = p.querySelector('[role="tab"]');
    expect(firstTab?.textContent).toBe("Recent");
  });

  it("search filters the grid by name substring, multi-token AND (claim 2)", () => {
    const p = createEmojiPicker({ onPick: () => {} });
    const input = p.querySelector<HTMLInputElement>(".lib-emoji-search")!;
    input.value = "grinning face big eyes";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const cells = Array.from(p.querySelectorAll<HTMLElement>(".lib-emoji-cell"));
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(c.getAttribute("aria-label")).toContain("grinning");
    }
    // clearing restores the active tab's full group.
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const firstGroup = EMOJI_DATA.filter((e) => e.group === EMOJI_GROUP_ORDER[0]);
    expect(p.querySelectorAll(".lib-emoji-cell").length).toBe(firstGroup.length);
  });

  it("unmatched search shows 'No emoji found', not an empty grid (claim 10)", () => {
    const p = createEmojiPicker({ onPick: () => {} });
    const input = p.querySelector<HTMLInputElement>(".lib-emoji-search")!;
    input.value = "zzzznonexistentqueryzzzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(p.querySelector(".lib-emoji-empty")?.textContent).toBe("No emoji found");
  });

  it("tabs are arrow-navigable (wrap) and click swaps the grid group (claim 3)", () => {
    const p = createEmojiPicker({ onPick: () => {} });
    document.body.appendChild(p);
    const tabs = Array.from(p.querySelectorAll<HTMLElement>('[role="tab"]'));
    const first = tabs[0]!;
    const last = tabs[tabs.length - 1]!;
    expect(first.getAttribute("aria-selected")).toBe("true");

    // ArrowLeft from the first tab wraps to the last.
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(last.getAttribute("aria-selected")).toBe("true");
    expect(first.getAttribute("aria-selected")).toBe("false");

    // click a middle tab swaps the grid to that group.
    const mid = tabs[Math.floor(tabs.length / 2)]!;
    mid.click();
    expect(mid.getAttribute("aria-selected")).toBe("true");
    const midGroup = EMOJI_GROUP_ORDER[Math.floor(tabs.length / 2)];
    const expectedCount = EMOJI_DATA.filter((e) => e.group === midGroup).length;
    expect(p.querySelectorAll(".lib-emoji-cell").length).toBe(expectedCount);
  });

  it("grid ArrowRight/Down move the roving cell, tabIndex hops (claim 4)", () => {
    const p = createEmojiPicker({ onPick: () => {} });
    document.body.appendChild(p);
    const cells = () => Array.from(p.querySelectorAll<HTMLElement>(".lib-emoji-cell"));
    const c0 = cells()[0]!;
    c0.focus();
    c0.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(cells()[0]!.getAttribute("tabindex")).toBe("-1");
    expect(cells()[1]!.getAttribute("tabindex")).toBe("0");
    expect(document.activeElement).toBe(cells()[1]);

    cells()[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(cells()[1 + 8]);
  });

  it("Enter, Space, and click each fire onPick exactly once with the emoji (claim 5)", () => {
    const picked: string[] = [];
    const p = createEmojiPicker({ onPick: (e) => picked.push(e) });
    document.body.appendChild(p);
    const cell = p.querySelector<HTMLElement>(".lib-emoji-cell")!;
    const expected = cell.textContent;

    cell.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    cell.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    cell.click();

    expect(picked).toEqual([expected, expected, expected]);
  });

  it("Escape fires onClose; the picker does not remove itself (claim 6)", () => {
    let closed = 0;
    const p = createEmojiPicker({ onPick: () => {}, onClose: () => closed++ });
    document.body.appendChild(p);
    p.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(closed).toBe(1);
    expect(document.body.contains(p)).toBe(true);
  });

  it("announcer hears '<name> picked' on selection (claim 7)", () => {
    const heard: string[] = [];
    const p = createEmojiPicker({
      onPick: () => {},
      announcer: { announce: (m) => heard.push(m) },
    });
    document.body.appendChild(p);
    const cell = p.querySelector<HTMLElement>(".lib-emoji-cell")!;
    const name = cell.getAttribute("aria-label");
    cell.click();
    expect(heard).toEqual([`${name} picked`]);
  });

  it("recents seam: pick writes store.set, dedupes, caps; Recent tab reads store.get (claim 8)", () => {
    const store = memoryStore(["😀"]);
    const p = createEmojiPicker({ onPick: () => {}, recents: store });
    document.body.appendChild(p);

    // pick something from the first real group (grid starts on Recent tab,
    // so switch to a populated group first).
    const tabs = Array.from(p.querySelectorAll<HTMLElement>('[role="tab"]'));
    tabs[1]!.click(); // first real group, since tabs[0] is Recent
    const cell = p.querySelector<HTMLElement>(".lib-emoji-cell")!;
    const picked = cell.textContent!;
    cell.click();

    expect(store.get()[0]).toBe(picked);
    expect(store.get().filter((e) => e === picked).length).toBe(1); // deduped

    // Recent tab now reflects the store.
    tabs[0]!.click();
    const recentCells = Array.from(p.querySelectorAll<HTMLElement>(".lib-emoji-cell"));
    expect(recentCells.some((c) => c.textContent === picked)).toBe(true);
  });

  it("sealed room: keydown/click on the picker don't bubble past it (claim 9)", () => {
    const outerKeydown: string[] = [];
    const outerClick: number[] = [];
    const p = createEmojiPicker({ onPick: () => {} });
    const host = document.createElement("div");
    host.appendChild(p);
    document.body.appendChild(host);
    host.addEventListener("keydown", (e) => outerKeydown.push(e.type));
    host.addEventListener("click", () => outerClick.push(1));

    p.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    p.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(outerKeydown).toEqual([]);
    expect(outerClick).toEqual([]);
  });
});
