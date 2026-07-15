// ─────────────────────────────────────────────────────────────────────────────
// button-story.ts — BUTTON STORY and its uncheckable sibling TOGGLE BUTTON STORY.
// Split out of stories.ts (2026-07-15, separation-of-concerns pass) — the button
// family seam. Behavior is byte-identical to the code this was cut from; only the
// file boundary moved. stories.ts re-exports both at the same names, so no
// importer (barrel, frontend dist path, or test) changes.
// ─────────────────────────────────────────────────────────────────────────────

import { el, on } from "./dom.js";
import { project } from "./projection.js";
import { Society, isEstablished, isOccluded, prehensionsOnto } from "./society.js";
import { reading } from "./stories.js";

// ── BUTTON STORY ──────────────────────────────────────────────────────────────
// A Story whose determined values are (label, enabled) READ from the society, and
// whose PRESS lays a beat. The button does not "do an action" — it appends to the
// society, and every reading re-derives. check=ground, star, share are all buttonStories.

export interface ButtonStoryParams {
  /** the label — a fixed string, or a reading over the society. */
  label: string | ((s: Society) => string);
  /** enabled — default always; or a reading (e.g. disabled once grounded). */
  enabled?: (s: Society) => boolean;
  /** the press: LAY into the society. The only write. */
  press: (s: Society) => void;
  class?: string;
}

export function buttonStory(soc: Society, params: ButtonStoryParams): Node {
  // TODO(socratic): why does buttonStory default enabled to true, while enabled-checking still happens at click time — is the default meant to be defensive fallback or is the button always enabled by construction?
  const read = reading(soc, (s) => ({
    label: typeof params.label === "function" ? params.label(s) : params.label,
    enabled: params.enabled ? params.enabled(s) : true,
  }));

  return project(read, (v) => {
    const btn = el("button", {
      class: `story-button ${params.class ?? ""}`,
      attrs: { disabled: v.enabled ? undefined : "true" },
    }, v.label) as HTMLButtonElement;
    // TODO(socratic): why gate the click handler on v.enabled instead of letting the disabled attr work and checking at press-time, like toggleButtonStory does?
    if (v.enabled) on(btn, "click", () => params.press(soc));  // press = lay a beat
    return btn;
  }).node;
}

// ── TOGGLE (UNCHECKABLE) BUTTON STORY — append-only undo via SUPERSEDE ──────────
// An "uncheckable" check. Press once: ground the beat (lay a grounding). Press again:
// UNGROUND — but you never delete; you lay a SUPERSEDE beat onto the grounding. The
// grounding STAYS IN INK; the read ignores it; the card flips back to scripted. The
// society's count only ever rises — undo is an append. (git-for-meaning: revert is a
// commit, not a rewrite.) check=ground is this. star-toggle is this.
export interface ToggleButtonStoryParams {
  /** the target beat this toggle grounds/ungrounds. */
  target: string;
  /** the frame (standpoint) doing the grounding — must exist in the society. */
  by: string;
  /** stable slug for THIS toggle's grounding (so re-press is idempotent / supersede-able). */
  groundSlug: string;
  labelChecked?: string;
  labelUnchecked?: string;
  class?: string;
}

export function toggleButtonStory(soc: Society, params: ToggleButtonStoryParams): Node {
  const { target, by, groundSlug } = params;

  // TODO(socratic): the comment says "this fixes the one-loop bug" but why was reading a FIXED slug the bug — what makes a fixed slug desync and does nth++ guarantee freshness even across multiple toggles of the same target?
  // ANSWERED(walk 2026-07-02): the append-only law is why — a slug can only be laid ONCE (re-lay is inert), so re-grounding must mint a fresh slug each cycle, and any read pinned to one fixed slug goes stale after the first occlude/re-ground; reading the TARGET's establishment (below) is slug-free and never desyncs. nth++ freshness has its own open bug at fix-list #8. — see append-only law / walk plan B#8
  // LIVE = does the TARGET have any non-superseded grounding? (the truth, not a single
  // slug's state). This is what fixes the one-loop bug: each re-ground uses a FRESH slug,
  // so reading a fixed slug desyncs after one cycle. Read the establishment of the target.
  const read = reading(soc, (s) => ({ live: isEstablished(s, target) }));

  // every grounding this toggle lays gets a unique slug (groundSlug + a counter) so a
  // re-ground is always a NEW, non-superseded beat — and uncheck supersedes ALL of them.
  let nth = 0;

  return project(read, (v) => {
    const btn = el("button", {
      class: `story-button toggle ${v.live ? "checked" : ""} ${params.class ?? ""}`,
    }, v.live ? (params.labelChecked ?? "☑ grounded — untick to supersede")
              : (params.labelUnchecked ?? "☐ check = ground")) as HTMLButtonElement;

    on(btn, "click", () => {
      // TODO(socratic): liveNow is re-read from scratch at click time, but why — could the projection have staled between render and click, or is this defending against some edge case in the batching/revision system?
      // re-read live AT CLICK TIME (don't trust the captured v — defensive against any
      // stale projection). The society is the source of truth.
      const liveNow = isEstablished(soc, target);
      if (!liveNow) {
        // CHECK: lay a fresh-slugged grounding (always new → never born-superseded).
        // NAMED EXCEPTION to N4 (society.ts KernelQuality doc, "do not lay [q-grounding]
        // in new writers"), surfaced by the 2026-07-15 review sitting (tension
        // hea-filter-mismatch) as a live writer the honesty clause didn't name. Left AS
        // q-grounding deliberately, not an oversight.
        // RE-CHECKED (2026-07-15, follow-up wave, against the now-landed closePole bare-
        // closing mechanization): the kernel's bare-edge migration is scoped to closing
        // edges OUT OF a designated End-pole (closingEdgesFrom, isDesignatedEndPole) —
        // this write grounds ONTO an arbitrary `target`, which is never an End-pole in
        // this call shape. isEstablished/groundedForAnyFrame reads that shape via a plain
        // `prehensionsOnto(soc, beat, "q-grounding")` string filter — untouched by the
        // migration by construction (society.ts's own KernelQuality doc names this exact
        // case: "groundedForAnyFrame reads it — ordinary grounding-onto, unrelated to
        // pole-closing"; "toggle-buttons — see stories.ts's NAMED EXCEPTION — still lay
        // and read it"). So my stated blocker is still exactly true, unchanged by the
        // kernel's work: writing a bare edge here would silently desync this toggle's own
        // `live` read (isEstablished would never see a bare onto-edge either — that read
        // was never migrated to closingEdgesFrom, only the FROM-an-End-pole walk was).
        // Revisit only if isEstablished's own read grammar changes; until then this stays
        // honest, not fixed.
        soc.layP(`${groundSlug}-${nth++}`, `${by} grounds ${target}`, by, target, "q-grounding");
      } else {
        // TODO(socratic): why occlude ALL live groundings instead of just the most recent one — does every grounding participate equally in establishment, or are there scenarios where one grounding alone drives the mode?
        // UNCHECK = OCCLUDE every live grounding onto the target (2026-06-26: was a self-loop
        // supersede the freeze 409s / isOccluded ignores). `by` is the named occluder. Append-only:
        // the groundings stay in ink, the read ignores them. The society count RISES on undo.
        const liveGroundings = prehensionsOnto(soc, target, "q-grounding").filter(
          (p) => !isOccluded(soc, p.slug),
        );
        for (const g of liveGroundings) {
          soc.layP(`occ-${g.slug}`, `${by} un-grounds ${g.slug} (uncheck)`, by, g.slug, "q-occludes");
        }
      }
    });
    return btn;
  }).node;
}
