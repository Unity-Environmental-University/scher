# Pull-spec for scher — harvested from 15 ithaca muslin screens (2026-06-23)

Handed over from the ithaca local canon (:8012). Three slow-fire agents reduced 15
hand-built screens against scher's primitives.

> **STATUS, re-checked 2026-06-29:** most of this spec is FULFILLED. `foldGist` (with the
> `fold(all)==fold(cache)⊕fold(tail)` verify law, tested), `boardStory`, `viewCardStory`,
> `dropStory`, `relateBuckets`, and `composerStory` all ship in 0.3.0, and ithaca imports
> them from the package — no fork (`Beat.title` and `DropStoryParams.source` landed too, so
> the old "fork is load-bearing" worry is closed). **Still open** (the live remainder):
> `gridStory` (#4), the `partitionStory`/`strain` channel (#6), and the `Lore.evidence`
> field. Items #1–3 are DONE — left below for lineage. Treat the rest as a muslin-of-a-spec:
> cut it where it's wrong.

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
   - ~~OPEN SEAM~~ ADDRESSED (spike/foldGist): supersede *behind the bound, past the cursor* —
     `freshGistOf`'s `stale` only half-covered it (caught grew/moved, missed a supersede that
     doesn't change interior membership). foldGist now folds supersede stamps into the cursor
     and falls to a cold re-scan when an invalidating frame landed past the cache cursor — so
     invalidation is modeled, not just append. (Future O(tail) refinement: bound invalidation
     to supersedes onto interior beats or their causal reach, rather than any supersede.)

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
