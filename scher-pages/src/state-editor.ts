// ─────────────────────────────────────────────────────────────────────────────
// state-editor.ts — a WRITING surface over a society.
//
// The counterpart to history.ts. That one shows what happened; this one is how
// something happens. Both are shared surface (Hallie, 2026-07-30): Penelope
// wants them and a game wants them, and neither wants a bespoke pair.
//
// THE ONE RULE THIS MUST NOT BREAK
// --------------------------------
// An editor over an append-only society NEVER EDITS. There is no update, no
// delete, no in-place write. Editing a beat lays a SUCCESSOR; removing one
// OCCLUDES it. Both leave the original readable forever — which is why the
// history list beside it stays honest, and why undo is just another append.
//
// If you find yourself wanting a `soc.update(slug, …)`, the shape is wrong:
// what you want is `succeed(slug, …)`, and the difference is the whole library.
// ─────────────────────────────────────────────────────────────────────────────

import { Society, isOccluded } from "scher/society";
import { reading } from "scher/stories";
import { el, esc } from "scher/dom";
import { project } from "scher/projection";

export interface EditorParams {
  /** WHO is writing. Required: "no statement is not spoken from"
   *  (gen4 2026-07-07). An editor that lets you write anonymously is a bug. */
  by: string;
  /** called after any write, so a host can persist / sync. */
  onWrite?: (slug: string, kind: "lay" | "succeed" | "occlude") => void;
  /** field labels, so a consumer can say "incident" instead of "beat". */
  labels?: { title?: string; content?: string; add?: string };
}

/** Lay a NEW beat. */
export function lay(soc: Society, params: EditorParams,
                   b: { slug: string; title?: string; content: string }): boolean {
  const ok = soc.lay({
    slug: b.slug, content: b.content, title: b.title ?? null,
    subject: null, object: null, laid_by: params.by,
  });
  if (ok) params.onWrite?.(b.slug, "lay");
  return ok;
}

/** EDIT = lay a successor. The original stays readable; `q-succeeds` records
 *  which replaced which, so history shows the revision rather than hiding it. */
export function succeed(soc: Society, params: EditorParams,
                        slug: string, next: { title?: string; content: string }): string | null {
  const prior = soc.get(slug);
  if (!prior) return null;
  // a stable, derived successor slug: same beat, next revision. Deriving it
  // rather than random-generating keeps a re-edit idempotent (append-only law:
  // laying an existing slug is inert).
  let n = 2;
  while (soc.get(`${slug}-r${n}`)) n++;
  const nextSlug = `${slug}-r${n}`;
  soc.lay({
    slug: nextSlug, content: next.content, title: next.title ?? prior.title ?? null,
    subject: null, object: null, laid_by: params.by,
  });
  soc.layP(`${nextSlug}~succ`, `revises ${slug}`, nextSlug, slug, "q-succeeds");
  params.onWrite?.(nextSlug, "succeed");
  return nextSlug;
}

/** REMOVE = occlude. Nothing is deleted; the beat stops counting, with a
 *  reason recorded. A remove with no lesson is refused — occlusion is for a
 *  lesson learned, not a stand-in for an error message. */
export function occlude(soc: Society, params: EditorParams,
                        slug: string, lesson: string): string | null {
  if (!lesson.trim()) return null;
  if (!soc.get(slug)) return null;
  const occ = `occ-${slug}-${[...soc.all()].filter((r) => r.slug.startsWith(`occ-${slug}`)).length}`;
  soc.lay({ slug: occ, content: lesson, subject: null, object: null, laid_by: params.by });
  soc.layP(`${occ}~occ`, lesson, occ, slug, "q-occludes");
  params.onWrite?.(occ, "occlude");
  return occ;
}

/** UNDO = occlude the occluder. Occlusion is reversible and standpoint-relative
 *  (society.ts), so undo is not a special mechanism — it is the same move again. */
export function unocclude(soc: Society, params: EditorParams, occluderSlug: string): string | null {
  return occlude(soc, params, occluderSlug, "undone");
}

// ── the SPREAD ──────────────────────────────────────────────────────────────

/** An editing surface: add a beat, revise one, retire one. Live. */
export function stateEditorStory(soc: Society, params: EditorParams): Node {
  const L = { title: "title", content: "content", add: "add", ...(params.labels ?? {}) };
  const read = reading(soc, (s) =>
    s.all().filter((r) => r.subject === null && r.object === null && !isOccluded(s, r.slug)));

  return project(read, (beats) => {
    const box = el("div", { class: "scher-editor" });

    const title = el("input", { class: "scher-editor-title", attrs: { placeholder: L.title } });
    const content = el("textarea", { class: "scher-editor-content", attrs: { placeholder: L.content } });
    const add = el("button", { class: "scher-editor-add", on: { click: () => {
      const t = title.value.trim();
      if (!t) return;
      lay(soc, params, { slug: slugify(t, soc), title: t, content: content.value });
      title.value = ""; content.value = "";
    } } }, L.add);
    box.append(title, content, add);

    const list = el("div", { class: "scher-editor-list" });
    for (const b of beats) {
      const row = el("div", { class: "scher-editor-row", data: { slug: b.slug } });
      row.appendChild(el("span", { class: "t" }, esc(b.title || b.content)));
      const rev = el("button", { class: "sm", on: { click: () => {
        const v = prompt("new content", b.content);
        if (v !== null) succeed(soc, params, b.slug, { content: v });
      } } }, "revise");
      const rm = el("button", { class: "sm", on: { click: () => {
        const why = prompt("why? (occlusion records a lesson, never a silent delete)");
        if (why) occlude(soc, params, b.slug, why);
      } } }, "retire");
      row.append(rev, rm);
      list.appendChild(row);
    }
    box.appendChild(list);
    return box;
  }).node;
}

/** A slug from a title, made unique against the society (append-only: a
 *  collision would be inert, silently dropping the write). */
export function slugify(s: string, soc?: Society): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "beat";
  if (!soc || !soc.get(base)) return base;
  let n = 2;
  while (soc.get(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export const EDITOR_INLINE_CSS = `
.scher-editor{font:12px ui-monospace,Menlo,monospace;display:flex;flex-direction:column;gap:5px}
.scher-editor input,.scher-editor textarea{font:inherit;padding:4px;border:1px solid #999}
.scher-editor-row{display:flex;gap:6px;align-items:center;padding:3px 0;border-bottom:1px solid #eee}
.scher-editor-row .t{flex:1}
.scher-editor button{font:inherit;font-size:10px;padding:2px 7px;cursor:pointer}
`;
