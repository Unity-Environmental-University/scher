// ─────────────────────────────────────────────────────────────────────────────
// mrs-dalloway.play.test.ts — the imperfective, at kernel level. 🕰️🌸
//
// A doll (2026-07-16, laid by the afternoon's clerk, on recess — "you wanna go
// play with dolls?" — the same day Hallie discovered the board had recreated
// the perfect and imperfect tenses, and the future perfect, before lunch wore off):
//
// Mrs. Dalloway said she would buy the flowers herself. One June day; a now that
// moves through it, striking like Big Ben ("the leaden circles dissolved in the
// air"); the morning perfect behind it; the party scripted ahead of it. Woolf
// wrote the novel that IS the imperfective aspect — a day viewed from within,
// reference point inside the event, internal structure visible. The kernel
// agrees, and this doll makes it attest:
//
//   PERFECT      — the flowers, bought: behind the day's Now, a bounded whole.
//   IMPERFECTIVE — Clarissa's day and Septimus's day: two stories that contain
//                  the same Now without containing each other. Genuinely
//                  concurrent; mutually unordered; both straddling the strike
//                  of the clock. (The board met these today as "straddlers.")
//   FUTURE PERFECT — from the morning's vantage, the party's grounds read
//                  "will have been done": E before R, R after S. Reichenbach
//                  rides the graph for free.
//   MEDIATION    — Clarissa and Septimus NEVER MEET. His death reaches her
//                  party only through Bradshaw's telling of it — "we only see
//                  outside of the card via the context we're in" (Hallie,
//                  ruled this afternoon; Woolf, ruled 1925).
//
// Built on the house discipline: readings are nodes, meaning is in the edges,
// slugs are opaque, closings are bare (edge direction carries it), and nothing
// is ever a stored flag — doneness here is READ from vantages, which is the
// whole novel: Peter Walsh thinks her party trivial; Clarissa knows it is her
// offering. Same event. Two frames. Both honest.
//
// Run: cd scher && npx vitest run mrs-dalloway.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  Society, prehensionsFrom, prehensionsOnto,
  unpackPoles, endActual, closePole, reaches,
} from "../src/society.js";

const lay = (s: Society, slug: string, content = slug) => {
  if (!s.has(slug)) s.lay({ slug, content, subject: null, object: null });
};
/** a plain grounding: `later ~because~ earlier` (later prehends earlier). */
const grounds = (s: Society, later: string, earlier: string) => {
  lay(s, later); lay(s, earlier);
  s.layP(`${later}~because~${earlier}`, "grounds in", later, earlier, "q-grounding");
};

/** One June day, laid whole. Returns the named beats. */
function juneDay(s: Society) {
  // the day, and Big Ben's strikes — the moving Now, struck into the record
  lay(s, "wednesday-june-1923");
  lay(s, "big-ben-morning", "the leaden circles dissolved in the air");
  lay(s, "big-ben-midday");
  grounds(s, "big-ben-midday", "big-ben-morning"); // the clock's own succession

  // PERFECT: the flowers, bought in the morning — a bounded whole
  lay(s, "buy-the-flowers", "she would buy the flowers herself");
  const flowers = unpackPoles(s, "buy-the-flowers");
  closePole(s, "buy-the-flowers");                 // bought: the End closes (bare, direction carries it)
  grounds(s, "big-ben-midday", flowers.end);       // and midday prehends the closed End — behind the strike

  // IMPERFECTIVE ×2: two stories containing the same Now, not each other
  lay(s, "clarissas-day", "Clarissa walks into the June morning");
  lay(s, "septimuss-day", "Septimus hears the sparrows sing in Greek");
  const clarissa = unpackPoles(s, "clarissas-day");
  const septimus = unpackPoles(s, "septimuss-day");
  grounds(s, "clarissas-day", "big-ben-morning"); // both began before midday
  grounds(s, "septimuss-day", "big-ben-morning");
  // neither closed at midday: both straddle the strike

  // THE PARTY: scripted ahead all day — the End Clarissa's whole day reaches toward
  lay(s, "the-party", "her offering; for what she loved: life");
  const party = unpackPoles(s, "the-party");
  grounds(s, "the-party", "buy-the-flowers"); // the party grounds in the morning's work

  // SEPTIMUS'S DEATH, and the MEDIATION: Bradshaw's telling carries it to the party
  lay(s, "septimuss-death", "he flung himself from the window");
  grounds(s, "septimuss-death", "septimuss-day");
  lay(s, "bradshaws-telling", "a young man had killed himself — in the middle of my party");
  grounds(s, "bradshaws-telling", "septimuss-death"); // the telling prehends the death
  grounds(s, "the-party", "bradshaws-telling");       // the party prehends the telling
  // NO direct edge death→party or party→death is ever laid. Woolf never lays it either.

  return { flowers, clarissa, septimus, party };
}

describe("Mrs. Dalloway — the imperfective, at kernel level 🕰️🌸", () => {
  it("PERFECT — the flowers are a bounded whole behind the midday strike", () => {
    const s = new Society();
    const { flowers } = juneDay(s);
    expect(endActual(s, flowers.end)).toBe(true);                      // closed: viewed from outside
    expect(reaches(s, "big-ben-midday", flowers.end, "q-grounding")).toBe(true); // and behind the Now
  });

  it("IMPERFECTIVE — two stories straddle the same strike without containing each other", () => {
    const s = new Society();
    const { clarissa, septimus } = juneDay(s);
    // both open at midday — the reference point sits INSIDE each
    expect(endActual(s, clarissa.end)).toBe(false);
    expect(endActual(s, septimus.end)).toBe(false);
    // both contain the morning (began before the strike)…
    expect(reaches(s, "clarissas-day", "big-ben-morning", "q-grounding")).toBe(true);
    expect(reaches(s, "septimuss-day", "big-ben-morning", "q-grounding")).toBe(true);
    // …and neither prehends the other: genuinely concurrent, mutually unordered
    expect(reaches(s, "clarissas-day", "septimuss-day", "q-grounding")).toBe(false);
    expect(reaches(s, "septimuss-day", "clarissas-day", "q-grounding")).toBe(false);
  });

  it("FUTURE PERFECT — from the morning, the party's grounds read 'will have been done'", () => {
    const s = new Society();
    const { party } = juneDay(s);
    // R (the party's End) is still ahead — scripted, not actual…
    expect(endActual(s, party.end)).toBe(false);
    // …yet E (the flowers) already sits in the party's past cone: E before R, R after S
    expect(reaches(s, "the-party", "buy-the-flowers", "q-grounding")).toBe(true);
  });

  it("MEDIATION — the death reaches the party only through the telling", () => {
    const s = new Society();
    juneDay(s);
    // reachable: the party's cone holds the death (two hops of honest grounding)
    expect(reaches(s, "the-party", "septimuss-death", "q-grounding")).toBe(true);
    // but never directly: no prehension joins them without Bradshaw between
    const direct = prehensionsFrom(s, "the-party", "q-grounding")
      .some((e) => e.object === "septimuss-death");
    expect(direct).toBe(false);
    // and the telling is the one join: it prehends the death; the party prehends it
    expect(prehensionsFrom(s, "bradshaws-telling", "q-grounding")
      .some((e) => e.object === "septimuss-death")).toBe(true);
    expect(prehensionsFrom(s, "the-party", "q-grounding")
      .some((e) => e.object === "bradshaws-telling")).toBe(true);
  });

  it("THE PARTY CLOSES — and the whole day declines from imperfective into perfect", () => {
    const s = new Society();
    const { party, clarissa } = juneDay(s);
    // evening: the party completes; Clarissa's day closes because her offering stood
    closePole(s, "the-party");
    grounds(s, "clarissas-day", party.end);  // her day's tail prehends the party's closed End
    closePole(s, "clarissas-day");
    expect(endActual(s, party.end)).toBe(true);
    expect(endActual(s, clarissa.end)).toBe(true);
    // the future perfect has become plain perfect: same beats, the reference moved.
    // "It is Clarissa, he said. For there she was." — the last reading is laid
    // by someone else's frame, of her, at her party: a reading, not a flag.
    lay(s, "peter-sees-her", "for there she was");
    grounds(s, "peter-sees-her", "the-party");
    expect(prehensionsOnto(s, "the-party", "q-grounding")
      .some((e) => e.subject === "peter-sees-her")).toBe(true);
  });
});
