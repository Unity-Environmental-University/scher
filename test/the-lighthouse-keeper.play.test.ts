// ─────────────────────────────────────────────────────────────────────────────
// the-lighthouse-keeper.play.test.ts — the wall moves while you are standing on it. 🗼
//
// A doll (2026-07-28, offered rather than chartered — Hallie said make one if you have
// an idea). It plays the case tonight's standpoint ruling opens and does not answer:
//
//   "opening a card is a viewport into another frame of reference"
//   "a card's look is a function of its boundary, never its contents — UNLESS something
//    outside prehends an interior beat, and then that beat is surface"
//
// Both hold from OUTSIDE. Neither says what happens when you are INSIDE and the boundary
// changes underneath you.
//
// THE FIGURE. The Eddystone light, 1703. Henry Winstanley built it, believed in it, and
// asked to be inside during the greatest storm that ever blew. He got his wish on the
// night of 26 November; the tower and every man in it were gone by morning. What makes
// him the right doll is not the drowning — it is that from inside a lighthouse you cannot
// see the lighthouse. You see the lamp, the stair, the men with you. Whether the sea has
// taken the base is not a fact your standpoint contains.
//
// THE QUESTION THIS PLAYS, honestly, with no answer assumed:
//   Standing inside story S, a beat B is interior — nothing outside S prehends it.
//   Then something outside S lays a prehension onto B.
//   From OUTSIDE, S's drawers change: B is surface now, the wall moved.
//   From INSIDE, does anything change at all?
//
// THREE READINGS, and the doll's job is to find which the grammar already gives:
//   (a) NOTHING CHANGES INSIDE. The interior is a cone from S's poles; B is still between
//       them; interval membership is untouched. The keeper sees the same room.
//   (b) B GAINS A DRAWER ITEM. Something now reaches B, so B's own Direction drawer shows
//       it — the outside becomes visible AT B, one beat, not at the wall.
//   (c) THE STANDPOINT IS STALE. What you are standing in is no longer what it was when
//       you entered, and nothing tells you.
//
// (a) and (b) are compatible and I suspect both are true. (c) is the one that matters for
// the cache: if a standpoint can go stale from outside, the cone-hash bulkhead must
// invalidate an interior slice on a write that never touched the interior.
//
// SLUG CONVENTION (opaque, never parsed): plain nodes; `{event}~because~{story}` and
// `{story-end}~because~{event}` for membership, which is what intervalOf reads.
//
// WHAT THIS DOLL DOES NOT DO: it does not build the boundary read (Hallie: later, and
// scoped) and it does not touch src/. It plays the existing reads and reports.

import { describe, it, expect } from 'vitest'
import { Society, intervalOf, prehensionsOnto, prehensionsFrom } from '../src/society.js'

/** A story with its two poles, and beats laid between them. */
function lighthouse(soc: Society, story: string, end: string, beats: string[]) {
  soc.lay({ slug: story, content: story, subject: null, object: null })
  soc.lay({ slug: end, content: end, subject: null, object: null })
  soc.layP(`${story}~end-pole~${end}`, 'end pole', story, end, 'q-end-pole')
  for (const b of beats) {
    soc.lay({ slug: b, content: b, subject: null, object: null })
    soc.layP(`${b}~because~${story}`, 'member', b, story, 'q-grounding')
    soc.layP(`${end}~because~${b}`, 'the end gathers it', end, b, 'q-grounding')
  }
}

describe('the lighthouse keeper — the wall moves while you are standing on it', () => {
  it('the keeper inside sees the same room after the sea reaches the base', () => {
    const soc = new Society()
    lighthouse(soc, 'story-eddystone', 'eddystone-end', ['beat-the-lamp', 'beat-the-stair'])

    const beforeInside = intervalOf(soc, 'story-eddystone', 'eddystone-end')

    // Something OUTSIDE the tower reaches a beat INSIDE it.
    soc.lay({ slug: 'beat-the-great-storm', content: 'the storm of 1703', subject: null, object: null })
    soc.layP(
      'beat-the-great-storm~because~beat-the-stair',
      'the sea takes the stair',
      'beat-the-great-storm',
      'beat-the-stair',
      'q-grounding',
    )

    const afterInside = intervalOf(soc, 'story-eddystone', 'eddystone-end')

    // READING (a): interval membership is a cone from the poles. The storm is not between
    // them, so it does not join the room — and nothing already in the room leaves.
    expect(new Set(afterInside)).toEqual(new Set(beforeInside))
  })

  it('the beat itself knows: the outside becomes visible AT the beat, not at the wall', () => {
    const soc = new Society()
    lighthouse(soc, 'story-eddystone', 'eddystone-end', ['beat-the-lamp', 'beat-the-stair'])
    soc.lay({ slug: 'beat-the-great-storm', content: 'the storm of 1703', subject: null, object: null })
    soc.layP(
      'beat-the-great-storm~because~beat-the-stair',
      'the sea takes the stair',
      'beat-the-great-storm',
      'beat-the-stair',
      'q-grounding',
    )

    // READING (b): what reaches beat-the-stair now includes something from outside. The
    // keeper standing at the stair can see it; the keeper looking at the tower's wall
    // cannot, because no read of the wall exists yet.
    const reachingTheStair = prehensionsOnto(soc, 'beat-the-stair', 'q-grounding').map(
      (p: { subject: string }) => p.subject,
    )
    expect(reachingTheStair).toContain('beat-the-great-storm')
    expect(reachingTheStair).toContain('eddystone-end') // the story's own gathering, still there
  })

  it('FINDING, not a bug: nothing tells the standpoint it went stale', () => {
    const soc = new Society()
    lighthouse(soc, 'story-eddystone', 'eddystone-end', ['beat-the-lamp', 'beat-the-stair'])

    // Everything the inside standpoint can consult, before the storm.
    const before = {
      members: intervalOf(soc, 'story-eddystone', 'eddystone-end').slice().sort(),
      storyReaches: prehensionsFrom(soc, 'story-eddystone', 'q-grounding').length,
      storyIsReached: prehensionsOnto(soc, 'story-eddystone', 'q-grounding').length,
    }

    soc.lay({ slug: 'beat-the-great-storm', content: 'the storm of 1703', subject: null, object: null })
    soc.layP(
      'beat-the-great-storm~because~beat-the-stair',
      'the sea takes the stair',
      'beat-the-great-storm',
      'beat-the-stair',
      'q-grounding',
    )

    const after = {
      members: intervalOf(soc, 'story-eddystone', 'eddystone-end').slice().sort(),
      storyReaches: prehensionsFrom(soc, 'story-eddystone', 'q-grounding').length,
      storyIsReached: prehensionsOnto(soc, 'story-eddystone', 'q-grounding').length,
    }

    // READING (c). Every read AT THE STORY is identical across a write that changed what
    // the story's boundary contains. That is the finding: staleness is invisible from the
    // standpoint, and a cone-hash bulkhead cannot key on the story's own edges — it has to
    // key on the interior's, or an inside slice will serve a wall that has already moved.
    expect(after).toEqual(before)
  })
})
