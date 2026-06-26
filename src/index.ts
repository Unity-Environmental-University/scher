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

// the gen3 substance: the society + its reads ("a value is read, not stored")
export {
  Society,
  prehendsAs,
  prehensionsOnto,
  prehensionsFrom,
  isOccluded,
  isSuperseded,
  dependsOn,
  dependentsOf,
  blockedOnNow,
  isBlocked,
  parallelizable,
  whoWaitsOn,
  stressOf,
  isEstablished,
  modeAt,
  confidence,
  groundedBy,
  excludedBy,
  pathosOf,
  reactionsOn,
  isStory,
  intervalOf,
  endOf,
  contentBeats,
  authorOf,
  type Beat,
  type Quality,
  type Mode,
  type Pathos,
  assigneesOf,
  resolutionOf,
  isResolved,
  cleanContent,
  distanceToHEA,
} from "./society.js";

// the reusable STORY-CONSTRUCTORS ("everything is a Story, incl. a UI component")
export {
  reading,
  cardStory,
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

// the POSITIVIST PORCELAIN — a get/set(boolean) handle over an establishment, so the
// append-only/read-the-truth dissonance is hidden behind an intuitive surface and the
// desync bug-class becomes unwriteable. (honest porcelain: history() exposes the seam.)
export {
  fact,
  type Fact,
  type FactOptions,
} from "./fact.js";

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
