// ─────────────────────────────────────────────────────────────────────────────
// eventview.ts — EventView: one component, THREE MODES, which are Whitehead's
// subject-superject phases (BRIEF.md "HALLIE ARCHITECTURE" 2026-07-xx, live ~09:31/09:32):
//
//   interior    = the occasion in its own BECOMING     (card open / detail)
//   superject   = the occasion AS A DATUM for the next  (row / chip / glyph / sphere)
//   proposition = not-yet-actual, a lure                (superject render + a "not-yet" SKIN)
//
// Two render PATHS, three ontological faces: proposition is a SKIN ON SUPERJECT, not a
// third family (Hallie's decision, BRIEF.md line ~1630). This file follows the SAME
// reads/spreads/taste-arm seam that just passed the fence in stories.ts (readCard ~55,
// ModeArm ~71, cardStory ~90): a pure READ (Society -> structural shape), a structural
// SPREAD (the dispatch + DOM skeleton), and caller-supplied TASTE ARMS for the copy/visual
// inside each mode's slot. Mode DETECTION (interior/superject/proposition, and — inside
// superject/proposition — is-this-beat-a-story) is scher's read; the WORDS and SKIN are
// the caller's, exactly like modeArm never choosing English for cardStory.
// ─────────────────────────────────────────────────────────────────────────────

import { el, on } from "./dom.js";
import { project } from "./projection.js";
import { reading, readCard, cardStory, type CardRead, type ModeArm } from "./stories.js";
import { Society, isEstablished, isSublimePole, bearingsOf, storyBearingsOf } from "./society.js";

/** the three faces. INTERIOR = becoming; SUPERJECT = datum-for-the-next; PROPOSITION =
 *  not-yet-actual (renders as superject + a not-yet skin). */
export type EventViewMode = "interior" | "superject" | "proposition";

/** the READ: pure (Society, slug) -> structural shape for the superject/proposition
 *  faces. Reuses readCard's beat-level read (content/mode/pathos) and adds the ONE
 *  structural fact those two faces need beyond a card: is this beat PROPOSITION-y —
 *  detected, never asserted by the caller. A beat reads as a proposition iff it is NOT
 *  established (scripted — the "not yet actual" mode) OR it is itself a sublime-pole (a
 *  never-closing bearing-target — a star to steer by, never a landed datum; see
 *  society.ts's sublime guard, "a star for navigation, not a destination to land"). */
export interface EventViewRead extends CardRead {
  /** structurally not-yet-actual: scripted, or a sublime bearing-target. scher's read —
   *  callers never assert this themselves; they only decide how to SKIN it. */
  isProposition: boolean;
}

export function readEventView(soc: Society, slug: string): EventViewRead {
  const base = readCard(soc, slug);
  const isProposition = !isEstablished(soc, slug) || isSublimePole(soc, slug);
  return { ...base, isProposition };
}

/** nextAlong: the RELATIONAL lure-read committee-eventview added (2026-07-10), distinct
 *  from `isProposition` on purpose — see the note above EventViewRead.isProposition and
 *  BRIEF.md's ghost-row/in-service-of committee (CLEARNESS-ghostrow-ontology.md, fork 3).
 *
 *  isProposition asks a PER-BEAT question ("is this beat, alone, not-yet-actual?") and is
 *  true for nearly every open todo on an ungrounded board — that's a true fact about the
 *  beat but NOT what "a ghost row attached to its todo" means. nextAlong asks a RELATIONAL
 *  question instead: "does this beat (or a story it belongs to) SERVE a sublime-pole worth
 *  previewing as a lure beside it?" — Hallie's "next thing along, attached to the todo row"
 *  / the ghost-chain-toward-the-sea image. Built entirely on the ghost-row committee's
 *  already-landed kernel reads (bearingsOf/storyBearingsOf, society.ts ~1217-1252); no new
 *  kernel primitive. Returns the FIRST direct bearing if the beat has one of its own,
 *  else the first bearing inherited via a containing story, else null (an ordinary open
 *  todo with nothing downstream to preview — the common case, and correctly undashed).
 *
 *  This is a READ ONLY — it does not decide skin or attachment DOM; callers (board.ts)
 *  decide whether/how to render a row for the returned bearing. Kept as an eventview.ts
 *  export (not folded into isProposition) because the two answer different questions and
 *  a caller may legitimately want either or both: isProposition for "skin this row that IS
 *  rendering," nextAlong for "should I render an attached ghost row at all." */
export function nextAlong(soc: Society, slug: string, asOf?: number): { slug: string; viaStory: boolean } | null {
  const firstDirect = bearingsOf(soc, slug, asOf)[0];
  if (firstDirect?.object) {
    return { slug: firstDirect.object, viaStory: false };
  }
  const firstInherited = storyBearingsOf(soc, slug, asOf)[0];
  if (firstInherited?.object) {
    return { slug: firstInherited.object, viaStory: true };
  }
  return null;
}

/** the TASTE arm for the superject/proposition faces: given the structural read, render
 *  the compact datum's contents (the row's label/glyph — Penelope's voice, not scher's).
 *  Reuses ModeArm's shape (CardRead -> Node) since EventViewRead extends CardRead — a
 *  caller who already has a ModeArm for cards can reuse it here, or supply a dedicated one. */
export type SuperjectArm = (v: EventViewRead) => Node;

export interface EventViewParams {
  slug: string;
  mode: EventViewMode;
  /** the TASTE arm for the INTERIOR face — threaded straight to cardStory (see
   *  stories.ts CardStoryParams.modeArm). REQUIRED whenever mode may be "interior". */
  modeArm?: ModeArm;
  /** the TASTE arm for the SUPERJECT / PROPOSITION faces — the compact row's contents.
   *  REQUIRED whenever mode may be "superject" or "proposition". Proposition reuses this
   *  SAME arm (it is a skin ON superject, not a different render) — the skin (dashed/
   *  faint/conditional) is applied by scher as a structural class + data-attribute; the
   *  ARM never needs to know it's being skinned. */
  superjectArm?: SuperjectArm;
  /** interior-only passthroughs, threaded to cardStory. */
  standpoint?: string;
  onOpen?: (slug: string) => void;
  onReify?: (slug: string) => void;
  /** MASS HOOK (tentative — RECESS-2 hunch, twice-confirmed, BRIEF.md "task mass made
   *  SOMATIC"): an OPTIONAL per-occasion weight for the superject/proposition row. This
   *  is STRUCTURE only — a number the row carries as `data-mass` + a `--mass` CSS var —
   *  never the drag physics itself (inertia/cursor-lag is a Penelope/interaction concern,
   *  wired later against these hooks). scher does not derive mass from voltage here:
   *  voltageOf(soc, story, ...) reads a STORY's differentials (it needs an End/poles), so
   *  it isn't trivially available for an arbitrary list member that may be a bare beat —
   *  deriving mass from the society is a real read, not a trivial one, so this stays an
   *  honest caller-supplied optional rather than a forced auto-derivation.
   *  TODO: once a cheap per-beat voltage/bearing-depth read exists for non-story beats,
   *  fold it in here as a fallback when `mass` is omitted. */
  mass?: number;
}

/** eventView: the harness. Dispatches on `mode` — scher's structure, never the caller's
 *  choice of copy. INTERIOR delegates to cardStory (it already IS the interior render;
 *  no duplication). SUPERJECT is a compact row built fresh here (a card is too heavy —
 *  full content, pathos chips, an openable click-target — for "a datum in a list").
 *  PROPOSITION renders the identical superject skeleton and adds ONLY a structural
 *  not-yet-actual marker (a class + data-attribute); the VISUAL skin (dashed border,
 *  faint opacity, "if…" phrasing) is the caller's CSS/taste, not scher's. */
export function eventView(soc: Society, params: EventViewParams): Node {
  const { slug, mode } = params;

  if (mode === "interior") {
    if (!params.modeArm) {
      throw new Error("eventView: mode 'interior' needs params.modeArm (the taste arm) — see cardStory");
    }
    const common = {
      ...(params.standpoint !== undefined ? { standpoint: params.standpoint } : {}),
      ...(params.onOpen ? { onOpen: params.onOpen } : {}),
      ...(params.onReify ? { onReify: params.onReify } : {}),
    };
    return cardStory(soc, { slug, modeArm: params.modeArm, ...common });
  }

  // superject AND proposition share one structural spread — proposition = superject + skin.
  if (!params.superjectArm) {
    throw new Error("eventView: mode 'superject'/'proposition' needs params.superjectArm (the taste arm)");
  }
  const superjectArm = params.superjectArm;
  const read = reading(soc, (s) => readEventView(s, slug));

  return project(read, (v) => {
    // the "is this a proposition RIGHT NOW" flag for THIS render is scher's structural
    // detection (v.isProposition) UNIONED with the caller's declared mode — a caller may
    // force mode:'proposition' on a beat scher would otherwise read as plain superject
    // (e.g. previewing a not-yet-committed lure before it's laid at all), but scher's own
    // detection can never be silenced by a caller declaring mode:'superject' on a beat
    // that structurally IS one — the not-yet-actual marker is never hidden.
    const asProposition = mode === "proposition" || v.isProposition;

    const row = el("div", {
      class: `event-view superject ${v.mode}${asProposition ? " proposition" : ""}`,
      attrs: {
        title: params.standpoint ? `read from: ${params.standpoint}` : undefined,
      },
      // the STRUCTURAL not-yet-actual marker — scher's fact, caller styles the skin.
      data: { proposition: asProposition ? "true" : undefined, mass: params.mass !== undefined ? String(params.mass) : undefined },
    });
    // the MASS HOOK as a CSS var too, for callers who'd rather style off `var(--mass)`
    // than re-read the data-attribute — same structural fact, two handles on it.
    if (params.mass !== undefined) row.style.setProperty("--mass", String(params.mass));
    if (params.onOpen) on(row, "click", () => params.onOpen!(slug));
    row.appendChild(superjectArm(v));
    return row;
  }).node;
}

// NOTE: "a list is a spread of superject-face EventViews" (PORT work-round 3) lives in
// stories.ts's listStory, not here — list COMPOSITION belongs on the stories.ts side of
// the file-advocate boundary (this file owns the single EventView harness above; stories.ts
// owns spreading it across a slice, same as it already owns cardStory/frameStory/boardStory).
// listStory's default per-item render (no `item` override) composes eventView(soc, {slug,
// mode:'superject', superjectArm}) per member — see stories.ts.
