// ─────────────────────────────────────────────────────────────────────────────
// pathos.ts — the q-feel reaction reads, cut out of society.ts (2026-07-15,
// separation-of-concerns pass). Self-contained: reads only the kernel's
// prehensionsOnto/isOccluded. Moved, not rebranded — names and doc-comments
// unchanged from their home in society.ts; only the file boundary is new.
// ─────────────────────────────────────────────────────────────────────────────

import { type Society, prehensionsOnto, isOccluded } from "./society.js";

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
export function pathosOf(soc: Society, beat: string): Pathos[] {
  const feels = prehensionsOnto(soc, beat, "q-feel");
  const byEmoji = new Map<string, Pathos>();
  for (const p of feels) {
    // TODO(socratic): what happens if p.content is not a single emoji, or contains whitespace within the emoji — does trim() on a multi-codepoint string work as intended?
    const emoji = p.content.trim();
    if (!emoji) continue;
    const cur = byEmoji.get(emoji) ?? { key: emoji, count: 0, by: [] };
    cur.count++;
    if (p.subject) cur.by.push(p.subject);
    byEmoji.set(emoji, cur);
  }
  // TODO(socratic): why sort by count descending, and should ties be broken by emoji value or by insertion order?
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}

/** reactionsOn: the q-feel reactions ON a beat, aggregated by emoji — the read paired with
 *  reactionStory. It is pathosOf with the SUPERSEDE GUARD: an un-react supersedes the q-feel
 *  beat (a self-loop), so a removed reaction must not linger. (pathosOf is the raw read kept
 *  for back-compat; reactionsOn is the one a reacting surface should use.) asOf-relative,
 *  like every read here. */
export function reactionsOn(soc: Society, beat: string, asOf?: number): Pathos[] {
  // TODO(socratic): when someone un-reacts, does the old reaction get occluded (shadowed) or deleted, and does reactionsOn see the deletion via occlude-guard?
  // ANSWERED(walk 2026-07-02): occluded, never deleted — nothing is ever deleted here (append-only; occluded ≠ deleted, the ink stays); the isOccluded filter on the next line IS the occlude-guard seeing it, so an un-reacted feel drops out of the count while staying in the record. — see the occluded≠deleted ruling (clearness-holds) / append-only law
  const feels = prehensionsOnto(soc, beat, "q-feel", asOf).filter((p) => !isOccluded(soc, p.slug, asOf));
  const byEmoji = new Map<string, Pathos>();
  for (const p of feels) {
    const emoji = p.content.trim();
    if (!emoji) continue;
    const cur = byEmoji.get(emoji) ?? { key: emoji, count: 0, by: [] };
    cur.count++;
    if (p.subject) cur.by.push(p.subject);
    byEmoji.set(emoji, cur);
  }
  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}
