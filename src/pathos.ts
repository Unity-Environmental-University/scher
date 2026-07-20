// ─────────────────────────────────────────────────────────────────────────────
// pathos.ts — the q-feel reaction reads, cut out of society.ts (2026-07-15,
// separation-of-concerns pass). Self-contained: reads only the kernel's
// prehensionsOnto/isOccluded. Moved, not rebranded — names and doc-comments
// unchanged from their home in society.ts; only the file boundary is new.
// ─────────────────────────────────────────────────────────────────────────────

import { type Society, prehensionsFrom, prehensionsOnto, isOccluded } from "./society.js";

/** pathos: the q-feel reactions on a beat — key (the raw q-feel content, an emoji today,
 *  a stem once verbFeels lands) + count + who. */
export interface Pathos {
  key: string;
  count: number;
  by: string[];
}
// TODO(socratic): I am the raw read "kept for back-compat" while reactionsOn (below) is the honest
// one — how long does a deprecated read get to keep counting un-reacted feels before a surface
// trusts the wrong number, and what would let me perish?
// ANSWERED(walk 2026-07-02): the code names its own exit — reactionsOn's doc says it is "the one a reacting surface should use"; pathosOf perishes the moment no caller remains, which is a greppable fact today, not a policy wait. — see reactionsOn's doc-comment below
//
// EMOJI-AS-NODE, THE FINAL Q-FEEL RULING (Hallie, "story-emoji-as-node", 2026-07-20 —
// supersedes the SAME DAY's earlier "story-flip-q-feel-direction" object=reactor shape):
// q-feel edges are subject=event, object=EMOJI-NODE (lazily minted, content=the glyph).
// Emoji is read off the OBJECT NODE's content, not the edge's own content field.
//
// AUTHORSHIP RECONCILIATION (Hallie, same day): the reactor is who LAID the feel, not
// who UTTERED something — q-utterance/authorOf (biography.ts) is the SPEECH idiom,
// reserved for comments, untouched by this ruling. The reactor instead reads the SAME
// laid_by-primary-then-q-authorship-fallback shape biographyOf's own authorship
// discovery already uses (biography.ts:80-110), mirroring gen4-policy's `laid_by()`
// read (gen4-policy/src/lib.rs:821-837) exactly: PRIMARY is the q-feel row's own
// EventRow.laid_by column (structural, no parsing); FALLBACK, for rows laid before a
// column existed, walks the `laid-{feelSlug}-by-{layer}` node via its un-occluded
// `~lays~` edge co-prehending q-authorship. SINGLE-SHAPE READS ONLY — no dual-shape
// compatibility with either of this same day's two earlier, since-superseded reactor
// shapes (object=reactor, or a q-utterance authorship row); those wait for the kalpa.
/** authorOfReaction: who LAID a q-feel edge — laid_by column first, q-authorship
 *  testimony edge as the legacy fallback. Composes the same primary-then-fallback shape
 *  biographyOf's authorship discovery already uses, rather than minting a new pattern.
 *  FALLBACK NOTE: the testimony node's slug (`laid-{feelSlug}-by-{layer}`) is parsed only
 *  in this legacy branch — the SAME dated, explicit exception biographyOf's own fallback
 *  takes (biography.ts:86-90) and Rust's laid_by() takes (gen4-policy/src/lib.rs:816-819):
 *  new writes never depend on it, since layReactionAuthorship's caller (reactionStory)
 *  always also sets the primary laid_by column at lay time. */
function authorOfReaction(soc: Society, feelSlug: string, asOf?: number): string | null {
  const feelRow = soc.get(feelSlug);
  if (feelRow?.laid_by) return feelRow.laid_by;
  // FALLBACK, LEGACY ROWS ONLY: laid-{feelSlug}-by-{layer} node via its q-authorship edge.
  const laysEdge = prehensionsOnto(soc, feelSlug, "q-authorship", asOf).find((p) => !isOccluded(soc, p.slug, asOf));
  const node = laysEdge?.subject;
  if (!node) return null;
  const match = node.match(/^laid-(.+)-by-(.+)$/);
  if (!match) return null;
  const [, eventSlug, layer] = match;
  return eventSlug === feelSlug ? (layer ?? null) : null;
}
export function pathosOf(soc: Society, beat: string): Pathos[] {
  const feels = prehensionsFrom(soc, beat, "q-feel");
  const byEmoji = new Map<string, Pathos>();
  for (const p of feels) {
    // the emoji is the OBJECT NODE's content (the lazily-minted emoji-node), not the
    // q-feel edge's own content field.
    if (!p.object) continue;
    const emojiNode = soc.get(p.object);
    const emoji = emojiNode?.content.trim();
    if (!emoji) continue;
    const cur = byEmoji.get(emoji) ?? { key: emoji, count: 0, by: [] };
    cur.count++;
    const reactor = authorOfReaction(soc, p.slug);
    if (reactor) cur.by.push(reactor);
    byEmoji.set(emoji, cur);
  }
  // TODO(socratic): why sort by count descending, and should ties be broken by emoji value or by insertion order?
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}

/** reactionsOn: the q-feel reactions ON a beat, aggregated by emoji — the read paired with
 *  reactionStory. It is pathosOf with the SUPERSEDE GUARD: an un-react supersedes the q-feel
 *  beat (a self-loop), so a removed reaction must not linger. (pathosOf is the raw read kept
 *  for back-compat; reactionsOn is the one a reacting surface should use.) asOf-relative,
 *  like every read here.
 *
 *  EMOJI-AS-NODE (2026-07-20, final q-feel ruling): see pathosOf's doc-comment — emoji
 *  read off the object node's content, reactor off the q-utterance authorship row. */
export function reactionsOn(soc: Society, beat: string, asOf?: number): Pathos[] {
  // TODO(socratic): when someone un-reacts, does the old reaction get occluded (shadowed) or deleted, and does reactionsOn see the deletion via occlude-guard?
  // ANSWERED(walk 2026-07-02): occluded, never deleted — nothing is ever deleted here (append-only; occluded ≠ deleted, the ink stays); the isOccluded filter on the next line IS the occlude-guard seeing it, so an un-reacted feel drops out of the count while staying in the record. — see the occluded≠deleted ruling (clearness-holds) / append-only law
  const feels = prehensionsFrom(soc, beat, "q-feel", asOf).filter((p) => !isOccluded(soc, p.slug, asOf));
  const byEmoji = new Map<string, Pathos>();
  for (const p of feels) {
    if (!p.object) continue;
    const emojiNode = soc.get(p.object);
    const emoji = emojiNode?.content.trim();
    if (!emoji) continue;
    const cur = byEmoji.get(emoji) ?? { key: emoji, count: 0, by: [] };
    cur.count++;
    const reactor = authorOfReaction(soc, p.slug, asOf);
    if (reactor) cur.by.push(reactor);
    byEmoji.set(emoji, cur);
  }
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}
