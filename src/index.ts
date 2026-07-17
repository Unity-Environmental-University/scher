// ─────────────────────────────────────────────────────────────────────────────
// lib/index.ts — the Penelope view lib. The metaphysics-native, no-framework
// component library: a view is a READING of state, re-observed.
//
// One import surface for the whole lib. Build a component (a STANDPOINT projecting a
// society of beats) from three primitives:
//
//   • Cell / derive / batch  (cell.ts)        — "a value is a reading"
//   • el / esc / on / fill     (dom.ts)        — raw-DOM authoring, factored
//   • project / projectList    (projection.ts) — "a view is a reading, re-observed"
//
// See LIB.md for the thesis and a worked component. Zero runtime deps; plain `tsc`.
// ─────────────────────────────────────────────────────────────────────────────

export {
  Cell,
  Derived,
  cell,
  derive,
  batch,
  type Read,
  type Subscriber,
  type Unsubscribe,
} from "./cell.js";

export {
  el,
  esc,
  escAttr,
  on,
  fill,
  fromHTML,
  type Child,
  type ElOptions,
} from "./dom.js";

export {
  project,
  projectList,
  standpoint,
  type Projection,
  type ListProjection,
  type ListOptions,
  type RenderFn,
  type ItemRender,
  type Standpoint,
} from "./projection.js";

// TODO(socratic): I call this block "the gen3 substance" in a lib whose grammar refuses substance — is that name a joke that still tells the truth, or has a store-shaped thing actually snuck in under a process vocabulary?
// TODO(socratic): thirty-odd loose read functions all taking a Society — at what point does this flat surface stop being "one import surface" and start hiding that these reads cluster into three or four frames (blocking, mood, story-shape, authorship) that want names of their own?
// the gen3 substance: the society + its reads ("a value is read, not stored")
//
// SPLIT (2026-07-15, separation-of-concerns pass, society.ts's own agent): the single
// flat surface below is unchanged for every IMPORTER of this barrel (same names, same
// re-export list) — only the source files moved. society.ts keeps the mutually-
// recursive kernel (Society, guards, witnessing, establishment, poles/voltage/
// algedonic — voltageOf calls establishedTo which calls reaches which calls
// closingEdgesFrom, a real cycle that resisted further splitting). strain.ts,
// pathos.ts, biography.ts, sublimes.ts hold the leaf read-families that only ever
// call INTO the kernel, never back. Mechanical edit only (this barrel is unclaimed,
// per the DRAMA CUT precedent above) — not a claim on index.ts.
export {
  Society,
  prehendsAs,
  hasAnyQuality,
  prehensionsOnto,
  prehensionsFrom,
  isOccluded,
  isEstablished, // deprecated alias — see groundedForAnyFrame / establishedTo
  groundedForAnyFrame,
  reaches,
  establishedTo,
  modeAt,
  confidence,
  isStory,
  intervalOf,
  intervalContext,
  type IntervalContext,
  endOf,
  unpackPoles,
  storyNow,
  endActual,
  chargesOn,
  layCharge,
  closePole,
  voltageOf,
  reopenTask,
  floatingCharge,
  overload,
  assertNoLure,
  assertNoLureInSociety,
  assertNakedPole,
  type PoleUnpack,
  type FloatingCharge,
  type VoltageReading,
  contentBeats,
  membersOf,
  bucketsOf,
  countsOf,
  type Buckets,
  type BucketCounts,
  type EventRow,
  type Quality,
  type Mode,
  // resolutionOf/isResolved: DRAMA CUT (Hallie, 2026-07-15) — removed from society.ts
  // (see its own tombstone comment on the KernelQuality union). Mechanical unblock only,
  // done by society.ts's agent because this barrel file is unclaimed and the two dead
  // re-exports failed `npm run check` for the whole package — not a claim on index.ts.
  cleanContent,
} from "./society.js";

// dependency/strain reads + assigneesOf/distanceToHEA — cut from society.ts into
// strain.ts (2026-07-15, separation-of-concerns pass). Same names, new source file.
export {
  dependsOn,
  dependentsOf,
  blockedOnNow,
  isBlocked,
  parallelizable,
  whoWaitsOn,
  stressOf,
  groundedBy,
  excludedBy,
  distanceToHEA,
  assigneesOf,
} from "./strain.js";

// q-feel reaction reads — cut from society.ts into pathos.ts (2026-07-15,
// separation-of-concerns pass). Same names, new source file.
export {
  pathosOf,
  reactionsOn,
  type Pathos,
} from "./pathos.js";

// the O1 "nothing unheard" biography read + authorOf — cut from society.ts into
// biography.ts (2026-07-15, separation-of-concerns pass). Same names, new source file.
export {
  authorOf,
  biographyOf,
  type BiographyEntry,
  type HearingStatus,
} from "./biography.js";

// the sublime-DAG reads (bearings, service chains, path-to-sublime) — cut from
// society.ts into sublimes.ts (2026-07-15, separation-of-concerns pass). Same
// names, new source file. (Not previously in the barrel's export list — these
// reads exist in society.ts today with no re-export here; left un-added to avoid
// widening index.ts's surface beyond what this pass's mandate covers. See report.)

// the reusable STORY-CONSTRUCTORS ("everything is a Story, incl. a UI component")
export {
  reading,
  cardStory,
  readCard,
  type CardRead,
  type ModeArm,
  buttonStory,
  toggleButtonStory,
  modalStory,
  frameStory,
  gistStory,
  gistOf,
  freshGistOf,
  foldGist,
  TALLY,
  type Monoid,
  type FoldGist,
  loreStory,
  loreOf,
  makeLore,
  type CardStoryParams,
  type ButtonStoryParams,
  type ToggleButtonStoryParams,
  type ModalStoryParams,
  type FrameStoryParams,
  listStory,
  reify,
  viewCardStory,
  boardStory,
  dropStory,
  relateBuckets,
  composerStory,
  reactionStory,
  type Gist,
  type Lore,
  type ListStoryParams,
  type ViewCardParams,
  type BoardColumn,
  type BoardStoryParams,
  type DropBucket,
  type DropStoryParams,
  type ComposerStoryParams,
  type ReactionStoryParams,
} from "./stories.js";

// TODO(socratic): the porcelain promises the desync bug-class is "unwriteable" — unwriteable through THIS surface, sure, but every raw read above is still exported alongside it; does offering both doors mean the bug-class merely moved, not died?
// EventView — one component, THREE MODES (interior/superject/proposition), the
// subject-superject phases (BRIEF.md "components are EventViews"). Proposition is a
// SKIN ON SUPERJECT, not a third render family — see eventview.ts for the seam.
export {
  eventView,
  readEventView,
  // the relational lure-read board.ts's phantom stack composes with the proposition face.
  nextAlong,
  type EventViewMode,
  type EventViewRead,
  type SuperjectArm,
  type EventViewParams,
  // the corrected interior anatomy (card-v2 sitting, 2026-07-13): three stacked lists,
  // contains → future → past, hideable per-section.
  type InteriorSection,
  type InteriorRow,
  INTERIOR_SECTION_ORDER,
} from "./eventview.js";

// GRADUATED MUSLIN COMPONENTS (card-v2 sitting, 2026-07-13) — the hardened
// fleet-bj-card-round1 lib primitives, ported JS→TS on el(): the 6-state
// state-change glyph picker, the gcheck checkbox write-door, the reversible
// hide affordance. State exposed as data-/aria- attributes; colors are the
// page's job (the taste fence) — the *_INLINE_CSS constants are opt-in only.
export {
  createStateChangeGlyph,
  STATE_MAP,
  createGcheck,
  createGcheckRow,
  setGcheckToggle,
  wireGcheckToEndpoint,
  createHideButton,
  setHideCallbacks,
  wireHideToEndpoint,
  STATE_GLYPH_INLINE_CSS,
  GCHECK_INLINE_CSS,
  HIDE_AFFORDANCE_INLINE_CSS,
  type Announcer,
  type BujoState,
  type StateInfo,
  type StateChangeGlyphOptions,
  type StateChangeDetail,
  type GcheckState,
  type GcheckOptions,
  type GcheckRowOptions,
  type HideButtonOptions,
  type WireEndpointOptions,
} from "./components.js";

// COMPLETE EMOJI PICKER (2026-07-14 wave) — search + category tabs + roving-
// tabindex grid over the vendored dataset (emoji-data.ts, 1914 entries,
// unicode-emoji-json/MIT — see that file's provenance header). Skin-tone
// selection deferred honestly (see emoji-picker.ts's file header); recents
// via an injected RecentsStore seam, no direct localStorage.
export {
  createEmojiPicker,
  EMOJI_PICKER_INLINE_CSS,
  type EmojiPickerOptions,
  type RecentsStore,
} from "./emoji-picker.js";
export {
  EMOJI_DATA,
  EMOJI_GROUP_LABELS,
  EMOJI_GROUP_ORDER,
  type EmojiEntry,
  type EmojiGroup,
} from "./emoji-data.js";

// the POSITIVIST PORCELAIN — a get/set(boolean) handle over an establishment, so the
// append-only/read-the-truth dissonance is hidden behind an intuitive surface and the
// desync bug-class becomes unwriteable. (honest porcelain: history() exposes the seam.)
export {
  fact,
  type Fact,
  type FactOptions,
} from "./fact.js";

// TODO(socratic): SYSTEM_ZONE and SYSTEM_LOCALE are constants a reader "inherits from the system" — but a constant is captured once at module load; if reads are frame-relative, whose Now decided that the system frame is allowed to be frozen rather than read?
// REFERENCE FRAMES — "a reading is relative to a standpoint," pushed down to time and
// language: a timezone/locale IS a frame a reader inherits from the system unless they
// establish their own. Zero-dep (native Intl). See frames.ts for the Temporal note.
export {
  SYSTEM_ZONE,
  timeFrame,
  clockLabel,
  SYSTEM_LOCALE,
  localeFrame,
  makeCanon,
  type Canon,
  type Canons,
} from "./frames.js";
