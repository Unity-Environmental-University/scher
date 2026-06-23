# Pull-spec for scher — harvested from 15 ithaca muslin screens (2026-06-23)

Handed over from the ithaca local canon (:8012). Three slow-fire agents reduced 15
hand-built screens against scher's primitives.

As of scher **0.3.0** the leaves present are: cardStory, frameStory, listStory,
gistStory/gistOf/freshGistOf, loreStory/loreOf/makeLore, buttonStory, toggleButtonStory,
modalStory — plus the substrate (cell/derive/batch, el/esc/on/fill, project/projectList/
standpoint, Society + reads, fact, and the reference frames: timeFrame/localeFrame/makeCanon).
Verified against src/ on 2026-06-23: NONE of the pulls below exist yet, and `Lore` still has
no `evidence` field — so the priority list stands unchanged. This is the priority-ordered
pull list, with a faithfulness criterion for each. Treat as a muslin-of-a-spec: cut it where
it's wrong.

## Priority order

1. **`foldGist`** (subsumes `gistOf`) — HIGHEST LEVERAGE: it IS the cached-SSR perf fix.
   `gistOf` already freezes an interval reading at `at = max(witnessed)` and reports `stale`.
   That watermark IS a render-cache cursor. Generalize on the axis `Gist.at`/`stale` already
   gesture at:
   - cursor advances per **whole FRAME (= witnessed txn)**, never a partial frame.
     `db_now = now()` is transaction time = the authority-reference-time of the frame the
     perished data lives in (this is correct, not a bug — beats in one txn share it).
   - fold only the **tail** (O(tail)), not re-scan the interval (O(interval)).
   - the summary is a **pluggable associative monoid**, so `fold(all) == fold(cache) ⊕ fold(tail)`
     IS the verify law. `gistOf` ⊂ `foldGist` (fold = {empty:{total,established}, step:tally}).
   - OPEN SEAM: supersede *behind the bound, past the cursor* — `freshGistOf`'s `stale` only
     half-covers it (catches grew/moved, misses a supersede that doesn't change interior
     membership). Model invalidation, not just append.

2. **`boardStory` + `viewCardStory`** — pull from ithaca's stories.ts (they exist there, not here).
   `boardStory(soc, {columns: {name, slice:(s)=>string[]}[], item?})`. Collapses the flat
   structure of EVERY board screen. `viewCardStory` = leaf→card, story→frame.

3. **`dropStory`** — the keystone drop-engine. Drop A onto B (or into a basket), choose the
   quality → lay ONE edge; the view re-derives from `prehensionsFrom`/`intervalOf`, **zero
   imperative drag-state**. Sub-Beat-Of lays the membership/positioning edge (betweenness),
   NOT a stored containment. Covers card-onto-card, basket, gather.

4. **`gridStory`** (subsumes `boardStory`, both axes are slices) + **`composerStory`**
   (an input bound to a lay-fn — the conjugate of `buttonStory`; the only UI write besides a button).

5. **`cardStory` extension** — it's too thin: add provenance (who-grounded + why-evidence),
   a pain/algedonic slot, and an actions row. This is what forces 4/5 screens back into bespoke HTML.

6. **`partitionStory` / a `strain` channel** — the algedonic guarantee made STRUCTURAL: a
   partition that is TOTAL and screams on a hole (an INVALID lane carrying its pain), never a
   silent fallthrough. `strain?:(s)=>string|null` on buttons = the soft "this will hurt, here's why."

## Two corrections (NOT pulls — fixes)
- `sprint-horizons` reads/writes membership as stored `q-containment <slug>-in` edges — the exact
  shape society.ts yells about. Faithful slice is `intervalOf(once,end)`. **Membership is betweenness.**
- model supersede-past-cursor invalidation (the foldGist open seam, above).

## Add to `Lore`
- `evidence: string[]` (the grounding *contents*, not just `groundedBy` subjects) — so cheevos
  is a plain `loreStory` reading.
