// scher-pages — shared page furniture for apps built on a scher Society.
//
// The five things Hallie named (2026-07-30) as wanted by BOTH Penelope and a
// game, which is the test for whether something belongs here rather than in
// one app: hamburger menu, modal, state-editor, state-history-list,
// stack-inventory.
//
// The rule for adding anything: name two consumers that want it. One consumer
// is a hypothesis; the package that serves an audience it does not have yet is
// how you end up designing for imaginary users.

export { historyOf, historyStory, momentsOf, authorsOf, HISTORY_INLINE_CSS,
         type HistoryEntry, type HistoryParams } from "./history.js";
export { lay, succeed, occlude, unocclude, stateEditorStory, slugify,
         EDITOR_INLINE_CSS, type EditorParams } from "./state-editor.js";
export { menuStory, dialogStory, CHROME_INLINE_CSS,
         type MenuItem, type MenuParams, type SimpleModalParams } from "./chrome.js";
export { acquire, spend, stackOf, inventoryOf, carriedCount, stackInventoryStory,
         Q_HOLDS, INVENTORY_INLINE_CSS,
         type Stack, type InventoryParams, type InventoryStoryParams } from "./stack-inventory.js";
