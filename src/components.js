// ─────────────────────────────────────────────────────────────────────────────
// components.ts — the graduated muslin primitives (card-v2 sitting, 2026-07-13).
//
// Three hardened components ported from
// from-ithaca-muslins/muslins/fleet-bj-card-round1/lib/ (raw JS → TS on el()):
//
//   • createStateChangeGlyph — the BuJo state-change control (6-state picker,
//     keyboard nav, announcements). The left glyph on a row IS the control.
//   • createGcheck — the pressable checkbox write-door (☑/☐, live data-state,
//     a11y announcer hook). Plus createGcheckRow and wireGcheckToEndpoint.
//   • createHideButton — reversible hide matching q-hides semantics (undo
//     window, replaceable callback slots). Plus wireHideToEndpoint.
//
// One file, not three: these are one family (the muslin lib graduating), the
// sitting's ruling was "sensible names or one components.ts if that's truer" —
// truer, because they share the Announcer seam and the press-animation idiom,
// and because stories.ts must NOT be reorganized this pass (adopted condition).
//
// THE HARDENED FIXES PRESERVED (each was a real round-2 defect fix; do not
// regress them):
//   1. gcheck reads its CURRENT state from the live data-state attribute at
//      click time — never the closed-over creation param (which froze after
//      one toggle in round 1).
//   2. hide's onHide/onUndo live in REPLACEABLE SLOTS the click handler reads
//      at fire time, so wireHideToEndpoint actually takes effect (round 1
//      wrote to properties the handler never read — a silent no-op).
//      The port carries the slots in a WeakMap keyed by the button (typed,
//      not expando properties on HTMLElement).
//   3. state-change-glyph is a PICKER (all 6 states shown), with Enter/Space
//      open, ArrowUp/Down navigation, Enter select, Escape close, focus
//      return, and announcer messages on change.
//   (The JS gcheck also had wireGcheckToEndpoint assign `el.onclick` WHILE the
//   factory's addEventListener handler stayed live — a double-fire. The port
//   gives gcheck the same slot pattern hide already had, so wiring REPLACES
//   the toggle behavior instead of stacking on it. Fix, not drift.)
//
// TASTE FENCE (sitting addendum, binding): these APIs expose state as
// data-state / aria attributes and class names ONLY — no imperative
// color-by-state inline styling. The JS originals Object.assign'd ground/lure/
// error colors onto el.style; that prescription is exactly what the addendum
// forbids scher to bake in ("met/pending renders as weather, never error-red"
// is the css light's call). The original inline-CSS strings are still exported
// (GCHECK_INLINE_CSS etc.) as OPT-IN defaults a demo may inject; a real page
// (cblock-skins.css) styles the hooks itself and never loads them.
// ─────────────────────────────────────────────────────────────────────────────
import { el, on } from "./dom.js";
/** Brief press animation: scale down, then back up. (The material model:
 *  pressing deforms the element slightly.) Shared by glyph + gcheck, as in
 *  the muslin originals. */
function pressAnimation(node) {
    const original = node.style.transform || "";
    node.style.transition = "transform 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    node.style.transform = "scale(0.92)";
    setTimeout(() => {
        node.style.transform = original;
    }, 80);
}
/** Exported so a caller (board.ts's kind mapping, a legend) can read the
 *  vocabulary instead of re-declaring it. Richer backend states (resolved/
 *  received/tension) stay future expansion, as in the original. */
export const STATE_MAP = {
    task: { glyph: "•", label: "Task", description: "Open task", order: 0 },
    done: { glyph: "X", label: "Done", description: "Task completed", order: 1 },
    migrated: { glyph: ">", label: "Migrated", description: "Carried forward", order: 2 },
    scheduled: { glyph: "<", label: "Scheduled", description: "For a future day", order: 3 },
    dropped: { glyph: "✗", label: "Dropped", description: "No longer relevant", order: 4 },
    note: { glyph: "—", label: "Note", description: "Reference info", order: 5 },
};
const isBujoState = (s) => s in STATE_MAP;
/**
 * Create a state-change glyph control: a pressable glyph (role=button) that
 * opens a popover picker of all six states. Arrow keys navigate, Enter
 * selects, Escape closes, focus returns to the glyph. State is exposed as
 * `data-state` (live) — styling by state is the page's job.
 */
export function createStateChangeGlyph(options = {}) {
    const { state = "task", slug = "", ariaLabel = `Change task state: ${slug}`, onStateChange, announcer = null, } = options;
    const node = el("div", {
        class: "lib-state-glyph",
        attrs: {
            role: "button",
            tabindex: "0",
            "aria-label": ariaLabel,
            "aria-haspopup": "dialog",
            "aria-expanded": "false",
        },
        data: { slug, state },
        text: STATE_MAP[state].glyph,
    });
    let pickerEl = null;
    let offEscape = null;
    const closePicker = () => {
        if (!pickerEl)
            return;
        pickerEl.remove();
        pickerEl = null;
        offEscape?.();
        offEscape = null;
        node.setAttribute("aria-expanded", "false");
        node.focus(); // return focus to the glyph button
    };
    const select = (newState) => {
        const oldStateRaw = node.dataset.state ?? "task";
        const oldState = isBujoState(oldStateRaw) ? oldStateRaw : "task";
        closePicker();
        if (oldState === newState)
            return; // no change
        node.dataset.state = newState;
        node.textContent = STATE_MAP[newState].glyph;
        pressAnimation(node);
        if (announcer) {
            const cleanLabel = ariaLabel.replace(/^Change task state:\s*/i, "");
            announcer.announce(`${cleanLabel}: ${STATE_MAP[newState].label}`);
        }
        onStateChange?.(newState, slug);
        node.dispatchEvent(new CustomEvent("statechange", {
            detail: { oldState, newState, slug },
            bubbles: true,
            composed: true,
        }));
    };
    const openPicker = () => {
        if (pickerEl)
            return; // already open
        const currentRaw = node.dataset.state ?? "task";
        const current = isBujoState(currentRaw) ? currentRaw : "task";
        pickerEl = createPickerPopover(node, current, select);
        node.setAttribute("aria-expanded", "true");
        document.body.appendChild(pickerEl);
        (pickerEl.querySelector(`[data-state="${current}"]`))?.focus();
        offEscape = on(document, "keydown", (e) => {
            if (e.key === "Escape")
                closePicker();
        });
    };
    const toggle = () => {
        if (pickerEl)
            closePicker();
        else
            openPicker();
    };
    on(node, "click", toggle);
    on(node, "keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
        }
    });
    return node;
}
/** The popover picker: role=dialog listing every state; click or Enter
 *  selects, ArrowUp/Down move between options. */
function createPickerPopover(triggerEl, currentState, onSelect) {
    const rect = triggerEl.getBoundingClientRect();
    const popover = el("div", {
        class: "lib-state-picker",
        attrs: { role: "dialog", "aria-label": "Choose task state" },
        style: {
            position: "fixed",
            top: `${rect.bottom + 8}px`,
            left: `${rect.left}px`,
            zIndex: "10000",
        },
    });
    const entries = Object.entries(STATE_MAP)
        .sort((a, b) => a[1].order - b[1].order);
    for (const [key, info] of entries) {
        const optionBtn = el("button", {
            class: "lib-state-option",
            attrs: {
                type: "button",
                ...(key === currentState ? { "aria-current": "true" } : {}),
            },
            data: { state: key },
            on: {
                click: () => onSelect(key),
                keydown: (e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        const buttons = Array.from(popover.querySelectorAll("[data-state]"));
                        const index = buttons.indexOf(optionBtn);
                        buttons[e.key === "ArrowDown" ? index + 1 : index - 1]?.focus();
                    }
                    else if (e.key === "Enter") {
                        e.preventDefault();
                        onSelect(key);
                    }
                },
            },
        }, el("span", { class: "lib-state-option-glyph", text: info.glyph }), el("span", { class: "lib-state-option-label", text: info.label }), el("span", { class: "lib-state-option-desc", text: info.description }));
        popover.appendChild(optionBtn);
    }
    return popover;
}
// the replaceable toggle slots (typed home for what the JS kept as expandos).
const gcheckToggleSlots = new WeakMap();
/** Replace a gcheck's toggle callback (the slot wireGcheckToEndpoint uses). */
export function setGcheckToggle(gcheckEl, onToggle) {
    gcheckToggleSlots.set(gcheckEl, onToggle);
}
/** Flip a gcheck's visual + ARIA state and fire its slot callback (if any). */
function updateGcheckState(node, newState, slug, fireSlot) {
    node.dataset.state = newState;
    node.setAttribute("aria-checked", String(newState === "grounded"));
    node.textContent = newState === "grounded" ? "☑" : "☐";
    pressAnimation(node);
    if (fireSlot)
        gcheckToggleSlots.get(node)?.(newState, slug);
}
/**
 * Create a gcheck checkbox: role=checkbox, ☑=grounded / ☐=scripted (the REAL
 * .gcheck glyphs — NOT ⊙/◌, which are the day-boundary pole-marks; that
 * conflation was a round-1 defect, kept fixed). Click and Space/Enter toggle.
 * HARDENED (fix 1): current state is read from the live data-state attribute
 * at click time, never the closed-over creation param.
 */
export function createGcheck(options) {
    const { slug, state = "scripted", onToggle, ariaLabel = `Toggle task: ${slug}`, announcer = null, } = options;
    const node = el("div", {
        class: "lib-gcheck",
        attrs: {
            role: "checkbox",
            tabindex: "0",
            "aria-checked": String(state === "grounded"),
            "aria-label": ariaLabel,
        },
        data: { slug, state },
        text: state === "grounded" ? "☑" : "☐",
    });
    gcheckToggleSlots.set(node, onToggle);
    on(node, "click", () => {
        // fix 1: LIVE read — the attribute, not the creation-time param.
        const currentState = node.dataset.state === "grounded" ? "grounded" : "scripted";
        const newState = currentState === "grounded" ? "scripted" : "grounded";
        updateGcheckState(node, newState, slug, true);
        if (announcer) {
            announcer.announce(`${ariaLabel.replace(/^Toggle task:\s*/i, "")}: ${newState === "grounded" ? "done" : "not done"}`);
        }
    });
    on(node, "keydown", (e) => {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            node.click();
        }
    });
    return node;
}
/** A gcheck inside a labelled row container (structural: flex row + status
 *  span; the status span carries class lib-gcheck-status, no colors here). */
export function createGcheckRow(options) {
    const row = el("div", { class: "lib-gcheck-row" }, createGcheck(options));
    if (options.statusText) {
        row.appendChild(el("span", { class: "lib-gcheck-status", text: options.statusText }));
    }
    return row;
}
/**
 * Wire a gcheck to a server endpoint (the write-door pattern): the toggle slot
 * is REPLACED with an optimistic-update + POST + revert-on-failure handler.
 * (Fix over the JS original, which assigned el.onclick while the factory's
 * addEventListener handler stayed live — a double-fire; see file header.)
 */
export function wireGcheckToEndpoint(gcheckEl, endpoint, options = {}) {
    const { onSuccess = () => { }, onError = (err) => console.error("gcheck POST failed:", err), headers = {}, } = options;
    setGcheckToggle(gcheckEl, (newState, slug) => {
        // the visual flip already happened optimistically in the click handler.
        void (async () => {
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...headers },
                    body: JSON.stringify({ slug, state: newState }),
                });
                if (!response.ok)
                    throw new Error(`POST ${endpoint} returned ${response.status}`);
                onSuccess(await response.json());
            }
            catch (err) {
                // revert on failure (without re-firing the slot — no POST loop).
                const revertState = newState === "grounded" ? "scripted" : "grounded";
                updateGcheckState(gcheckEl, revertState, slug, false);
                onError(err);
            }
        })();
    });
}
// fix 2's slots, typed: the click handler reads THESE at fire time, so
// wireHideToEndpoint's replacement actually takes effect.
const hideSlots = new WeakMap();
/** Replace a hide button's callbacks (the slots the handlers actually read). */
export function setHideCallbacks(btn, slots) {
    hideSlots.set(btn, { ...hideSlots.get(btn), ...slots });
}
/**
 * Create a hide button (⊖). Press: fires the onHide slot, announces, and
 * shows an "↲ undo" affordance for undoWindowMs; pressing again within the
 * window fires the onUndo slot and restores. Not a client-side delete — the
 * caller's onHide/onUndo lay/negate the q-hides edge.
 * State hooks: class lib-hide-btn, lib-undo-active while the window is open.
 */
export function createHideButton(options) {
    const { slug, onHide, onUndo, ariaLabel = `Hide event: ${slug}`, undoWindowMs = 3000, announcer = null, } = options;
    const btn = el("button", {
        class: "lib-hide-btn",
        attrs: { "aria-label": ariaLabel, type: "button" },
        data: { slug },
        text: "⊖",
    });
    hideSlots.set(btn, { onHide, onUndo });
    on(btn, "click", (e) => {
        e.stopPropagation(); // don't bubble to row expand
        if (btn.classList.contains("lib-undo-active"))
            return; // undo handler owns this click
        hideSlots.get(btn)?.onHide?.(slug);
        if (announcer) {
            announcer.announce(`${ariaLabel.replace(/^Hide event:\s*/i, "")}: hidden. Undo available.`);
        }
        showUndoAffordance(btn, slug, undoWindowMs, announcer, ariaLabel);
    });
    return btn;
}
/** The undo window: the button becomes "↲ undo" for undoWindowMs; a click in
 *  that window fires the onUndo slot; otherwise it restores itself. */
function showUndoAffordance(btn, slug, undoWindowMs, announcer, ariaLabel) {
    const origText = btn.textContent ?? "⊖";
    const origAriaLabel = btn.getAttribute("aria-label") ?? ariaLabel;
    btn.textContent = "↲ undo";
    btn.setAttribute("aria-label", `Undo hide for event: ${slug}`);
    btn.classList.add("lib-undo-active");
    let undoClicked = false;
    const restore = () => {
        btn.textContent = origText;
        btn.setAttribute("aria-label", origAriaLabel);
        btn.classList.remove("lib-undo-active");
    };
    const offUndo = on(btn, "click", (e) => {
        e.stopPropagation();
        undoClicked = true;
        hideSlots.get(btn)?.onUndo?.(slug);
        if (announcer) {
            announcer.announce(`${(ariaLabel || slug).replace(/^Hide event:\s*/i, "")}: restored.`);
        }
        restore();
    }, { once: true });
    const timer = setTimeout(() => {
        if (!undoClicked) {
            restore();
            offUndo();
        }
    }, undoWindowMs);
    // if the button leaves the DOM, don't leave the timer running (the JS
    // original monkey-patched .remove(); same intent, kept).
    const origRemove = btn.remove.bind(btn);
    btn.remove = () => {
        clearTimeout(timer);
        origRemove();
    };
}
/**
 * Wire a hide button to server endpoints: replaces the onHide/onUndo SLOTS
 * (fix 2 — the handlers read the slots at fire time, so this takes effect)
 * with POSTing versions that lay / negate the q-hides edge server-side.
 */
export function wireHideToEndpoint(hideBtn, hideEndpoint, undoEndpoint, options = {}) {
    const { onSuccess = () => { }, onError = (err) => console.error("hide POST failed:", err), headers = {}, } = options;
    const post = (endpoint) => (s) => {
        void (async () => {
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...headers },
                    body: JSON.stringify({ slug: s }),
                });
                if (!response.ok)
                    throw new Error(`POST ${endpoint} returned ${response.status}`);
                onSuccess(await response.json());
            }
            catch (err) {
                onError(err);
            }
        })();
    };
    setHideCallbacks(hideBtn, {
        onHide: post(hideEndpoint),
        onUndo: post(undoEndpoint),
    });
}
// ══════════════════════════════════════════════════════════════════════════
// OPT-IN default CSS (the muslins' hardened look). NOT applied by the
// components — a demo may inject these; a real page styles the hooks itself
// (data-state, aria-checked, .lib-undo-active) in its own language. Ported
// verbatim from the JS originals' exported constants.
// ══════════════════════════════════════════════════════════════════════════
export const STATE_GLYPH_INLINE_CSS = `
  .lib-state-glyph {
    min-width: var(--touch-min, 44px);
    min-height: var(--touch-min, 44px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm, 6px);
    background: #fff;
    cursor: pointer;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1;
    border: none;
    padding: 0;
    margin: 0;
    transition: box-shadow var(--timing-interaction, 0.12s) var(--ease-out, cubic-bezier(0.25, 0.46, 0.45, 0.94));
  }
  .lib-state-glyph[data-state="task"],
  .lib-state-glyph[data-state="scheduled"] {
    color: var(--color-lure, #f0ad4e);
    box-shadow: var(--elev-1, 0 1px 2px rgba(42, 38, 34, 0.08), 1px 0 2px rgba(42, 38, 34, 0.03));
  }
  .lib-state-glyph[data-state="done"],
  .lib-state-glyph[data-state="migrated"],
  .lib-state-glyph[data-state="note"] {
    color: var(--color-ground, #2d7c3e);
    box-shadow: var(--recess-soft, inset 0 1px 2px rgba(42, 38, 34, 0.06));
    background: color-mix(in oklch, var(--color-ground, #2d7c3e) 4%, #fff);
  }
  .lib-state-glyph[data-state="dropped"] {
    color: var(--color-error, #b5603a);
    box-shadow: var(--elev-1, 0 1px 2px rgba(42, 38, 34, 0.08), 1px 0 2px rgba(42, 38, 34, 0.03));
  }
  .lib-state-glyph:focus-visible {
    outline: 2px solid var(--color-ground, #2d7c3e);
    outline-offset: 2px;
  }
  .lib-state-picker {
    background: #fff;
    border-radius: var(--radius-md, 10px);
    box-shadow: var(--elev-3, 0 4px 8px rgba(42, 38, 34, 0.15), 2px 0 4px rgba(42, 38, 34, 0.04));
    padding: var(--gap-sm, 0.4rem);
    display: flex;
    flex-direction: column;
    gap: var(--gap-tight, 0.25rem);
    min-width: 160px;
    max-width: 200px;
  }
  .lib-state-option {
    background: transparent;
    border: 1px solid color-mix(in oklch, var(--color-line, #e4ddd2) 60%, transparent);
    border-radius: var(--radius-sm, 6px);
    padding: var(--gap-md, 0.6rem);
    text-align: left;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: var(--gap-tight, 0.25rem);
    font-family: inherit;
    font-size: 0.875rem;
  }
  .lib-state-option[aria-current="true"] {
    border: 1px solid var(--color-ground, #2d7c3e);
    background: color-mix(in oklch, var(--color-ground, #2d7c3e) 4%, #fff);
    font-weight: 600;
  }
  .lib-state-option-glyph { font-size: 1.25rem; font-weight: 700; line-height: 1; }
  .lib-state-option-label { font-weight: 600; color: var(--color-ink, #2a2622); }
  .lib-state-option-desc { font-size: 0.75rem; color: var(--color-note, #8b827a); font-weight: 400; }
`;
export const GCHECK_INLINE_CSS = `
  .lib-gcheck {
    min-width: var(--touch-min, 44px);
    min-height: var(--touch-min, 44px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm, 6px);
    background: #fff;
    cursor: pointer;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1;
    border: none;
    padding: 0;
    margin: 0;
    transition: box-shadow var(--timing-interaction, 0.12s) var(--ease-out, cubic-bezier(0.25, 0.46, 0.45, 0.94));
  }
  .lib-gcheck[data-state="scripted"] {
    color: var(--color-lure, #f0ad4e);
    box-shadow: var(--elev-1, 0 1px 2px rgba(42, 38, 34, 0.08), 1px 0 2px rgba(42, 38, 34, 0.03));
  }
  .lib-gcheck[data-state="grounded"] {
    color: var(--color-ground, #2d7c3e);
    box-shadow: var(--recess-soft, inset 0 1px 2px rgba(42, 38, 34, 0.06));
    background: color-mix(in oklch, var(--color-ground, #2d7c3e) 4%, #fff);
  }
  .lib-gcheck:focus-visible {
    outline: 2px solid var(--color-ground, #2d7c3e);
    outline-offset: 2px;
  }
  .lib-gcheck-row {
    display: flex;
    gap: var(--gap-sm, 0.4rem);
    align-items: center;
    min-height: var(--touch-min, 44px);
  }
  .lib-gcheck-status { font-size: 0.75rem; font-family: ui-monospace, monospace; }
`;
export const HIDE_AFFORDANCE_INLINE_CSS = `
  .lib-hide-btn {
    background: transparent;
    border: 1px solid var(--color-error, #b5603a);
    border-radius: var(--radius-sm, 6px);
    cursor: pointer;
    color: var(--color-error, #b5603a);
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.35rem 0.6rem;
    min-height: var(--touch-min, 44px);
    min-width: var(--touch-min, 44px);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--timing-interaction, 0.12s) var(--ease-out, cubic-bezier(0.25, 0.46, 0.45, 0.94));
  }
  .lib-hide-btn:hover {
    box-shadow: var(--elev-1, 0 1px 2px rgba(42, 38, 34, 0.08), 1px 0 2px rgba(42, 38, 34, 0.03));
    border-color: var(--color-lure, #f0ad4e);
    color: var(--color-lure, #f0ad4e);
  }
  .lib-hide-btn.lib-undo-active {
    background: color-mix(in oklch, var(--color-error, #b5603a) 8%, transparent);
    border-color: var(--color-ground, #2d7c3e);
    color: var(--color-ground, #2d7c3e);
    font-weight: 600;
  }
  .lib-hide-btn:focus-visible {
    outline: 2px solid var(--color-error, #b5603a);
    outline-offset: 2px;
  }
`;
