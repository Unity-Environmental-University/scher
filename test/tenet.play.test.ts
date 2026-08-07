// ─────────────────────────────────────────────────────────────────────────────
// tenet.play.test.ts — the temporal pincer walks into an append-only canon. ⏳🔀
//
// A doll (2026-08-07, after an afternoon that started with a text field losing
// keystrokes and ended in Whitehead). Hallie had watched Tenet the night before
// and asked how fine-grained it could be rendered. Hyperion is the prior art and
// most of the answer: anti-time, backward aging, a scripted future gripping the
// present — all won there, adversarially, and honored here rather than redone.
//
// What Tenet adds that Hyperion did not have: Hyperion's anti-time is ONE canon
// read against its own insertion order. Tenet's is TWO series with their own
// internal orders and NO global order between them — related only where they
// touch. That is the claim this doll tests.
//
//   THE TURNSTILE    — not a substrate converter. The same events, prehended
//                      from the other direction. Nothing changes kind.
//   THE PINCER       — two teams, opposite directions, one order each. Between
//                      contacts there is NO fact about which came first. The
//                      grammar must refuse the question, not answer it wrong.
//   THE CONTACT      — order between series exists ONLY where one prehends the
//                      other. Local, not global. (Neil: "for you it's the end of
//                      a beautiful friendship; for me it's the beginning.")
//   "WHAT'S HAPPENED,
//    HAPPENED"       — constraint already laid holds. Not fatalism: the refusal
//                      to unmake what constrained you. Append-only IS this line.
//   THE ALGORITHM    — the doomsday device is not an explosion. It is a GLOBAL
//                      order imposed across all series — one direction winning
//                      everywhere. Annihilation as the erasure of every other
//                      order. The grammar's answer: you cannot lay it.
//
// Run: cd scher && npx vitest run tenet.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto } from "../src/society.js";

const lay = (s: Society, slug: string, content = slug) => {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
};
/** an occasion witnessed at a stated moment — backdating is legal, the clock
 *  ratchets on max, nothing is ever rewritten (the Time Tombs' own idiom). */
const at = (s: Society, slug: string, w: number, content = slug) => {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null, witnessed: w });
};
/** later grounds in earlier — the ONLY thing that makes one occasion "before"
 *  another. There is no clock doing this; prehension is the order. */
const grounds = (s: Society, later: string, earlier: string, w?: number) => {
  lay(s, later); lay(s, earlier);
  s.layP(`${later}~because~${earlier}`, "grounds in", later, earlier, "q-grounding");
  if (w !== undefined) {
    s.lay({ slug: `${later}~because~${earlier}~w`, content: "w", subject: null, object: "q-grounding", witnessed: w });
  }
};

describe("tenet — two orders, one contact, no global time 🔀", () => {
  it("THE TURNSTILE — inversion is a standpoint, not a change of kind", () => {
    const s = new Society();
    // The same occasion, prehended from both sides. If inversion changed what a
    // thing IS, the inverted read would need its own node. It does not — one
    // occasion, two readings, exactly like the six Mona Lisas of city-of-death.
    lay(s, "the-oslo-freeport");
    lay(s, "read-forward", "the protagonist, going in");
    lay(s, "read-inverted", "the protagonist, coming out");
    grounds(s, "read-forward", "the-oslo-freeport");
    grounds(s, "read-inverted", "the-oslo-freeport");

    // both readings ground in the SAME occasion — no second freeport exists
    const readings = prehensionsOnto(s, "the-oslo-freeport", "q-grounding").map((e) => e.subject);
    expect(readings.sort()).toEqual(["read-forward", "read-inverted"]);
    // and neither reading grounds in the other: they are not ordered by each other
    expect(prehensionsOnto(s, "read-forward", "q-grounding")).toHaveLength(0);
    expect(prehensionsOnto(s, "read-inverted", "q-grounding")).toHaveLength(0);
  });

  it("THE PINCER — two internal orders, and NO fact about which came first", () => {
    const s = new Society();
    // Red team runs forward, blue team runs inverted. Each has a real internal
    // order. Between them, nothing — until they touch.
    for (const [a, b] of [["red-1", "red-2"], ["red-2", "red-3"]]) grounds(s, b, a);
    for (const [a, b] of [["blue-1", "blue-2"], ["blue-2", "blue-3"]]) grounds(s, b, a);

    // each series is ordered WITHIN itself
    expect(prehensionsOnto(s, "red-2", "q-grounding").map((e) => e.subject)).toEqual(["red-3"]);
    expect(prehensionsOnto(s, "blue-2", "q-grounding").map((e) => e.subject)).toEqual(["blue-3"]);

    // ACROSS the series: no edge, therefore no order. The grammar does not
    // answer "did red-1 precede blue-1?" with a guess — there is no such fact.
    // This is the whole finding: order is prehendability, not a timeline the
    // occasions sit in. Two things that do not touch are not ordered at all.
    const across = s.all().filter((b) =>
      (b.subject?.startsWith("red") && b.object?.startsWith("blue")) ||
      (b.subject?.startsWith("blue") && b.object?.startsWith("red")));
    expect(across).toHaveLength(0);
  });

  it("THE CONTACT — order between series exists only where one prehends the other", () => {
    const s = new Society();
    for (const [a, b] of [["red-1", "red-2"], ["red-2", "red-3"]]) grounds(s, b, a);
    for (const [a, b] of [["blue-1", "blue-2"], ["blue-2", "blue-3"]]) grounds(s, b, a);

    // One exchange: blue hands red what red needs. NOW there is an order — but
    // only here, and only between these two beats.
    grounds(s, "red-2", "blue-2");

    // red-2 is after blue-2. That is a real, local fact.
    expect(prehensionsFrom(s, "red-2", "q-grounding").map((e) => e.object).sort())
      .toEqual(["blue-2", "red-1"]);
    // but red-1 and blue-1 STILL have no order between them. The contact does
    // not propagate into a global timeline — it orders exactly what it touches.
    const red1blue1 = s.all().filter((b) =>
      (b.subject === "red-1" && b.object === "blue-1") || (b.subject === "blue-1" && b.object === "red-1"));
    expect(red1blue1).toHaveLength(0);
  });

  it("NEIL — the same friendship, opposite directions, both true", () => {
    const s = new Society();
    // "For you, I think it's the end of a beautiful friendship. For me, it's the
    // beginning." Two readings of one relation, each laid BY its own frame.
    lay(s, "the-friendship");
    s.lay({ slug: "tp-reads", content: "the end of a beautiful friendship", subject: null, object: null, laid_by: "the-protagonist" });
    s.lay({ slug: "neil-reads", content: "for me it's the beginning", subject: null, object: null, laid_by: "neil" });
    grounds(s, "tp-reads", "the-friendship");
    grounds(s, "neil-reads", "the-friendship");

    // the grammar refuses the objective seat: neither reading is privileged,
    // and no third beat says which is "really" first (mind-line's law).
    const reads = prehensionsOnto(s, "the-friendship", "q-grounding").map((e) => e.subject);
    expect(reads.sort()).toEqual(["neil-reads", "tp-reads"]);
    expect(prehensionsOnto(s, "tp-reads", "q-grounding")).toHaveLength(0);
    expect(prehensionsOnto(s, "neil-reads", "q-grounding")).toHaveLength(0);
  });

  it("WHAT'S HAPPENED, HAPPENED — constraint laid holds; append-only IS the line", () => {
    const s = new Society();
    at(s, "the-past", 10);
    at(s, "the-attempt-to-undo-it", 20, "going back to prevent it");
    // The attempt is a real occasion and it GROUNDS IN the thing it would undo —
    // which is exactly why it cannot unmake it. To act against the past you must
    // first prehend it, and prehending it is what makes it hold.
    grounds(s, "the-attempt-to-undo-it", "the-past");

    expect(s.has("the-past")).toBe(true);                       // still there
    expect(prehensionsOnto(s, "the-past", "q-grounding")).toHaveLength(1);
    // nothing was deleted; the record of the attempt is itself more constraint
    // on the past, not less. Fatalism would be a rule forbidding the attempt.
    // This is not that: the attempt is legal, and it thickens what it opposed.
  });

  it("THE ALGORITHM — a global order is not layable; the refusal is the grammar", () => {
    const s = new Society();
    for (const [a, b] of [["red-1", "red-2"]]) grounds(s, b, a);
    for (const [a, b] of [["blue-1", "blue-2"]]) grounds(s, b, a);

    // The doomsday device is one direction winning EVERYWHERE — a single order
    // imposed across all series, which is the same as erasing every other order.
    // There is no beat for that. You can lay any number of LOCAL orderings:
    grounds(s, "red-2", "blue-1");
    grounds(s, "blue-2", "red-1");
    // ...and this is not a contradiction, because there was never a global line
    // for them to contradict. Both hold. The count of orders is READ off what
    // has actually been laid — never fixed in advance, never collapsed to one.
    expect(prehensionsFrom(s, "red-2", "q-grounding").map((e) => e.object).sort())
      .toEqual(["blue-1", "red-1"]);
    expect(prehensionsFrom(s, "blue-2", "q-grounding").map((e) => e.object).sort())
      .toEqual(["blue-1", "red-1"]);
    // The grammar's answer to annihilation is structural, not a guard: there is
    // no place to put "and this order is the only one." Nothing to smack.
  });

  it("INVERSION IS WITNESSED, NOT REWRITTEN — the Tombs' idiom, one series", () => {
    const s = new Society();
    lay(s, "the-turnstile");
    // laid in one order, witnessed in the reverse — explicit backdating, legal,
    // append-only intact (this is Hyperion's law, reused rather than re-won).
    const pass = (slug: string, w: number) => {
      s.lay({ slug, content: slug, subject: null, object: null, witnessed: w });
      s.lay({ slug: `${slug}~through~the-turnstile`, content: "passes through", subject: slug, object: "the-turnstile", witnessed: w });
      s.lay({ slug: `${slug}~through~the-turnstile~q`, content: "q", subject: null, object: "q-grounding", witnessed: w });
    };
    pass("exit-inverted", 90);   // laid FIRST, witnessed LAST
    pass("enter-forward", 70);   // laid LAST, witnessed FIRST

    const through = (asOf: number) =>
      prehensionsOnto(s, "the-turnstile", "q-grounding", asOf).map((e) => e.subject);
    expect(through(75)).toEqual(["enter-forward"]);                    // only the forward pass yet
    expect(through(95)).toEqual(["exit-inverted", "enter-forward"]);   // both, in witnessed order
  });
});
