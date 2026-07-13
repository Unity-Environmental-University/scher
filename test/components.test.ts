// @vitest-environment jsdom
// ─────────────────────────────────────────────────────────────────────────────
// components.test.ts — the graduated muslin components (card-v2 sitting,
// 2026-07-13): state-change-glyph, gcheck, hide-affordance, ported JS→TS.
//
// CLAIMS under test (each maps to a hardened round-2 fix or an a11y contract
// the port must not regress — see src/components.ts file header):
//   gcheck:
//     1. renders role=checkbox, ☐/scripted initial, aria-checked=false.
//     2. click toggles ☑/grounded AND toggles BACK on the second click —
//        the live data-state read (round-2 fix 1: no frozen closure state).
//     3. Space/Enter toggle (keyboard path).
//     4. announcer hears "<label>: done" / "not done".
//     5. setGcheckToggle REPLACES the callback (the slot pattern).
//   state-change-glyph:
//     6. renders role=button with the state's glyph + data-state.
//     7. click opens the picker (role=dialog, 6 options, aria-expanded=true);
//        selecting a state updates glyph + data-state, fires onStateChange,
//        dispatches a bubbling `statechange` CustomEvent, closes the picker.
//     8. Escape closes without change; re-selecting the SAME state is a no-op
//        (no callback, no event).
//     9. announcer hears "<label>: <StateLabel>" on change.
//   hide:
//     10. click fires onHide and shows the "↲ undo" affordance.
//     11. click within the undo window fires onUndo and restores ⊖ (no
//         second onHide from the same click — the guard).
//     12. window expiry restores ⊖ without onUndo.
//     13. setHideCallbacks replaces the slots the handlers actually read
//         (round-2 fix 2: wireHideToEndpoint's pathway is not a no-op).
//   taste fence:
//     14. none of the three factories set state COLORS inline — state is
//         data-/aria-/class only (the sitting addendum's binding condition).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createGcheck,
  setGcheckToggle,
  createStateChangeGlyph,
  STATE_MAP,
  createHideButton,
  setHideCallbacks,
  type BujoState,
  type GcheckState,
  type StateChangeDetail,
} from "../src/components.js";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createGcheck", () => {
  it("renders role=checkbox, scripted/☐ initial, aria-checked=false (claim 1)", () => {
    const g = createGcheck({ slug: "task-a" });
    expect(g.getAttribute("role")).toBe("checkbox");
    expect(g.dataset.state).toBe("scripted");
    expect(g.textContent).toBe("☐");
    expect(g.getAttribute("aria-checked")).toBe("false");
    expect(g.dataset.slug).toBe("task-a");
  });

  it("toggles on click AND toggles BACK on a second click — live data-state read (claim 2)", () => {
    const seen: GcheckState[] = [];
    const g = createGcheck({ slug: "task-a", onToggle: (s) => seen.push(s) });
    document.body.appendChild(g);
    g.click();
    expect(g.dataset.state).toBe("grounded");
    expect(g.textContent).toBe("☑");
    expect(g.getAttribute("aria-checked")).toBe("true");
    g.click(); // the round-1 defect: this used to stick. Must alternate.
    expect(g.dataset.state).toBe("scripted");
    expect(g.textContent).toBe("☐");
    expect(seen).toEqual(["grounded", "scripted"]);
  });

  it("Space and Enter toggle (claim 3)", () => {
    const g = createGcheck({ slug: "task-a" });
    document.body.appendChild(g);
    g.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(g.dataset.state).toBe("grounded");
    g.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(g.dataset.state).toBe("scripted");
  });

  it("announces done / not done (claim 4)", () => {
    const heard: string[] = [];
    const g = createGcheck({
      slug: "task-a",
      ariaLabel: "Toggle task: Fix the terl",
      announcer: { announce: (m) => heard.push(m) },
    });
    g.click();
    g.click();
    expect(heard).toEqual(["Fix the terl: done", "Fix the terl: not done"]);
  });

  it("setGcheckToggle REPLACES the callback — the slot pattern (claim 5)", () => {
    const first: string[] = [];
    const second: string[] = [];
    const g = createGcheck({ slug: "task-a", onToggle: (s) => first.push(s) });
    g.click();
    setGcheckToggle(g, (s) => second.push(s));
    g.click();
    expect(first).toEqual(["grounded"]); // only the pre-replacement click
    expect(second).toEqual(["scripted"]); // the replacement got the next one
  });
});

describe("createStateChangeGlyph", () => {
  it("renders role=button with the state's glyph + data-state (claim 6)", () => {
    const g = createStateChangeGlyph({ state: "migrated", slug: "ev-1" });
    expect(g.getAttribute("role")).toBe("button");
    expect(g.dataset.state).toBe("migrated");
    expect(g.textContent).toBe(STATE_MAP.migrated.glyph);
    expect(g.getAttribute("aria-haspopup")).toBe("dialog");
    expect(g.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens a 6-option picker; selecting updates state, fires callback + statechange, closes (claim 7)", () => {
    const changes: Array<[BujoState, string]> = [];
    const events: StateChangeDetail[] = [];
    const g = createStateChangeGlyph({
      state: "task",
      slug: "ev-1",
      onStateChange: (s, slug) => changes.push([s, slug]),
    });
    document.body.appendChild(g);
    g.addEventListener("statechange", (e) =>
      events.push((e as CustomEvent<StateChangeDetail>).detail),
    );

    g.click();
    const picker = document.querySelector<HTMLElement>(".lib-state-picker");
    expect(picker).not.toBeNull();
    expect(picker!.getAttribute("role")).toBe("dialog");
    expect(g.getAttribute("aria-expanded")).toBe("true");
    const options = picker!.querySelectorAll(".lib-state-option");
    expect(options.length).toBe(6);
    expect(
      picker!.querySelector('[data-state="task"]')!.getAttribute("aria-current"),
    ).toBe("true");

    picker!.querySelector<HTMLElement>('[data-state="done"]')!.click();
    expect(g.dataset.state).toBe("done");
    expect(g.textContent).toBe(STATE_MAP.done.glyph);
    expect(changes).toEqual([["done", "ev-1"]]);
    expect(events).toEqual([{ oldState: "task", newState: "done", slug: "ev-1" }]);
    expect(document.querySelector(".lib-state-picker")).toBeNull(); // closed
    expect(g.getAttribute("aria-expanded")).toBe("false");
  });

  it("Escape closes without change; same-state select is a no-op (claim 8)", () => {
    const changes: BujoState[] = [];
    const g = createStateChangeGlyph({
      state: "task",
      slug: "ev-1",
      onStateChange: (s) => changes.push(s),
    });
    document.body.appendChild(g);

    g.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector(".lib-state-picker")).toBeNull();
    expect(g.dataset.state).toBe("task");

    g.click();
    document
      .querySelector<HTMLElement>('.lib-state-picker [data-state="task"]')!
      .click(); // pick the CURRENT state
    expect(document.querySelector(".lib-state-picker")).toBeNull(); // closes…
    expect(changes).toEqual([]); // …but no change fired
  });

  it("announces the new state's label (claim 9)", () => {
    const heard: string[] = [];
    const g = createStateChangeGlyph({
      state: "task",
      slug: "ev-1",
      ariaLabel: "Change task state: Fix the terl",
      announcer: { announce: (m) => heard.push(m) },
    });
    document.body.appendChild(g);
    g.click();
    document.querySelector<HTMLElement>('.lib-state-picker [data-state="dropped"]')!.click();
    expect(heard).toEqual(["Fix the terl: Dropped"]);
  });
});

describe("createHideButton", () => {
  it("click fires onHide and shows the undo affordance (claim 10)", () => {
    vi.useFakeTimers();
    const hidden: string[] = [];
    const btn = createHideButton({ slug: "ev-2", onHide: (s) => hidden.push(s) });
    document.body.appendChild(btn);
    btn.click();
    expect(hidden).toEqual(["ev-2"]);
    expect(btn.textContent).toBe("↲ undo");
    expect(btn.classList.contains("lib-undo-active")).toBe(true);
  });

  it("click within the window fires onUndo (once) and restores (claim 11)", () => {
    vi.useFakeTimers();
    const hidden: string[] = [];
    const undone: string[] = [];
    const btn = createHideButton({
      slug: "ev-2",
      onHide: (s) => hidden.push(s),
      onUndo: (s) => undone.push(s),
    });
    document.body.appendChild(btn);
    btn.click(); // hide
    btn.click(); // undo, inside the window
    expect(hidden).toEqual(["ev-2"]); // the undo click did NOT re-hide
    expect(undone).toEqual(["ev-2"]);
    expect(btn.textContent).toBe("⊖");
    expect(btn.classList.contains("lib-undo-active")).toBe(false);
  });

  it("window expiry restores without onUndo (claim 12)", () => {
    vi.useFakeTimers();
    const undone: string[] = [];
    const btn = createHideButton({
      slug: "ev-2",
      onUndo: (s) => undone.push(s),
      undoWindowMs: 1000,
    });
    document.body.appendChild(btn);
    btn.click();
    vi.advanceTimersByTime(1001);
    expect(btn.textContent).toBe("⊖");
    expect(btn.classList.contains("lib-undo-active")).toBe(false);
    expect(undone).toEqual([]);
    // and the button is pressable again after expiry
    btn.click();
    expect(btn.classList.contains("lib-undo-active")).toBe(true);
  });

  it("setHideCallbacks replaces the slots the handlers read at fire time (claim 13)", () => {
    vi.useFakeTimers();
    const original: string[] = [];
    const wired: string[] = [];
    const btn = createHideButton({ slug: "ev-2", onHide: (s) => original.push(s) });
    document.body.appendChild(btn);
    setHideCallbacks(btn, { onHide: (s) => wired.push(`hide:${s}`), onUndo: (s) => wired.push(`undo:${s}`) });
    btn.click(); // hide → wired slot, not the original (the round-1 no-op bug)
    btn.click(); // undo → wired slot
    expect(original).toEqual([]);
    expect(wired).toEqual(["hide:ev-2", "undo:ev-2"]);
  });
});

describe("taste fence (sitting addendum)", () => {
  it("no factory prescribes state colors inline — data/aria/class only (claim 14)", () => {
    const g = createGcheck({ slug: "a" });
    const s = createStateChangeGlyph({ slug: "a" });
    const h = createHideButton({ slug: "a" });
    for (const node of [g, s, h]) {
      expect(node.style.color).toBe("");
      expect(node.style.background).toBe("");
      expect(node.style.boxShadow).toBe("");
    }
  });
});
