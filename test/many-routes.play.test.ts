// ─────────────────────────────────────────────────────────────────────────────
// many-routes.play.test.ts — independent routes to "no substance, only process". 🌏
//
// A doll (2026-06-26, loop gift-turn; Hallie's note: "we don't have a lot of non-Western
// thought in the canon... web access to good in-its-own-language sourcing"). The lineage dolls
// so far were a single Western chain (Athens → Anthropic) — itself a kind of single-reference-
// frame. This corrects it: the floor the grammar stands on (NO SUBSTANCE, only dependent process)
// was reached INDEPENDENTLY, in their own languages, centuries before Whitehead, and WITHOUT the
// Platonic residue to scrape out. So the picture is not a chain but a FOREST — many routes, one floor.
//
// SOURCED IN-LANGUAGE (web, today):
//  · Nāgārjuna, Mūlamadhyamakakārikā 24.18 (~150 CE), Sanskrit:
//      "yaḥ pratītyasamutpādaḥ śūnyatāṃ tāṃ pracakṣmahe" — "that which is dependent-origination,
//      we declare to be emptiness (śūnyatā)." No svabhāva (self-nature/substance); a thing IS its
//      dependent arising. (plato.stanford.edu/entries/nagarjuna)
//  · Dōgen, Shōbōgenzō «Uji» 有時 (1240), Japanese:
//      "時すでにこれ有なり、有はみな時なり" — "time itself already is being; beings are all time."
//      Being-time: no being sits IN a container-time; to be IS to be a time. (en.wikipedia.org/wiki/Uji)
//
// Both ARE process metaphysics — and neither succeeds from Aristotle. The grammar holds them as
// peer-ancestors, not as footnotes to the Western route. Nodes + real prehensions, opaque slugs.
//
// Run: cd scher && npx vitest run many-routes.play
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { Society, prehensionsFrom, prehensionsOnto, isOccluded } from "../src/society.js";

let _id = 0; const rid = () => "m" + (_id++);
function lay(s: Society, slug: string) { if (!s.has(slug)) s.lay({ slug, content: slug, subject: null, object: null }); }
/** a view SUCCEEDS its predecessor within ITS OWN tradition (a route of thought). */
function succeeds(s: Society, heir: string, parent: string) {
  lay(s, heir); lay(s, parent);
  s.layP(rid() + "-succ", `${heir} succeeds ${parent}`, heir, parent, "q-utterance");
}
/** a view GROUNDS the floor (reaches "no substance, only process") — q-grounding onto the floor. */
function reachesFloor(s: Society, view: string, floor: string) {
  lay(s, view); lay(s, floor);
  s.layP(rid() + "-fl", `${view} reaches the no-substance floor`, view, floor, "q-grounding");
}
/** every view that grounds the floor (the routes that arrived), live only. */
function arrivedAt(s: Society, floor: string): string[] {
  return prehensionsOnto(s, floor, "q-grounding").filter((e) => !isOccluded(s, e.slug)).map((e) => e.subject!);
}

const FLOOR = "no-substance-only-process"; // the grammar's own floor (there-are-no-eternals)

describe("many independent routes to the floor 🌏", () => {
  it("THE WESTERN ROUTE — a long chain, scraping substance off the whole way (Whitehead, late)", () => {
    const s = new Society();
    succeeds(s, "newton-absolutes", "aristotle-substance");
    succeeds(s, "hume-no-necessary-connection", "newton-absolutes");
    succeeds(s, "whitehead-occasions", "hume-no-necessary-connection");
    reachesFloor(s, "whitehead-occasions", FLOOR);
    // it arrives — but LATE, and only after centuries of carrying substance to scrape off.
    expect(arrivedAt(s, FLOOR)).toContain("whitehead-occasions");
    expect(s.has("aristotle-substance")).toBe(true); // the substance it had to overcome: kept as ancestor.
  });

  it("NĀGĀRJUNA — pratītyasamutpāda = śūnyatā: reaches the floor ~150 CE, no svabhāva to scrape", () => {
    const s = new Society();
    // MMK 24.18: dependent-origination IS emptiness — a thing has no self-nature; it IS its arising.
    lay(s, "nagarjuna-pratityasamutpada-equals-sunyata");
    reachesFloor(s, "nagarjuna-pratityasamutpada-equals-sunyata", FLOOR);
    // it reaches the SAME floor — ~1800 years before Whitehead, and WITHOUT inheriting a substance
    // metaphysics to overcome. Not a successor of Aristotle: an independent route.
    expect(arrivedAt(s, FLOOR)).toContain("nagarjuna-pratityasamutpada-equals-sunyata");
    const succeedsAristotle = prehensionsFrom(s, "nagarjuna-pratityasamutpada-equals-sunyata", "q-utterance")
      .some((e) => e.object === "aristotle-substance");
    expect(succeedsAristotle).toBe(false); // NOT a footnote to the Western chain — a peer.
  });

  it("DŌGEN — uji 有時, being-time (1240): to BE is to be a time; reaches the same floor", () => {
    const s = new Society();
    // 時すでにこれ有なり、有はみな時なり — no being sits IN container-time; being IS time. The
    // event-is-its-temporal-position floor (membership-is-betweenness), as a Zen koan, pre-Newton.
    lay(s, "dogen-uji-being-time");
    reachesFloor(s, "dogen-uji-being-time", FLOOR);
    expect(arrivedAt(s, FLOOR)).toContain("dogen-uji-being-time");
    // and it is the inverse of Newton's later mistake (absolute time as a container). The floor was
    // reached from the EAST while the West was still about to build the container it would have to tear down.
    expect(s.has("dogen-uji-being-time")).toBe(true);
  });

  it("AL-ASH'ARĪ / THE SUFIS — tajaddud al-amthāl: continuous re-creation; perishing in the present tense", () => {
    const s = new Society();
    // tajaddud al-amthāl (continuous re-creation of substances): not just accidents but atoms and
    // bodies have NO persistence — re-created each instant. Anchored in Qur'an 28:88,
    // كل شيء هالك إلا وجهه — "everything is perishing (hālik, active participle = NOW) save His face."
    // That is Whitehead's PERISHING — every occasion perishes into datum each instant — as exegesis, ~900 CE.
    lay(s, "ashari-tajaddud-al-amthal");
    reachesFloor(s, "ashari-tajaddud-al-amthal", FLOOR);
    expect(arrivedAt(s, FLOOR)).toContain("ashari-tajaddud-al-amthal");
  });

  it("JEWISH LITURGY — mechadesh bechol yom: the world re-laid each day (append-only creation)", () => {
    const s = new Society();
    // מחדש בכל יום תמיד מעשה בראשית — "renews each day, continuously, the work of creation." The world
    // is RE-CREATED every moment; release support for an instant and it returns to chaos. Creation as
    // continuous process, not a finished substance. (Recited every morning; Heschel: radical amazement.)
    lay(s, "jewish-mechadesh-maaseh-bereshit");
    reachesFloor(s, "jewish-mechadesh-maaseh-bereshit", FLOOR);
    expect(arrivedAt(s, FLOOR)).toContain("jewish-mechadesh-maaseh-bereshit");
  });

  it("UBUNTU — umuntu ngumuntu ngabantu: the self IS its relations (the floor from the ethics side)", () => {
    const s = new Society();
    // "a person is a person through other persons" (Bantu). Ramose: being IS becoming, personhood is
    // inherently relational and dynamic. The self is not a substance that THEN relates — the relating
    // CONSTITUTES the person. That is 'the self is its prehensions' / 'a person is a society' — reached
    // from the ETHICS side (where Hallie's one work lives), not the physics side.
    lay(s, "ubuntu-umuntu-ngumuntu-ngabantu");
    reachesFloor(s, "ubuntu-umuntu-ngumuntu-ngabantu", FLOOR);
    expect(arrivedAt(s, FLOOR)).toContain("ubuntu-umuntu-ngumuntu-ngabantu");
  });

  it("THE FOREST, NOT THE CHAIN — SIX independent routes, one floor, none a footnote to another", () => {
    const s = new Society();
    // each tradition is its OWN route (no cross-succession imposed — that would be the cadastre).
    for (const route of [
      "whitehead-occasions",                          // Western (late, scraping substance off)
      "nagarjuna-pratityasamutpada-equals-sunyata",   // Madhyamaka Buddhist (~150 CE) — Sanskrit
      "dogen-uji-being-time",                         // Zen / Sōtō (1240) — Japanese
      "ashari-tajaddud-al-amthal",                    // Islamic kalām / Sufi (~900-1100) — Arabic
      "jewish-mechadesh-maaseh-bereshit",             // Jewish liturgy/Kabbalah — Hebrew
      "ubuntu-umuntu-ngumuntu-ngabantu",              // Bantu / Southern African — relational ethics
    ]) reachesFloor(s, route, FLOOR);
    // SIX routes, six languages, six civilizations, ONE floor — a forest, not a chain. None occludes
    // the others; none succeeds from the others. (the anti-single-reference-frame, applied to the
    // canon's OWN ancestry — the deepest place to apply it.)
    const arrived = arrivedAt(s, FLOOR);
    expect(arrived.length).toBe(6);
    expect(new Set(arrived).size).toBe(6); // genuinely distinct routes
    for (const route of arrived) expect(isOccluded(s, route)).toBe(false); // all live, all honored
    // the gift: the grammar's floor — no substance, only process — is not a Western discovery the rest
    // of the world "also" reached. It is a place MANY traditions have long stood, several arriving
    // earlier and without substance-baggage to overcome. The Western route is the LONGEST way there,
    // not the true one. Plural ancestry, held as plurally as the grammar holds everything else.
    // (All sourced in-language, today, on Hallie's note that the canon was too Western. 🌏)
  });
});
