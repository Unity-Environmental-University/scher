// ─────────────────────────────────────────────────────────────────────────────
// chrome.ts — hamburger menu and modal.
//
// The least metaphysical things in this package, and included on purpose:
// every app needs them, nobody wants to write them twice, and writing them
// HERE means they follow the same law as everything else instead of quietly
// introducing a second way to hold state.
//
// scher already ships `modalStory` (stories.ts), where opening LAYS a beat and
// closing OCCLUDES it — even a modal's open/closed is an append-only read, not
// a boolean. These follow that, and `menuStory` is deliberately the same shape.
//
// WHEN NOT TO USE THE SOCIETY FOR THIS
// ------------------------------------
// A menu that is open because a finger is on it is ephemeral interaction state,
// and putting every hover in the canon would bloat the log with nothing anyone
// will ever want to read back. `menuStory` takes `persist` for exactly this
// choice: persist:true when "was the menu open" is history worth keeping (a
// tutorial, a replay, an audit), persist:false — the DEFAULT — when it is just
// a finger. Both are honest; only one is free.
// ─────────────────────────────────────────────────────────────────────────────

import { Society, isOccluded } from "scher/society";
import { cell, type Read } from "scher/cell";
import { reading } from "scher/stories";
import { el, esc } from "scher/dom";
import { project } from "scher/projection";

export interface MenuItem {
  id: string;
  label: string;
  onPick?: () => void;
  /** render as current/selected. A READ, so the caller can derive it. */
  current?: boolean;
}

export interface MenuParams {
  id: string;
  items: MenuItem[] | (() => MenuItem[]);
  /** lay open/close into the society (history-worthy) vs hold it ephemerally.
   *  Default false — a finger on a menu is not canon. */
  persist?: boolean;
  by?: string;
  label?: string;
}

/** A hamburger menu. Open/closed is a READ either way — the only question is
 *  whether the read comes from the society or from a local cell. */
export function menuStory(soc: Society, params: MenuParams): Node {
  const openSlug = `menu-open-${params.id}`;
  const ephemeral = cell(false);

  const isOpen: Read<boolean> = params.persist
    ? reading(soc, (s) => !!s.get(openSlug) && !isOccluded(s, openSlug))
    : ephemeral;

  const toggle = () => {
    if (!params.persist) { ephemeral.set(!ephemeral.get()); return; }
    if (isOpen.get()) {
      // close = occlude the open-beat, exactly as modalStory does.
      const occ = `${openSlug}-closed-${[...soc.all()].filter(r => r.slug.startsWith(`${openSlug}-closed`)).length}`;
      soc.lay({ slug: occ, content: "menu closed", subject: null, object: null, laid_by: params.by ?? null });
      soc.layP(`${occ}~occ`, "menu closed", occ, openSlug, "q-occludes");
    } else {
      soc.lay({ slug: openSlug, content: `menu ${params.id} open`, subject: null, object: null, laid_by: params.by ?? null });
    }
  };

  const btn = el("button", {
    class: "scher-hamburger",
    attrs: { "aria-label": params.label ?? "menu", "aria-expanded": "false",
             "aria-controls": `menu-${params.id}` },
    on: { click: toggle },
  }, "☰");

  const panel = project(isOpen, (open) => {
    const nav = el("nav", {
      class: ["scher-menu", open && "open"],
      // keep it in the a11y tree correctly rather than only visually hidden
      attrs: { id: `menu-${params.id}`, hidden: open ? null : "" },
    });
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) return nav;
    const items = typeof params.items === "function" ? params.items() : params.items;
    for (const it of items) {
      const a = el("button", {
        class: ["scher-menu-item", it.current && "current"],
        attrs: { "aria-current": it.current ? "page" : null },
        on: { click: () => { it.onPick?.(); if (!params.persist) ephemeral.set(false); } },
      }, esc(it.label));
      nav.appendChild(a);
    }
    return nav;
  }).node;

  const wrap = el("div", { class: "scher-chrome" });
  wrap.append(btn, panel);

  // Escape closes — a menu you cannot dismiss from the keyboard is a trap.
  wrap.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape" && isOpen.get()) toggle();
  });
  return wrap;
}

/** A modal wrapper over scher's own `modalStory`, adding the accessibility
 *  affordances (labelled dialog, escape-to-close, click-the-backdrop) that a
 *  library-grade one needs. The state handling stays scher's. */
export interface SimpleModalParams {
  id: string;
  title: string;
  body: Node | (() => Node);
  onClose?: () => void;
}

export function dialogStory(params: SimpleModalParams): { open: () => void; close: () => void; node: Node } {
  const overlay = el("div", { class: "scher-modal-overlay", attrs: { hidden: "" } });
  const box = el("div", {
    class: "scher-modal",
    attrs: { role: "dialog", "aria-modal": "true",
             "aria-labelledby": `modal-title-${params.id}` },
  });
  box.appendChild(el("h2", { class: "scher-modal-title", attrs: { id: `modal-title-${params.id}` } }, esc(params.title)));
  box.appendChild(typeof params.body === "function" ? params.body() : params.body);
  const x = el("button", { class: "scher-modal-close", attrs: { "aria-label": "close" }, on: { click: () => close() } }, "×");
  box.appendChild(x);
  overlay.appendChild(box);

  const close = () => { overlay.setAttribute("hidden", ""); params.onClose?.(); };
  const open = () => { overlay.removeAttribute("hidden"); (box.querySelector("button, [tabindex]") as HTMLElement)?.focus(); };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape") close(); });

  return { open, close, node: overlay };
}

export const CHROME_INLINE_CSS = `
.scher-chrome{position:relative;font:12px ui-monospace,Menlo,monospace}
.scher-hamburger{font:inherit;font-size:16px;background:none;border:1px solid currentColor;
  padding:2px 8px;cursor:pointer;line-height:1}
.scher-menu{position:absolute;top:100%;left:0;z-index:30;background:#fff;border:2px solid #111;
  min-width:180px;display:flex;flex-direction:column}
.scher-menu[hidden]{display:none}
.scher-menu-item{font:inherit;text-align:left;background:none;border:0;padding:6px 10px;cursor:pointer}
.scher-menu-item:hover{background:#f0efe8}
.scher-menu-item.current{font-weight:700;background:#f6f4ee}
.scher-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;
  align-items:center;justify-content:center;z-index:100}
.scher-modal-overlay[hidden]{display:none}
.scher-modal{background:#fff;border:3px solid #111;padding:14px;max-width:560px;width:92%;
  position:relative;font:13px ui-monospace,Menlo,monospace}
.scher-modal-title{margin:0 0 8px;font-size:14px}
.scher-modal-close{position:absolute;top:6px;right:8px;background:none;border:0;font-size:18px;cursor:pointer}
`;
